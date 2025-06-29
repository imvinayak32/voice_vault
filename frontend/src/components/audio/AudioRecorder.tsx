import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Upload,
  FileAudio,
} from "lucide-react";

interface AudioRecorderProps {
  onAudioRecorded: (file: File) => void;
  maxDuration?: number;
}

export default function AudioRecorder({
  onAudioRecorded,
  maxDuration = 30,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<"recording" | "upload">(
    "recording"
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Create file and call callback
        const file = new File([blob], "recording.wav", { type: "audio/wav" });
        onAudioRecorded(file);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
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
    setFileName(null);
    setAudioSource("recording");
  };

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith("audio/")) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setFileName(file.name);
      setAudioSource("upload");
      onAudioRecorded(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag and Drop / Waveform Visualization */}
      <div
        className={`bg-gradient-to-br ${
          isDragging
            ? "from-blue-200 to-purple-200 border-blue-400 border-2 border-dashed"
            : "from-slate-100 to-blue-100 border-slate-200"
        } rounded-2xl p-8 mb-6 border transition-all duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-center h-24">
          {isRecording ? (
            <div className="flex items-center space-x-1">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-blue-600 to-purple-600 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 50 + 15}px`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          ) : audioUrl ? (
            <div className="text-center">
              <div className="flex items-center space-x-1 mb-2">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-slate-400 rounded-full"
                    style={{ height: `${Math.random() * 50 + 15}px` }}
                  />
                ))}
              </div>
              {fileName && (
                <div className="flex items-center justify-center space-x-2">
                  <FileAudio className="w-4 h-4 text-slate-500" />
                  <p className="text-xs text-slate-600 font-medium truncate max-w-48">
                    {fileName}
                  </p>
                </div>
              )}
            </div>
          ) : isDragging ? (
            <div className="text-blue-600 text-center">
              <Upload className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-medium">Drop audio file here</p>
            </div>
          ) : (
            <div className="text-slate-500 text-center">
              <Mic className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-medium">Ready to record</p>
              <p className="text-xs text-slate-400 mt-1">
                or drag & drop audio file
              </p>
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
          /* Recording/Upload Controls */
          <>
            {!isRecording ? (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <div className="text-slate-400 font-medium">OR</div>
                <button
                  type="button"
                  onClick={openFileDialog}
                  className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <Upload className="w-8 h-8" />
                </button>
              </>
            ) : (
              <button
                type="button"
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
              type="button"
              onClick={resetRecording}
              className="w-14 h-14 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            <button
              type="button"
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
          {isRecording
            ? "Recording in progress..."
            : audioUrl
            ? audioSource === "upload"
              ? "Audio file uploaded - Click play to review"
              : "Recording complete - Click play to review"
            : "Record your voice or upload an audio file"}
        </p>
      </div>
    </div>
  );
}
