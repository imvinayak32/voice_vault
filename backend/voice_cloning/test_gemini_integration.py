import requests
import os
import base64

def test_gemini_voice_cloning():
    """Test the Gemini-integrated voice cloning API endpoint"""
    
    # API endpoint
    url = "http://localhost:8000/clone-voice"
    
    # Use one of the sample files
    audio_file_path = "samples/1320_00000.mp3"
    
    if not os.path.exists(audio_file_path):
        print(f"Error: Sample file {audio_file_path} not found")
        return
    
    # Test question that will be sent to Gemini
    test_question = "What is artificial intelligence and how does it work?"
    
    # Prepare the request
    files = {
        'audio_file': ('test_audio.mp3', open(audio_file_path, 'rb'), 'audio/mpeg')
    }
    data = {
        'question': test_question
    }
    
    try:
        print("Testing Gemini AI + Voice Cloning API...")
        print(f"Using reference audio: {audio_file_path}")
        print(f"Question for Gemini: '{test_question}'")
        
        # Make the request
        response = requests.post(url, files=files, data=data)
        
        if response.status_code == 200:
            # Save the generated audio
            output_file = "gemini_voice_output.wav"
            with open(output_file, 'wb') as f:
                f.write(response.content)
            
            # Get Gemini response from headers
            gemini_response = response.headers.get('X-Gemini-Response', 'No response found')
            original_question = response.headers.get('X-Original-Question', 'No question found')
            
            print(f"✅ Success! Generated audio saved as: {output_file}")
            print(f"File size: {len(response.content)} bytes")
            print(f"📝 Gemini's answer: {gemini_response}")
            print(f"❓ Original question: {original_question}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API. Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    finally:
        files['audio_file'][1].close()

def test_gemini_json_endpoint():
    """Test the JSON endpoint that returns both text and audio"""
    
    # API endpoint
    url = "http://localhost:8000/ask-and-speak-json"
    
    # Use one of the sample files
    audio_file_path = "samples/1320_00000.mp3"
    
    if not os.path.exists(audio_file_path):
        print(f"Error: Sample file {audio_file_path} not found")
        return
    
    # Test question that will be sent to Gemini
    test_question = "Explain machine learning in simple terms"
    
    # Prepare the request
    files = {
        'audio_file': ('test_audio.mp3', open(audio_file_path, 'rb'), 'audio/mpeg')
    }
    data = {
        'question': test_question
    }
    
    try:
        print("\nTesting JSON endpoint with Gemini AI...")
        print(f"Question for Gemini: '{test_question}'")
        
        # Make the request
        response = requests.post(url, files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            
            # Save the audio from base64
            audio_data = base64.b64decode(result['audio_base64'])
            output_file = "gemini_json_output.wav"
            with open(output_file, 'wb') as f:
                f.write(audio_data)
            
            print(f"✅ Success! JSON response received")
            print(f"📝 Gemini's answer: {result['text_response']}")
            print(f"🎵 Audio saved as: {output_file}")
            print(f"📊 Metadata:")
            for key, value in result['metadata'].items():
                print(f"   {key}: {value}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API. Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    finally:
        files['audio_file'][1].close()

def test_health_endpoint():
    """Test the health check endpoint"""
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            data = response.json()
            print(f"Health check: {data}")
        else:
            print(f"Health check failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API for health check")

if __name__ == "__main__":
    print("🧪 Testing Gemini AI + Voice Cloning API\n")
    
    # Test health endpoint first
    test_health_endpoint()
    print()
    
    # Test audio file endpoint
    test_gemini_voice_cloning()
    
    # Test JSON endpoint
    test_gemini_json_endpoint() 