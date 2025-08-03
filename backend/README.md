# To build and test

1. Build Docker image: (note build time was ~620s on my computer)
    $ docker build -t image_name .
2. Run Container: 
    $ docker run --name container_name -p 8000:8000 image_name
3. Output should have a URL for testing and to check model
    Running on http://0.0.0.0:8000
4. Backend querying
    - http://0.0.0.0:8000/docs
    Upscaling
    - curl -X POST "http://0.0.0.0:8000/upscale" \
        -H "accept: application/json" \
        -F "file=@/path/to/your/image.jpg" \
        -F "scales=[\"2\"]" \
        -F "resample_mode=bicubic" \
        -F "show_progress=true"
    Checking completion
    - curl -X GET "http://0.0.0.0:8000/job/<job_id>" -H "accept: application/json"
    Downloading file
    - curl -X GET "http://0.0.0.0:8000/download/<job_id>" -o output_image.png

    