import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react';

interface AudioRecorderProps {
  onAudioRecorded: (file: File) => void;
  maxDuration?: number;
}

export default function AudioRecorder({ onAudioRecorded, maxDuration = 30 }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Create file and call callback
        const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
        onAudioRecorded(file);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setDuration(0);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Waveform Visualization */}
      <div className="bg-gradient-to-br from-slate-100 to-blue-100 rounded-2xl p-8 mb-6 border border-slate-200">
        <div className="flex items-center justify-center h-24">
          {isRecording ? (
            <div className="flex items-center space-x-1">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-blue-600 to-purple-600 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 50 + 15}px`,
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          ) : audioUrl ? (
            <div className="flex items-center space-x-1">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-slate-400 rounded-full"
                  style={{ height: `${Math.random() * 50 + 15}px` }}
                />
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-center">
              <Mic className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-medium">Ready to record</p>
            </div>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <span className="text-3xl font-mono text-slate-700 font-bold">
          {formatTime(isRecording ? recordingTime : duration)}
        </span>
        {maxDuration && (
          <span className="text-slate-500 ml-3 text-lg">
            / {formatTime(maxDuration)}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-6">
        {!audioUrl ? (
          /* Recording Controls */
          <>
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <Mic className="w-8 h-8" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full flex items-center justify-center transition-all shadow-xl animate-pulse"
              >
                <Square className="w-8 h-8" />
              </button>
            )}
          </>
        ) : (
          /* Playback Controls */
          <>
            <button
              onClick={resetRecording}
              className="w-14 h-14 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </button>

            <div className="w-14 h-14 flex items-center justify-center">
              <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-lg" />
            </div>
          </>
        )}
      </div>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(Math.floor(audioRef.current.duration));
            }
          }}
        />
      )}

      {/* Status Text */}
      <div className="text-center mt-6">
        <p className="text-sm text-slate-600">
          {isRecording ? 'Recording in progress...' : 
           audioUrl ? 'Recording complete - Click play to review' :
           'Click the microphone to start recording'}
        </p>
      </div>
    </div>
  );
}