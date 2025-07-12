# Google OAuth Setup Guide

## Prerequisites
1. Google Cloud Console account
2. A Google Cloud Project

## Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

## Step 2: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (for development)

## Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)
6. Copy the Client ID and Client Secret

## Step 4: Environment Variables
Add these to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Step 5: Frontend Integration
For the frontend, you'll need to:

1. Install Google OAuth library:
```bash
npm install @react-oauth/google
```

2. Initialize Google OAuth:
```javascript
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  return (
    <GoogleOAuthProvider clientId="your_google_client_id_here">
      {/* Your app components */}
    </GoogleOAuthProvider>
  );
}
```

3. Use Google Login component:
```javascript
import { GoogleLogin } from '@react-oauth/google';

function Login() {
  const handleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: credentialResponse.credential
        })
      });
      
      const data = await response.json();
      // Handle successful login
    } catch (error) {
      // Handle error
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => {
        console.log('Login Failed');
      }}
    />
  );
}
```

## API Endpoints

### Google Login
- **POST** `/api/auth/google`
- **Body**: `{ "token": "google_id_token" }`
- **Response**: JWT token and user data

### Link Google Account
- **POST** `/api/auth/link-google`
- **Headers**: `Authorization: Bearer <jwt_token>`
- **Body**: `{ "token": "google_id_token" }`
- **Response**: Updated user data

### Unlink Google Account
- **POST** `/api/auth/unlink-google`
- **Headers**: `Authorization: Bearer <jwt_token>`
- **Response**: Updated user data

## Security Notes
1. Always verify Google tokens on the backend
2. Use HTTPS in production
3. Store sensitive data securely
4. Implement proper error handling
5. Add rate limiting for OAuth endpoints

## Testing
1. Use Google's test accounts during development
2. Test both new user registration and existing user linking
3. Verify token validation works correctly
4. Test error scenarios (invalid tokens, blocked users, etc.) 