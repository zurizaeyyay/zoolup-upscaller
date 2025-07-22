"""
FastAPI server for image upscaling with RealESRGAN
Provides REST endpoints and WebSocket for real-time progress updates
"""

import asyncio
import json
import logging
import os
import uuid
from io import BytesIO
from typing import Dict, List


import uvicorn
import numpy as np
from PIL import Image
from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks,
    File, Form, UploadFile,
    )
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool


from config import (
    API_TITLE, API_VERSION, HOST, PORT, LOG_LEVEL,
    CORS_ORIGINS, CORS_ALLOW_CREDENTIALS, OUTPUT_DIR
)
from upscale import ModelManager
from util_file import process_byte_input, generate_filename


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=API_TITLE, version=API_VERSION)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state management
class UpscalerState:
    def __init__(self):
        self.models: Dict[str, ModelManager] = {}
        self.active_jobs: Dict[str, dict] = {}
        self.websocket_connections: Dict[str, WebSocket] = {}
        
    def get_model(self, scale: str, resample_mode: str) -> ModelManager:
        """Get or create a model for the given scale"""
        model_key = f"{scale}_{resample_mode or 'bicubic'}"
        if model_key not in self.models:
            self.models[model_key] = ModelManager()
            self.models[model_key].initialize_model(
                scale=scale,
                use_attention=False,
                resample_mode=resample_mode
            )
        return self.models[model_key]

state = UpscalerState()

# WebSocket connection manager
@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    state.websocket_connections[job_id] = websocket
    logger.info(f"WebSocket connected for job {job_id}")
    
    # keep connection alive and cleanup memory on disconnect
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
        if job_id in state.websocket_connections:
            del state.websocket_connections[job_id]

async def send_progress_update(job_id: str, progress: float, message: str):
    """Send progress update via WebSocket"""
    if job_id in state.websocket_connections:
        try:
            progress_data = {
                "progress": progress,
                "message": message
            }
            logger.info(f"📤 Sending progress update for job {job_id}: {progress_data}")
            await state.websocket_connections[job_id].send_json(progress_data)
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")



@app.get("/")
async def root():
    return {"message": "Image Upscaler API is running"}

@app.get("/models")
async def get_available_models():
    """Get list of available upscaling models"""
    return {
        "factors": ["2", "4", "8"],
        "resample_modes": ['nearest', 'linear', 'bilinear', 'bicubic', 'area', 'nearest-exact'],
        "resample_desc": {
            "nearest": "Nearest Neighbor - Fast and sharp lines",
            "linear": "Linear - Good for 1D, not recommended for images",
            "bilinear": "Bilinear - Smooth interpolation",
            "bicubic": "Bicubic - High quality, smooth (recommended)",
            "area": "Area - Good for downsampling",
            'nearest-exact': 'Nearest Neighbor Exact - Strictly better nearest neighbor'
        }
    }

@app.post("/upscale", status_code=202)
async def upscale_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    scales: str = Form(default="2"),  # JSON string like "[\"2\", \"4\"]"
    resample_mode: str = Form(default="bicubic"),
    show_progress: bool = Form(default=True),
    job_id: str = Form(None),
    
):
    """
    Upscale an image with the specified parameters
    """
    
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        # Read the uploaded file
        img_file = await process_byte_input(file)
    except Exception as e:
        logger.error(f"Error reading uploaded file: {e}")
        raise HTTPException(status_code=400, detail="Invalid file upload")
    
    if job_id == None:
        job_id = str(uuid.uuid4())
    
    # send initial “accepted” response
    background_tasks.add_task(
        run_in_threadpool,
        upscale_job,  # a sync function that wraps your loop & ModelManager calls
        job_id, 
        img_file,
        file.filename,
        scales, 
        resample_mode, 
        show_progress
    )
    
    return {"job_id": job_id, "status": "accepted"}

