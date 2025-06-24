import React, { useState, useRef } from "react";
import {
  Send,
  Play,
  Pause,
  Download,
  Loader,
  AlertCircle,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { apiService } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";
import AudioRecorder from "./audio/AudioRecorder";

export default function VoiceCloning() {
  const [question, setQuestion] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedAudio, setGeneratedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState("");
  const [seed, setSeed] = useState<number | undefined>(undefined);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { isJwtAuthenticated } = useAuth();

  const handleAudioRecorded = (file: File) => {
    setAudioFile(file);
  };

  const handleGenerateVoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isJwtAuthenticated) {
      setError(
        "Authentication required. Please authenticate your voice first."
      );
      return;
    }

    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    if (!audioFile) {
      setError("Please record a reference audio sample");
      return;
    }

    setIsGenerating(true);
    setError("");
    setGeminiResponse("");

    try {
      // Generate cloned voice with Gemini AI response
      const audioBlob = await apiService.cloneVoice(
        audioFile,
        question.trim(),
        seed
      );

      setGeneratedAudio(audioBlob);

      // Extract Gemini response from response headers if available
      // Note: In a real implementation, you might want to get this differently
      setGeminiResponse(`AI response generated for: "${question}"`);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Voice cloning failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const playGeneratedAudio = () => {
    if (generatedAudio && audioRef.current) {
      const url = URL.createObjectURL(generatedAudio);
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseGeneratedAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const downloadGeneratedAudio = () => {
    if (generatedAudio) {
      const url = URL.createObjectURL(generatedAudio);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voice_clone_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const resetForm = () => {
    setQuestion("");
    setAudioFile(null);
    setGeneratedAudio(null);
    setError("");
    setGeminiResponse("");
    setSeed(undefined);
    setIsPlaying(false);
  };

  // Sample questions for inspiration
  const sampleQuestions = [
    "What is artificial intelligence?",
    "How does machine learning work?",
    "Tell me about the future of technology",
    "Explain quantum computing in simple terms",
    "What are the benefits of renewable energy?",
  ];

  if (!isJwtAuthenticated) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-amber-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Authentication Required</span>
        </div>
        <p className="text-amber-700 mt-2">
          You need to authenticate your voice before using voice cloning
          features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              AI Voice Cloning
            </h3>
            <p className="text-slate-600 text-sm">
              Ask a question and hear it in your cloned voice
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerateVoice} className="space-y-6">
          {/* Question Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ask a Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything... The AI will answer and speak in your voice!"
              className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-500">
                {question.length}/1000 characters
              </span>
              {question.length > 800 && (
                <span className="text-xs text-amber-600">
                  Approaching character limit
                </span>
              )}
            </div>
          </div>

          {/* Sample Questions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Need inspiration? Try these:
            </label>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((sample, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setQuestion(sample)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Audio Recording */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Reference Audio (Your Voice Sample)
            </label>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                maxDuration={30}
              />
              {audioFile && (
                <div className="mt-3 flex items-center space-x-2 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Reference audio recorded</span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <details className="bg-slate-50 rounded-xl p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-3">
              Advanced Options
            </summary>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Random Seed (optional)
              </label>
              <input
                type="number"
                value={seed || ""}
                onChange={(e) =>
                  setSeed(e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="Enter seed for reproducible results"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Using the same seed will produce identical results
              </p>
            </div>
          </details>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="submit"
            disabled={isGenerating || !question.trim() || !audioFile}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Generating Voice Clone...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Generate Voice Clone</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Generated Audio Playback */}
      {generatedAudio && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-slate-900">
              Generated Voice Clone
            </h4>
            <button
              onClick={resetForm}
              className="text-slate-500 hover:text-slate-700 text-sm"
            >
              Start New
            </button>
          </div>

          {geminiResponse && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h5 className="text-sm font-medium text-blue-900 mb-2">
                AI Response:
              </h5>
              <p className="text-blue-800 text-sm">{geminiResponse}</p>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              onClick={isPlaying ? pauseGeneratedAudio : playGeneratedAudio}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-colors shadow-lg"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={downloadGeneratedAudio}
              className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>

          <audio
            ref={audioRef}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Usage Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">
          Voice Cloning Tips:
        </h4>
        <ul className="text-blue-800 text-sm space-y-2">
          <li>
            • Record clear, high-quality reference audio (at least 5 seconds)
          </li>
          <li>• Ask specific questions for better AI responses</li>
          <li>• Use the same recording environment as your enrollment</li>
          <li>• Try different questions to test voice consistency</li>
          <li>• Save generated audio files for later use</li>
        </ul>
      </div>
    </div>
  );
}
