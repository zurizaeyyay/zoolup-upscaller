import os
from pathlib import Path
from dotenv import load_dotenv

#  Load environment variables from .env file (check current dir first, then parent)
current_dir = os.path.dirname(__file__)
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))

# Try to load .env from current directory first
current_dotenv_path = os.path.join(current_dir, ".env")
parent_dotenv_path = os.path.join(parent_dir, ".env")

env_loaded = False

if os.path.exists(current_dotenv_path):
    load_dotenv(current_dotenv_path)
    print(f"Loaded environment variables from: {current_dotenv_path}")
    env_loaded = True
elif os.path.exists(parent_dotenv_path):
    load_dotenv(parent_dotenv_path)
    print(f"Loaded environment variables from: {parent_dotenv_path}")
    env_loaded = True
else:
    print("No .env file found in current or parent directory. Using system environment variables only.")
    

# API settings
API_TITLE = os.getenv("API_TITLE", "Image Upscaler API")
API_VERSION = os.getenv("API_VERSION", "0.1.1")

# Server settings
HOST = os.getenv("HOST", "127.0.0.1")  # Use 0.0.0.0 for cloud deployment
PORT = int(os.getenv("PORT", "8000"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# CORS settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "True").lower() == "true"

# File storage settings
out_dir = os.path.join("results", "images")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", out_dir)
Path(os.path.join(current_dir, OUTPUT_DIR)).mkdir(parents=True, exist_ok=True)