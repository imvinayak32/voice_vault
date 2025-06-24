from pyaudio import paInt16

# Signal processing
SAMPLE_RATE = 16000
PREEMPHASIS_ALPHA = 0.97
FRAME_LEN = 0.025
FRAME_STEP = 0.01
NUM_FFT = 512
BUCKET_STEP = 1
MAX_SEC = 10

# Model
MODEL_FILE = "voice_auth_model_cnn"
COST_METRIC = "cosine"  # euclidean or cosine
INPUT_SHAPE=(NUM_FFT,None,1)

# IO
EMBED_LIST_FILE = "data/embed"

# Recognition
THRESHOLD = 0.35
ULTRA_STRICT_THRESHOLD = 1e-06  # Ultra-strict threshold for near-perfect matches (0.000001)
STRONG_MATCH_THRESHOLD = 0.1    # Very confident match threshold
MODERATE_MATCH_THRESHOLD = 0.2  # Moderate confidence threshold  
MIN_DISTANCE_GAP = 0.05         # Minimum gap between closest and second closest
MIN_RELATIVE_CONFIDENCE = 0.2   # Minimum relative confidence (20%)