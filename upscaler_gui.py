import streamlit as st
import numpy as np
import pandas as pd

from util_file import process_byte_input
from util_display import image_frame, load_texture
from upscale import upscale, ModelManager

#TODO: use await asyncio.sleep() instead of time.sleep() for stlite 


MAX_NODES = 5
FACTORS = ["x2", "x4", "x8"]
imageDimmingFactorDefault = 2.0 
IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif']


about_md = """
# Image Enhancer is a simple GUI for upscaling images using RealESRGAN models. 
# It allows users to upload images and apply various upscaling factors.
# Contact me at [github.com/yourusername] or email me at [mailto:john@example.com]
"""

st.set_page_config(
   page_title="Image Enhancer",
   page_icon="🧊",
   #layout="wide",
   initial_sidebar_state="auto",
   #menu_items= {'About': about_md}
)

st.write("Welcome to the Image Upscaler GUI!")

st.sidebar.title("Image Upscaler")
st.sidebar.write("TODO: Add options additional options and author details/links.")
imageDimmingFactor = st.sidebar.slider(
    "Image Dimming Factor",
    min_value=1.0,
    max_value=5.0,
    value=imageDimmingFactorDefault,
    step=0.1
)
st.sidebar.checkbox("Show Image Progress", value=True, key="show_progress")

left_column, right_column = st.columns([0.5, 0.5], gap="medium")

with left_column:
    src_img_display= st.image(np.zeros((100, 100, 3), dtype=np.uint8), caption="Original Image", use_container_width=True, clamp=True)
with right_column:
    res_img_display = st.image(np.zeros((100, 100, 3), dtype=np.uint8)* [0.75, 0.75, 0.75], caption="Result Image", use_container_width=True, clamp=True)

progress_container = st.container()
with progress_container:
    progress_bar_placeholder = st.empty()
    status_text_placeholder = st.empty()


uploaded_file = st.file_uploader("Upload an image", type=IMAGE_FORMATS)

@st.cache_resource
def get_model_manager():
    """Get a cached ModelManager instance"""
    return ModelManager()

@st.cache_data
def get_byte_input(uploaded_file):
    """wrapper for process_byte_input to cache the result"""
    return process_byte_input(uploaded_file)

@st.cache_data
def convert_for_download(img):
    from io import BytesIO
    from PIL import Image
    
    extension = st.session_state['original_filename'].split('.')[-1].lower()
    format_map = {
        'jpg': 'JPEG',
        'jpeg': 'JPEG',
        'png': 'PNG',
        'webp': 'WEBP',
        'bmp': 'BMP',
        'tiff': 'TIFF',
        'gif': 'GIF',
    }
    
    save_format = format_map.get(extension, 'PNG')  # default to PNG if unknown
    
    with BytesIO() as output:
        # Preserve transparency for PNG
        if save_format == 'PNG' and img.mode == 'RGBA':
            img.save(output, format=save_format, optimize=True)
        elif save_format == 'JPEG' and img.mode == 'RGBA':
            # JPEG doesn't support transparency, convert to RGB with white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])  # Use alpha as mask
            background.save(output, format=save_format)
        else:
            img.save(output, format=save_format)
        
        data = output.getvalue()
        
    return data


def build_filename():
    """ caches mime type for download button
        creates a new filename for the downloaded image that has the factors appended e.g image (x2 x4).png 
        caches new filename
        deletes the old filename from session state
    """
    # Cache mime type
    extension = st.session_state['original_filename'].split('.')[-1]
    st.session_state['cached_mime_type'] = f"image/{extension}"
    
    # Create new filename with factors appended
    original_filename = st.session_state['original_filename']
    name_without_ext = '.'.join(original_filename.split('.')[:-1])
    
    # Get selected scales and format them
    selected_scales = st.session_state.get('selected_scales', [])
    factors_str = ' '.join([f"x{scale}" for scale in selected_scales])
    
    # Create new filename
    new_filename = f"{name_without_ext} ({factors_str}).{extension}"
    st.session_state['output_upscaled_filename'] = new_filename
    

