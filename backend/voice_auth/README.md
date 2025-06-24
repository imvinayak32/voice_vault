# Voice Authentication CNN API

A FastAPI-based voice authentication system using a pre-trained Convolutional Neural Network. This API supports voice enrollment and authentication with automatic audio format conversion.

## Features

- **Voice Enrollment**: Register new users with their voice samples
- **Voice Authentication**: Authenticate users based on voice recognition
- **Multiple Audio Formats**: Supports .wav, .flac, .mp3, .m4a, .aac, .ogg, .wma, .aif, .aiff
- **Automatic Format Conversion**: Converts any supported audio format to FLAC internally
- **User Management**: List and delete enrolled users
- **REST API**: Full REST API with JSON responses

## Requirements

- Python 3.9+
- macOS/Linux (tested on macOS)
- FFmpeg (for audio format conversion)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Voice-Authentication-CNN
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install System Dependencies

```bash
# On macOS using Homebrew
brew install portaudio ffmpeg

# On Ubuntu/Debian
sudo apt-get install portaudio19-dev ffmpeg

# On CentOS/RHEL
sudo yum install portaudio-devel ffmpeg
```

### 4. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## Usage

### Starting the Server

#### Option 1: Using Python directly

```bash
source venv/bin/activate
python voice_auth_api.py
```

#### Option 2: Using uvicorn

```bash
source venv/bin/activate
uvicorn voice_auth_api:app --host 0.0.0.0 --port 8000 --reload
```

The server will start on `http://localhost:8000`

### Command Line Interface (Original)

You can also use the original command-line interface:

#### Enroll a user:

```bash
python voice_auth.py -t enroll -n "Amy" -f "data/wav/Amy/700-122866-0000.flac"
```

#### Authenticate a user:

```bash
python voice_auth.py -t recognize -f "data/wav/Amy/700-122866-0001.flac"
```

## API Endpoints

### 1. Root Endpoint

