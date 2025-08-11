@echo off
setlocal enabledelayedexpansion

:: Set backend and frontend paths
set BACKEND_DIR=backend
set FRONTEND_DIR=frontend

:: Initialize CONDA_ACTIVATE_CMD variable empty
set "CONDA_ACTIVATE_CMD="

:: Check if .env exists in backend folder
if exist "%BACKEND_DIR%\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND_DIR%\.env") do (
        if /i "%%A"=="CONDA_ACTIVATE" (
            set "CONDA_ACTIVATE_CMD=%%B"
        )
    )
)

:: Remove possible surrounding quotes (optional)
set CONDA_ACTIVATE_CMD=%CONDA_ACTIVATE_CMD:"=%

:: Start FastAPI server with or without conda environment activation
if defined CONDA_ACTIVATE_CMD (
    echo Using conda activation from .env:
    echo %CONDA_ACTIVATE_CMD%
    start "FastAPI Server" cmd /k "%CONDA_ACTIVATE_CMD% && conda activate upscaller && python -m backend.api_server"
) else (
    echo Running normally through global Python environment...
    start "FastAPI Server" cmd /k "python -m backend.api_server"
)

:: Start frontend
set OPEN_DEVTOOLS=false
start "Frontend Electron" cmd /k "cd %FRONTEND_DIR% && npm run electron-dev"

endlocal