import React, { useState } from "react";
import { MessageSquare, Users, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import VoiceCloning from "../components/VoiceCloning";
import UserManagement from "../components/UserManagement";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("voice-cloning");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-slate-600 mt-1">
                Manage your AI voice cloning and user profiles
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-slate-200 bg-slate-50">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("voice-cloning")}
              className={`flex items-center space-x-3 px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === "voice-cloning"
                  ? "border-b-2 border-blue-500 text-blue-600 bg-white"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>AI Voice Cloning</span>
            </button>
            <button
              onClick={() => setActiveTab("user-management")}
              className={`flex items-center space-x-3 px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === "user-management"
                  ? "border-b-2 border-blue-500 text-blue-600 bg-white"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "voice-cloning" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  AI Voice Cloning
                </h2>
                <p className="text-slate-600">
                  Ask a question and hear it in your cloned voice
                </p>
              </div>
              <VoiceCloning />
            </div>
          )}

          {activeTab === "user-management" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  User Management
                </h2>
                <p className="text-slate-600">Manage enrolled voice profiles</p>
              </div>
              <UserManagement />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
