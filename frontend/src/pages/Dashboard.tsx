import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mic,
  AudioWaveform as Waveform,
  Settings,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Users,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import VoiceCloning from "../components/VoiceCloning";
import UserManagement from "../components/UserManagement";

export default function Dashboard() {
  const { user, isJwtAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const features = [
    {
      icon: Mic,
      title: "Voice Cloning",
      description:
        "Create a digital twin of your voice for personalized audio experiences",
      status: user?.voiceCloned ? "completed" : "available",
      link: "/voice-cloning",
      buttonText: user?.voiceCloned ? "Manage Clone" : "Start Cloning",
    },
    {
      icon: Waveform,
      title: "Voice Testing",
      description: "Test your cloned voice with custom text and audio playback",
      status: user?.voiceCloned ? "available" : "locked",
      link: "/voice-testing",
      buttonText: "Test Voice",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "available":
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "available":
        return "Available";
      default:
        return "Locked";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Welcome Section */}
      <div className="mb-12">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-blue-100 mt-2 text-lg">
                Manage your voice identity and cloning features
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-300" />
                <span className="font-semibold text-lg">Voice Enrolled</span>
              </div>
              <p className="text-blue-100">
                Your voice profile is active and secure
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-3">
                {user?.voiceCloned ? (
                  <CheckCircle className="w-6 h-6 text-emerald-300" />
                ) : (
                  <Clock className="w-6 h-6 text-yellow-300" />
                )}
                <span className="font-semibold text-lg">Voice Clone</span>
              </div>
              <p className="text-blue-100">
                {user?.voiceCloned
                  ? "Clone ready for use"
                  : "Clone not yet created"}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="w-6 h-6 text-blue-200" />
                <span className="font-semibold text-lg">Security</span>
              </div>
              <p className="text-blue-100">All systems operational</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <div className="flex items-center space-x-2 mt-2">
                    {getStatusIcon(feature.status)}
                    <span
                      className={`text-sm font-medium ${
                        feature.status === "completed"
                          ? "text-emerald-600"
                          : feature.status === "available"
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    >
                      {getStatusText(feature.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-600 mb-8 leading-relaxed text-lg">
              {feature.description}
            </p>

            <Link
              to={feature.status !== "locked" ? feature.link : "#"}
              className={`inline-flex items-center justify-center w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                feature.status !== "locked"
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 text-white hover:from-blue-700 hover:via-purple-700 hover:to-emerald-600 hover:shadow-lg transform hover:scale-105"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {feature.buttonText}
              {feature.status !== "locked" && (
                <ArrowRight className="ml-2 w-5 h-5" />
              )}
            </Link>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-16 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-10 border border-slate-200">
        <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
          Your Voice Journey
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">
              Voice Enrolled
            </h3>
            <p className="text-slate-600 mt-2">Authentication ready</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Mic className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">
              Voice Quality
            </h3>
            <p className="text-slate-600 mt-2">High fidelity</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Waveform className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">
              Clone Status
            </h3>
            <p className="text-slate-600 mt-2">
              {user?.voiceCloned ? "Active" : "Pending"}
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">Security</h3>
            <p className="text-slate-600 mt-2">Fully protected</p>
          </div>
        </div>
      </div>

      {/* Tabs for Advanced Features */}
      <div className="mt-16">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Tab Header */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-8 py-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("voice-cloning")}
                className={`flex items-center space-x-2 pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "voice-cloning"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI Voice Cloning</span>
              </button>
              <button
                onClick={() => setActiveTab("user-management")}
                className={`flex items-center space-x-2 pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "user-management"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === "overview" && (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                  Dashboard Overview
                </h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Your voice profile is successfully enrolled and secure. You
                  can now access advanced features like AI voice cloning and
                  user management using the tabs above.
                </p>
                {isJwtAuthenticated && (
                  <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200 max-w-md mx-auto">
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 text-sm font-medium">
                      JWT Authentication Active
                    </p>
                    <p className="text-green-700 text-xs">
                      You can access all premium features
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "voice-cloning" && <VoiceCloning />}

            {activeTab === "user-management" && <UserManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
