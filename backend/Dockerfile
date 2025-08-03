FROM pytorch/pytorch:2.2.2-cuda12.1-cudnn8-runtime

WORKDIR /code

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0

COPY ./requirements.txt /code/requirements.txt

# Install Git for cloning Real-ESRGAN
RUN apt-get update && apt-get install -y git

RUN pip install --no-cache-dir numpy
RUN pip install --no-cache-dir -r /code/requirements.txt

COPY . /code/app

EXPOSE 8000

CMD ["uvicorn", "app.api_server:app", "--host", "0.0.0.0", "--port", "8000"]