# Trying it out

1. See the releases area
2. Download the file for your system
3. Let me know if you enjoyed or have feedback :)

# Dev Instructions:

## Quick Setup

1. Clone or download this repo
2. Use the setup script to automatically install the required prerequistites

### Windows

-   Click the **setup.bat** file in the root and then press enter to run the app
    or
-   if prerequisities are installed you can try running the **launch.bat** in the root

### MacOS

-   Note: if you dont want the dependancies and python 3.12 installed globalled created a
    conda env called "upscaller" with python 3.12 installed
-   Open the terminal and run **./setup.sh** file in the project root
    or
-   if prerequisities are installed you can try running the **./launch.sh**

# Prerequistites:

-   Clone or download this repo
-   Install [python 3.10](https://www.python.org/downloads/release/python-3108/)
-   Install [REAL-ESREGAN](https://github.com/zurizaeyyay/Real-ESRGAN) via the command `pip install git+https://github.com/zurizaeyyay/Real-ESRGAN.git` WARNING: Install git first
    or you can copy that repo folder into the backend folder instead
-   Install [node.js](https://nodejs.org/en/download) (i am using v22)
-   (optional) Ensure you have [CUDA](https://developer.nvidia.com/cuda-downloads?target_os=Windows&target_arch=x86_64&target_version=11&target_type=exe_local) installed and running correctly for GPU upscalling (if you have an NVIDIA GPU)
-   (optional) install [pnpm](https://pnpm.io/installation). If not dev inclined run all commands that say `pnpm` with `npm` instead (this one is already installed for you above)

## Running the Dev Environment Manually:

-   Install the python packages in requirments.txt (optionally inside a virtual environment)
    -   `pip install --no-cache-dir -r /code/requirements.txt`
-   Start the fastAPI server
    -   `uvicorn backend.api_server:app --host 127.0.0.1 --port 8000 --reload` or `python -m backend.api_server`
        or
    -   cd to backend
    -   ensure docker is installed and image built (see backend readme for instructions)
    -   run `docker run --name container_name -p 8000:8000 image_name`
-   Run the electron/next.js frontend
    -   cd to frontend folder
    -   pnpm install
    -   pnpm run electron-dev

# Production Build Process:

## Prerequisites for Building:

-   Complete the "Quick Setup" or "Manual Setup" above first
-   Install PyInstaller: `pip install pyinstaller`
-   Ensure you're in the `upscaller` conda environment (if using conda)

### 1. Create Standalone Backend

Note: I had import issues when containerizing the backend with docker. I found python module entry to the backend the best way and so calling backend.api_server is required to start the backend.
However pyinstaller doesn't like this so I use an entry wrapper py file and also a wrapper folder. This ensured Docker, Pyinstaller, VScode tasks and dev runs are all compatible with each other.

```bash
# Navigate to backend-wrap directory
cd backend-wrap

# Create standalone executable via the pyinstaller spec file.
pyinstaller .\fastapiApp.spec

# Copy the standalone backend to frontend resources
cp -r dist/upscaler-backend.exe ../frontend/resources/backends/Win/x64
cp -r dist/upscaler-backend.exe ../frontend/resources/backends/Win/arm
cp -r dist/upscaler-backend.exe ../frontend/resources/backends/Apple/arm
cp -r dist/upscaler-backend.exe ../frontend/resources/backends/Apple/x64
cp -r dist/upscaler-backend.exe ../frontend/resources/backends/Linux
```

### 2. Build Electron App

```bash
# Navigate to frontend directory
cd frontend

# Generate icons (Mac only, first time) NOTE: Script will install imagemagick via brew
cd public && ./generate_icons.sh && cd ..

# Install dependencies
pnpm install

# Build for your platform
pnpm run electron-pack-mac     # Mac only
pnpm run electron-pack-win     # Windows only
pnpm run electron-pack-linux   # Linux only
pnpm run electron-pack-all     # All platforms

# Output will be in frontend/dist/
```

### 3. Platform-Specific Notes:

**Mac:**

-   For distribution, Apple Developer account needed for code signing
-   Universal builds (Intel + Apple Silicon) are created automatically
-   Output: `.dmg` installer and `.zip` archive

**Windows:**

-   Output: `.exe` installer and `.zip` archive
-   Installer includes desktop shortcut and start menu entry

**Linux:**

-   Output: `.AppImage` and `.tar.gz` archive
-   AppImage is portable, no installation required
