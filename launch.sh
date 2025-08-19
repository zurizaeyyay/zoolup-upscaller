#!/bin/zsh

BACKEND_DIR="backend-wrap\backend"
FRONTEND_DIR="frontend"
CONDA_ACTIVATE_CMD=""
BACKEND_PID=""
FRONTEND_PID=""

# Function to kill existing processes
cleanup_existing_processes() {
  echo "Checking for existing processes..."
  
  # Kill existing backend servers
  pkill -f "api_server" 2>/dev/null && echo "Killed existing backend server"
  
  # Kill existing Electron processes
  pkill -f "electron" 2>/dev/null && echo "Killed existing Electron app"
  
  # Wait a moment for processes to terminate
  sleep 2
}

# Function to cleanup on script exit
cleanup_on_exit() {
  echo "Cleaning up processes..."
  if [[ -n "$BACKEND_PID" ]]; then
    kill $BACKEND_PID 2>/dev/null
  fi
  if [[ -n "$FRONTEND_PID" ]]; then
    kill $FRONTEND_PID 2>/dev/null
  fi
  pkill -f "api_server" 2>/dev/null
  pkill -f "electron" 2>/dev/null
  echo "Cleanup complete."
  exit 0
}

# Set up signal handlers for cleanup
trap cleanup_on_exit SIGINT SIGTERM

# Cleanup any existing processes first
cleanup_existing_processes

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



# Dynamically find and source conda profile script, then activate upscaller env
CONDA_BASE=$(conda info --base)
CONDA_PROFILE="$CONDA_BASE/etc/profile.d/conda.sh"

if [[ -n "$CONDA_ACTIVATE_CMD" ]]; then
  echo "Using conda activation from .env:"
  echo "$CONDA_ACTIVATE_CMD"
  nohup zsh -c "source $CONDA_PROFILE && $CONDA_ACTIVATE_CMD && python -m backend-wrap.backend.api_server" > backend_server.log 2>&1 &
  BACKEND_PID=$!
  echo "Backend started with PID: $BACKEND_PID"
elif [[ -f "$CONDA_PROFILE" ]]; then
  echo "Sourcing conda profile and activating 'upscaller' environment."
  nohup zsh -c "source $CONDA_PROFILE && conda activate upscaller && python -m backend-wrap.backend.api_server" > backend_server.log 2>&1 &
  BACKEND_PID=$!
  echo "Backend started with PID: $BACKEND_PID"
else
  echo "Conda profile script not found. Running normally through global Python environment..."
  nohup python -m backend-wrap.backend.api_server > backend_server.log 2>&1 &
  BACKEND_PID=$!
  echo "Backend started with PID: $BACKEND_PID"
fi

# Start frontend Electron app
export OPEN_DEVTOOLS=false
if cd "$FRONTEND_DIR"; then
  npm run electron-dev &
  FRONTEND_PID=$!
  echo "Frontend Electron app started with PID: $FRONTEND_PID"
else
  echo "Error: Could not change to frontend directory"
fi

echo "Launch script finished."
echo "Press Ctrl+C to stop all processes."

# Wait for processes to finish (or be interrupted)
wait
