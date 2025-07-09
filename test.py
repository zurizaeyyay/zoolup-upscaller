from upscale import process_input, ModelManager
from util_file import file_select_dialog, build_filename

# Global model manager instance
up_model = ModelManager()

up_model.initialize_model() # defaults to x2

filename = file_select_dialog()

outputpath = build_filename(filename)  # Change 'x2' to the desired scale factor

process_input(filename, up_model, output_path=outputpath)
