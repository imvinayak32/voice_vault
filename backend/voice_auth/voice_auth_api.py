from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import os
import tempfile
import shutil
import numpy as np
import tensorflow as tf
from scipy.spatial.distance import euclidean
import traceback
from pydub import AudioSegment
from pydub.utils import which

# Import our existing modules
from feature_extraction import get_embedding
from preprocess import get_fft_spectrum
import parameters as p

# Initialize FastAPI app
app = FastAPI(title="Voice Authentication API", version="1.0.0")

# Global model variable
model = None

def load_voice_model():
    """Load the voice authentication model"""
    global model
    if model is None:
        try:
            print(f"Loading model from {p.MODEL_FILE}...")
            model = tf.saved_model.load(p.MODEL_FILE)
            model = model.signatures['serving_default']
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Failed to load model: {e}")
            raise HTTPException(status_code=500, detail="Failed to load voice authentication model")
    return model

def save_uploaded_file(upload_file: UploadFile) -> str:
    """Save uploaded file to temporary location and return path"""
    try:
        # Create temporary file with same extension as uploaded file
        suffix = os.path.splitext(upload_file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            shutil.copyfileobj(upload_file.file, tmp_file)
            tmp_path = tmp_file.name
        return tmp_path
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error saving uploaded file: {str(e)}")

def convert_audio_to_flac(input_path: str) -> str:
    """Convert any audio format to FLAC format"""
    try:
        # Check if file is already FLAC
        if input_path.lower().endswith('.flac'):
            return input_path
        
        # Load audio using pydub (supports many formats)
        audio = AudioSegment.from_file(input_path)
        
        # Create output path with .flac extension
        output_path = input_path.rsplit('.', 1)[0] + '_converted.flac'
        
        # Convert to FLAC
        # Set parameters to match what librosa expects
        audio = audio.set_frame_rate(16000)  # 16kHz sample rate as per parameters
        audio = audio.set_channels(1)  # Mono
        
        # Export as FLAC
        audio.export(output_path, format="flac")
        
        # Remove original file if it's different
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

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_voice_model()

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Voice Authentication API",
        "endpoints": {
            "enroll": "POST /enroll - Enroll a new user with audio sample",
            "authenticate": "POST /authenticate - Authenticate user with audio sample"
        }
    }

