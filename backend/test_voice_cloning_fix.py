#!/usr/bin/env python3
"""
Test script to verify the voice cloning librosa compatibility fix
"""

import sys
import os
from pathlib import Path

# Add voice_cloning directory to Python path
sys.path.append(str(Path(__file__).parent / "voice_cloning"))

def test_voice_cloning_compatibility():
    try:
        # Test imports
        from encoder.audio import preprocess_wav, wav_to_mel_spectrogram
        import numpy as np
        import librosa
        
        print("Testing Voice Cloning Librosa Compatibility Fix")
        print("=" * 50)
        
        # Test 1: Check librosa version
        print(f"1. Librosa version: {librosa.__version__}")
        
        # Test 2: Test resample function
        print("\n2. Testing resample function...")
        test_wav = np.random.randn(16000)  # 1 second of random audio at 16kHz
        
        try:
            processed_wav = preprocess_wav(test_wav, source_sr=16000)
            print("✓ preprocess_wav function works correctly")
            print(f"   Input shape: {test_wav.shape}")
            print(f"   Output shape: {processed_wav.shape}")
        except Exception as e:
            print(f"✗ preprocess_wav failed: {e}")
            return False
        
        # Test 3: Test mel spectrogram function
        print("\n3. Testing mel spectrogram function...")
        try:
            mel_spec = wav_to_mel_spectrogram(processed_wav)
            print("✓ wav_to_mel_spectrogram function works correctly")
            print(f"   Mel spectrogram shape: {mel_spec.shape}")
        except Exception as e:
            print(f"✗ wav_to_mel_spectrogram failed: {e}")
            return False
        
        print("\n" + "=" * 50)
        print("✓ All voice cloning compatibility tests passed!")
        print("The librosa version compatibility issues have been resolved.")
        return True
        
    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure the voice cloning models are available and the environment is set up correctly.")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_voice_cloning_compatibility()
    if not success:
        sys.exit(1) 