import os
import tempfile
import io
import json
from pathlib import Path
from typing import Optional
import warnings

import numpy as np
import soundfile as sf
import torch
import requests
import base64
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
import uvicorn

from encoder import inference as encoder
from encoder.params_model import model_embedding_size as speaker_embedding_size
from synthesizer.inference import Synthesizer
from utils.default_models import ensure_default_models
from vocoder import inference as vocoder
from encoder.audio import load_audio_robust

# Suppress warnings for cleaner API output
warnings.filterwarnings("ignore")

app = FastAPI(
    title="Real-Time Voice Cloning API with Gemini AI",
    description="API for cloning voices using SV2TTS with Gemini AI integration",
    version="1.0.0"
)

# Global variables for models
models_loaded = False
synthesizer = None

# Gemini API configuration
GEMINI_API_KEY = "AIzaSyBRQ3-mV7INmmrmD6BIdkpVps45aya4ZXQ"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def load_models():
    """Load all required models once at startup"""
    global models_loaded, synthesizer
    
    if models_loaded:
        return
    
    print("Loading models...")
    
    # Ensure default models are available
    ensure_default_models(Path("saved_models"))
    
    # Load encoder
    encoder.load_model(Path("saved_models/default/encoder.pt"))
    
    # Load synthesizer
    synthesizer = Synthesizer(Path("saved_models/default/synthesizer.pt"))
    
    # Load vocoder
    vocoder.load_model(Path("saved_models/default/vocoder.pt"))
    
    models_loaded = True
    print("All models loaded successfully!")

def call_gemini_api(question: str) -> str:
    """
    Call Gemini API to get a response to the question/conversation
    Returns the response text limited to 50 words
    """
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
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            # Extract the text from Gemini's response
            if 'candidates' in data and len(data['candidates']) > 0:
                content = data['candidates'][0]['content']['parts'][0]['text']
                
                # Limit to 50 words
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

@app.on_event("startup")
async def startup_event():
    """Load models when the API starts"""
    load_models()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Real-Time Voice Cloning API with Gemini AI is running"}

@app.get("/health")
async def health_check():
    """Check if models are loaded and ready"""
    return {
        "status": "healthy" if models_loaded else "loading",
        "models_loaded": models_loaded
    }