@app.post("/enroll")
async def enroll_user(
    name: str = Form(..., description="Name of the person to enroll"),
    audio_file: UploadFile = File(..., description="Audio file (supports .wav, .flac, .mp3, .m4a, .aac, .ogg, .wma, .aif, .aiff)")
):
    """
    Enroll a new user with their voice sample
    
    Args:
        name: Name of the person to enroll
        audio_file: Audio file containing the person's voice (any common audio format)
    
    Returns:
        Success/failure message
    """
    # Validate file type
    if not validate_audio_file(audio_file.filename):
        supported_formats = ', '.join(get_supported_audio_extensions())
        raise HTTPException(status_code=400, detail=f"Unsupported audio format. Supported formats: {supported_formats}")
    
    tmp_audio_path = None
    converted_path = None
    try:
        # Save uploaded file temporarily
        tmp_audio_path = save_uploaded_file(audio_file)
        print(f"Saved uploaded file: {tmp_audio_path}")
        
        # Convert to FLAC format
        converted_path = convert_audio_to_flac(tmp_audio_path)
        print(f"Converted to FLAC: {converted_path}")
        
        # Load model
        voice_model = load_voice_model()
        
        # Generate embedding using converted FLAC file
        print(f"Processing enrollment for {name}...")
        embedding = get_embedding(voice_model, converted_path, p.MAX_SEC)
        embedding_array = np.array(embedding.tolist())
        
        # Ensure embed directory exists
        os.makedirs(p.EMBED_LIST_FILE, exist_ok=True)
        
        # Save embedding
        embed_path = os.path.join(p.EMBED_LIST_FILE, f"{name}.npy")
        np.save(embed_path, embedding_array)
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": f"Successfully enrolled user: {name}",
                "user": name,
                "original_format": os.path.splitext(audio_file.filename)[1],
                "processed_format": ".flac"
            }
        )
        
    except Exception as e:
        print(f"Enrollment error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")
    
    finally:
        # Clean up temporary files
        for path in [tmp_audio_path, converted_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass

@app.post("/authenticate")
async def authenticate_user(
    audio_file: UploadFile = File(..., description="Audio file for authentication (supports .wav, .flac, .mp3, .m4a, .aac, .ogg, .wma, .aif, .aiff)")
):
    """
    Authenticate a user based on their voice sample
    
    Args:
        audio_file: Audio file containing the person's voice (any common audio format)
    
    Returns:
        Authentication result with user identification
    """
    # Validate file type
    if not validate_audio_file(audio_file.filename):
        supported_formats = ', '.join(get_supported_audio_extensions())
        raise HTTPException(status_code=400, detail=f"Unsupported audio format. Supported formats: {supported_formats}")
    
    tmp_audio_path = None
    converted_path = None
    try:
        # Check if any users are enrolled
        if not os.path.exists(p.EMBED_LIST_FILE):
            return JSONResponse(
                status_code=200,
                content={
                    "authenticated": False,
                    "message": "No enrolled users found",
                    "recognized_user": None
                }
            )
        
        enrolled_users = [f for f in os.listdir(p.EMBED_LIST_FILE) if f.endswith('.npy')]
        if len(enrolled_users) == 0:
            return JSONResponse(
                status_code=200,
                content={
                    "authenticated": False,
                    "message": "No enrolled users found",
                    "recognized_user": None
                }
            )
        
        # Save uploaded file temporarily
        tmp_audio_path = save_uploaded_file(audio_file)
        print(f"Saved uploaded file: {tmp_audio_path}")
        
        # Convert to FLAC format
        converted_path = convert_audio_to_flac(tmp_audio_path)
        print(f"Converted to FLAC: {converted_path}")
        
        # Load model
        voice_model = load_voice_model()
        
        # Generate embedding for test sample using converted FLAC file
        print("Processing authentication sample...")
        test_embedding = get_embedding(voice_model, converted_path, p.MAX_SEC)
        test_array = np.array(test_embedding.tolist())
        
        # Compare against enrolled users
        distances = {}
        print("Comparing against enrolled users...")
        
        for user_file in enrolled_users:
            user_name = user_file.replace(".npy", "")
            enrolled_embedding = np.load(os.path.join(p.EMBED_LIST_FILE, user_file))
            distance = euclidean(test_array, enrolled_embedding)
            distances[user_name] = distance
            print(f"Distance to {user_name}: {distance:.4f}")
        
        # Sort distances to get closest and second closest
        sorted_distances = sorted(distances.items(), key=lambda x: x[1])
        closest_user, min_distance = sorted_distances[0]
        
        print(f"Closest match: {closest_user} with distance {min_distance:.6f}")
        print(f"Threshold: {p.THRESHOLD}")
        
        # Ultra-strict authentication logic
        authenticated = False
        confidence_score = 0.0
        message = ""
        
        # Ultra-strict check: Only authenticate if distance is extremely small
        ULTRA_STRICT_THRESHOLD = 1e-06  # 0.000001 - only for near-perfect matches
        
        if min_distance < ULTRA_STRICT_THRESHOLD:
            # Only authenticate if the match is nearly perfect
            authenticated = True
            confidence_score = 1.0 - (min_distance / ULTRA_STRICT_THRESHOLD)
            message = f"User authenticated successfully - Ultra-precise match (distance: {min_distance:.2e})"
            
            print(f"ULTRA-STRICT AUTHENTICATION PASSED: {closest_user} with distance {min_distance:.2e}")
            
        else:
            # Reject authentication - distance too large
            authenticated = False
            
            if min_distance < p.THRESHOLD:
                message = f"Authentication failed - distance {min_distance:.6f} above ultra-strict threshold {ULTRA_STRICT_THRESHOLD:.2e} (but below general threshold {p.THRESHOLD})"
            else:
                message = f"Authentication failed - distance {min_distance:.6f} exceeds both ultra-strict threshold {ULTRA_STRICT_THRESHOLD:.2e} and general threshold {p.THRESHOLD}"
            
            print(f"ULTRA-STRICT AUTHENTICATION REJECTED: Closest match {closest_user} with distance {min_distance:.6f} (threshold: {ULTRA_STRICT_THRESHOLD:.2e})")
        
        if authenticated:
            return JSONResponse(
                status_code=200,
                content={
                    "authenticated": True,
                    "message": message,
                    "recognized_user": closest_user,
                    "confidence_score": float(confidence_score),
                    "distance": float(min_distance),
                    "all_distances": {user: float(dist) for user, dist in distances.items()},
                    "verification_details": {
                        "distance_threshold": float(p.THRESHOLD),
                        "distance_gap": float(sorted_distances[1][1] - min_distance) if len(sorted_distances) > 1 else None,
                        "relative_confidence": float((sorted_distances[1][1] - min_distance) / sorted_distances[1][1]) if len(sorted_distances) > 1 and sorted_distances[1][1] > 0 else None
                    }
                }
            )
        else:
            return JSONResponse(
                status_code=200,
                content={
                    "authenticated": False,
                    "message": message,
                    "recognized_user": None,
                    "closest_match": closest_user,
                    "distance": float(min_distance),
                    "all_distances": {user: float(dist) for user, dist in distances.items()},
                    "threshold": float(p.THRESHOLD),
                    "verification_details": {
                        "distance_threshold": float(p.THRESHOLD),
                        "distance_gap": float(sorted_distances[1][1] - min_distance) if len(sorted_distances) > 1 else None,
                        "relative_confidence": float((sorted_distances[1][1] - min_distance) / sorted_distances[1][1]) if len(sorted_distances) > 1 and sorted_distances[1][1] > 0 else None
                    }
                }
            )
    
    except Exception as e:
        print(f"Authentication error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")
    
    finally:
        # Clean up temporary files
        for path in [tmp_audio_path, converted_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass

@app.get("/users")
async def list_enrolled_users():
    """List all enrolled users"""
    try:
        if not os.path.exists(p.EMBED_LIST_FILE):
            return JSONResponse(content={"enrolled_users": []})
        
        enrolled_files = [f for f in os.listdir(p.EMBED_LIST_FILE) if f.endswith('.npy')]
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
        user_file = os.path.join(p.EMBED_LIST_FILE, f"{user_name}.npy")
        
        if not os.path.exists(user_file):
            raise HTTPException(status_code=404, detail=f"User '{user_name}' not found")
        
        os.remove(user_file)
        
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