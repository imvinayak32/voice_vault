from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional
import os
import tempfile
import shutil
import numpy as np
import tensorflow as tf
from scipy.spatial.distance import euclidean
import traceback
from pydub import AudioSegment
import io
import jwt
from pathlib import Path
import warnings
import soundfile as sf
import torch
import requests
import sys
from pathlib import Path

# Add voice_auth and voice_cloning directories to Python path
sys.path.append(str(Path(__file__).parent / "voice_auth"))
sys.path.append(str(Path(__file__).parent / "voice_cloning"))

# Import voice auth modules
from feature_extraction import get_embedding
from preprocess import get_fft_spectrum
import parameters as p

# Import voice cloning modules
from encoder import inference as encoder
from encoder.params_model import model_embedding_size as speaker_embedding_size
from synthesizer.inference import Synthesizer
from utils.default_models import ensure_default_models
from vocoder import inference as vocoder
from encoder.audio import load_audio_robust

# Suppress warnings for cleaner API output
warnings.filterwarnings("ignore")

# JWT Configuration
JWT_SECRET_KEY = "your-secret-key-change-this-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Initialize FastAPI app
app = FastAPI(
    title="Unified Voice Authentication & Cloning API",
    description="Unified API for voice authentication and cloning with JWT token management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],  # Frontend development servers
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security scheme
security = HTTPBearer()

# Global model variables
voice_auth_model = None
cloning_models_loaded = False
synthesizer = None

# Gemini API configuration
GEMINI_API_KEY = "AIzaSyBRQ3-mV7INmmrmD6BIdkpVps45aya4ZXQ"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

# JWT Token Management
def create_jwt_token(user_name: str) -> str:
    """Create JWT token for authenticated user"""
    payload = {
        "user_name": user_name,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify JWT token and return user name"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_name = payload.get("user_name")
        
        if user_name is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user name",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_name
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Voice Auth Model Loading
def load_voice_auth_model():
    """Load the voice authentication model"""
    global voice_auth_model
    if voice_auth_model is None:
        try:
            # Construct the correct path to the model
            model_path = Path(__file__).parent / "voice_auth" / p.MODEL_FILE
            print(f"Loading voice auth model from {model_path}...")
            
            # Check if model file exists
            if not model_path.exists():
                print(f"Model directory not found at: {model_path}")
                print("Please ensure the voice authentication model is available")
                raise HTTPException(status_code=500, detail=f"Voice authentication model not found at {model_path}")
            
            voice_auth_model = tf.saved_model.load(str(model_path))
            voice_auth_model = voice_auth_model.signatures['serving_default']
            print("Voice auth model loaded successfully!")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Failed to load voice auth model: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load voice authentication model: {str(e)}")
    return voice_auth_model

# Voice Cloning Model Loading
def load_cloning_models():
    """Load all required models for voice cloning"""
    global cloning_models_loaded, synthesizer
    
    if cloning_models_loaded:
        return
    
    print("Loading voice cloning models...")
    
    try:
        # Set up paths relative to voice_cloning directory
        voice_cloning_dir = Path(__file__).parent / "voice_cloning"
        
        # Ensure default models are available
        ensure_default_models(voice_cloning_dir / "saved_models")
        
        # Load encoder
        encoder.load_model(voice_cloning_dir / "saved_models/default/encoder.pt")
        
        # Load synthesizer
        synthesizer = Synthesizer(voice_cloning_dir / "saved_models/default/synthesizer.pt")
        
        # Load vocoder
        vocoder.load_model(voice_cloning_dir / "saved_models/default/vocoder.pt")
        
        cloning_models_loaded = True
        print("All voice cloning models loaded successfully!")
    except Exception as e:
        print(f"Failed to load voice cloning models: {e}")
        raise HTTPException(status_code=500, detail="Failed to load voice cloning models")

# Utility Functions
def save_uploaded_file(upload_file: UploadFile) -> str:
    """Save uploaded file to temporary location and return path"""
    try:
        suffix = os.path.splitext(upload_file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            shutil.copyfileobj(upload_file.file, tmp_file)
            tmp_path = tmp_file.name
        return tmp_path
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error saving uploaded file: {str(e)}")

def convert_audio_to_flac(input_path: str) -> str:
    """Convert any audio format to FLAC format for voice auth"""
    try:
        if input_path.lower().endswith('.flac'):
            return input_path
        
        audio = AudioSegment.from_file(input_path)
        output_path = input_path.rsplit('.', 1)[0] + '_converted.flac'
        
        audio = audio.set_frame_rate(16000)
        audio = audio.set_channels(1)
        audio.export(output_path, format="flac")
        
        if input_path != output_path:
            os.unlink(input_path)
        
        return output_path
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting audio format: {str(e)}")

def get_supported_audio_extensions():
    """Get list of supported audio file extensions"""
    return ['.wav', '.flac', '.mp3', '.m4a', '.aac', '.ogg', '.wma', '.aif', '.aiff']

def validate_audio_file(filename: str) -> bool:
    """Validate if the uploaded file is a supported audio format"""
    if not filename:
        return False
    ext = os.path.splitext(filename.lower())[1]
    return ext in get_supported_audio_extensions()

def call_gemini_api(question: str) -> str:
    """Call Gemini API to get a response to the question"""
    try:
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"{question}\n\nPlease provide a concise answer in 50 words or less."
                        }
                    ]
                }
            ]
        }
        
        headers = {'Content-Type': 'application/json'}
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if 'candidates' in data and len(data['candidates']) > 0:
                content = data['candidates'][0]['content']['parts'][0]['text']
                words = content.split()
                if len(words) > 50:
                    content = ' '.join(words[:50])
                return content.strip()
            else:
                return "I understand your question, but I couldn't generate a proper response at this time."
        else:
            print(f"Gemini API error: {response.status_code} - {response.text}")
            return "I'm having trouble processing your question right now. Please try again."
    
    except requests.exceptions.Timeout:
        return "I'm taking too long to think. Please try asking again."
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        return "I encountered an error while processing your question. Please try again."

