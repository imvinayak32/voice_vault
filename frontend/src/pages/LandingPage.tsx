import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mic, Zap, Lock, ArrowRight, CheckCircle, AudioWaveform as Waveform } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Shield,
      title: "Voice-Only Authentication",
      description: "Login securely using only your unique voice signature - no passwords needed."
    },
    {
      icon: Mic,
      title: "Advanced Voice Cloning",
      description: "Create a digital twin of your voice for personalized audio experiences."
    },
    {
      icon: Zap,
      title: "Lightning Fast Recognition",
      description: "Instant voice authentication and synthesis in under 2 seconds."
    },
    {
      icon: Lock,
      title: "Military-Grade Security",
      description: "Your voice data is encrypted and protected with enterprise-level security."
    }
  ];

  const benefits = [
    "No passwords to remember or forget",
    "Biometric-level voice security",
    "Seamless authentication experience",
    "Real-time voice synthesis",
    "Privacy-first architecture"
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full border border-blue-200">
                <Waveform className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Pure Voice Authentication</span>
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="block text-slate-900">Your Voice is Your</span>
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
                Digital Key
              </span>
            </h1>
            
            <p className="mt-6 max-w-3xl mx-auto text-xl text-slate-600 leading-relaxed">
              Experience the future of authentication with Voice Vault. Secure access and personalized 
              voice cloning powered by advanced AI - all through your unique voice signature.
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                to="/enroll"
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl"
              >
                Enroll Your Voice
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Mic className="mr-2 w-5 h-5" />
                Voice Login
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur-2xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-r from-purple-400 to-emerald-400 rounded-full blur-xl opacity-15 animate-pulse delay-500"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Why Choose Voice Vault?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Revolutionary voice technology that puts security, privacy, and user experience first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-8 bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 via-purple-50 to-emerald-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Built for Tomorrow
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need for secure, voice-powered digital experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-4 p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 font-medium text-lg">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/enroll"
              className="inline-flex items-center justify-center px-10 py-4 text-xl font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 hover:from-emerald-700 hover:via-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl"
            >
              Start Your Voice Journey
              <ArrowRight className="ml-3 w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold">Voice Vault</span>
          </div>
          <p className="text-slate-400 mb-8 text-lg">
            Secure voice authentication and cloning platform for the digital age.
          </p>
          <div className="flex justify-center space-x-8 text-slate-400">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition-colors">Contact Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}