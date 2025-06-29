import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mic,
  Shield,
  AlertCircle,
  Loader,
  ArrowLeft,
  AudioWaveform as Waveform,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AudioRecorder from "../components/audio/AudioRecorder";
import { apiService } from "../services/apiService";

export default function LoginPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAudioRecorded = (file: File) => {
    setAudioFile(file);
  };

  const handleVoiceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setError("Please record your voice");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Validate audio file format
      if (!apiService.isValidAudioFile(audioFile.name)) {
        const supportedFormats = apiService
          .getSupportedAudioFormats()
          .join(", ");
        setError(
          `Unsupported audio format. Supported formats: ${supportedFormats}`
        );
        return;
      }

      const result = await apiService.authenticateUser(audioFile);

      if (result.authenticated && result.recognized_user) {
        // Create user object with authentication data
        const user = {
          id: Date.now().toString(),
          name: result.recognized_user,
          voiceEnrolled: true,
          voiceCloned: false,
          jwtToken: result.jwt_token,
        };

        login(user);
        navigate("/dashboard");
      } else {
        // Show specific error message with details
        let errorMsg = "Voice authentication failed.";

        // if (result.closest_match) {
        //   errorMsg += ` Closest match: ${result.closest_match}`;
        //   if (result.distance) {
        //     errorMsg += ` (distance: ${result.distance.toFixed(6)})`;
        //   }
        // }

        if (
          result.all_distances &&
          Object.keys(result.all_distances).length === 0
        ) {
          errorMsg = "No enrolled users found. Please enroll your voice first.";
        }

        setError(errorMsg);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-slate-900">Voice Login</h2>
          <p className="mt-3 text-slate-600">
            Authenticate securely with your voice
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
          <form onSubmit={handleVoiceLogin} className="space-y-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Waveform className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                Speak to Login
              </h3>
              <p className="text-slate-600">
                Say anything naturally - your voice is your password
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
              <AudioRecorder onAudioRecorded={handleAudioRecorded} />
            </div>

            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">
                Authentication Tips:
              </h4>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>• Speak clearly and naturally</li>
                <li>• Use the same tone as enrollment</li>
                <li>• Ensure minimal background noise</li>
                <li>• Speak for at least 3-5 seconds</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !audioFile}
              className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 space-x-3"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Authenticating Voice...</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>Authenticate with Voice</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              New to Voice Vault?{" "}
              <Link
                to="/enroll"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Enroll your voice here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