**GET /** - Get API information

```bash
curl http://localhost:8000/
```

**Response:**

```json
{
  "message": "Voice Authentication API",
  "endpoints": {
    "enroll": "POST /enroll - Enroll a new user with audio sample",
    "authenticate": "POST /authenticate - Authenticate user with audio sample"
  }
}
```

### 2. User Enrollment

**POST /enroll** - Enroll a new user

#### With FLAC file:

```bash
curl -X POST "http://localhost:8000/enroll" \
     -F "name=Amy" \
     -F "audio_file=@data/wav/Amy/700-122866-0000.flac"
```

#### With WAV file:

```bash
curl -X POST "http://localhost:8000/enroll" \
     -F "name=John" \
     -F "audio_file=@path/to/john.wav"
```

#### With MP3 file:

```bash
curl -X POST "http://localhost:8000/enroll" \
     -F "name=Sarah" \
     -F "audio_file=@path/to/sarah.mp3"
```

#### With M4A file:

```bash
curl -X POST "http://localhost:8000/enroll" \
     -F "name=Mike" \
     -F "audio_file=@path/to/mike.m4a"
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Successfully enrolled user: Amy",
  "user": "Amy",
  "original_format": ".flac",
  "processed_format": ".flac"
}
```

**Error Response:**

```json
{
  "detail": "Unsupported audio format. Supported formats: .wav, .flac, .mp3, .m4a, .aac, .ogg, .wma, .aif, .aiff"
}
```

### 3. User Authentication

**POST /authenticate** - Authenticate a user

#### Basic authentication:curl -X POST "http://localhost:8000/authenticate" \

```bash
     -F "audio_file=@data/wav/Amy/700-122866-0001.flac"
```

#### With different formats:

```bash
# WAV file
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@test_audio.wav"

# MP3 file
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@test_audio.mp3"

# M4A file
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@voice_sample.m4a"
```

**Successful Authentication:**

```json
{
  "authenticated": true,
  "message": "User authenticated successfully",
  "recognized_user": "Amy",
  "confidence_score": 0.33171726007575747,
  "distance": 0.018282739924242515
}
```

**Failed Authentication:**

```json
{
  "authenticated": false,
  "message": "Authentication failed - user not recognized",
  "recognized_user": null,
  "closest_match": "Amy",
  "distance": 0.45,
  "threshold": 0.35
}
```

**No Users Enrolled:**

```json
{
  "authenticated": false,
  "message": "No enrolled users found",
  "recognized_user": null
}
```

### 4. List Enrolled Users

**GET /users** - Get all enrolled users

```bash
curl http://localhost:8000/users
```

**Response:**

```json
{
  "enrolled_users": ["Amy", "John", "Sarah", "Mike"],
  "count": 4
}
```

### 5. Delete User

**DELETE /users/{user_name}** - Delete an enrolled user

```bash
curl -X DELETE "http://localhost:8000/users/Amy"
```

**Success Response:**

```json
{
  "status": "success",
  "message": "User 'Amy' deleted successfully"
}
```

**User Not Found:**

```json
{
  "detail": "User 'Amy' not found"
}
```

## Testing the API

### Complete Test Sequence

1. **Start the server:**

```bash
source venv/bin/activate
python voice_auth_api.py
```

2. **Test API is running:**

```bash
curl http://localhost:8000/
```

3. **Enroll users with different formats:**

```bash
# Enroll with FLAC
curl -X POST "http://localhost:8000/enroll" \
     -F "name=Amy" \
     -F "audio_file=@data/wav/Amy/700-122866-0000.flac"

# Enroll with another FLAC
curl -X POST "http://localhost:8000/enroll" \
     -F "name=Collin" \
     -F "audio_file=@data/wav/Collin/116-288045-0000.flac"
```

4. **List enrolled users:**

```bash
curl http://localhost:8000/users
```

5. **Test authentication:**

```bash
# Should recognize Amy
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@data/wav/Amy/700-122866-0001.flac"

# Should recognize Collin
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@data/wav/Collin/116-288045-0001.flac"

# Should not recognize unknown voice
curl -X POST "http://localhost:8000/authenticate" \
     -F "audio_file=@data/wav/Ethan/1255-138279-0000.flac"
```

6. **Delete a user:**

```bash
curl -X DELETE "http://localhost:8000/users/Amy"
```

## Supported Audio Formats

The API automatically converts the following audio formats to FLAC before processing:

- **.wav** - Waveform Audio File Format
- **.flac** - Free Lossless Audio Codec
- **.mp3** - MPEG-1 Audio Layer III
- **.m4a** - MPEG-4 Audio
- **.aac** - Advanced Audio Coding
- **.ogg** - Ogg Vorbis
- **.wma** - Windows Media Audio
- **.aif/.aiff** - Audio Interchange File Format

## Audio Requirements

- **Sample Rate**: Automatically converted to 16kHz
- **Channels**: Automatically converted to mono
- **Duration**: Recommended 2-10 seconds for best results
- **Quality**: Clear speech without background noise recommended

## ⚠️ ULTRA-STRICT AUTHENTICATION

**IMPORTANT**: The system now uses an extremely strict authentication threshold of **1e-06 (0.000001)**

### What this means:

- **ONLY** near-perfect voice matches will be authenticated
- Distance must be less than 0.000001 to pass authentication
- This prevents false positives but may create false negatives
- Same person's voice samples with slight variations may be rejected

### Authentication Results:

- ✅ **PASS**: Distance < 0.000001 → "Ultra-precise match"
- ❌ **FAIL**: Distance ≥ 0.000001 → "Authentication failed"

### Example Responses:

**Ultra-Precise Match (AUTHENTICATED):**

```json
{
  "authenticated": true,
  "message": "User authenticated successfully - Ultra-precise match (distance: 7.28e-08)",
  "recognized_user": "Vinayak",
  "confidence_score": 0.9999,
  "distance": 7.28e-8
}
```

**Close Match (REJECTED):**

```json
{
  "authenticated": false,
  "message": "Authentication failed - distance 0.018000 above ultra-strict threshold 1.00e-06",
  "closest_match": "Gaurav",
  "distance": 0.018
}
```

## Configuration

You can modify the following parameters in `parameters.py`:

- `THRESHOLD`: General authentication threshold (default: 0.35) - NOT USED FOR AUTH
- `ULTRA_STRICT_THRESHOLD`: Ultra-strict threshold (default: 1e-06) - ACTUAL AUTH THRESHOLD
- `MAX_SEC`: Maximum audio duration to process (default: 10 seconds)
- `SAMPLE_RATE`: Target sample rate (default: 16000 Hz)

## Error Handling

The API provides detailed error messages for common issues:

- **Unsupported file format**: Lists all supported formats
- **File upload errors**: Details about file handling issues
- **Model loading errors**: Information about model availability
- **Processing errors**: Audio processing and conversion errors

## Development

### Running in Development Mode

```bash
uvicorn voice_auth_api:app --host 0.0.0.0 --port 8000 --reload
```

### API Documentation

Once the server is running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Troubleshooting

### Common Issues

1. **Server won't start:**

   - Check if port 8000 is available
   - Ensure all dependencies are installed
   - Verify virtual environment is activated

2. **Audio conversion fails:**

   - Install FFmpeg: `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Ubuntu)
   - Check if the audio file is not corrupted

3. **Model loading error:**

   - Ensure `voice_auth_model_cnn` directory exists
   - Check if `saved_model.pb` file is present

4. **PyAudio installation fails:**

   - Install portaudio: `brew install portaudio` (macOS)
   - On Ubuntu: `sudo apt-get install portaudio19-dev`

### Logs

Check the console output for detailed error messages and processing information.

## License

This project is open source. Please check the license file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

For more information or issues, please create an issue in the repository.
