"""
# upscale.py
This module provides functionality to upscale images using the RealESRGAN model.
Wrapper for the RealESRGAN model to handle image upscaling, including support for RGBA images.
Includes methods for command line usage
"""

from PIL import Image
import numpy as np
import io
import tarfile
import sys
import os
from io import BytesIO
from util_file import import_model


# Directory to store model weights. Set to app root/weights
WEIGHTS_DIR = "weights"

# Accepted image formats for the model
IMAGE_FORMATS = ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')

class ModelManager:
    def __init__(self):
        self.model = None
        self.current_scale = None
        self.current_resample_mode = None
        self.device = None
        
    
    def initialize_model(self, scale="2", use_attention=False, resample_mode='bicubic'):
        # Check if we need to reinitialize due to different parameters
        needs_reinit = (
            self.model is None or 
            self.current_scale != scale or 
            self.current_resample_mode != resample_mode
        )
        
        if not needs_reinit:
            return  # Already initialized with correct parameters
            
        import torch
        import_model()
        
        from RealESRGAN import RealESRGAN
        
        print(f'Initializing model with scale x{scale}, resample mode: {resample_mode}...')
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print('Device:', self.device)
        
        # Ensure weights directory exists
        os.makedirs(WEIGHTS_DIR, mode=0o777, exist_ok=True)
        
        weights_path = self._get_weights_path(scale)
        
        # Load model
        self.model = RealESRGAN(self.device, scale=int(scale), use_attention=use_attention, resample_mode=resample_mode)
        self.model.load_weights(weights_path)
        self.current_scale = scale
        self.current_resample_mode = resample_mode
        
        print(f"Model loaded with scale x{scale}, resample mode: {resample_mode}")
    
    def _get_weights_path(self, scale):
        """Get the path where weights should be stored"""
        return os.path.join(WEIGHTS_DIR, f"RealESRGAN_x{scale}.pth")
       
    def update_resample_mode(self, resample_mode):
        """Update resample mode without reinitializing the entire model"""
        if self.model is not None:
            self.model.set_resample_mode(resample_mode)
            self.current_resample_mode = resample_mode
        else:
            print("Model not initialized. Call initialize_model() first.")
    
    def get_available_resample_modes(self):
        """Get list of available resample modes"""
        return ['nearest', 'linear', 'bilinear', 'bicubic', 'trilinear', 'area', 'nearest-exact']
    
    
    def predict(self, image_input):
        if self.model is None:
            raise RuntimeError("Model not initialized. Call initialize_model() first.")
        
        # Convert PIL Image to numpy array if needed
        if isinstance(image_input, Image.Image):
            image_array = np.array(image_input)
        else:
            image_array = image_input
        
        # Handle different image modes
        if len(image_array.shape) == 3 and image_array.shape[2] == 4:
            # RGBA image - process RGB and Alpha separately
            return self._predict_rgba(image_array)
        else:
            # RGB image - process normally
            return self.model.predict(image_array)
    
    def _predict_rgba(self, rgba_array):
        """Handle RGBA images by processing RGB and Alpha separately"""
        # Separate channels
        rgb_array = rgba_array[:, :, :3]
        alpha_array = rgba_array[:, :, 3]
        
        # Upscale RGB
        upscaled_rgb = self.model.predict(lr_image=rgb_array)
        upscaled_rgb = np.array(upscaled_rgb)
        
        # Upscale Alpha (convert to 3-channel temporarily)
        alpha_3ch = np.stack([alpha_array, alpha_array, alpha_array], axis=-1)
        upscaled_alpha_3ch = self.model.predict(lr_image=alpha_3ch)
        upscaled_alpha = np.array(upscaled_alpha_3ch)[:, :, 0]
        
        # Combine results
        upscaled_rgba = np.dstack([
            upscaled_rgb[:, :, 0],
            upscaled_rgb[:, :, 1], 
            upscaled_rgb[:, :, 2],
            upscaled_alpha
        ])
        
        return Image.fromarray(upscaled_rgba.astype(np.uint8), 'RGBA')
    
    def predict_with_progress(self, image_input, progress_callback=None):
        """Predict with progress tracking"""
        if self.model is None:
            raise RuntimeError("Model not initialized. Call initialize_model() first.")
        
        # Convert PIL Image to numpy array if needed
        if isinstance(image_input, Image.Image):
            image_array = np.array(image_input)
        else:
            image_array = image_input
        
        # Check if RGBA
        if len(image_array.shape) == 3 and image_array.shape[2] == 4:
            return self._predict_rgba_with_progress(image_array, progress_callback)
        else:
            return self.model.predict_with_progress(lr_image=image_array, progress_callback=progress_callback)
        
    def _predict_rgba_with_progress(self, rgba_array, progress_callback):
        """Handle RGBA with progress tracking"""
        # Separate channels
        rgb_array = rgba_array[:, :, :3]
        alpha_array = rgba_array[:, :, 3].copy()
        
        # Update progress
        if progress_callback:
            progress_callback(0.1, "Processing RGB channels...")
        
        # Upscale RGB
        upscaled_rgb = self.model.predict_with_progress(lr_image=rgb_array, progress_callback=progress_callback)
        upscaled_rgb = np.array(upscaled_rgb)
        
        if progress_callback:
            progress_callback(0.8, "Processing alpha channel...")
        
        # Upscale Alpha
        alpha_3ch = np.stack([alpha_array, alpha_array, alpha_array], axis=-1)
        upscaled_alpha_3ch = self.model.predict(lr_image=alpha_3ch)
        upscaled_alpha = np.array(upscaled_alpha_3ch)[:, :, 0]
        
        if progress_callback:
            progress_callback(0.95, "Combining channels...")
        
        # Combine results
        upscaled_rgba = np.dstack([
            upscaled_rgb[:, :, 0],
            upscaled_rgb[:, :, 1],
            upscaled_rgb[:, :, 2],
            upscaled_alpha
        ])
        
        if progress_callback:
            progress_callback(1.0, "Complete!")
        
        return Image.fromarray(upscaled_rgba.astype(np.uint8), 'RGBA')
    
