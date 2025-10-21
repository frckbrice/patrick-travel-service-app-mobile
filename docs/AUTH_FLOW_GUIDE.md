# Authentication Flow Guide

## Overview

This mobile app uses **Firebase Authentication** as the primary identity provider, with a custom backend API for user management and authorization.

## Authentication Architecture

### Flow Diagram

```
User Input (email/password)
    ↓
Firebase Auth (signInWithEmailAndPassword)
    ↓
Get Firebase ID Token
    ↓
Backend API (/auth/login with Bearer token)
    ↓
Verify ID Token + Sync User in DB
    ↓
Return Custom Token + User Data
    ↓
Store in SecureStorage + Update App State
```

## Key Components

### 1. Login Flow

**File**: `features/auth/screens/LoginScreen.tsx`

**Process**:
1. User enters email and password
2. Sign in with Firebase: `signInWithEmailAndPassword(auth, email, password)`
3. Axios interceptor automatically adds Firebase ID token to request headers
4. Call backend: `POST /auth/login` (empty body, auth via Bearer token)
5. Backend verifies Firebase token, syncs user, returns custom token
6. Store tokens in SecureStorage
7. Register push notification token
8. Navigate to home screen

**Features**:
- ✅ Inline loader (button doesn't disappear)
- ✅ White semi-bold button text
- ✅ Consistent rounded inputs with theme colors
- ✅ Remember me checkbox
- ✅ Biometric login option (if enabled)
- ✅ Google OAuth integration

---

### 2. Registration Flow

**File**: `features/auth/screens/RegisterScreen.tsx`

**Process**:
1. User fills registration form (email, password, name, etc.)
2. Call backend: `POST /auth/register` with user data
3. Backend creates Firebase user + DB record
4. Redirect to verify-email page
5. User must verify email before login

**Features**:
- ✅ Inline loader with ActivityIndicator
- ✅ White semi-bold button text
- ✅ GDPR consent checkboxes (Terms & Privacy Policy)
- ✅ Password confirmation validation
- ✅ Consistent styling with login page

**GDPR Fields**:
```typescript
{
  consentedAt: string;     // ISO timestamp
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}
```

---

### 3. Email Verification

**File**: `app/(auth)/verify-email.tsx`

**Process**:
1. User receives verification email from Firebase
2. Clicks link in email → Firebase verifies automatically
3. On verify page, user can resend verification email
4. Enter email → validate → call `authApi.resendVerification(email)`
5. Show feedback (success/error) inline

**Features**:
- ✅ Email input with validation
- ✅ Resend button with inline loader
- ✅ Feedback messages (HelperText)
- ✅ "Go to Login" button (white semi-bold text)

**Important**: Firebase sends the verification email directly. The backend `resendVerification` endpoint triggers Firebase to resend it.

---

### 4. Forgot Password Flow

**File**: `features/auth/screens/ForgotPasswordScreen.tsx`

**Process**:
1. User enters email
2. Call Firebase directly: `sendPasswordResetEmail(auth, email)`
3. Firebase sends password reset email with oobCode
4. User clicks link → lands on web reset page
5. Web page calls `confirmPasswordReset(auth, oobCode, newPassword)`
6. User can now login with new password

**Features**:
- ✅ Inline loader (no disappearing button)
- ✅ White semi-bold button text
- ✅ Success screen with proper message
- ✅ Firebase handles email sending directly (no backend route needed)
- ✅ Comprehensive logging for debugging

**Success Message**:
> "We've sent you instructions to reset your password. Please check your inbox and spam folder."

**Important Notes**:
- ⚠️ **No API calls to your backend** - `sendPasswordResetEmail` communicates directly with Firebase servers
- ⚠️ **No backend logs will appear** - This is expected behavior since Firebase handles everything
- ⚠️ Check your terminal for console logs: `🔥 Forgot Password - Form submitted` and `✅ Password reset email sent successfully`
- ⚠️ The email is sent by Firebase, not your backend server
- ⚠️ Ensure Firebase email templates are configured in Firebase Console → Authentication → Templates

**Debugging**:
If the button doesn't work:
1. Check console for `🔥 Forgot Password - Form submitted with email: ...`
2. Look for `✅ Password reset email sent successfully` or `❌ Failed...`
3. Verify Firebase config is loaded (check for validation errors in console)
4. Ensure email format is valid (form validation should catch this)
5. Check Firebase Console → Authentication → Users to see if email exists

**Common Issues**:
- **"No logs appear"**: This is expected - Firebase sends emails directly, no backend involvement
- **"Email not received"**: Check spam folder, verify email exists in Firebase Auth
- **Firebase error codes**:
  - `auth/invalid-email`: Email format is invalid
  - `auth/user-not-found`: Email not registered in Firebase
  - `auth/too-many-requests`: Rate limited, wait before retrying

---

## Consistent Auth Page Structure

All auth pages follow this structure:

### Layout
```tsx
<KeyboardAvoidingView> or <ScrollView>
  <View style={styles.header}>
    <Text variant="headlineLarge" style={styles.title}>
    <Text variant="bodyLarge" style={styles.subtitle}>
  </View>

  {error && <ErrorContainer />}

  <View style={styles.form}>
    <TextInput ... />
    <Button mode="contained" ... />
    <Footer with links />
  </View>
</KeyboardAvoidingView>
```

### Styling Standards

**Inputs**:
```typescript
mode="outlined"
outlineStyle={styles.inputOutline}  // borderRadius: 12, borderWidth: 1.5
textColor={COLORS.text}
placeholderTextColor={COLORS.textSecondary}
theme={{ colors: { onSurfaceVariant: COLORS.textSecondary, onSurface: COLORS.text } }}
```

**Buttons** (using TouchableOpacity for smooth native behavior):
```typescript
<TouchableOpacity
  style={styles.button}
  activeOpacity={0.8}
  onPress={handlePress}
>
  <Text style={styles.buttonLabel}>{buttonText}</Text>
</TouchableOpacity>

// Styles:
button: {
  borderRadius: 12,
  backgroundColor: COLORS.primary,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}

buttonLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: COLORS.surface,
}
```

**Inline Loader**:
```tsx
{isLoading ? (
  <View style={styles.buttonLoading}>
    <ActivityIndicator color={COLORS.surface} size="small" />
    <Text style={styles.buttonLabel}>{buttonText}</Text>
  </View>
) : (
  <Text style={styles.buttonLabel}>{buttonText}</Text>
)}

// Styles:
buttonLoading: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}
```

**Error Container**:
```typescript
backgroundColor: '#FEE2E2'
borderRadius: 12
padding: SPACING.md
```

---

## API Integration

### Axios Interceptor

**File**: `lib/api/axios.ts`

**Request Interceptor**:
```typescript
// Automatically adds Firebase ID token to all API requests
const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken();
  config.headers.Authorization = `Bearer ${token}`;
}
```

**Response Interceptor**:
- Handles 401 by refreshing Firebase token
- Sanitizes error messages before showing to user
- Logs errors with safe messages (no DB/stack traces)

### Login API

**Endpoint**: `POST /auth/login`

**Request Body**: `{}` (empty - auth via Bearer token)

**Headers**:
```
Authorization: Bearer <firebase-id-token>
```

**Backend Process**:
1. Extract Firebase ID token from Authorization header
2. Verify token with Firebase Admin SDK
3. Extract user info from token
4. Find or create user in database
5. Refresh custom claims if needed
6. Return custom backend token + user data

**Response**:
```typescript
{
  success: true,
  data: {
    user: User,
    token: string,        // Backend JWT
    refreshToken: string
  }
}
```

---

## Biometric Authentication

**File**: `lib/services/biometricAuth.ts`

**Flow**:
1. User logs in with email/password
2. App prompts: "Enable Face ID / Fingerprint for faster login?"
3. If yes, store encrypted credentials in SecureStorage
4. Next login, user can tap biometric button
5. Authenticate with biometric → retrieve credentials → auto-login

**Security**:
- Credentials encrypted with device keychain
- Biometric required to decrypt
- Platform-specific (Face ID on iOS, Fingerprint on Android)

---

## Google OAuth

**File**: `lib/auth/googleAuth.ts`

**Flow**:
1. User taps "Continue with Google"
2. Prompt Google sign-in (native or web fallback)
3. Get Google ID token and access token
4. Sign in to Firebase with Google credential
5. Get Firebase ID token
6. Call backend: `POST /auth/google` with both tokens
7. Backend syncs user, returns custom token
8. Store and navigate

---

## Security Features

### 1. Error Sanitization

**File**: `lib/api/axios.ts` (response interceptor)

- Removes sensitive terms: sql, database, stack, internal, server error
- Limits message length to 120 chars
- Provides user-friendly messages based on status codes
- Logs detailed errors server-side only

### 2. Token Management

- Firebase ID token: Auto-refreshed by interceptor
- Backend JWT: Stored in SecureStorage
- Refresh token: Used for long sessions
- All tokens cleared on logout

### 3. GDPR Compliance

- Consent timestamps recorded
- Terms & Privacy Policy acceptance required
- User data portable and deletable
- See: `docs/GDPR_COMPLIANCE.md`

---

## Testing Checklist

### Login
- [ ] Valid credentials → successful login
- [ ] Invalid credentials → error message
- [ ] Unverified email → error message
- [ ] Remember me → persists session
- [ ] Biometric login → works after enabling
- [ ] Google login → successful

### Registration
- [ ] Valid data → redirect to verify email
- [ ] Missing consent → error alert
- [ ] Weak password → validation error
- [ ] Duplicate email → error message
- [ ] Password mismatch → validation error

### Email Verification
- [ ] Click link in email → email verified
- [ ] Resend button → sends new email
- [ ] Invalid email → button disabled
- [ ] Success feedback → shows message

### Forgot Password
- [ ] Enter email → sends reset email
- [ ] Invalid email → validation error
- [ ] Success screen → shows message
- [ ] Back to login → navigates correctly

### UI Consistency
- [ ] All buttons show inline loaders
- [ ] No buttons disappear on click
- [ ] All button text is white semi-bold
- [ ] All inputs have rounded borders (12px)
- [ ] All error containers have red background
- [ ] All pages follow same structure

---

## Troubleshooting

### Login 401 Error
**Cause**: Backend expects Firebase ID token but doesn't receive it

**Solutions**:
1. Ensure Firebase sign-in happens first
2. Check Axios interceptor is adding token
3. Verify backend validates token correctly
4. Check Firebase config is correct

### Email Not Sent
**Cause**: Firebase email not configured or blocked

**Solutions**:
1. Check Firebase Console → Authentication → Templates
2. Verify domain is authorized
3. Check spam folder
4. Use resend verification on verify page

### 404 on Forgot Password
**Cause**: Using old backend route instead of Firebase

**Solution**: Use `sendPasswordResetEmail(auth, email)` directly (already implemented)

### API Not Reachable
**Cause**: Wrong API URL for device/emulator

**Solutions**:
- iOS Simulator: `http://127.0.0.1:3000/api`
- Android Emulator: `http://10.0.2.2:3000/api`
- Physical Device: `http://YOUR_LAN_IP:3000/api`
- Set in `.env`: `EXPO_PUBLIC_API_URL=...`

---

## Environment Variables

Required in `.env` or `app.config.ts`:

```bash
# API
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=...

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
```

---

## Next Steps

1. **Test registration flow** with real email to verify Firebase sends emails
2. **Test login** after email verification
3. **Set up web reset password page** to handle `oobCode` from email links
4. **Configure Firebase action URL** to point to your reset page
5. **Add deep linking** for mobile to handle password reset in-app (optional)

---

## Related Documentation

- [GDPR Compliance](./GDPR_COMPLIANCE.md)
- [Mobile API Guide](./MOBILE_CLIENT_API_GUIDE.md)
- [Push Notifications Setup](./PUSH_NOTIFICATIONS_SETUP.md)
- [Onboarding Flow](./ONBOARDING.md)

