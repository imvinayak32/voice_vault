import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mic,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AudioRecorder from "../components/audio/AudioRecorder";
import { apiService } from "../services/apiService";

export default function EnrollPage() {
  const [name, setName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Name, 2: Voice Recording

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleAudioRecorded = (file: File) => {
    setAudioFile(file);
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Enrollment form submitted");

    if (!audioFile) {
      setError("Please record your voice sample");
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
        setIsLoading(false);
        return;
      }

      console.log("Starting enrollment process...");
      // Enroll user with voice
      const result = await apiService.enrollUser(name, audioFile);
      console.log("Enrollment API call completed, result:", result);

      // Create user object with JWT token
      const user = {
        id: Date.now().toString(),
        name: result.user,
        voiceEnrolled: true,
        voiceCloned: false,
        jwtToken: result.jwt_token,
      };

      console.log("Logging in user:", user);
      login(user);

      console.log("Navigating to dashboard...");
      navigate("/dashboard");
    } catch (err) {
      console.error("Enrollment failed:", err);
      const error = err as Error;
      setError(error.message || "Failed to enroll. Please try again.");
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
          <h2 className="text-4xl font-bold text-slate-900">
            Enroll Your Voice
          </h2>
          <p className="mt-3 text-slate-600">
            Create your secure voice profile with Voice Vault
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= 1
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                1
              </div>
              <div
                className={`w-20 h-1 rounded-full ${
                  step > 1
                    ? "bg-gradient-to-r from-blue-600 to-purple-600"
                    : "bg-slate-200"
                }`}
              ></div>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= 2
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                2
              </div>
            </div>
          </div>

          {step === 1 ? (
            /* Step 1: Name Input */
            <div className="space-y-8">
              <div className="text-center">
                <User className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                  What's your name?
                </h3>
                <p className="text-slate-600">
                  We'll use this to identify your voice profile
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="Enter your full name"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Continue to Voice Recording
              </button>
            </div>
          ) : (
            /* Step 2: Voice Recording */
            <div className="space-y-8">
              <div className="text-center">
                <Mic className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                  Record Your Voice
                </h3>
                <p className="text-slate-600">
                  Speak clearly for 5-10 seconds to create your unique voice
                  signature
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
                <AudioRecorder onAudioRecorded={handleAudioRecorded} />

                {audioFile && (
                  <div className="mt-6 flex items-center justify-center space-x-2 text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Voice sample recorded successfully
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">
                  Recording Tips:
                </h4>
                <ul className="text-blue-800 text-sm space-y-2">
                  <li>• Speak in a quiet environment</li>
                  <li>• Use your natural speaking voice</li>
                  <li>• Say a few sentences clearly</li>
                  <li>• Avoid background noise</li>
                </ul>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-200 text-slate-700 py-4 px-6 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={isLoading || !audioFile}
                  className="flex-2 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Enrolling Voice...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      <span>Complete Enrollment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Already enrolled?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Voice login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
