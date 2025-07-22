import os
import subprocess
from dotenv import load_dotenv

# Load environment variables from the .env file in the parent directory
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
dotenv_path = os.path.join(parent_dir, ".env")
load_dotenv(dotenv_path)

# Function to execute a shell command with environment variables
def run_task(command):
    try:
        result = subprocess.run(
            command,
            shell=True,
            env=os.environ,  # Pass the loaded environment variables
            text=True,
            capture_output=True
        )
        if result.returncode == 0:
            print(result.stdout)
        else:
            print(f"Error: {result.stderr}")
    except Exception as e:
        print(f"Exception occurred: {e}")

# Example usage
if __name__ == "__main__":
    # Replace 'echo $MY_VARIABLE' with your desired command
    run_task("echo $MY_VARIABLE")