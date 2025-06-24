import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Type, Play, Pause, Download, Volume2, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

export default function VoiceTesting() {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { user } = useAuth();

  const sampleTexts = [
    "Hello, this is my cloned voice speaking. How does it sound?",
    "The weather today is absolutely beautiful with clear blue skies.",
    "Thank you for trying out Voice Vault's voice cloning technology.",
    "I hope you're having a wonderful day today!",
    "Voice cloning technology has come a long way in recent years."
  ];

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      setError('Please enter some text to generate audio');
      return;
    }

    setIsGenerating(true);
    setError('');
    setAudioUrl(null);

    try {
      const audioBlob = await apiService.cloneVoice(null, text);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      setError('Failed to generate audio. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = 'voice-clone-output.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const useSampleText = (sampleText: string) => {
    setText(sampleText);
  };

  if (!user?.voiceCloned) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Volume2 className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-6">Voice Clone Required</h1>
          <p className="text-xl text-slate-600 mb-10">
            You need to create a voice clone before you can test voice synthesis.
          </p>
          <Link
            to="/voice-cloning"
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Create Voice Clone
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-slate-900">Voice Testing</h1>
        <p className="text-slate-600 mt-3 text-lg">Test your cloned voice with custom text</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Text Input Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center space-x-4 mb-8">
              <Type className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-semibold text-slate-900">Enter Your Text</h2>
            </div>

            <div className="mb-8">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type the text you want to hear in your cloned voice..."
                className="w-full h-40 p-6 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-slate-500">{text.length}/500 characters</span>
                <button
                  onClick={handleGenerateAudio}
                  disabled={isGenerating || !text.trim()}
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white px-8 py-3 rounded-xl font-medium hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      <span>Generate Audio</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl mb-8">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Audio Player */}
            {audioUrl && (
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-6 text-lg">Generated Audio</h3>
                <div className="flex items-center space-x-6">
                  <button
                    onClick={handlePlayPause}
                    className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <div className="flex-1">
                    <div className="w-full bg-slate-300 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full w-0 transition-all duration-300"></div>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors"
                    title="Download audio"
                  >
                    <Download className="w-6 h-6" />
                  </button>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sample Texts Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Sample Texts</h3>
            <p className="text-slate-600 text-sm mb-8">
              Try these sample texts to test your voice clone
            </p>
            
            <div className="space-y-4">
              {sampleTexts.map((sampleText, index) => (
                <button
                  key={index}
                  onClick={() => useSampleText(sampleText)}
                  className="w-full text-left p-4 bg-gradient-to-br from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 rounded-xl transition-colors border border-slate-200 hover:border-slate-300"
                >
                  <p className="text-slate-700 text-sm leading-relaxed">"{sampleText}"</p>
                </button>
              ))}
            </div>

            <div className="mt-10 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-4">Tips for Best Results</h4>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>• Use natural punctuation</li>
                <li>• Keep sentences moderate length</li>
                <li>• Avoid special characters</li>
                <li>• Try different emotions and tones</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}