def upscale_job(
    job_id: str,
    img_file: Image,
    original_filename: str,
    scales: str | list[str],
    resample_mode: str,
    show_progress: bool
):
    """
    Synchronous helper to run in a thread pool.
    - raw_file_bytes: the body of the uploaded file
    - original_filename: e.g. "photo.jpg"
    - scales: JSON string or list of scale factors
    - resample_mode: interpolation mode
    - show_progress: whether to push updates
    """
    try:
        # 1) Parse + validate scales
        if isinstance(scales, str):
            try:
                scale_list = json.loads(scales)
                if not isinstance(scale_list, list):
                    scale_list = [str(scale_list)]
            except json.JSONDecodeError:
                scale_list = [scales]
        else:
            scale_list = [str(s) for s in scales]

        retrieved_model_info = asyncio.run(get_available_models())

        valid_factors = retrieved_model_info["factors"]
        scale_list = [s for s in scale_list if str(s) in valid_factors]
        if not scale_list:
            raise ValueError(f"No valid scales provided. Must be {valid_factors}")

        # 2) Validate resample mode
        valid_modes = retrieved_model_info["resample_modes"]
        if resample_mode not in valid_modes:
            logging.warning(f"Invalid resample_mode '{resample_mode}', falling back to 'bicubic'")
            resample_mode = "bicubic"

        # 3) Read image from bytes
        uploaded_img = img_file

        # 4) Initialize job state
        state.active_jobs[job_id] = {
            "status": "processing",
            "progress": 0.0,
            "message": "Starting upscale…",
            "scales": scale_list,
            "resample_mode": resample_mode
        }

        # Send initial progress
        if show_progress:
            asyncio.run(send_progress_update(job_id, 0.0, "Starting upscale…"))

        # 5) Loop over scales
        current_img = uploaded_img
        if isinstance(current_img, Image.Image):
            current_img = np.array(current_img)
        total = len(scale_list)

        async def progress_callback(progress: float, message: str):
            # update state and push via WebSocket
            state.active_jobs[job_id]["progress"] = progress
            state.active_jobs[job_id]["message"] = message
            await send_progress_update(job_id, progress, message)

        for idx, scale in enumerate(scale_list):
            model = state.get_model(scale, resample_mode)
            if show_progress:
                result = asyncio.run(model.predict_with_progress(current_img, progress_callback=progress_callback))
            else:
                result = model.predict(current_img)

            # Predict functions return PIL images
            # prepare for next iteration and preserves RGBA return format if final iteration
            if isinstance(result, Image.Image) and idx < total - 1:
                current_img = np.array(result)
            else:
                current_img = result

            # send “this scale done” update
            if show_progress:
                asyncio.run(send_progress_update(job_id, 1.0, f"Completed scale x{scale}"))

        # 6) Save final result
        output_filename = generate_filename(original_filename, scale_list, resample_mode)
        out_path = os.path.join(OUTPUT_DIR, output_filename)

        # If PIL.Image:
        if isinstance(current_img, Image.Image):
            current_img.save(out_path)
        else:
            # assume numpy array
            Image.fromarray(current_img).save(out_path)

        # 7) Mark job complete
        state.active_jobs[job_id].update({
            "status": "completed",
            "progress": 1.0,
            "message": "Image upscaled successfully!",
            "output_file": out_path,
            "filename": output_filename
        })
        if show_progress:
            asyncio.run(send_progress_update(job_id, 1.0, "Image upscaled successfully!"))

    except Exception as e:
        logger.error(f"[upscale_job:{job_id}] error: {e}")
        state.active_jobs[job_id] = {"status": "error", "message": str(e)}
        
@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of an upscaling job"""
    if job_id not in state.active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = state.active_jobs[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job.get("progress", 0.0),
        "message": job.get("message", ""),
        "filename": job.get("filename", ""),
    }

@app.get("/download/{job_id}")
async def download_result(job_id: str):
    """Download the upscaled image result"""
    if job_id not in state.active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = state.active_jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    
    if "output_file" not in job:
        raise HTTPException(status_code=404, detail="Result file not found")
    
    output_file = job["output_file"]
    if not os.path.exists(output_file):
        raise HTTPException(status_code=404, detail="Result file not found")
    
    filename = job["filename"]
    
    extension = filename.split('.')[-1]
    mime_type = f"image/{extension}"
    
    return FileResponse(
        output_file,
        filename=filename,
        media_type=mime_type
    )

@app.delete("/job/{job_id}")
async def cleanup_job(job_id: str):
    """Clean up job files and data"""
    if job_id not in state.active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = state.active_jobs[job_id]
    
    # Clean up output file if it exists
    if "output_file" in job and os.path.exists(job["output_file"]):
        try:
            os.unlink(job["output_file"])
        except Exception as e:
            logger.error(f"Error cleaning up file: {e}")
    
    # Remove job from state
    del state.active_jobs[job_id]
    
    # Close WebSocket connection if exists
    if job_id in state.websocket_connections:
        try:
            await state.websocket_connections[job_id].close()
            del state.websocket_connections[job_id]
        except Exception as e:
            logger.error(f"Error closing WebSocket: {e}")
    
    return {"message": "Job cleaned up successfully"}

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, log_level=LOG_LEVEL)
