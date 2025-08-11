@echo off
setlocal EnableDelayedExpansion

:: --- Check winget first ---
winget --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Winget not found. Please install Winget or install dependencies manually.
    pause
    exit /b 1
)

goto :startSetup

:: --- Function to prompt user ---
:promptInstall
set "installFlag="
:askUser
set /p userInput=Do you want to install %1? (Y/N): 
if /i "!userInput!"=="Y" (
    set installFlag=1
    goto :eof
) else if /i "!userInput!"=="N" (
    set installFlag=0
    goto :eof
) else (
    echo Please enter Y or N.
    goto askUser
)
goto :eof

:startSetup

:: --- Track if restart is needed ---
set "RESTARTED=0"

:: --- Check Python 3.10 or higher ---
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Python not found.
    call :promptInstall Python
    if "!installFlag!"=="1" (
        echo Installing Python 3.10...
        winget install --id Python.Python.3.10 -e --silent
        set "RESTARTED=1"
    ) else (
        echo Skipping Python installation.
    )
) else (
    for /f "tokens=2 delims= " %%v in ('python --version') do (
        set "pyver=%%v"
    )
    for /f "tokens=1,2,3 delims=." %%a in ("!pyver!") do (
        set major=%%a
        set minor=%%b
        set patch=%%c
    )
    if !major! LSS 3 (
        echo Python version is less than 3.
        call :promptInstall Python
        if "!installFlag!"=="1" (
            echo Installing Python 3.10...
            winget install --id Python.Python.3.10 -e --silent
            set "RESTARTED=1"
        ) else (
            echo Skipping Python installation.
        )
    ) else if !major!==3 if !minor! LSS 10 (
        echo Python version less than 3.10.
        call :promptInstall Python
        if "!installFlag!"=="1" (
            echo Installing Python 3.10...
            winget install --id Python.Python.3.10 -e --silent
            set "RESTARTED=1"
        ) else (
            echo Skipping Python installation.
        )
    ) else (
        echo Python !pyver! detected.
    )
)

:: --- Check Git ---
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Git not found.
    call :promptInstall Git
    if "!installFlag!"=="1" (
        echo Installing Git...
        winget install --id Git.Git -e --silent
        set "RESTARTED=1"
    ) else (
        echo Skipping Git installation.
    )
) else (
    echo Git detected.
)

:: --- Check Node.js v22 ---
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Node.js not found.
    call :promptInstall Node.js v22
    if "!installFlag!"=="1" (
        echo Installing Node.js v22...
        winget install OpenJS.NodeJS.LTS -e --silent
        set "RESTARTED=1"
    ) else (
        echo Skipping Node.js installation.
    )
) else (
    for /f "tokens=* delims=v" %%v in ('node --version') do (
        set nodever=%%v
    )
    for /f "tokens=1,2 delims=." %%a in ("!nodever!") do (
        set nodemajor=%%a
        set nodeminor=%%b
    )
    if not "!nodemajor!"=="22" (
        echo Node version is not 22.
        call :promptInstall Node.js v22
        if "!installFlag!"=="1" (
            echo Installing Node.js v22...
            winget install OpenJS.NodeJS.LTS -e --silent
            set "RESTARTED=1"
        ) else (
            echo Skipping Node.js installation.
        )
    ) else (
        echo Node.js v!nodever! detected.
    )
)

:: --- Restart the script if anything was installed ---
if "!RESTARTED!"=="1" (
    echo Restarting script to refresh environment variables...
    start "" cmd /k "%~f0"
    exit /b
)

:: --- Set backend path ---
set "BACKEND_DIR=backend"
set "FRONTEND_DIR=frontend"
set "CONDA_ACTIVATE_CMD="
set "SKIP_PIP=0"
:: --- Read CONDA_ACTIVATE from .env if it exists ---
if exist "%BACKEND_DIR%\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND_DIR%\.env") do (
        if /i "%%A"=="CONDA_ACTIVATE" (
            set "CONDA_ACTIVATE_CMD=%%~B"
        )
    )
)
:: --- Skip if CONDA_ACTIVATE was set in .env ---
if defined CONDA_ACTIVATE_CMD (
    echo Found CONDA_ACTIVATE in .env file, skipping pip install.
    set "SKIP_PIP=1"
)
:: --- Check if conda environment 'upscaller' exists ---
where conda >nul 2>&1
if %ERRORLEVEL%==0 (
    for /f "delims=" %%E in ('conda env list ^| findstr /i "upscaller"') do (
        echo Found Conda environment 'upscaller', skipping pip install.
        set "SKIP_PIP=1"
    )
)
:: --- Run pip install only if neither condition triggered skip ---
if "%SKIP_PIP%"=="0" (
    echo Installing Python backend requirements...
    python -m pip install --no-cache-dir -r "%BACKEND_DIR%\requirements.txt"
)


:: --- Install Real-ESRGAN via pip if not present ---
if exist "backend\Real-ESRGAN" (
    echo Real-ESRGAN folder found in backend, skipping pip install.
) else (
    echo Installing Real-ESRGAN from GitHub...
    python -m pip install --no-cache-dir git+https://github.com/zurizaeyyay/Real-ESRGAN.git
)

:: --- Install frontend dependencies with pnpm or npm ---
echo Installing frontend dependencies...
cd "%FRONTEND_DIR%"
where pnpm >nul 2>&1
if %ERRORLEVEL%==0 (
    echo Using pnpm...
    pnpm install
) else (
    echo pnpm not found, falling back to npm...
    npm install
)
cd ..

echo Setup complete.
pause

call launch.bat
