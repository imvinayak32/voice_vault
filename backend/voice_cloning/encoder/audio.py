from scipy.ndimage.morphology import binary_dilation
from encoder.params_data import *
from pathlib import Path
from typing import Optional, Union
from warnings import warn
import warnings
import numpy as np
import librosa
import struct
import tempfile
import os

try:
    from pydub import AudioSegment
    HAS_PYDUB = True
except ImportError:
    HAS_PYDUB = False

try:
    import webrtcvad
except:
    warn("Unable to import 'webrtcvad'. This package enables noise removal and is recommended.")
    webrtcvad=None

int16_max = (2 ** 15) - 1


def load_audio_robust(fpath_or_wav: Union[str, Path, np.ndarray], target_sr: int = None) -> tuple:
    """
    Robustly loads audio from various formats. Handles formats that SoundFile doesn't support
    by converting them using pydub when available.
    
    :param fpath_or_wav: filepath to audio file or numpy array
    :param target_sr: target sampling rate
    :return: tuple of (audio_array, sampling_rate)
    """
    if isinstance(fpath_or_wav, str) or isinstance(fpath_or_wav, Path):
        fpath = Path(fpath_or_wav)
        
        # Try librosa first (this will use SoundFile if supported, then fall back to audioread)
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", UserWarning)  # Convert warnings to exceptions
                wav, sr = librosa.load(str(fpath), sr=target_sr)
                return wav, sr
        except (UserWarning, Exception) as e:
            # If librosa failed due to SoundFile issues and we have pydub, use it
            if HAS_PYDUB and "PySoundFile failed" in str(e):
                return load_with_pydub(fpath, target_sr)
            else:
                # For other errors or if pydub not available, suppress warnings and use audioread
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore", message="PySoundFile failed. Trying audioread instead.")
                    wav, sr = librosa.load(str(fpath), sr=target_sr)
                    return wav, sr
    else:
        # It's already a numpy array
        return fpath_or_wav, target_sr


def load_with_pydub(fpath: Path, target_sr: int = None) -> tuple:
    """
    Load audio using pydub, which supports many more formats than SoundFile.
    Converts to WAV format that SoundFile can handle.
    """
    try:
        # Load with pydub
        audio_segment = AudioSegment.from_file(str(fpath))
        
        # Convert to mono if stereo
        if audio_segment.channels > 1:
            audio_segment = audio_segment.set_channels(1)
            
        # Set sample rate if specified
        if target_sr:
            audio_segment = audio_segment.set_frame_rate(target_sr)
            
        # Convert to numpy array
        samples = np.array(audio_segment.get_array_of_samples(), dtype=np.float32)
        
        # Normalize to [-1, 1] range
        if audio_segment.sample_width == 1:  # 8-bit
            samples = samples / 128.0 - 1.0
        elif audio_segment.sample_width == 2:  # 16-bit
            samples = samples / 32768.0
        elif audio_segment.sample_width == 4:  # 32-bit
            samples = samples / 2147483648.0
        else:
            samples = samples / np.max(np.abs(samples))  # Generic normalization
            
        return samples, audio_segment.frame_rate
        
    except Exception as e:
        print(f"Warning: pydub failed to load {fpath}: {e}")
        # Fall back to librosa with warning suppression
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="PySoundFile failed. Trying audioread instead.")
            return librosa.load(str(fpath), sr=target_sr)


