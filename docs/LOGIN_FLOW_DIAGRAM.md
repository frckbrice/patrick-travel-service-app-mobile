# Complete Login Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION (LoginScreen.tsx)                          │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ User enters email & password                          │    │
│    │ Clicks "Sign In" button                               │    │
│    │ → onSubmit() calls login(data)                        │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. AUTH STORE (authStore.ts)                                    │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ login(data) {                                         │    │
│    │   set({ isLoading: true, error: null })              │    │
│    │   // Firebase authentication                         │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. FIREBASE AUTHENTICATION (authStore.ts:151-159)              │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ signInWithEmailAndPassword(auth, email, password)    │    │
│    │                                                       │    │
│    │ Result: Firebase UserCredential                      │    │
│    │   ├─ firebaseToken = getIdToken()                   │    │
│    │   └─ firebaseRefreshToken = user.refreshToken        │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. BACKEND API CALL (authStore.ts:163)                         │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ authApi.login({})                                   │    │
│    │                                                       │    │
│    │ This triggers:                                       │    │
│    │   └─→ axios interceptor adds Firebase token         │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. REQUEST INTERCEPTOR (axios.ts:18-44)                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ apiClient.interceptors.request.use()                │    │
│    │                                                       │    │
│    │ Gets current Firebase user                           │    │
│    │ Gets fresh ID token                                   │    │
│    │ Adds to header:                                       │    │
│    │   Authorization: "Bearer <firebase-token>"           │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. HTTP REQUEST TO BACKEND                                      │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ POST /api/auth/login                                  │    │
│    │ Headers:                                              │    │
│    │   Authorization: "Bearer <firebase-token>"           │    │
│    │ Body: {}                                              │    │
│    │                                                       │    │
│    │ Backend:                                              │    │
│    │   1. Verifies Firebase token                         │    │
│    │   2. Syncs user data in DB                            │    │
│    │   3. Sets custom claims                               │    │
│    │   4. Returns: { user, token, refreshToken }         │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. RESPONSE HANDLING (authStore.ts:165-193)                    │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ if (response.success) {                             │    │
│    │   // Store tokens securely                           │    │
│    │   secureStorage.setAuthToken(firebaseToken)         │    │
│    │   secureStorage.setRefreshToken(refreshToken)       │    │
│    │   secureStorage.setUserData(user)                   │    │
│    │                                                       │    │
│    │   // Update app state                                │    │
│    │   set({                                              │    │
│    │     user,                                            │    │
│    │     token: firebaseToken,                           │    │
│    │     isAuthenticated: true                           │    │
│    │   })                                                 │    │
│    │ }                                                     │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. POST-LOGIN ACTIONS                                           │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ registerPushToken() // Register for notifications    │    │
│    │ promptEnableBiometric() // Optional biometric setup  │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. NAVIGATION                                                   │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ router.replace('/(tabs)')                           │    │
│    │                                                       │    │
│    │ User is now in the authenticated app!                 │    │
│    └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Technologies

### 1. **Firebase Authentication**
- Primary authentication service
- Validates email/password
- Provides ID tokens for backend verification
- Handles refresh tokens automatically

### 2. **Secure Storage**
- Uses `expo-secure-store` for encrypted storage
- Tokens stored securely on device
- User data persisted across app restarts

### 3. **Axios Interceptors**
- Automatically adds Firebase token to all API requests
- Handles token refresh automatically
- Manages 401 errors and re-authentication

### 4. **Zustand State Management**
- Centralized auth state
- Reactive updates across components
- Handles loading and error states

## Error Handling

### User-Friendly Error Messages
```typescript
// lib/utils/errorHandler.ts
sanitizeErrorMessage(error) {
  // Firebase: Error (auth/invalid-credential)
  // ↓ converts to ↓
  // "Invalid email or password. Please check your credentials."
}
```

## Security Features

1. **No Backend Details Exposed**: Firebase errors are sanitized
2. **Encrypted Storage**: Tokens stored in secure storage (encrypted)
3. **Token Refresh**: Automatic token refresh for expired tokens
4. **Token Validation**: Backend verifies every Firebase token

## Storage Locations

1. **Secure Storage** (Encrypted):
   - `auth_token` - Firebase ID token
   - `refresh_token` - Firebase refresh token
   - `user_data` - User profile data
   - `biometric_enabled` - Biometric auth setting

2. **AsyncStorage** (Unencrypted):
   - `onboarding_completed` - Onboarding status
   - `theme_preference` - Theme setting
   - `language_preference` - Language setting

