Usage:

Prerequistites:
- Install python and the packages in requirments.txt
- Ensure you have CUDA installed and running correctly (optional but CPU upscalling will be slow)
- Install [REAL-ESREGAN](https://github.com/zurizaeyyay/Real-ESRGAN) or I recommend copying that repo into the root

Running the Dev Environment:
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