def preprocess_wav(fpath_or_wav: Union[str, Path, np.ndarray],
                   source_sr: Optional[int] = None,
                   normalize: Optional[bool] = True,
                   trim_silence: Optional[bool] = True):
    """
    Applies the preprocessing operations used in training the Speaker Encoder to a waveform 
    either on disk or in memory. The waveform will be resampled to match the data hyperparameters.

    :param fpath_or_wav: either a filepath to an audio file (many extensions are supported, not 
    just .wav), either the waveform as a numpy array of floats.
    :param source_sr: if passing an audio waveform, the sampling rate of the waveform before 
    preprocessing. After preprocessing, the waveform's sampling rate will match the data 
    hyperparameters. If passing a filepath, the sampling rate will be automatically detected and 
    this argument will be ignored.
    """
    # Load the wav from disk if needed
    if isinstance(fpath_or_wav, str) or isinstance(fpath_or_wav, Path):
        wav, source_sr = load_audio_robust(fpath_or_wav, target_sr=None)
    else:
        wav = fpath_or_wav
    
    # Resample the wav if needed
    if source_sr is not None and source_sr != sampling_rate:
        try:
            # Try new librosa syntax (v0.9.0+)
            wav = librosa.resample(wav, orig_sr=source_sr, target_sr=sampling_rate)
        except TypeError:
            # Fall back to old syntax for older librosa versions
            wav = librosa.resample(wav, source_sr, sampling_rate)
        
    # Apply the preprocessing: normalize volume and shorten long silences 
    if normalize:
        wav = normalize_volume(wav, audio_norm_target_dBFS, increase_only=True)
    if webrtcvad and trim_silence:
        wav = trim_long_silences(wav)
    
    return wav


def wav_to_mel_spectrogram(wav):
    """
    Derives a mel spectrogram ready to be used by the encoder from a preprocessed audio waveform.
    Note: this not a log-mel spectrogram.
    """
    try:
        # Try new librosa syntax (v0.8.0+)
        frames = librosa.feature.melspectrogram(
            y=wav,
            sr=sampling_rate,
            n_fft=int(sampling_rate * mel_window_length / 1000),
            hop_length=int(sampling_rate * mel_window_step / 1000),
            n_mels=mel_n_channels
        )
    except TypeError:
        # Fall back to old syntax for older librosa versions
        frames = librosa.feature.melspectrogram(
            wav,
            sampling_rate,
            n_fft=int(sampling_rate * mel_window_length / 1000),
            hop_length=int(sampling_rate * mel_window_step / 1000),
            n_mels=mel_n_channels
        )
    return frames.astype(np.float32).T


def trim_long_silences(wav):
    """
    Ensures that segments without voice in the waveform remain no longer than a 
    threshold determined by the VAD parameters in params.py.

    :param wav: the raw waveform as a numpy array of floats 
    :return: the same waveform with silences trimmed away (length <= original wav length)
    """
    # Compute the voice detection window size
    samples_per_window = (vad_window_length * sampling_rate) // 1000
    
    # Trim the end of the audio to have a multiple of the window size
    wav = wav[:len(wav) - (len(wav) % samples_per_window)]
    
    # Convert the float waveform to 16-bit mono PCM
    pcm_wave = struct.pack("%dh" % len(wav), *(np.round(wav * int16_max)).astype(np.int16))
    
    # Perform voice activation detection
    voice_flags = []
    vad = webrtcvad.Vad(mode=3)
    for window_start in range(0, len(wav), samples_per_window):
        window_end = window_start + samples_per_window
        voice_flags.append(vad.is_speech(pcm_wave[window_start * 2:window_end * 2],
                                         sample_rate=sampling_rate))
    voice_flags = np.array(voice_flags)
    
    # Smooth the voice detection with a moving average
    def moving_average(array, width):
        array_padded = np.concatenate((np.zeros((width - 1) // 2), array, np.zeros(width // 2)))
        ret = np.cumsum(array_padded, dtype=float)
        ret[width:] = ret[width:] - ret[:-width]
        return ret[width - 1:] / width
    
    audio_mask = moving_average(voice_flags, vad_moving_average_width)
    audio_mask = np.round(audio_mask).astype(bool)
    
    # Dilate the voiced regions
    audio_mask = binary_dilation(audio_mask, np.ones(vad_max_silence_length + 1))
    audio_mask = np.repeat(audio_mask, samples_per_window)
    
    return wav[audio_mask == True]


def normalize_volume(wav, target_dBFS, increase_only=False, decrease_only=False):
    if increase_only and decrease_only:
        raise ValueError("Both increase only and decrease only are set")
    dBFS_change = target_dBFS - 10 * np.log10(np.mean(wav ** 2))
    if (dBFS_change < 0 and increase_only) or (dBFS_change > 0 and decrease_only):
        return wav
    return wav * (10 ** (dBFS_change / 20))
