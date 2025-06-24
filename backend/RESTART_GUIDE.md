# Backend Restart Guide

## Issue Diagnosis

You're experiencing a "NetworkError when attempting to fetch resource" which is typically caused by CORS (Cross-Origin Resource Sharing) issues. The backend is returning the correct response, but the browser is blocking the frontend from accessing it.

## Solution Applied

I've added CORS middleware to your FastAPI backend to allow requests from frontend development servers.

## Steps to Fix

### 1. Stop the Current Backend

If your backend is currently running, stop it with `Ctrl+C`.

### 2. Restart the Backend

Navigate to the backend directory and restart the server:

```bash
cd backend
python unified_voice_api.py
```

Or if you're using uvicorn directly:

```bash
cd backend
uvicorn unified_voice_api:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Verify CORS Configuration

Run the test script to verify CORS is working:

```bash
cd backend
python test_cors.py
```

You should see output like:

```
Testing Unified Voice API...
==================================================

1. Testing API Root Endpoint:
Status Code: 200
Headers: {...}
Response: {...}

2. Testing CORS Headers:
OPTIONS Status Code: 200
CORS Headers: {...}
✓ access-control-allow-origin: http://localhost:3000
✓ access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
✓ access-control-allow-headers: *
```

### 4. Test Frontend

Now try the enrollment process again from your frontend. You should see detailed logs in the browser console that will help us debug any remaining issues.

## Changes Made

### Backend (`unified_voice_api.py`)

1. **Added CORS middleware** with support for common frontend development ports:

   - `http://localhost:3000` (Create React App default)
   - `http://localhost:5173` (Vite default)
   - `http://127.0.0.1:3000`
   - `http://127.0.0.1:5173`

2. **Allowed methods**: GET, POST, PUT, DELETE, OPTIONS
3. **Allowed headers**: All headers (`*`)
4. **Allow credentials**: Enabled for JWT authentication

### Frontend (`apiService.ts`)

1. **Enhanced logging** for better debugging
2. **Improved error handling** with detailed error information
3. **Response validation** to catch parsing issues

## Debugging

If you still encounter issues, check the browser's developer console for:

1. **Network tab**: Look for the actual HTTP requests and responses
2. **Console tab**: Check for our detailed logging output
3. **CORS errors**: Look for specific CORS-related error messages

## Expected Behavior

After the fix, you should see:

1. Successful API calls in the Network tab
2. Detailed logging in the Console
3. Successful enrollment and redirect to dashboard
4. JWT token stored in localStorage

## Troubleshooting

### If CORS errors persist:

1. Check if you're running frontend on a different port
2. Add your specific frontend URL to the `allow_origins` list in `unified_voice_api.py`
3. Clear browser cache and localStorage

### If enrollment still fails:

1. Check the detailed console logs for specific errors
2. Verify the backend models are loaded correctly
3. Check file permissions for the voice_auth data directory

### If no redirect happens:

1. Check for JavaScript errors in console
2. Verify the login() function is being called
3. Check React Router setup
