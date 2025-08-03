# To build and test

Prerequisites:
- Install Docker Desktop

1. Build Docker image: (note build time was ~620s on my computer)
    $ docker build -t image_name .
    for forced rebuild $ docker build --no-cache -t image_name .
    
2. Run Container: 
    $ docker run --name upscaller_1 -p 8000:8000 image_name
    on GPU system $ docker run --name upscaller_1 --gpus all -p 8000:8000 image_name
3. Output should have a URL for testing and to check model
    NOTE: If running on windows and with certain browsers. Visit localhost not 0.0.0.0
    Running on http://localhost:8000
4. Backend querying
    ### App
    run the nextjs webpage or electron app using pnpm run dev or pnpm run electron-dev

    ### Manual
    - http://localhost:8000/docs
    Upscaling
    - curl -X POST "http://localhost:8000/upscale" \
        -H "accept: application/json" \
        -F "file=@/path/to/your/image.jpg" \
        -F "scales=[\"2\"]" \
        -F "resample_mode=bicubic" \
        -F "show_progress=true"
    Checking completion
    - curl -X GET "http://localhost:8000/job/<job_id>" -H "accept: application/json"
    Downloading file
    - curl -X GET "http://localhost:8000/download/<job_id>" -o output_image.png

    