@app.post("/clone-voice")
async def clone_voice(
    audio_file: UploadFile = File(..., description="Reference audio file (mp3, wav, m4a, flac)"),
    question: str = Form(..., description="Question or conversation text to be processed by Gemini AI"),
    seed: Optional[int] = Form(None, description="Random seed for reproducible results")
):
    """
    Process a question with Gemini AI and clone voice to speak the answer
    Returns audio file with Gemini response in cloned voice
    
    - **audio_file**: Reference audio file to clone the voice from
    - **question**: Question or conversation text that will be sent to Gemini AI
    - **seed**: Optional random seed for reproducible results
    """
    
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading, please try again in a moment")
    
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
    
    if len(question) > 1000:  # Reasonable limit for question length
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
            # Load and preprocess the reference audio
            print(f"Processing reference audio: {audio_file.filename}")
            original_wav, sampling_rate = load_audio_robust(temp_audio_path, target_sr=None)
            
            # Quality checks
            if len(original_wav) < encoder.sampling_rate * 0.5:  # Less than 0.5 second
                raise HTTPException(
                    status_code=400, 
                    detail="Reference audio is too short. Please provide audio that is at least 1 second long"
                )
            
            # Preprocess the audio
            preprocessed_wav = encoder.preprocess_wav(
                original_wav, sampling_rate, normalize=True, trim_silence=True
            )
            
            print(f"Audio preprocessed: {len(preprocessed_wav)} samples ({len(preprocessed_wav)/encoder.sampling_rate:.1f}s)")
            
            # Create embedding
            embed = encoder.embed_utterance(preprocessed_wav)
            print("Created voice embedding")
            
            # Call Gemini API to get response
            print("Getting response from Gemini AI...")
            gemini_response = call_gemini_api(question)
            print(f"Gemini response: {gemini_response}")
            
            # Set seed if provided
            if seed is not None:
                torch.manual_seed(seed)
                # Reload synthesizer and vocoder with seed
                global synthesizer
                synthesizer = Synthesizer(Path("saved_models/default/synthesizer.pt"))
                vocoder.load_model(Path("saved_models/default/vocoder.pt"))
            
            # Generate spectrogram using Gemini's response
            print("Generating spectrogram...")
            texts = [gemini_response]
            embeds = [embed]
            specs = synthesizer.synthesize_spectrograms(texts, embeds)
            spec = specs[0]
            print("Spectrogram created")
            
            # Generate waveform
            print("Synthesizing waveform...")
            generated_wav = vocoder.infer_waveform(spec, target=8000, overlap=800)
            
            # Post-process audio
            print("Post-processing audio...")
            
            # Normalize to prevent clipping
            if np.max(np.abs(generated_wav)) > 0:
                generated_wav = generated_wav / np.max(np.abs(generated_wav)) * 0.95
            
            # Pad audio (fixes sounddevice bug)
            generated_wav = np.pad(generated_wav, (0, synthesizer.sample_rate), mode="constant")
            
            # Apply gentle processing
            generated_wav = encoder.preprocess_wav(generated_wav, normalize=False, trim_silence=True)
            
            # Final normalization
            if np.max(np.abs(generated_wav)) > 0:
                generated_wav = generated_wav / np.max(np.abs(generated_wav)) * 0.8
            
            # Convert to bytes for response
            audio_buffer = io.BytesIO()
            sf.write(audio_buffer, generated_wav.astype(np.float32), synthesizer.sample_rate, format='WAV')
            audio_buffer.seek(0)
            audio_data = audio_buffer.read()
            
            print("Voice cloning completed successfully!")
            
            # Return audio file with metadata in headers
            return StreamingResponse(
                io.BytesIO(audio_data),
                media_type="audio/wav",
                headers={
                    "Content-Disposition": "attachment; filename=gemini_cloned_voice.wav",
                    "X-Gemini-Response": gemini_response,
                    "X-Original-Question": question
                }
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during voice cloning: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {str(e)}")

@app.post("/ask-and-speak-json")
async def ask_and_speak_json(
    audio_file: UploadFile = File(..., description="Reference audio file (mp3, wav, m4a, flac)"),
    question: str = Form(..., description="Question or conversation text to be processed by Gemini AI"),
    seed: Optional[int] = Form(None, description="Random seed for reproducible results")
):
    """
    Process a question with Gemini AI and clone voice to speak the answer
    Returns JSON with both text response and base64-encoded audio
    
    - **audio_file**: Reference audio file to clone the voice from
    - **question**: Question or conversation text that will be sent to Gemini AI
    - **seed**: Optional random seed for reproducible results
    
    Returns: JSON with 'text_response', 'audio_base64', 'question', and metadata
    """
    
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading, please try again in a moment")
    
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
    
    if len(question) > 1000:  # Reasonable limit for question length
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
            # Load and preprocess the reference audio
            print(f"Processing reference audio: {audio_file.filename}")
            original_wav, sampling_rate = load_audio_robust(temp_audio_path, target_sr=None)
            
            # Quality checks
            if len(original_wav) < encoder.sampling_rate * 0.5:  # Less than 0.5 second
                raise HTTPException(
                    status_code=400, 
                    detail="Reference audio is too short. Please provide audio that is at least 1 second long"
                )
            
            # Preprocess the audio
            preprocessed_wav = encoder.preprocess_wav(
                original_wav, sampling_rate, normalize=True, trim_silence=True
            )
            
            print(f"Audio preprocessed: {len(preprocessed_wav)} samples ({len(preprocessed_wav)/encoder.sampling_rate:.1f}s)")
            
            # Create embedding
            embed = encoder.embed_utterance(preprocessed_wav)
            print("Created voice embedding")
            
            # Call Gemini API to get response
            print("Getting response from Gemini AI...")
            gemini_response = call_gemini_api(question)
            print(f"Gemini response: {gemini_response}")
            
            # Set seed if provided
            if seed is not None:
                torch.manual_seed(seed)
                # Reload synthesizer and vocoder with seed
                global synthesizer
                synthesizer = Synthesizer(Path("saved_models/default/synthesizer.pt"))
                vocoder.load_model(Path("saved_models/default/vocoder.pt"))
            
            # Generate spectrogram using Gemini's response
            print("Generating spectrogram...")
            texts = [gemini_response]
            embeds = [embed]
            specs = synthesizer.synthesize_spectrograms(texts, embeds)
            spec = specs[0]
            print("Spectrogram created")
            
            # Generate waveform
            print("Synthesizing waveform...")
            generated_wav = vocoder.infer_waveform(spec, target=8000, overlap=800)
            
            # Post-process audio
            print("Post-processing audio...")
            
            # Normalize to prevent clipping
            if np.max(np.abs(generated_wav)) > 0:
                generated_wav = generated_wav / np.max(np.abs(generated_wav)) * 0.95
            
            # Pad audio (fixes sounddevice bug)
            generated_wav = np.pad(generated_wav, (0, synthesizer.sample_rate), mode="constant")
            
            # Apply gentle processing
            generated_wav = encoder.preprocess_wav(generated_wav, normalize=False, trim_silence=True)
            
            # Final normalization
            if np.max(np.abs(generated_wav)) > 0:
                generated_wav = generated_wav / np.max(np.abs(generated_wav)) * 0.8
            
            # Convert audio to base64
            audio_buffer = io.BytesIO()
            sf.write(audio_buffer, generated_wav.astype(np.float32), synthesizer.sample_rate, format='WAV')
            audio_buffer.seek(0)
            audio_data = audio_buffer.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            print("Voice cloning completed successfully!")
            
            # Return JSON response with both text and audio
            return JSONResponse(content={
                "text_response": gemini_response,
                "audio_base64": audio_base64,
                "question": question,
                "metadata": {
                    "audio_format": "wav",
                    "sample_rate": synthesizer.sample_rate,
                    "audio_duration_seconds": len(generated_wav) / synthesizer.sample_rate,
                    "response_word_count": len(gemini_response.split()),
                    "seed": seed
                }
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during voice cloning: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {str(e)}")

if __name__ == "__main__":
    print("Starting Real-Time Voice Cloning API with Gemini AI...")
    print("The API will be available at: http://localhost:8000")
    print("API documentation will be available at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=5678) 