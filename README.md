Usage:

Prerequistites:
- Install python and the packages in requirments.txt
- Ensure you have CUDA installed and running correctly (optional but CPU upscalling will be slow)
- Install [REAL-ESREGAN](https://github.com/zurizaeyyay/Real-ESRGAN) or I recommend copying that repo into the root

Running the Dev Environment:
- Install the python packages in requirments.txt
- Start the fastAPI server
    - cd to backend folder
    -  `uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload` or `python api_server.py`
- Run the electron/next.js frontend
    - cd to frontend folder
    - pnpm install
    - pnpm run electron-dev

