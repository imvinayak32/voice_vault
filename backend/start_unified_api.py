#!/usr/bin/env python3
"""
Startup script for the Unified Voice Authentication & Cloning API
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add the current directory to Python path to ensure imports work
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Add voice_auth and voice_cloning directories to Python path
sys.path.insert(0, str(current_dir / "voice_auth"))
sys.path.insert(0, str(current_dir / "voice_cloning"))

# Set working directory to backend
os.chdir(current_dir)

if __name__ == "__main__":
    print("Starting Unified Voice Authentication & Cloning API...")
    print("Available endpoints:")
    print("  - POST /enroll - Enroll a new user")
    print("  - POST /authenticate - Authenticate a user")
    print("  - POST /clone-voice - Clone voice (requires JWT)")
    print("  - GET /users - List enrolled users")
    print("  - DELETE /users/{user_name} - Delete a user")
    print("  - GET / - API information")
    print()
    print("API Documentation available at: http://localhost:8000/docs")
    print("OpenAPI JSON: http://localhost:8000/openapi.json")
    print()
    
    # Start the server
    uvicorn.run(
        "unified_voice_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 