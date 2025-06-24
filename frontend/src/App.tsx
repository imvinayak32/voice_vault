import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import EnrollPage from './pages/EnrollPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import VoiceCloning from './pages/VoiceCloning';
import VoiceTesting from './pages/VoiceTesting';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
          <Header />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/enroll" element={<EnrollPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/voice-cloning" 
              element={
                <ProtectedRoute>
                  <VoiceCloning />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/voice-testing" 
              element={
                <ProtectedRoute>
                  <VoiceTesting />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;