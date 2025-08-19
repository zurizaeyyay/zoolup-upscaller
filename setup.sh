#!/bin/zsh

set -e

BACKEND_DIR="backend-wrap\backend"
FRONTEND_DIR="frontend"
CONDA_ACTIVATE_CMD=""

prompt_install() {
    local pkg="$1"
    while true; do
        read -rp "Do you want to install $pkg? (Y/N): " yn
        case $yn in
            [Yy]* ) return 0 ;;
            [Nn]* ) return 1 ;;
            * ) echo "Please answer Y or N." ;;
        esac
    done
}

# --- Check for Homebrew ---
if ! command -v brew &>/dev/null; then
    echo "Homebrew not found. Please install Homebrew first: https://brew.sh/"
    exit 1
fi

# --- Check for conda environment and Python version ---
PYTHON_CMD="python3"
PYTHON_VERSION=""
CONDA_ENV_PYTHON=""

# First, try to find and source conda profile
if command -v conda &>/dev/null; then
    CONDA_BASE=$(conda info --base 2>/dev/null)
    CONDA_PROFILE="$CONDA_BASE/etc/profile.d/conda.sh"
    if [[ -f "$CONDA_PROFILE" ]]; then
        source "$CONDA_PROFILE"
        
        # Check if we're already in upscaller environment or if it exists
        if [[ "$CONDA_DEFAULT_ENV" == "upscaller" ]]; then
            echo "Already in 'upscaller' conda environment"
            PYTHON_CMD="python"
            CONDA_ENV_PYTHON="yes"
        elif conda env list | grep -q "upscaller"; then
            echo "Found 'upscaller' conda environment, activating..."
            conda activate upscaller
            PYTHON_CMD="python"
            CONDA_ENV_PYTHON="yes"
        fi
    fi
fi

# Check Python version (either from conda env or system)
if [[ "$CONDA_ENV_PYTHON" == "yes" ]]; then
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
    echo "Checking Python version in conda environment: $PYTHON_VERSION"
else
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo "Checking system Python version: $PYTHON_VERSION"
fi

IFS='.' read -r major minor patch <<< "$PYTHON_VERSION"
if [[ "$major" -lt 3 || ("$major" -eq 3 && "$minor" -lt 9) || ("$major" -eq 3 && "$minor" -gt 12) ]]; then
    if [[ "$CONDA_ENV_PYTHON" == "yes" ]]; then
        echo "Python version $PYTHON_VERSION in conda environment is outside the recommended range (3.9-3.12)."
        echo "Consider recreating your conda environment with a compatible Python version."
    else
        echo "System Python version $PYTHON_VERSION is outside the recommended range (3.9-3.12)."
        if prompt_install "Python 3.12"; then
            brew install python@3.12
            export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"
        else
            echo "Skipping Python installation."
        fi
    fi
else
    if [[ "$CONDA_ENV_PYTHON" == "yes" ]]; then
        echo "Python $PYTHON_VERSION in conda environment is compatible (within range 3.9-3.12)."
    else
        echo "System Python $PYTHON_VERSION detected (within recommended range 3.9-3.12)."
    fi
fi

# --- Check Git ---
if ! command -v git &>/dev/null; then
    echo "Git not found."
    if prompt_install "Git"; then
        brew install git
    else
        echo "Skipping Git installation."
    fi
else
    echo "Git detected."
fi

# --- Check Node.js v22 ---
if ! command -v node &>/dev/null; then
    echo "Node.js not found."
    if prompt_install "Node.js v22"; then
        brew install node@22
        export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
    else
        echo "Skipping Node.js installation."
    fi
else
    nodever=$(node -v | sed 's/v//')
    nodemajor=$(echo "$nodever" | cut -d. -f1)
    if [[ "$nodemajor" != "22" ]]; then
        echo "Node version is $nodever (not 22)."
        if prompt_install "Node.js v22"; then
            brew install node@22
            export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
        else
            echo "Skipping Node.js installation."
        fi
    else
        echo "Node.js v$nodever detected."
    fi
fi

# --- Check for CONDA_ACTIVATE in .env ---
if [ -f "$BACKEND_DIR/.env" ]; then
    while IFS='=' read -r key value; do
        if [[ "$key" == "CONDA_ACTIVATE" ]]; then
            CONDA_ACTIVATE_CMD=${value//\"/}  # remove quotes if any
        fi
    done < "$BACKEND_DIR/.env"
fi

echo "CONDA_ACTIVATE_CMD: [$CONDA_ACTIVATE_CMD]"

# --- Install backend requirements unless managed by Conda ---
if [ -z "$CONDA_ACTIVATE_CMD" ] && [ "$CONDA_DEFAULT_ENV" != "upscaller" ] && [ "$CONDA_ENV_PYTHON" != "yes" ]; then
    echo "Installing Python backend requirements using system Python..."
    python3 -m pip install --no-cache-dir -r "$BACKEND_DIR/requirements.txt"
elif [ "$CONDA_ENV_PYTHON" = "yes" ]; then
    echo "Installing Python backend requirements in conda environment..."
    python -m pip install --no-cache-dir -r "$BACKEND_DIR/requirements.txt"
else
    echo "Skipping pip install because CONDA_ACTIVATE is set or already in upscaller environment."
fi


# --- Install Real-ESRGAN ---
if [ -d "$BACKEND_DIR/Real-ESRGAN" ]; then
    echo "Real-ESRGAN folder found, skipping installation."
else
    echo "Installing Real-ESRGAN..."
    if [ "$CONDA_ENV_PYTHON" = "yes" ] || [ "$CONDA_DEFAULT_ENV" = "upscaller" ] || [ -n "$CONDA_ACTIVATE_CMD" ]; then
        python -m pip install --no-cache-dir git+https://github.com/zurizaeyyay/Real-ESRGAN.git
    else
        python3 -m pip install --no-cache-dir git+https://github.com/zurizaeyyay/Real-ESRGAN.git
    fi
fi

# --- Install frontend dependencies ---
echo "Installing frontend dependencies..."
if cd "$FRONTEND_DIR"; then
    if command -v pnpm &>/dev/null; then
        echo "Using pnpm..."
        pnpm install
    else
        echo "Using npm..."
        npm install
    fi
    cd ..
else
    echo "Error: Could not change to frontend directory"
    exit 1
fi

echo "Setup complete."

# Launch the application
echo "Launching application..."
zsh launch.sh