from PIL import Image
import numpy as np

image_frame = { "width": 600, "height": 400 }


# Function to load an image and create a texture
def load_texture(image_path):
    image = Image.open(image_path).convert("RGBA")  # Ensure image is in RGBA format
    width, height = image.size
    img_thumb = image.resize((image_frame["width"], image_frame["height"]), Image.LANCZOS)
    image_data = np.array(img_thumb, dtype=np.float32) / 255.0  # Normalize pixel values
    image_data = image_data.flatten()  # Flatten the image data for Dear PyGui
    
    return image_data