def upscale_callback(uploaded_img):
    if uploaded_img is not None:
        import time
         # Get selected scales from radio buttons
        selected_scales = []
        for i in range(st.session_state.iter_num):
            if st.session_state[f"factor_{i}"] is not None:
                selected_scales.append(st.session_state[f"factor_{i}"])
        selected_scales = [s[1:] for s in selected_scales] # remove 'x' prefix
        st.session_state['selected_scales'] = selected_scales
        
        unique_scales = set(selected_scales)
        print(f"Selected scales: {selected_scales} and unique scales: {unique_scales}")
        
        # Initialize model manager
        models = {}
        for i, scale in enumerate(selected_scales):
            models[scale] = get_model_manager()
            models[scale].initialize_model(scale)
        
        # Upscale the image
        # Create progress tracking
        progress_bar = progress_bar_placeholder.progress(0)
        status_text = status_text_placeholder.text("Starting upscale...")
        
        def progress_callback(progress, message):
            """Simple callback - just update UI"""
            progress_bar.progress(progress)
            status_text.text(message)
        
        # Process with progress
        upscaled_img = uploaded_img
        
        for i, scale in enumerate(selected_scales):
            if st.session_state['show_progress']:
                # Use the model manager's predict_with_progress method
                upscaled_img = models[scale].predict_with_progress(
                    np.array(uploaded_img if i == 0 else upscaled_img), 
                    progress_callback=progress_callback
                )
            else:
                upscaled_img = models[scale].predict(np.array(uploaded_img if i == 0 else upscaled_img))
                
            status_text_placeholder.text(f"Finish Upscale Iteration {i+1}/{st.session_state.iter_num} with scale {scale}")
            time.sleep(1)
            
        res_img_display.image(upscaled_img, caption="Upscaled Image", use_container_width=True, clamp=True)
        
        st.session_state['upscaled_result'] = upscaled_img
        st.session_state['processing_complete'] = True
        
        # Clear progress after a brief delay to show completion
        time.sleep(1)
        progress_bar_placeholder.empty()
        status_text_placeholder.success("Image upscaled successfully!")
        
        # Clear success message after a few seconds
        time.sleep(2)
        status_text_placeholder.empty()
    else:
        status_text_placeholder.error("Error with image data")
        

if uploaded_file is not None:
    # Clear previous results if a new file is uploaded
    if 'current_file_id' not in st.session_state or st.session_state['current_file_id'] != uploaded_file.file_id:
        st.session_state['current_file_id'] = uploaded_file.file_id
        st.session_state['processing_complete'] = False
        # Clear previous cached data
        if 'upscaled_result' in st.session_state:
            del st.session_state['upscaled_result']
        if 'original_filename' in st.session_state:
            del st.session_state['original_filename']
        if 'output_upscaled_filename' in st.session_state:
            del st.session_state['output_upscaled_filename']
    
    st.write("filename:", uploaded_file.name)
    if 'original_filename' not in st.session_state:
        st.session_state['original_filename'] = uploaded_file.name

    
    # Process the uploaded file
    uploaded_img = get_byte_input(uploaded_file)
    
    # Display the original image
    src_img_display.image(uploaded_img, caption="Original Image", use_container_width=True,clamp=True)
    
    if not st.session_state['processing_complete']:
        # display greyed out source image in result image area as placeholder
        greyed_out_img = np.array(uploaded_img) / imageDimmingFactor
        greyed_out_img = np.clip(greyed_out_img, 0, 255).astype(np.uint8) # convert image back to int
        res_img_display.image(greyed_out_img, caption="Result Image (Placeholder)", use_container_width=True, clamp=True)
    else:
         # Display the upscaled result
        res_img_display.image(st.session_state['upscaled_result'], caption="Upscaled Image", use_container_width=True, clamp=True)
        
        if 'output_upscaled_filename' not in st.session_state:
            build_filename()
        
        st.download_button(
            label="Download Upscaled Image",
            data= convert_for_download(st.session_state['upscaled_result']),
            file_name=st.session_state['output_upscaled_filename'],
            mime=st.session_state['cached_mime_type'],
            icon=":material/download:",
            key="download_upscaled_image"
        )
    
    if 'completed' not in st.session_state:
        st.session_state['completed'] = False
    if 'iter_num' not in st.session_state:
        st.session_state['iter_num'] = 1
    
    with st.container():
        st.markdown("### Iterations Control")
    st.slider('Number of Iterations', key='iter_num',
            min_value=1, max_value=MAX_NODES,
            on_change=lambda: st.session_state.update({'completed': False}),
            )
    
    iterations_selections = st.columns(st.session_state.iter_num, gap="small")
    for i in range(st.session_state.iter_num):
        with iterations_selections[i]:
            st.radio(
                f"Iteration {i+1}",
                FACTORS,
                index=None,
                key=f"factor_{i}"
            )
        if st.session_state[f"factor_{i}"] is not None and i == st.session_state.iter_num - 1:
            st.session_state['completed'] = True
    st.button("Upscale", 
                 key="upscale_btn", 
                 on_click=upscale_callback, 
                 args=[uploaded_img], 
                 disabled=not st.session_state.completed
                 )

