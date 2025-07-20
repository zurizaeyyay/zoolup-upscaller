"""
Simple test script to verify FastAPI integration
"""
import requests
import json
from pathlib import Path

# Test the API endpoints
API_BASE = "http://127.0.0.1:8000"

def test_health_check():
    """Test if the API is running"""
    try:
        response = requests.get(f"{API_BASE}/")
        print(f"Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_models_endpoint():
    """Test the models endpoint"""
    try:
        response = requests.get(f"{API_BASE}/models")
        print(f"Models endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Available factors: {data['factors']}")
            print(f"Available resample modes: {list(data['resample_modes'].keys())}")
        return response.status_code == 200
    except Exception as e:
        print(f"Models endpoint failed: {e}")
        return False

def test_upscale_endpoint():
    """Test the upscale endpoint with a small image"""
    try:
        # Use the test image
        image_path = Path("IMG_1629.JPG")
        if not image_path.exists():
            print("Test image not found")
            return False
        
        print(f"Testing with image: {image_path}")
        
        # Prepare the request
        with open(image_path, 'rb') as f:
            files = {'file': (image_path.name, f, 'image/jpeg')}
            data = {
                'scales': json.dumps(['2']),  # Just test with 2x scale
                'resample_mode': 'bicubic',
                'show_progress': 'false'  # Disable progress for simple test
            }
            
            print("Sending upscale request...")
            response = requests.post(f"{API_BASE}/upscale", files=files, data=data, timeout=120)
            
        print(f"Upscale response: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Job ID: {result.get('job_id')}")
            print(f"Status: {result.get('status')}")
            print(f"Message: {result.get('message')}")
            print(f"Download URL: {result.get('download_url')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"Upscale test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing FastAPI Image Upscaler Integration...")
    print("=" * 50)
    
    # Run tests
    tests = [
        ("Health Check", test_health_check),
        ("Models Endpoint", test_models_endpoint),
        ("Upscale Endpoint", test_upscale_endpoint),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        result = test_func()
        results.append((test_name, result))
        print(f"Result: {'✅ PASS' if result else '❌ FAIL'}")
    
    print("\n" + "=" * 50)
    print("Test Summary:")
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    print(f"\nOverall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
