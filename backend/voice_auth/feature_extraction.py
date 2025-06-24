import os
import numpy as np
import pandas as pd
import tensorflow as tf
from scipy.spatial.distance import cdist, euclidean, cosine

from preprocess import get_fft_spectrum
import parameters as p


def buckets(max_time, steptime, frameskip):
    buckets = {}
    frames_per_sec = int(1/frameskip)
    end_frame = int(max_time*frames_per_sec)
    step_frame = int(steptime*frames_per_sec)
    for i in range(0, end_frame+1, step_frame):
        s = i
        s = np.floor((s-7+2)/2) + 1  # for first conv layer
        s = np.floor((s-3)/2) + 1    # for first maxpool layer
        s = np.floor((s-5+2)/2) + 1  # for second conv layer
        s = np.floor((s-3)/2) + 1    # for second maxpool layer
        s = np.floor((s-3+2)/1) + 1  # for third conv layer
        s = np.floor((s-3+2)/1) + 1  # for fourth conv layer
        s = np.floor((s-3+2)/1) + 1  # for fifth conv layer
        s = np.floor((s-3)/2) + 1    # for fifth maxpool layer
        s = np.floor((s-1)/1) + 1    # for sixth fully connected layer
        if s > 0:
            buckets[i] = int(s)
    return buckets


def get_embedding(model, wav_file, max_time):
    buckets_var = buckets(p.MAX_SEC, p.BUCKET_STEP, p.FRAME_STEP)
    signal = get_fft_spectrum(wav_file, buckets_var)
    # Convert to tensor and predict using SavedModel
    input_tensor = tf.constant(signal.reshape(1,*signal.shape,1), dtype=tf.float32)
    prediction = model(input_tensor)
    # Extract the output tensor and convert to numpy
    embedding = np.squeeze(list(prediction.values())[0].numpy())
    return embedding


def get_embedding_batch(model, wav_files, max_time):
    return [ get_embedding(model, wav_file, max_time) for wav_file in wav_files ]


def get_embeddings_from_list_file(model, list_file, max_time):
    buckets_var = buckets(p.MAX_SEC, p.BUCKET_STEP, p.FRAME_STEP)
    result = pd.read_csv(list_file, delimiter=",")
    result['features'] = result['filename'].apply(lambda x: get_fft_spectrum(x, buckets_var))
    def predict_embedding(x):
        input_tensor = tf.constant(x.reshape(1,*x.shape,1), dtype=tf.float32)
        prediction = model(input_tensor)
        return np.squeeze(list(prediction.values())[0].numpy())
    result['embedding'] = result['features'].apply(predict_embedding)
    return result[['filename','speaker','embedding']]
