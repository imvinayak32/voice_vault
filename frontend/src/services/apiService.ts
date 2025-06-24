// API service for unified voice authentication and cloning
export interface AuthResponse {
  authenticated: boolean;
  message: string;
  recognized_user?: string;
  jwt_token?: string;
  token_expires_in_hours?: number;
  distance?: number;
  confidence_score?: number;
  all_distances?: Record<string, number>;
  threshold?: number;
  closest_match?: string;
}

export interface EnrollResponse {
  status: string;
  message: string;
  user: string;
  jwt_token: string;
  token_expires_in_hours: number;
  original_format: string;
  processed_format: string;
}

export interface UserListResponse {
  enrolled_users: string[];
  count: number;
}

export interface DeleteUserResponse {
  status: string;
  message: string;
}

export interface ApiInfoResponse {
  message: string;
  endpoints: Record<string, string>;
}

class ApiService {
  private baseUrl = "http://localhost:8000";
  private jwtToken: string | null = null;

  constructor() {
    // Load JWT token from localStorage on initialization
    this.jwtToken = localStorage.getItem("voice_vault_jwt_token");
  }

  // Store JWT token
  private setJwtToken(token: string): void {
    this.jwtToken = token;
    localStorage.setItem("voice_vault_jwt_token", token);
  }

  // Clear JWT token
  private clearJwtToken(): void {
    this.jwtToken = null;
    localStorage.removeItem("voice_vault_jwt_token");
  }

  // Get current JWT token
  getJwtToken(): string | null {
    return this.jwtToken;
  }

  // Get authorization headers
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.jwtToken) {
      headers.Authorization = `Bearer ${this.jwtToken}`;
    }
    return headers;
  }

  // Handle API errors
  private async handleResponse<T>(response: Response): Promise<T> {
    console.log(`API Response: ${response.status} ${response.statusText}`);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
        console.error("API Error Details:", errorData);
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        // If we can't parse JSON, use the default error message
      }

      // Clear token if unauthorized
      if (response.status === 401) {
        this.clearJwtToken();
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    console.log("Content-Type:", contentType);

    if (contentType && contentType.includes("application/json")) {
      try {
        const jsonData = await response.json();
        console.log("Parsed JSON response:", jsonData);
        return jsonData;
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        throw new Error("Failed to parse response data");
      }
    } else {
      // For non-JSON responses (like audio files), return the response object
      return response as unknown as T;
    }
  }

  // Get API information
  async getApiInfo(): Promise<ApiInfoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      return await this.handleResponse<ApiInfoResponse>(response);
    } catch (error) {
      console.error("API info error:", error);
      throw new Error("Failed to fetch API information");
    }
  }

  // Enroll user with voice sample
  async enrollUser(name: string, audioFile: File): Promise<EnrollResponse> {
    console.log("Starting enrollment request...");
    console.log("Name:", name);
    console.log(
      "Audio file:",
      audioFile.name,
      audioFile.type,
      audioFile.size,
      "bytes"
    );
    console.log("API URL:", `${this.baseUrl}/enroll`);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("audio_file", audioFile);

      console.log("Sending enrollment request...");
      const response = await fetch(`${this.baseUrl}/enroll`, {
        method: "POST",
        body: formData,
      });

      console.log("Received response, processing...");
      const result = await this.handleResponse<EnrollResponse>(response);

      // Store JWT token if enrollment was successful
      if (result.jwt_token) {
        console.log("Storing JWT token...");
        this.setJwtToken(result.jwt_token);
      }

      console.log("Enrollment successful!");
      return result;
    } catch (error) {
      console.error("Enrollment error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Authenticate user with voice
  async authenticateUser(audioFile: File): Promise<AuthResponse> {
    try {
      const formData = new FormData();
      formData.append("audio_file", audioFile);

      const response = await fetch(`${this.baseUrl}/authenticate`, {
        method: "POST",
        body: formData,
      });

      const result = await this.handleResponse<AuthResponse>(response);

      // Store JWT token if authentication was successful
      if (result.authenticated && result.jwt_token) {
        this.setJwtToken(result.jwt_token);
      }

      return result;
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  // Clone voice with Gemini AI response (requires JWT authentication)
  async cloneVoice(
    audioFile: File,
    question: string,
    seed?: number
  ): Promise<Blob> {
    if (!this.jwtToken) {
      throw new Error("Authentication required. Please authenticate first.");
    }

    try {
      const formData = new FormData();
      formData.append("audio_file", audioFile);
      formData.append("question", question);

      if (seed !== undefined) {
        formData.append("seed", seed.toString());
      }

      const response = await fetch(`${this.baseUrl}/clone-voice`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        await this.handleResponse(response); // This will throw with proper error handling
      }

      return await response.blob();
    } catch (error) {
      console.error("Voice cloning error:", error);
      throw error;
    }
  }

  // List enrolled users
  async listUsers(): Promise<UserListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/users`);
      return await this.handleResponse<UserListResponse>(response);
    } catch (error) {
      console.error("List users error:", error);
      throw new Error("Failed to fetch enrolled users");
    }
  }

  // Delete an enrolled user
  async deleteUser(userName: string): Promise<DeleteUserResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/users/${encodeURIComponent(userName)}`,
        {
          method: "DELETE",
        }
      );

      return await this.handleResponse<DeleteUserResponse>(response);
    } catch (error) {
      console.error("Delete user error:", error);
      throw error;
    }
  }

  // Check if user is authenticated (has valid JWT token)
  isAuthenticated(): boolean {
    return !!this.jwtToken;
  }

  // Logout (clear JWT token)
  logout(): void {
    this.clearJwtToken();
  }

  // Get supported audio formats
  getSupportedAudioFormats(): string[] {
    return [".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg"];
  }

  // Validate audio file format
  isValidAudioFile(filename: string): boolean {
    if (!filename) return false;
    const ext = filename.toLowerCase().split(".").pop();
    return ext
      ? this.getSupportedAudioFormats().some(
          (format) => format.slice(1) === ext
        )
      : false;
  }
}

export const apiService = new ApiService();
