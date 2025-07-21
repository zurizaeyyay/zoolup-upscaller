"""
FastAPI server for image upscaling with RealESRGAN
Provides REST endpoints and WebSocket for real-time progress updates
"""

import asyncio
import json
import logging
import os
import tempfile
import uuid
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
import numpy as np

from upscale import ModelManager
from util_file import process_byte_input

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Image Upscaler API", version="1.0.0")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
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
            await state.websocket_connections[job_id].send_json({
                "progress": progress,
                "message": message
            })
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")

# Generate output filename        
def generate_filename(filename, scale_list, resample_mode):
    
    extension = filename.split('.')[-1]
    name_without_ext = '.'.join(filename.split('.')[:-1])
    
    original_name = filename.split('.')[0]
    factors_str = ' '.join([f"x{scale}" for scale in scale_list])
    
    # Check if filename ends with factors in parentheses like "(x2)" or "(x2 x4)"
    if name_without_ext.endswith(')') and '(' in name_without_ext:
        # Find the last opening parenthesis
        last_open_paren = name_without_ext.rfind('(')
        
        # Extract what's inside the parentheses at the end
        content_in_parens = name_without_ext[last_open_paren+1:-1]
        
        # Check if it contains factors (starts with 'x' and contains digits)
        if content_in_parens and all(part.startswith('x') and part[1:].isdigit() for part in content_in_parens.split()):
            # It's factors at the end, combine them
            name_before_factors = name_without_ext[:last_open_paren]
            combined_factors = f"{content_in_parens} {factors_str}"
            new_filename = f"{name_before_factors} {resample_mode} ({combined_factors}).{extension}"
        else:
            # Not factors, treat as normal filename
            new_filename = f"{name_without_ext} {resample_mode} ({factors_str}).{extension}"
    else:
        # No parentheses at end, add factors normally
        new_filename = f"{name_without_ext} {resample_mode} ({factors_str}).{extension}"
        
    return new_filename
    

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

@app.post("/upscale")
async def upscale_image(
    file: UploadFile = File(...),
    scales: str = Form(default="2"),  # JSON string like "[\"2\", \"4\"]"
    resample_mode: str = Form(default="bicubic"),
    show_progress: bool = Form(default=True),
    job_id: str = Form(default=None)
):
    """
    Upscale an image with the specified parameters
    """
    
    if job_id == None:
        job_id = str(uuid.uuid4())
    
    try:
        # Parse scales parameter - handle different input types
        if isinstance(scales, str):
            try:
                # Try to parse the scale list as JSON
                scale_list = json.loads(scales)
                if not isinstance(scale_list, list):
                    scale_list = [str(scale_list)]
            except json.JSONDecodeError:
                # If JSON parsing fails, treat as single scale
                scale_list = [scales]
        elif isinstance(scales, (list, tuple)):
            scale_list = [str(s) for s in scales]
        else:
            # If it's a number or other type, convert to string and put in list
            scale_list = [str(scales)]
        
        valid_factors = (await get_available_models())["factors"]
        # Ensure all scales are strings and valid
        scale_list = [str(s) for s in scale_list if str(s) in valid_factors]
        if not scale_list:
            raise HTTPException(status_code=400, detail=f'No valid scales provided. Must be {valid_factors}')
        
        # Validate resample mode
        valid_resample_modes = (await get_available_models())["resample_modes"]
        if resample_mode not in valid_resample_modes:
            resample_mode = "bicubic"  # Default fallback
            logging.warning(f"Invalid resample mode '{resample_mode}', using default 'bicubic'")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process the uploaded image
        uploaded_img = await process_byte_input(file)
        
        # Initialize job tracking
        state.active_jobs[job_id] = {
            "status": "processing",
            "progress": 0.0,
            "message": "Starting upscale...",
            "scales": scale_list,
            "resample_mode": resample_mode
        }
        
        # Send initial progress
        if show_progress:
            await send_progress_update(job_id, 0.0, "Starting upscale...")
        
        # Process each scale sequentially
        current_img = uploaded_img
        total_scales = len(scale_list)
        
        # Convert to numpy array if it's a PIL Image
        current_img = np.array(current_img) if isinstance(current_img, Image.Image) else current_img
        
        for i, scale in enumerate(scale_list):
            # Get model for this scale
            model = state.get_model(scale, resample_mode)
            
            # Define progress callback
            async def progress_callback(progress: float, message: str):
                # Calculate overall progress
                overall_progress = (i + progress) / total_scales
                state.active_jobs[job_id]["progress"] = overall_progress
                state.active_jobs[job_id]["message"] = f"Iteration {i+1}/{total_scales}: {message}"
                
                if show_progress:
                    await send_progress_update(job_id, overall_progress, state.active_jobs[job_id]["message"])
            
            # Upscale with progress tracking
            if show_progress:
                # Create a synchronous wrapper for the async callback
                def sync_progress_callback(progress: float, message: str):
                    # This will be called from the model's synchronous code
                    # We'll handle this by storing progress in the job state
                    state.active_jobs[job_id]["progress"] = (i + progress) / total_scales
                    state.active_jobs[job_id]["message"] = f"Iteration {i+1}/{total_scales}: {message}"
                    
                result = model.predict_with_progress(
                    current_img,
                    progress_callback=sync_progress_callback
                )
            else:
                result = model.predict(current_img)
            
            # Predict functions return PIL images
            # Ensure result is a numpy array for the next iteration
            # Does not convert for the last iteration which preserves RGBA return format
            if isinstance(result, Image.Image) and i != total_scales - 1:
                current_img = np.array(result)
            else:
                current_img = result
            
            # Send completion message for this iteration
            await progress_callback(1.0, f"Completed scale x{scale}")
        
        
        result_img = current_img
        output_filename = generate_filename(file.filename, scale_list, resample_mode)
        
        # Save image locally
        output_folder = os.path.join('results', 'images')
        os.makedirs(output_folder, mode=0o755, exist_ok=True)
        output_path = os.path.join(output_folder, output_filename)
        result_img.save(output_path)
        
         # Update job status
        state.active_jobs[job_id]["status"] = "completed"
        state.active_jobs[job_id]["progress"] = 1.0
        state.active_jobs[job_id]["message"] = "Image upscaled successfully!"
        state.active_jobs[job_id]["output_file"] = output_path # path on server to result image
        state.active_jobs[job_id]["filename"] = output_filename
        
        # Send final progress update
        if show_progress:
            await send_progress_update(job_id, 1.0, "Image upscaled successfully!")
        
        return {
            "job_id": job_id,
            "status": "completed",
            "message": "Image upscaled successfully!",
            "download_url": f"/download/{job_id}",
            "filename": output_filename
        }
        
    except Exception as e:
        logger.error(f"Error processing upscale request: {e}")
        state.active_jobs[job_id] = {
            "status": "error",
            "message": str(e)
        }
        raise HTTPException(status_code=500, detail=str(e))

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
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
