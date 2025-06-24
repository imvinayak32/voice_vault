import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Upload, CheckCircle, AlertCircle, Loader, ArrowLeft, Play, Pause } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AudioRecorder from '../components/audio/AudioRecorder';
import { apiService } from '../services/apiService';

export default function VoiceCloning() {
  const [step, setStep] = useState(1); // 1: Instructions, 2: Recording, 3: Processing, 4: Complete
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentRecording, setCurrentRecording] = useState(0);
  
  const { user, updateUser } = useAuth();

  const prompts = [
    "The quick brown fox jumps over the lazy dog.",
    "She sells seashells by the seashore and the shells she sells are surely seashells.",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
    "Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked.",
    "I wish to wish the wish you wish to wish, but if you wish the wish the witch wishes, I won't wish the wish you wish to wish."
  ];

  const handleAudioRecorded = (file: File) => {
    const newFiles = [...audioFiles];
    newFiles[currentRecording] = file;
    setAudioFiles(newFiles);
  };

  const nextRecording = () => {
    if (currentRecording < prompts.length - 1) {
      setCurrentRecording(currentRecording + 1);
    }
  };

  const prevRecording = () => {
    if (currentRecording > 0) {
      setCurrentRecording(currentRecording - 1);
    }
  };

  const handleStartCloning = async () => {
    if (audioFiles.length < 3) {
      setError('Please record at least 3 voice samples');
      return;
    }

    setStep(3);
    setIsProcessing(true);
    setError('');

    try {
      // Simulate voice cloning process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      updateUser({ voiceCloned: true });
      setStep(4);
    } catch (err) {
      setError('Voice cloning failed. Please try again.');
      setStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  if (user?.voiceCloned && step !== 4) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-6">Voice Clone Ready!</h1>
          <p className="text-xl text-slate-600 mb-10">Your voice has been successfully cloned and is ready to use.</p>
          <div className="flex justify-center space-x-6">
            <Link
              to="/voice-testing"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Test Your Voice
            </Link>
            <Link
              to="/dashboard"
              className="bg-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-slate-900">Voice Cloning</h1>
        <p className="text-slate-600 mt-3 text-lg">Create a digital twin of your voice for personalized experiences</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-16">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((num) => (
            <React.Fragment key={num}>
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                step >= num ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {num}
              </div>
              {num < 4 && (
                <div className={`w-20 h-1 rounded-full ${step > num ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-slate-200'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {step === 1 && (
        /* Step 1: Instructions */
        <div className="bg-white rounded-3xl shadow-xl p-10">
          <div className="text-center mb-10">
            <Mic className="w-20 h-20 text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Let's Clone Your Voice</h2>
            <p className="text-slate-600 max-w-3xl mx-auto text-lg">
              To create an accurate voice clone, we'll need you to record several sentences. 
              This process typically takes 5-10 minutes and will capture the unique characteristics of your voice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mic className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-3 text-lg">Clear Audio</h3>
              <p className="text-slate-600">Speak clearly in a quiet environment</p>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-3 text-lg">Multiple Samples</h3>
              <p className="text-slate-600">Record 5 different sentences</p>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-slate-50 to-emerald-50 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-3 text-lg">High Quality</h3>
              <p className="text-slate-600">Ensure consistent tone and pace</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setStep(2)}
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white px-10 py-4 rounded-xl font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Start Recording
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        /* Step 2: Recording */
        <div className="bg-white rounded-3xl shadow-xl p-10">
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-900">Recording Session</h2>
              <span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
                {currentRecording + 1} of {prompts.length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${((currentRecording + 1) / prompts.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 mb-10 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-6 text-lg">Please read the following sentence:</h3>
            <p className="text-xl text-slate-700 italic leading-relaxed font-medium">
              "{prompts[currentRecording]}"
            </p>
          </div>

          <div className="mb-10">
            <AudioRecorder onAudioRecorded={handleAudioRecorded} key={currentRecording} />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={prevRecording}
              disabled={currentRecording === 0}
              className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              {prompts.map((_, index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full ${
                    audioFiles[index] ? 'bg-emerald-500' : 
                    index === currentRecording ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>

            {currentRecording < prompts.length - 1 ? (
              <button
                onClick={nextRecording}
                disabled={!audioFiles[currentRecording]}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleStartCloning}
                disabled={audioFiles.filter(Boolean).length < 3}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white rounded-xl font-medium hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Start Cloning
              </button>
            )}
          </div>

          {error && (
            <div className="mt-8 flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        /* Step 3: Processing */
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
          <Loader className="w-20 h-20 text-blue-600 mx-auto mb-8 animate-spin" />
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Creating Your Voice Clone</h2>
          <p className="text-slate-600 mb-10 text-lg max-w-2xl mx-auto">
            Our AI is analyzing your voice patterns and creating your personalized voice model. 
            This usually takes 2-3 minutes.
          </p>
          <div className="max-w-md mx-auto">
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 h-3 rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Processing voice samples...</p>
          </div>
        </div>
      )}

      {step === 4 && (
        /* Step 4: Complete */
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Voice Clone Complete!</h2>
          <p className="text-slate-600 mb-10 max-w-3xl mx-auto text-lg">
            Congratulations! Your voice has been successfully cloned. You can now use it to generate 
            personalized audio content with any text you want.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              to="/voice-testing"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Test Your Voice Clone
            </Link>
            <Link
              to="/dashboard"
              className="bg-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}