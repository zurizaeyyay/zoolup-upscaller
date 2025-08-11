# Quick Setup:
1. Clone or download this repo
2. Use the setup script to automatically install the required prerequistites
### Windows
- Click the **setup.bat** file in the root and then press enter to run the app
-  or
- if prerequisities are installed you can try running the **launch.bat** in the root
### MacOS
- Run the **setup.sh** file in the project root. run `chmod +x setup.sh` if it won't launch
-  or
- if prerequisities are installed you can try running the **launch.sh**. Run `chmod +x launch.sh` if it won't launch

# Prerequistites:
- Clone or download this repo
- Install [python 3.10](https://www.python.org/downloads/release/python-3108/)
- Install [REAL-ESREGAN](https://github.com/zurizaeyyay/Real-ESRGAN) via the command `pip install git+https://github.com/zurizaeyyay/Real-ESRGAN.git` WARNING: Install git first
  or you can copy that repo folder into the backend folder instead
- Install [node.js](https://nodejs.org/en/download) (i am using v22)
- (optional) Ensure you have [CUDA](https://developer.nvidia.com/cuda-downloads?target_os=Windows&target_arch=x86_64&target_version=11&target_type=exe_local) installed and running correctly for GPU upscalling (if you have an NVIDIA GPU) 
- (optional) install [pnpm](https://pnpm.io/installation). If not dev inclined run all commands that say `pnpm` with `npm` instead (this one is already installed for you above)


# Running the Dev Environment Manually:
- Install the python packages in requirments.txt (optionally inside a virtual environment)
    - `pip install --no-cache-dir -r /code/requirements.txt`
- Start the fastAPI server
    -  `uvicorn backend.api_server:app --host 127.0.0.1 --port 8000 --reload` or `python -m backend.api_server`
    or 
    - cd to backend
    - ensure docker is installed and image built (see backend readme for instructions)
    - run `docker run --name container_name -p 8000:8000 image_name`
- Run the electron/next.js frontend
    - cd to frontend folder
    - pnpm install
    - pnpm run electron-dev
