# Unified Voice Authentication & Cloning API

A unified FastAPI server that combines voice authentication and voice cloning capabilities with JWT token management.

## Features

- **Voice Authentication**: Enroll and authenticate users based on their voice biometrics
- **Voice Cloning**: Clone any voice and have it speak AI-generated responses from Gemini AI
- **JWT Security**: Secure API access with JSON Web Tokens
- **Multi-format Audio Support**: Supports WAV, FLAC, MP3, M4A, AAC, OGG, WMA, AIF, AIFF
- **Unified API**: Single server for all voice-related operations

## Quick Start

### 1. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Start the unified API server
python start_unified_api.py
```

The API will be available at `http://localhost:8000`

### 2. API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## API Endpoints

### Authentication Endpoints

#### Enroll User

```bash
curl -X POST "http://localhost:8000/enroll" \
     -F "name=Amy" \
     -F "audio_file=@your_voice_sample.wav"
```

Response includes JWT token for future API calls.

#### Authenticate User

```bash
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@your_voice_sample.wav"
```

Returns JWT token if authentication successful.

### Voice Cloning Endpoint (JWT Protected)

#### Clone Voice

```bash
# First get JWT token from enrollment or authentication, then:
curl -X POST "http://localhost:8000/clone-voice" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "audio_file=@your_voice_sample.wav" \
     -F "question=What is artificial intelligence?" \
     -o cloned_response.wav
```

This endpoint:

1. Verifies your JWT token
2. Processes your question through Gemini AI
3. Clones the voice from the audio file
4. Returns an audio file with the AI response in the cloned voice

### User Management

#### List Users

```bash
curl -X GET "http://localhost:8000/users"
```

#### Delete User

```bash
curl -X DELETE "http://localhost:8000/users/Amy"
```

## Workflow Example

1. **Enroll a User** (gets JWT token):

```bash
curl -X POST "http://localhost:8000/enroll" \
     -F "name=Amy" \
     -F "audio_file=@amy_voice.wav"
```

2. **Or Authenticate Existing User** (gets JWT token):

```bash
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@amy_voice.wav"
```

3. **Use Voice Cloning** (requires JWT token):

```bash
curl -X POST "http://localhost:8000/clone-voice" \
     -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
     -F "audio_file=@amy_voice.wav" \
     -F "question=Explain quantum computing in simple terms" \
     -o amy_explains_quantum.wav
```

## Security Features

- **JWT Authentication**: Voice cloning requires valid JWT token
- **Token Expiration**: Tokens expire after 24 hours (configurable)
- **Ultra-strict Voice Matching**: High-precision voice authentication
- **Secure File Handling**: Temporary files are automatically cleaned up

## Audio Requirements

- **Supported Formats**: WAV, FLAC, MP3, M4A, AAC, OGG, WMA, AIF, AIFF
- **Minimum Duration**: At least 1 second for voice cloning
- **Quality**: Higher quality audio produces better voice cloning results

## Configuration

Key configuration options in `unified_voice_api.py`:

```python
# JWT Configuration
JWT_SECRET_KEY = "your-secret-key-change-this-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Gemini API Key
GEMINI_API_KEY = "your-gemini-api-key"
```

## Project Structure

```
backend/
├── unified_voice_api.py          # Main API server
├── start_unified_api.py          # Startup script
├── requirements.txt              # Dependencies
├── voice_auth/                   # Voice authentication modules
│   ├── feature_extraction.py
│   ├── parameters.py
│   ├── preprocess.py
│   └── voice_auth_model_cnn/     # Pre-trained model
└── voice_cloning/                # Voice cloning modules
    ├── encoder/
    ├── synthesizer/
    ├── vocoder/
    └── saved_models/             # Pre-trained models
```

## Error Handling

The API provides detailed error messages for:

- Invalid audio formats
- Authentication failures
- Missing JWT tokens
- Model loading issues
- Audio processing errors

## Performance Notes

- Models are loaded once at startup for optimal performance
- Voice authentication uses ultra-strict matching for security
- Voice cloning responses are limited to 50 words from Gemini AI
- Temporary files are automatically cleaned up after processing

## Development

To run in development mode with auto-reload:

```bash
python start_unified_api.py
```

The server will automatically reload when you make changes to the code.

## License

This project combines multiple open-source voice processing libraries. Please check individual component licenses for specific terms.
