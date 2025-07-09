import sys
import numpy as np
from PIL import Image
import os
from io import BytesIO

# Accepted image formats for the model
IMAGE_FORMATS = ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')


def process_byte_input(uploaded_file):
    """
    Process an uploaded file (in bytes) and return a PIL Image.
    Preserves transparency
    """
    if uploaded_file is not None:
        # Convert UploadedFile to PIL Image
        image = Image.open(BytesIO(uploaded_file.read()))
        
        # Check transparency and convert if necessary
        if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
            image = image.convert('RGBA')
        else:
            # Convert to RGB for non-transparent images
            image = image.convert('RGB')
        return image
    else:
        raise ValueError("No file uploaded or file is empty.")


# TODO: allow selection of multiple images
def file_select_dialog():
    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()

    file_path = filedialog.askopenfilename()
    return file_path

def import_model():
    try:
        # Try importing RealESRGAN as a pip-installed package
        import RealESRGAN
        print("RealESRGAN imported from pip installation.")
    except ImportError:
        # Fall back to local directory import
        realesrgan_path = os.path.join(os.path.dirname(__file__), 'Real-ESRGAN')
        if realesrgan_path not in sys.path:
            sys.path.insert(0, realesrgan_path)
        try:
            import RealESRGAN
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
    
    session = requests.Session()
    response = session.get(URL, params={"id": fileinx}, stream=True)
    token = get_confirm_token(response)

    if token:
        params = {"id": fileinx, "confirm": token}
        response = session.get(URL, params=params, stream=True)
        
    save_res_data(response, dest)


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
