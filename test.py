from upscale import process_input, ModelManager
from util_file import file_select_dialog

# Global model manager instance
up_model = ModelManager()
up_model.initialize_model() # defaults to x2

filename = file_select_dialog()
process_input(filename, up_model)
