# Authentication Setup Documentation

## Overview

This document describes the authentication system implemented for the Patrick Travel Services mobile app, including email/password authentication and Google OAuth 2.0 integration.

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Setup Instructions](#setup-instructions)
4. [Google OAuth 2.0 Configuration](#google-oauth-20-configuration)
5. [Authentication Flow](#authentication-flow)
6. [Security Measures](#security-measures)
7. [Usage Examples](#usage-examples)

---

## Architecture

The authentication system uses a hybrid approach:

```
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
   ┌───▼────┐      ┌─────▼──────┐    ┌─────▼────┐
   │Firebase│      │Backend API │    │ Google   │
   │  Auth  │      │(Next.js)   │    │ OAuth    │
   └───┬────┘      └─────┬──────┘    └─────┬────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                     │
            ┌────────▼─────────┐
            │  PostgreSQL DB   │
            │   (User Data)    │
            └──────────────────┘
```

### Components

1. **Firebase Authentication**: Handles user authentication with email/password and Google OAuth
2. **Backend API**: Manages user data synchronization with PostgreSQL
3. **Secure Storage**: Stores authentication tokens and user data securely
4. **Zustand Store**: Global state management for auth state

---

## Features

### ✅ Email/Password Authentication
- User registration with email verification
- Secure login with password hashing
- Password recovery/reset
- Remember me functionality
- Token-based session management

### ✅ Google OAuth 2.0
- One-tap Google Sign-In
- Cross-platform support (iOS, Android, Web)
- Automatic user profile sync
- Seamless integration with Firebase

### ✅ Session Management
- JWT-based authentication
- Automatic token refresh
- Secure token storage using Expo SecureStore
- Session persistence across app restarts

### ✅ Security Features
- Encrypted token storage
- HTTPS-only communication
- Token expiration handling
- Biometric authentication support (optional)

---

## Setup Instructions

### Prerequisites

1. Firebase project configured
2. Google Cloud Console project with OAuth credentials
3. Backend API running with authentication endpoints

### Environment Variables

Create a `.env` file in the mobile directory:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Google OAuth 2.0 Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
```

### Installation

```bash
# Install dependencies
pnpm install

# The following packages are required for authentication:
# - firebase
# - @react-native-google-signin/google-signin (alternative)
# - expo-auth-session (for Google OAuth)
# - expo-secure-store (for token storage)
# - expo-web-browser (for OAuth)
```

---

## Google OAuth 2.0 Configuration

### Step 1: Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** > **Sign-in method**
4. Enable **Google** sign-in provider
5. Add your support email

### Step 2: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Create OAuth 2.0 Client IDs:

#### Web Client ID
```
Application type: Web application
Authorized JavaScript origins: https://your-domain.com
Authorized redirect URIs: https://your-domain.com/__/auth/handler
```

#### iOS Client ID
```
Application type: iOS
Bundle ID: com.patricktravel.mobile (from app.json)
```

#### Android Client ID
```
Application type: Android
Package name: com.patricktravel.mobile
SHA-1 certificate fingerprint: (from your keystore)
```

### Step 3: Get SHA-1 Fingerprint (Android)

**For Development:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**For Production:**
```bash
keytool -list -v -keystore /path/to/your/release.keystore
```

### Step 4: Add Client IDs to Environment Variables

Copy the Client IDs to your `.env` file as shown in the setup instructions above.

---

## Authentication Flow

### Email/Password Login

```
1. User enters email and password
   ↓
2. App validates input using Zod schema
   ↓
3. Send credentials to Firebase Auth
   ↓
4. Firebase returns auth token
   ↓
5. Send token to backend API
   ↓
6. Backend validates and syncs user data
   ↓
7. Store tokens in Secure Storage
   ↓
8. Update auth store (Zustand)
   ↓
9. Register push notification token
   ↓
10. Navigate to home screen
```

### Google OAuth Login

```
1. User taps "Continue with Google"
   ↓
2. App initiates OAuth flow (expo-auth-session)
   ↓
3. User authenticates with Google
   ↓
4. Google returns ID token and access token
   ↓
5. App exchanges tokens with Firebase
   ↓
6. Firebase creates/returns user
   ↓
7. Send tokens to backend API
   ↓
8. Backend syncs Google user data
   ↓
9. Store tokens in Secure Storage
   ↓
10. Update auth store
   ↓
11. Register push notification token
   ↓
12. Navigate to home screen
```

### Token Refresh Flow

```
1. App makes API request
   ↓
2. API returns 401 (token expired)
   ↓
3. Axios interceptor catches error
   ↓
4. Get refresh token from Secure Storage
   ↓
5. Request new access token
   ↓
6. Store new access token
   ↓
7. Retry original request
   ↓
8. If refresh fails, logout user
```

---

## Security Measures

### Token Storage

- **Access Token**: Stored in Expo SecureStore (encrypted at rest)
- **Refresh Token**: Stored in Expo SecureStore (encrypted at rest)
- **User Data**: Stored in Expo SecureStore

### Token Lifecycle

- **Access Token Expiry**: 15 minutes (configurable in backend)
- **Refresh Token Expiry**: 7 days (configurable in backend)
- **Automatic Refresh**: Handled by Axios interceptor
- **Token Invalidation**: On logout or manual revocation

### Network Security

- HTTPS-only in production
- Certificate pinning (optional, for extra security)
- Request signing (optional)

### Input Validation

- Email format validation
- Password strength requirements (min 8 characters)
- XSS protection (input sanitization)
- SQL injection prevention (parameterized queries)

---

## Usage Examples

### Using Auth Store

```typescript
import { useAuthStore } from '../../stores/auth/authStore';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const handleLogin = async () => {
    const success = await login({
      email: 'user@example.com',
      password: 'SecurePass123',
    });

    if (success) {
      console.log('Logged in successfully');
    }
  };

  return (
    <View>
      {isAuthenticated ? (
        <Text>Welcome, {user?.firstName}!</Text>
      ) : (
        <Button onPress={handleLogin}>Login</Button>
      )}
    </View>
  );
}
```

### Using Auth Hook

```typescript
import { useAuth } from '../hooks/useAuth';

function LoginScreen() {
  const { login, isLoading, error } = useAuth();

  const onSubmit = async (data) => {
    const success = await login(data);
    if (success) {
      // Navigate to home
    }
  };

  return (
    <View>
      <Input label="Email" />
      <Input label="Password" secureTextEntry />
      <Button onPress={onSubmit} loading={isLoading}>
        Sign In
      </Button>
      {error && <Text>{error}</Text>}
    </View>
  );
}
```

### Google OAuth Integration

```typescript
import { useGoogleAuth, handleGoogleAuthResponse } from '../lib/auth/googleAuth';
import { useAuthStore } from '../stores/auth/authStore';

function LoginScreen() {
  const { promptAsync } = useGoogleAuth();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const onGoogleSignIn = async () => {
    const response = await promptAsync();
    const result = await handleGoogleAuthResponse(response);
    
    if (result.success && result.idToken) {
      await loginWithGoogle(result.idToken, result.accessToken);
    }
  };

  return (
    <Button onPress={onGoogleSignIn}>
      Continue with Google
    </Button>
  );
}
```

### Protected Routes

```typescript
import { useAuth } from '../hooks/useAuth';
import { Redirect } from 'expo-router';

export function useGuestOnly() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
}

export function useAuthRequired() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
}
```

---

## File Structure

```
mobile/
├── stores/
│   └── auth/
│       └── authStore.ts              # Zustand auth store
├── lib/
│   ├── auth/
│   │   └── googleAuth.ts             # Google OAuth utilities
│   ├── firebase/
│   │   └── config.ts                 # Firebase configuration
│   ├── storage/
│   │   └── secureStorage.ts          # Secure token storage
│   └── api/
│       └── auth.api.ts               # Auth API endpoints
├── features/
│   └── auth/
│       ├── hooks/
│       │   └── useAuth.ts            # Auth hooks
│       ├── schemas/
│       │   └── authSchemas.ts        # Validation schemas
│       └── screens/
│           ├── LoginScreen.tsx       # Login screen with Google OAuth
│           ├── RegisterScreen.tsx    # Registration screen
│           └── ForgotPasswordScreen.tsx
└── app/
    └── (auth)/
        ├── login.tsx
        ├── register.tsx
        └── forgot-password.tsx
```

---

## API Endpoints

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login with email/password |
| `/auth/google` | POST | Login with Google OAuth |
| `/auth/logout` | POST | Logout user |
| `/auth/refresh-token` | POST | Refresh access token |
| `/auth/forgot-password` | POST | Request password reset |
| `/auth/reset-password` | POST | Reset password |
| `/auth/verify-email` | POST | Verify email address |
| `/auth/me` | GET | Get current user |
| `/users/push-token` | POST | Update push notification token |

---

## Troubleshooting

### Common Issues

**Issue: Google Sign-In not working**
- Verify all Client IDs are correct in `.env`
- Check SHA-1 fingerprint is added to Firebase console (Android)
- Ensure bundle ID matches in Firebase and app.json (iOS)

**Issue: Token expired error**
- Check if refresh token is being stored correctly
- Verify backend token expiry settings
- Ensure Axios interceptor is configured properly

**Issue: Cannot store tokens on iOS**
- Check if device has passcode enabled (required for SecureStore)
- Verify app has necessary permissions

**Issue: Firebase connection error**
- Verify Firebase config in `.env`
- Check internet connection
- Ensure Firebase project is active

---

## Best Practices

1. **Never** store sensitive data (passwords, tokens) in plain text
2. **Always** use HTTPS in production
3. **Implement** proper error handling
4. **Use** token refresh to maintain session
5. **Clear** tokens on logout
6. **Validate** all user inputs
7. **Test** authentication flow on both platforms (iOS & Android)
8. **Monitor** authentication errors and failed login attempts

---

## Next Steps

- [ ] Implement biometric authentication (Face ID / Touch ID)
- [ ] Add multi-factor authentication (MFA)
- [ ] Implement social login with Apple Sign-In
- [ ] Add account deletion flow (GDPR compliance)
- [ ] Implement email verification flow
- [ ] Add session timeout warnings
- [ ] Implement device management (view/revoke sessions)

---

**Last Updated:** October 19, 2025  
**Version:** 1.0.0  
**Author:** Senior Mobile Developer


