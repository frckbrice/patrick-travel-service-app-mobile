# Firebase ID Token Handling Issue Analysis

## Issue Identified

There is a **potential race condition** and **inefficiency** in how the Firebase ID token is handled during login.

## Current Flow

### Login Process (`authStore.ts:147-164`)

```typescript
// Step 1: Sign in with Firebase
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// Step 2: Get token from userCredential (BUT NOT USED FOR API CALL)
const firebaseToken = await userCredential.user.getIdToken();

// Step 3: Make API call - relies on axios interceptor to attach token
const response = await authApi.login({});
```

### Axios Interceptor (`axios.ts:26-44`)

```typescript
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;  // ⚠️ POTENTIAL ISSUE HERE
  if (user) {
    const token = await user.getIdToken();  // Fetches token AGAIN
    config.headers.Authorization = `Bearer ${token}`;
  }
  // ⚠️ If user is null, request continues WITHOUT token
  return config;
});
```

## Problems Identified

### 1. ⚠️ **Race Condition Risk**

- `signInWithEmailAndPassword` resolves with `userCredential`
- `auth.currentUser` is updated **asynchronously** via `onAuthStateChanged`
- In rare cases, `auth.currentUser` might still be `null` when the interceptor runs
- The request would be sent **without an Authorization header**
- Result: 401 Unauthorized error even though login succeeded

### 2. ⚠️ **Inefficient: Double Token Fetch**

- Token fetched in `authStore.login()` (line 159) - **stored but not used**
- Token fetched again in axios interceptor (line 32) - **used for API call**
- Unnecessary API call overhead

### 3. ⚠️ **Silent Failure**

- If `auth.currentUser` is null in interceptor, error is caught but request proceeds
- No explicit error is thrown
- Request fails at backend with cryptic 401 error

## Impact

**Severity:** 🟡 **Medium**

- Most of the time this works correctly (Firebase updates `auth.currentUser` synchronously)
- In edge cases (network delays, Firebase initialization timing), requests may fail
- Wastes one token fetch per login

## Recommended Fix

### Option 1: Wait for `auth.currentUser` (More Reliable)

```typescript
login: async (data: { email: string; password: string }) => {
  try {
    set({ isLoading: true, error: null });

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // ✅ Wait for auth.currentUser to be set
    await new Promise<void>((resolve) => {
      if (auth.currentUser) {
        resolve();
      } else {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            unsubscribe();
            resolve();
          }
        });
      }
    });

    // Get token after confirming currentUser is set
    const firebaseToken = await auth.currentUser!.getIdToken();
    const firebaseRefreshToken = auth.currentUser!.refreshToken;

    // Now the interceptor can reliably get the token
    const response = await authApi.login({});
    // ... rest of login flow
  }
}
```

### Option 2: Use Token Directly (More Efficient)

```typescript
login: async (data: { email: string; password: string }) => {
  try {
    set({ isLoading: true, error: null });

    const userCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    const firebaseToken = await userCredential.user.getIdToken();
    const firebaseRefreshToken = userCredential.user.refreshToken;

    // ✅ Explicitly set the token for this request
    const response = await authApi.login({}, firebaseToken);
    // ... rest of login flow
  }
}

// Update authApi.login to accept optional token
async login(_data: LoginRequest, token?: string): Promise<ApiResponse<LoginResponse>> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/login',
    {},
    token ? {
      headers: {
        Authorization: `Bearer ${token}`
      }
    } : undefined
  );
  return response.data;
}
```

### Option 3: Improve Interceptor Error Handling (Quick Fix)

```typescript
apiClient.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // ✅ Explicitly check if this is an auth endpoint that needs a token
      const isAuthEndpoint = config.url?.includes('/auth/') && 
                             !config.url?.includes('/auth/register') &&
                             !config.url?.includes('/auth/forgot-password');
      
      if (isAuthEndpoint) {
        logger.warn('Auth endpoint called without currentUser - this may fail');
        // Could wait for auth state or throw error
      }
    }
  } catch (error) {
    logger.error('Error getting auth token', error);
    // ✅ Decide: reject request or continue?
    // For auth endpoints, we probably should reject
    if (config.url?.includes('/auth/login')) {
      return Promise.reject(new Error('Failed to get auth token'));
    }
  }
  return config;
});
```

## Recommended Solution

**Use Option 1** - Wait for `auth.currentUser` to be set. This is the most reliable and doesn't require changing the API contract.

## Testing Recommendations

1. **Test rapid login**: Login immediately after app start
2. **Test with network delays**: Slow network to check timing
3. **Test Firebase initialization edge cases**
4. **Monitor logs**: Check if interceptor logs show null currentUser

## Related Code Locations

- `stores/auth/authStore.ts:147-164` - Login function
- `lib/api/axios.ts:26-44` - Request interceptor
- `lib/api/auth.api.ts:39-70` - Login API call

