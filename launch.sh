#!/bin/zsh

BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
CONDA_ACTIVATE_CMD=""

# Read CONDA_ACTIVATE from .env if it exists
if [[ -f "$BACKEND_DIR/.env" ]]; then
  while IFS='=' read -r key value; do
    if [[ "$key" == "CONDA_ACTIVATE" ]]; then
      CONDA_ACTIVATE_CMD=${value//\"/}  # remove quotes if any
      break
    fi
  done < "$BACKEND_DIR/.env"
fi

echo "CONDA_ACTIVATE_CMD: [$CONDA_ACTIVATE_CMD]"

# Start FastAPI server with or without conda environment activation
if [[ -n "$CONDA_ACTIVATE_CMD" ]]; then
  echo "Using conda activation from .env:"
  echo "$CONDA_ACTIVATE_CMD"
  # Run in background, activate conda env, then start server
  nohup zsh -c "conda activate upscaller && python -m backend.api_server" > backend_server.log
   2>&1 &
elif zsh -c "conda activate upscaller && echo 'activated'" >/dev/null 2>&1; then
  echo "Conda environment 'upscaller' found and activated."
  nohup zsh -c "conda activate upscaller && python -m backend.api_server" > backend_server.log 2>&1 &
else
  echo "Running normally through global Python environment..."
  nohup python -m backend.api_server > backend_server.log 2>&1 &
fi

# Start frontend Electron app
export OPEN_DEVTOOLS=false
cd "$FRONTEND_DIR" || exit
npm run electron-dev &

echo "Launch script finished."