# Startup Event
@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    load_voice_auth_model()
    load_cloning_models()

# Root Endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Unified Voice Authentication & Cloning API",
        "endpoints": {
            "enroll": "POST /enroll - Enroll a new user with audio sample (returns JWT token)",
            "authenticate": "POST /authenticate - Authenticate user with audio sample (returns JWT token)",
            "clone-voice": "POST /clone-voice - Clone voice with authentication (requires JWT token)",
            "users": "GET /users - List enrolled users",
            "delete-user": "DELETE /users/{user_name} - Delete an enrolled user"
        }
    }

# Voice Authentication Endpoints
@app.post("/enroll")
async def enroll_user(
    name: str = Form(..., description="Name of the person to enroll"),
    audio_file: UploadFile = File(..., description="Audio file (supports various formats)")
):
    """
    Enroll a new user with their voice sample and return JWT token
    """
    if not validate_audio_file(audio_file.filename):
        supported_formats = ', '.join(get_supported_audio_extensions())
        raise HTTPException(status_code=400, detail=f"Unsupported audio format. Supported formats: {supported_formats}")
    
    tmp_audio_path = None
    converted_path = None
    try:
        tmp_audio_path = save_uploaded_file(audio_file)
        converted_path = convert_audio_to_flac(tmp_audio_path)
        
        voice_model = load_voice_auth_model()
        
        print(f"Processing enrollment for {name}...")
        embedding = get_embedding(voice_model, converted_path, p.MAX_SEC)
        embedding_array = np.array(embedding.tolist())
        
        # Construct correct path for embeddings
        embed_dir = Path(__file__).parent / "voice_auth" / p.EMBED_LIST_FILE
        os.makedirs(embed_dir, exist_ok=True)
        
        embed_path = embed_dir / f"{name}.npy"
        np.save(embed_path, embedding_array)
        
        # Create JWT token for the enrolled user
        jwt_token = create_jwt_token(name)
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": f"Successfully enrolled user: {name}",
                "user": name,
                "jwt_token": jwt_token,
                "token_expires_in_hours": JWT_EXPIRATION_HOURS,
                "original_format": os.path.splitext(audio_file.filename)[1],
                "processed_format": ".flac"
            }
        )
        
    except Exception as e:
        print(f"Enrollment error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")
    
    finally:
        for path in [tmp_audio_path, converted_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass

@app.post("/authenticate")
async def authenticate_user(
    audio_file: UploadFile = File(..., description="Audio file for authentication")
):
    """
    Authenticate a user based on their voice sample and return JWT token
    """
    if not validate_audio_file(audio_file.filename):
        supported_formats = ', '.join(get_supported_audio_extensions())
        raise HTTPException(status_code=400, detail=f"Unsupported audio format. Supported formats: {supported_formats}")
    
    tmp_audio_path = None
    converted_path = None
    try:
        # Construct correct path for embeddings
        embed_dir = Path(__file__).parent / "voice_auth" / p.EMBED_LIST_FILE
        
        if not embed_dir.exists():
            return JSONResponse(
                status_code=200,
                content={
                    "authenticated": False,
                    "message": "No enrolled users found",
                    "recognized_user": None
                }
            )
        
        enrolled_users = [f for f in os.listdir(embed_dir) if f.endswith('.npy')]
        if len(enrolled_users) == 0:
            return JSONResponse(
                status_code=200,
                content={
                    "authenticated": False,
                    "message": "No enrolled users found",
                    "recognized_user": None
                }
            )
        
        tmp_audio_path = save_uploaded_file(audio_file)
        converted_path = convert_audio_to_flac(tmp_audio_path)
        
        voice_model = load_voice_auth_model()
        
        print("Processing authentication sample...")
        test_embedding = get_embedding(voice_model, converted_path, p.MAX_SEC)
        test_array = np.array(test_embedding.tolist())
        
        distances = {}
        print("Comparing against enrolled users...")
        
        for user_file in enrolled_users:
            user_name = user_file.replace(".npy", "")
            enrolled_embedding = np.load(embed_dir / user_file)
            distance = euclidean(test_array, enrolled_embedding)
            distances[user_name] = distance
            print(f"Distance to {user_name}: {distance:.4f}")
        
        sorted_distances = sorted(distances.items(), key=lambda x: x[1])
        closest_user, min_distance = sorted_distances[0]
        
        print(f"Closest match: {closest_user} with distance {min_distance:.6f}")
        print(f"Threshold: {p.THRESHOLD}")
        
        # Authentication logic
        authenticated = False
        confidence_score = 0.0
        message = ""
        jwt_token = None
        
        ULTRA_STRICT_THRESHOLD = 1e-06
        
        if min_distance < ULTRA_STRICT_THRESHOLD:
            authenticated = True
            confidence_score = 1.0 - (min_distance / ULTRA_STRICT_THRESHOLD)
            message = f"User authenticated successfully - Ultra-precise match (distance: {min_distance:.2e})"
            jwt_token = create_jwt_token(closest_user)
            print(f"ULTRA-STRICT AUTHENTICATION PASSED: {closest_user} with distance {min_distance:.2e}")
        else:
            authenticated = False
            if min_distance < p.THRESHOLD:
                message = f"Authentication failed - distance {min_distance:.6f} above ultra-strict threshold {ULTRA_STRICT_THRESHOLD:.2e}"
            else:
                message = f"Authentication failed - distance {min_distance:.6f} exceeds both thresholds"
            print(f"ULTRA-STRICT AUTHENTICATION REJECTED: {min_distance:.6f}")
        
        response_content = {
            "authenticated": authenticated,
            "message": message,
            "recognized_user": closest_user if authenticated else None,
            "distance": float(min_distance),
            "all_distances": {user: float(dist) for user, dist in distances.items()},
            "threshold": float(p.THRESHOLD)
        }
        
        if authenticated:
            response_content.update({
                "jwt_token": jwt_token,
                "token_expires_in_hours": JWT_EXPIRATION_HOURS,
                "confidence_score": float(confidence_score)
            })
        else:
            response_content.update({
                "closest_match": closest_user
            })
        
        return JSONResponse(status_code=200, content=response_content)
    
    except Exception as e:
        print(f"Authentication error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")
    
    finally:
        for path in [tmp_audio_path, converted_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass

# Voice Cloning Endpoint (JWT Protected)
@app.post("/clone-voice")
async def clone_voice(
    audio_file: UploadFile = File(..., description="Reference audio file for voice cloning"),
    question: str = Form(..., description="Question to be processed by Gemini AI"),
    user_name: str = Depends(verify_jwt_token),
    seed: Optional[int] = Form(None, description="Random seed for reproducible results")
):
    """
    Clone voice with Gemini AI response (requires JWT authentication)
    """
    if not cloning_models_loaded:
        raise HTTPException(status_code=503, detail="Voice cloning models are still loading")
    
    # Validate file type
    allowed_extensions = {'.mp3', '.wav', '.m4a', '.flac', '.aac'}
    file_extension = Path(audio_file.filename).suffix.lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported audio format. Allowed formats: {', '.join(allowed_extensions)}"
        )
    
    # Validate question
    if len(question.strip()) == 0:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    if len(question) > 1000:
        raise HTTPException(
            status_code=400, 
            detail="Question is too long. Please limit to 1000 characters or less"
        )
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_audio:
            content = await audio_file.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
        
        try:
            print(f"Processing reference audio for user: {user_name}")
            original_wav, sampling_rate = load_audio_robust(temp_audio_path, target_sr=None)
            
            if len(original_wav) < encoder.sampling_rate * 0.5:
                raise HTTPException(
                    status_code=400, 
                    detail="Reference audio is too short. Please provide audio that is at least 1 second long"
                )
            
            preprocessed_wav = encoder.preprocess_wav(
                original_wav, sampling_rate, normalize=True, trim_silence=True
            )
            
            print(f"Audio preprocessed: {len(preprocessed_wav)} samples")
            
            embed = encoder.embed_utterance(preprocessed_wav)
            print("Created voice embedding")
            
            print("Getting response from Gemini AI...")
            gemini_response = call_gemini_api(question)
            print(f"Gemini response: {gemini_response}")
            
            if seed is not None:
                torch.manual_seed(seed)
                np.random.seed(seed)
            
            print("Generating speech with cloned voice...")
            specs = synthesizer.synthesize_spectrograms([gemini_response], [embed])
            spec = specs[0]
            
            print("Converting to audio...")
            generated_wav = vocoder.infer_waveform(spec)
            
            generated_wav = np.clip(generated_wav, -1, 1)
            
            output_buffer = io.BytesIO()
            sf.write(output_buffer, generated_wav, encoder.sampling_rate, format='WAV')
            output_buffer.seek(0)
            
            print(f"Generated audio for user: {user_name}")
            
            return StreamingResponse(
                io.BytesIO(output_buffer.read()),
                media_type="audio/wav",
                headers={
                    "Content-Disposition": "attachment; filename=cloned_response.wav",
                    "X-Authenticated-User": user_name,
                    "X-Original-Question": question,
                    "X-Gemini-Response": gemini_response
                }
            )
        
        finally:
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
    
    except Exception as e:
        print(f"Voice cloning error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {str(e)}")

# User Management Endpoints
@app.get("/users")
async def list_enrolled_users():
    """List all enrolled users"""
    try:
        # Construct correct path for embeddings
        embed_dir = Path(__file__).parent / "voice_auth" / p.EMBED_LIST_FILE
        
        if not embed_dir.exists():
            return JSONResponse(content={"enrolled_users": []})
        
        enrolled_files = [f for f in os.listdir(embed_dir) if f.endswith('.npy')]
        enrolled_users = [f.replace('.npy', '') for f in enrolled_files]
        
        return JSONResponse(content={
            "enrolled_users": enrolled_users,
            "count": len(enrolled_users)
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")

@app.delete("/users/{user_name}")
async def delete_user(user_name: str):
    """Delete an enrolled user"""
    try:
        # Construct correct path for embeddings
        embed_dir = Path(__file__).parent / "voice_auth" / p.EMBED_LIST_FILE
        user_file = embed_dir / f"{user_name}.npy"
        
        if not user_file.exists():
            raise HTTPException(status_code=404, detail=f"User '{user_name}' not found")
        
        user_file.unlink()
        
        return JSONResponse(content={
            "status": "success",
            "message": f"User '{user_name}' deleted successfully"
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 