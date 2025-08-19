import sys
import numpy as np
from PIL import Image
import os
from io import BytesIO

# Accepted image formats for the model
IMAGE_FORMATS = ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')


async def process_byte_input(uploaded_file):
    """
    Process an uploaded file (in bytes) and return a PIL Image.
    Preserves transparency
    """
    if uploaded_file is not None:
        # Convert UploadedFile to PIL Image
        file_content = await uploaded_file.read()
        image = Image.open(BytesIO(file_content))
        
        # Check transparency and convert if necessary
        if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
            image = image.convert('RGBA')
        else:
            # Convert to RGB for non-transparent images
            image = image.convert('RGB')
        return image
    else:
        raise ValueError("No file uploaded or file is empty.")

# Generate output filename        
def generate_filename(filename, scale_list, resample_mode):
    
    extension = filename.split('.')[-1]
    name_without_ext = '.'.join(filename.split('.')[:-1])
    
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


def import_model():
    # Fall back to local directory import
    realesrgan_path = os.path.join(os.path.dirname(__file__), 'Real-ESRGAN')
    if realesrgan_path not in sys.path:
        sys.path.insert(0, realesrgan_path)
    try:
        import RealESRGAN # type: ignore
        print("RealESRGAN imported from local directory.")
    except ImportError:
        raise ImportError("RealESRGAN not found. Please install it via pip or place it in the 'Real-ESRGAN' directory.")



# NOTE: Only works for small files. Use huggingface if possible
def download_gdrive_weights(URL, fileinx, dest):
    """ Download a file from Google Drive using its file ID.
    Args:
        URL (str): The base URL for Google Drive file downloads.
        fileinx (str): The file ID from Google Drive.
        dest (str): The destination path where the file will be saved.
    """
    import sys
    import requests
    
    def get_confirm_token(res):
        for key, value in res.cookies.items():
            if key.startswith("download_warning"):
                return value

        return None
    def save_res_data(res, dest):
        CHUNK_SIZE = 32768

        with open(dest, "wb") as f:
            for chunk in res.iter_content(CHUNK_SIZE):
                if chunk:  # filter out keep-alive new chunks
                    f.write(chunk)

    
    
    session = requests.Session()
    response = session.get(URL, params={"id": fileinx}, stream=True)
    token = get_confirm_token(response)

    if token:
        params = {"id": fileinx, "confirm": token}
        response = session.get(URL, params=params, stream=True)
        
    save_res_data(response, dest)

