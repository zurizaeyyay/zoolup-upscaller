#!/bin/zsh

set -e

BACKEND_DIR="backend"
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

# --- Check Python 3.9+ ---
if ! command -v python3 &>/dev/null; then
    echo "Python not found."
    if prompt_install "Python 3.9"; then
        brew install python@3.9
        export PATH="/opt/homebrew/opt/python@3.9/bin:$PATH"
    else
        echo "Skipping Python installation."
    fi
fi

pyver=$(python3 --version 2>&1 | awk '{print $2}')
IFS='.' read -r major minor patch <<< "$pyver"
if [[ "$major" -lt 3 || "$major" -eq 3 && "$minor" -lt 10 ]]; then
    echo "Python version $pyver is less than 3.9."
    if prompt_install "Python 3.9"; then
        brew install python@3.9
        export PATH="/opt/homebrew/opt/python@3.9/bin:$PATH"
    else
        echo "Skipping Python installation."
    fi
else
    echo "Python $pyver detected."
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
            CONDA_ACTIVATE_CMD="$value"
        fi
    done < "$BACKEND_DIR/.env"
fi

echo "CONDA_ACTIVATE_CMD: [$CONDA_ACTIVATE_CMD]"

# --- Install backend requirements unless managed by Conda ---
if [ -z "$CONDA_ACTIVATE_CMD" ] && [ "$CONDA_DEFAULT_ENV" != "upscaller" ]; ; then
    echo "Installing Python backend requirements..."
    python3 -m pip install --no-cache-dir -r "$BACKEND_DIR/requirements.txt"
else
    echo "Skipping pip install because CONDA_ACTIVATE is set."
fi


# --- Install Real-ESRGAN ---
if [ -d "$BACKEND_DIR/Real-ESRGAN" ]; then
    echo "Real-ESRGAN folder found, skipping installation."
else
    echo "Installing Real-ESRGAN..."
    python3 -m pip install --no-cache-dir git+https://github.com/zurizaeyyay/Real-ESRGAN.git
fi

# --- Install frontend dependencies ---
echo "Installing frontend dependencies..."
cd "$FRONTEND_DIR" || exit
if command -v pnpm &>/dev/null; then
    echo "Using pnpm..."
    pnpm install
else
    echo "Using npm..."
    npm install
fi
cd ..

echo "Setup complete."

zsh launch.sh