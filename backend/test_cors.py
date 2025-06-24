#!/usr/bin/env python3
"""
Simple test script to verify the unified voice API is working properly
"""

import requests
import json

def test_api_endpoint():
    """Test the API root endpoint"""
    try:
        response = requests.get("http://localhost:8000/")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response: {response.json()}")
        return True
    except Exception as e:
        print(f"Error testing API: {e}")
        return False

def test_cors_headers():
    """Test CORS headers with OPTIONS request"""
    try:
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        
        response = requests.options("http://localhost:8000/enroll", headers=headers)
        print(f"OPTIONS Status Code: {response.status_code}")
        print(f"CORS Headers: {dict(response.headers)}")
        
        # Check for required CORS headers
        cors_headers = [
            'access-control-allow-origin',
            'access-control-allow-methods', 
            'access-control-allow-headers'
        ]
        
        for header in cors_headers:
            if header in response.headers:
                print(f"✓ {header}: {response.headers[header]}")
            else:
                print(f"✗ Missing header: {header}")
                
        return True
    except Exception as e:
        print(f"Error testing CORS: {e}")
        return False

if __name__ == "__main__":
    print("Testing Unified Voice API...")
    print("=" * 50)
    
    print("\n1. Testing API Root Endpoint:")
    test_api_endpoint()
    
    print("\n2. Testing CORS Headers:")
    test_cors_headers()
    
    print("\n" + "=" * 50)
    print("Test completed!") 