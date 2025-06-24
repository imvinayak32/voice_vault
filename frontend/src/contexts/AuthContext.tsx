import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "../services/apiService";

interface User {
  id: string;
  name: string;
  voiceEnrolled: boolean;
  voiceCloned: boolean;
  jwtToken?: string;
  tokenExpiresAt?: Date;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  isJwtAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored auth data on app load
    const storedUser = localStorage.getItem("voicevault_user");
    const jwtToken = apiService.getJwtToken();

    if (storedUser) {
      const userData = JSON.parse(storedUser);

      // Check if JWT token is available and not expired
      if (jwtToken && userData.tokenExpiresAt) {
        const expiresAt = new Date(userData.tokenExpiresAt);
        if (expiresAt > new Date()) {
          setUser(userData);
        } else {
          // Token expired, clear auth data
          logout();
        }
      } else if (!jwtToken) {
        // No JWT token, user needs to authenticate
        setUser({ ...userData, jwtToken: undefined });
      }
    }
  }, []);

  const login = (userData: User) => {
    // Calculate token expiration time (24 hours from now)
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

    const userWithExpiry = {
      ...userData,
      tokenExpiresAt,
    };

    setUser(userWithExpiry);
    localStorage.setItem("voicevault_user", JSON.stringify(userWithExpiry));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("voicevault_user");
    apiService.logout(); // Clear JWT token from API service
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("voicevault_user", JSON.stringify(updatedUser));
    }
  };

  // Check if user has basic profile (enrolled)
  const isAuthenticated = !!user && user.voiceEnrolled;

  // Check if user has valid JWT token for voice cloning
  const isJwtAuthenticated = isAuthenticated && !!apiService.getJwtToken();

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        isAuthenticated,
        isJwtAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