def upscale(img_input, model, output_path=None):
    """
    Upscale an image using RealESRGAN
    
    Args:
        img_input: PIL Image object or file path string
        output_path: Optional output file path
    
    Returns:
        PIL Image if output_path is None, otherwise saves to file
    """
    # TODO: Remove model data from device after afk
    if isinstance(img_input, str):
        img_base = Image.open(img_input).convert('RGB')
    else:
        img_base = img_input.convert('RGB') if img_input.mode != 'RGB' else img_input
        
    img_up = model.predict(np.array(img_base))
    
    if output_path:
        img_up.save(output_path)
        print(f'Finished! Image saved to {output_path}')
        return None
    else:
        return img_up


#######################################################################
## Input Processing 

def process_input(filename, model, output_path=None):
    
    # TODO: Allow user selection of output directory (default to image directory)
    output_folder = os.path.dirname(filename)
    result_image_path = output_path
    
    # if multiple files are tared or multiple files selected in file input
    if tarfile.is_tarfile(filename):
        if output_path is None:
            result_image_path = os.path.join(output_folder, 'results', os.path.basename(filename))
            os.makedirs(os.path.join(output_folder, 'results'), mode=0o777, exist_ok=True)
        process_tar(filename, model, result_image_path)
        
    else:
        os.makedirs(os.path.join(output_folder), mode=0o777, exist_ok=True)
        if output_path is None:
            result_image_path = os.path.join(output_folder, "new_" + os.path.basename(filename))
        
        upscale(filename, model, result_image_path)


def process_tar(path_to_tar, model, output_path):
    processing_tar = tarfile.open(path_to_tar, mode='r')
    save_tar = tarfile.open(output_path, 'w')

    for c, item in enumerate(processing_tar):
        
        print(f'{c}, processing {item.name}')
        # iterate through the archive, skip memeber that cannot be processed
        if not item.name.endswith(IMAGE_FORMATS):
            continue

        try:
            # extract current item as bytestream, read bytes then load into memory buff (bytesio)
            img_bytes = BytesIO(processing_tar.extractfile(item.name).read())
            img_base = Image.open(img_bytes, mode='r').convert('RGB')
        
            img_up = upscale(img_base, model)
            
            # adding to new tar archive
            img_tar_info, fp = image_to_tar_format(img_up, item.name)
            save_tar.addfile(img_tar_info, fp)
        except Exception as err:
            print(f'Unable to process file {item.name}, skipping')
            continue

    processing_tar.close()
    save_tar.close()
    print(f'Finished! Archive saved to {output_path}')

# Saves the upscaled image to a buffer in a compatible format
# Rerturns img tar info and buffered file pointer
def image_to_tar_format(img, image_name):
    buff = BytesIO()
    if '.png' in image_name.lower():
        img = img.convert('RGBA')
        img.save(buff, format='PNG')
    else:
        img.save(buff, format='JPEG')
    buff.seek(0)
    fp = io.BufferedReader(buff)
    img_tar_info = tarfile.TarInfo(name=image_name)
    img_tar_info.size = len(buff.getvalue())
    return img_tar_info, fp


    
    
    
