import { create } from 'zustand';
import { User, PushTokenRequest } from '../../lib/types';
import { secureStorage } from '../../lib/storage/secureStorage';
import { authApi, RegisterRequest } from '../../lib/api/auth.api';
import { userApi } from '../../lib/api/user.api';
import { apiClient } from '../../lib/api/axios';
import { logger } from '../../lib/utils/logger';
import { sanitizeErrorMessage } from '../../lib/utils/errorHandler';
import { auth } from '../../lib/firebase/config';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser,
  User as FirebaseUser,
} from 'firebase/auth';
import { signInWithGoogle, signOutFromGoogle } from '../../lib/auth/googleAuth';
import { registerForPushNotifications } from '../../lib/services/pushNotifications';
import { biometricAuthService } from '../../lib/services/biometricAuth';
import { downloadsService } from '../../lib/services/downloadsService';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

interface AuthState {
  user: User | null;
  token: string | null;
  pushToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean; // Flag to prevent refreshAuth during logout
  error: string | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  previousUser: User | null; // PERFORMANCE: For optimistic rollback

  // Actions
  login: (data: { email: string; password: string }) => Promise<boolean>;
  loginWithGoogle: (idToken: string, accessToken?: string) => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => Promise<void>;
  registerPushToken: () => Promise<void>;
  enableBiometric: (email: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  checkBiometricStatus: () => Promise<void>;
  
  // PERFORMANCE: Optimistic update actions
  updateUserOptimistic: (updates: Partial<User>) => void;
  revertUserUpdate: () => void;
}

// Guard against concurrent refreshAuth calls
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  pushToken: null,
  isLoading: false,
  isAuthenticated: false,
  isLoggingOut: false,
  error: null,
  biometricAvailable: false,
  biometricEnabled: false,
  previousUser: null,

  loginWithGoogle: async (idToken: string, accessToken?: string) => {
    try {
      set({ isLoading: true, error: null });

      // Sign in to Firebase with Google
      const googleResult = await signInWithGoogle(idToken, accessToken);

      if (!googleResult.success || !googleResult.user) {
        set({
          error: googleResult.error || 'Google sign-in failed',
          isLoading: false,
        });
        return false;
      }

      // Get Firebase user token
      const firebaseToken = await googleResult.user.getIdToken();

      // Sync with backend API
      // NOTE: Backend may create/update user record in DB during Google login
      logger.info('Calling backend Google login API...', {
        firebaseUid: googleResult.user.uid,
        email: googleResult.user.email,
        note: 'Backend will sync/create user in DB',
      });
      const response = await authApi.loginWithGoogle({
        idToken,
        firebaseToken,
        email: googleResult.user.email || '',
        name: googleResult.user.displayName || '',
        photoUrl: googleResult.user.photoURL || '',
      });

      if (!response.success || !response.data) {
        set({
          error: response.error || 'Backend sync failed',
          isLoading: false,
        });
        return false;
      }

      let { user } = response.data;

      // Validate response data
      // Backend should have created/updated user record in DB
      if (!user) {
        logger.error(
          'Invalid Google login response from server - missing user',
          {
            firebaseUid: googleResult.user.uid,
            email: googleResult.user.email,
            note: 'Backend should have created/updated user in DB',
          }
        );
        set({
          error: 'Invalid server response. Please contact support.',
          isLoading: false,
        });
        return false;
      }

      // Get Firebase refresh token
      const firebaseRefreshToken = googleResult.user.refreshToken;

      // Store Firebase tokens (not custom backend tokens)
      await secureStorage.setAuthToken(firebaseToken);
      await secureStorage.setRefreshToken(firebaseRefreshToken);
      await secureStorage.setUserData(user);

      // OPTIMIZATION: Pre-fetch full profile immediately after login
      // This ensures profile is ready before navigation, eliminating the need for
      // retry logic or delays in profile screen. Profile fetched at the right time
      // (right after backend login) instead of using delays and retries.
      logger.info('Pre-fetching profile after Google login...', { userId: user.id });
      try {
        const profileResponse = await userApi.getProfile();
        if (profileResponse.success && profileResponse.data) {
          // Update user with complete profile data
          const completeUser = profileResponse.data;
          await secureStorage.setUserData(completeUser);
          user = completeUser;
          logger.info('Profile pre-fetched successfully after Google login', {
            userId: completeUser.id,
            hasProfilePicture: !!completeUser.profilePicture,
          });
        } else {
          logger.warn('Profile pre-fetch failed after Google login, using login response user data', {
            error: profileResponse.error,
          });
        }
      } catch (profileError: any) {
        // Non-blocking: if profile fetch fails, continue with login response user
        logger.warn('Profile pre-fetch error after Google login (non-blocking)', profileError);
      }

      set({
        user,
        token: firebaseToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Register push token
      await get().registerPushToken();

      logger.info('User logged in with Google successfully with profile ready', {
        userId: user.id,
      });
      return true;
    } catch (error: any) {
      logger.error('Google login error', error);
      
      // Sanitize error message - never expose backend details to user
      const userFriendlyError = sanitizeErrorMessage(error);
      
      set({
        error: userFriendlyError,
        isLoading: false,
      });
      return false;
    }
  },

  login: async (data: { email: string; password: string }) => {
    try {
      set({ isLoading: true, error: null });

      logger.info('Starting login flow', { email: data.email });

      // Sign in with Firebase first to obtain ID token
      logger.info('Signing in with Firebase...');
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      logger.info('Firebase sign-in successful', {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
      });

      // Wait for auth.currentUser to be set to avoid race condition
      // Firebase updates currentUser asynchronously via onAuthStateChanged
      // This ensures the axios interceptor can reliably access currentUser
      logger.info('Waiting for auth.currentUser to be set...');
      await new Promise<void>((resolve) => {
        if (auth.currentUser) {
          logger.info('auth.currentUser is already set');
          resolve();
        } else {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
              logger.info('auth.currentUser set via onAuthStateChanged', {
                userId: user.uid,
              });
              unsubscribe();
              resolve();
            }
          });
        }
      });

      // Get Firebase tokens (these are what we'll use throughout the app)
      // Use auth.currentUser now that it's guaranteed to be set
      logger.info('Getting Firebase ID token...');
      const firebaseToken = await auth.currentUser!.getIdToken();
      const firebaseRefreshToken = auth.currentUser!.refreshToken;

      logger.info('Firebase token obtained', {
        tokenLength: firebaseToken.length,
        hasRefreshToken: !!firebaseRefreshToken,
        userId: auth.currentUser!.uid,
      });

      // Verify auth.currentUser is still set before making API call
      if (!auth.currentUser) {
        logger.error('auth.currentUser is null before API call - this should not happen');
        throw new Error('Authentication state lost before API call');
      }

      // With Firebase user signed in, axios interceptor will attach ID token
      // Backend verifies token, syncs user in DB, and sets custom claims
      // NOTE: Backend auto-provisions user in DB if they exist in Firebase but not in database
      // This handles cases where user was created in Firebase but DB record is missing
      logger.info('Calling backend login API...', {
        firebaseUid: auth.currentUser!.uid,
        email: auth.currentUser!.email,
        note: 'Backend will auto-provision user in DB if missing',
      });
      const response = await authApi.login({});

      if (!response.success || !response.data) {
        set({ error: response.error || 'Login failed', isLoading: false });
        return false;
      }

      let { user } = response.data;

      // Validate response data
      // Backend may have auto-provisioned this user if they existed in Firebase but not in DB
      if (!user) {
        logger.error('Invalid login response from server - missing user', {
          firebaseUid: auth.currentUser!.uid,
          email: auth.currentUser!.email,
          note: 'Backend should have auto-provisioned user if missing',
        });
        set({
          error: 'Invalid server response. Please contact support.',
          isLoading: false,
        });
        return false;
      }

      // Log if user was likely auto-provisioned (has default firstName 'User')
      // This is a heuristic - backend sets firstName: 'User' for auto-provisioned users
      if (user.firstName === 'User' && !user.lastName) {
        logger.info('User may have been auto-provisioned by backend', {
          userId: user.id,
          email: user.email,
          firebaseUid: auth.currentUser!.uid,
          note: 'User has default firstName, likely auto-provisioned',
        });
      }

      // Store Firebase tokens (not custom backend tokens)
      await secureStorage.setAuthToken(firebaseToken);
      await secureStorage.setRefreshToken(firebaseRefreshToken);
      await secureStorage.setUserData(user);

      // OPTIMIZATION: Pre-fetch full profile immediately after login
      // This ensures profile is ready before navigation, eliminating the need for
      // retry logic or delays in profile screen. Profile fetched at the right time
      // (right after backend login) instead of using delays and retries.
      logger.info('Pre-fetching profile after login...', { userId: user.id });
      try {
        const profileResponse = await userApi.getProfile();
        if (profileResponse.success && profileResponse.data) {
          // Update user with complete profile data
          const completeUser = profileResponse.data;
          await secureStorage.setUserData(completeUser);
          user = completeUser;
          logger.info('Profile pre-fetched successfully', {
            userId: completeUser.id,
            hasProfilePicture: !!completeUser.profilePicture,
          });
        } else {
          logger.warn('Profile pre-fetch failed, using login response user data', {
            error: profileResponse.error,
          });
        }
      } catch (profileError: any) {
        // Non-blocking: if profile fetch fails, continue with login response user
        logger.warn('Profile pre-fetch error (non-blocking)', profileError);
      }

      set({
        user,
        token: firebaseToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Register push token
      await get().registerPushToken();

      logger.info('User logged in successfully with profile ready', { userId: user.id });
      return true;
    } catch (error: any) {
      logger.error('Login error', error);
      
      // Sanitize error message - never expose backend details to user
      const userFriendlyError = sanitizeErrorMessage(error);
      
      set({
        error: userFriendlyError,
        isLoading: false,
      });
      return false;
    }
  },

  register: async (data: RegisterRequest) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApi.register(data);

      if (!response.success) {
        set({
          error: response.error || 'Registration failed',
          isLoading: false,
        });
        return false;
      }

      set({ isLoading: false, error: null });
      logger.info('User registered successfully', { email: data.email });
      return true;
    } catch (error: any) {
      logger.error('Registration error', error);
      
      // Sanitize error message - never expose backend details to user
      const userFriendlyError = sanitizeErrorMessage(error);
      
      set({
        error: userFriendlyError,
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      // Set logout flag immediately to prevent refreshAuth during logout
      set({ isLoading: true, isLoggingOut: true });

      // STEP 1: Logout from API first (while we still have valid auth)
      // This revokes refresh tokens on server side
      // This is important for security and aligns with web API behavior
      try {
        await authApi.logout();
        logger.info('API logout successful - refresh tokens revoked');
      } catch (error) {
        // Log but continue with logout - local logout should proceed even if API fails
        logger.warn('API logout failed, continuing with local logout', error);
      }

      // STEP 2: Logout from Firebase (clear Firebase auth state)
      // Do this before push token removal to prevent 401 from triggering refreshAuth
      try {
        await firebaseSignOut(auth);
        await signOutFromGoogle();
        logger.info('Firebase logout successful');
      } catch (firebaseError) {
        logger.warn('Firebase logout failed', firebaseError);
        // Continue with clearing local data even if Firebase signout fails
      }

      // STEP 3: Remove push token (non-blocking, may fail since we're logged out)
      // Try to remove push token, but don't let failures block logout
      // Since Firebase is signed out and isLoggingOut flag is set, 401 won't trigger refreshAuth
      const currentToken = get().token;
      if (currentToken) {
        try {
          // Use a timeout to prevent hanging
          await Promise.race([
            userApi.removePushToken(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Push token removal timeout')), 2000)
            ),
          ]);
        } catch (error) {
          // Expected to fail during logout - that's fine
          logger.info('Push token removal skipped or failed during logout (expected)', error);
        }
      }

      // STEP 4: Clear user-specific downloads before clearing auth data
      // Get userId before clearing auth data
      const currentUserId = get().user?.id;
      if (currentUserId) {
        try {
          await downloadsService.clearDownloadsForUser(currentUserId);
          logger.info('User downloads cleared during logout', { userId: currentUserId });
        } catch (downloadsError) {
          // Log but don't fail logout if downloads clearing fails
          logger.warn('Failed to clear downloads during logout', downloadsError);
        }
      }

      // STEP 5: Clear stored data (always execute)
      await secureStorage.clearAuthData();

      // STEP 6: Update state (clear logout flag)
      set({
        user: null,
        token: null,
        pushToken: null,
        isAuthenticated: false,
        isLoading: false,
        isLoggingOut: false,
        error: null,
      });

      logger.info('User logged out successfully');
    } catch (error: any) {
      logger.error('Logout error', error);
      
      // Even if logout fails, clear local state to ensure security
      // Sign out from Firebase to prevent refreshAuth loops
      try {
        await firebaseSignOut(auth).catch(() => { });
        await signOutFromGoogle().catch(() => { });
      } catch {
        // Ignore Firebase errors
      }

      // Clear user-specific downloads before clearing auth data
      const currentUserId = get().user?.id;
      if (currentUserId) {
        try {
          await downloadsService.clearDownloadsForUser(currentUserId);
        } catch {
          // Ignore downloads clearing errors
        }
      }

      await secureStorage.clearAuthData().catch(() => {
        // Ignore clear errors
      });
      
      set({
        user: null,
        token: null,
        pushToken: null,
        isAuthenticated: false,
        isLoading: false,
        isLoggingOut: false,
        error: null,
      });
    }
  },

  deleteAccount: async () => {
    try {
      set({ isLoading: true, error: null });

      // First, call backend API to schedule account deletion
      const response = await userApi.deleteAccount();

      if (!response.success) {
        set({
          error: response.error || 'Failed to delete account',
          isLoading: false,
        });
        return false;
      }

      logger.info('Backend account deletion scheduled');

      // Delete Firebase auth user
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        try {
          await deleteUser(firebaseUser);
          logger.info('Firebase user deleted successfully');
        } catch (firebaseError: any) {
          logger.warn('Firebase user deletion failed', firebaseError);
          // Continue with local logout even if Firebase deletion fails
          // Backend will handle the scheduled deletion
        }
      }

      // Clear local data
      await secureStorage.clearAuthData();

      set({
        user: null,
        token: null,
        pushToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      logger.info('Account deletion completed');
      return true;
    } catch (error: any) {
      logger.error('Delete account error', error);
      
      // Sanitize error message
      const userFriendlyError = sanitizeErrorMessage(error);
      
      set({
        error: userFriendlyError,
        isLoading: false,
      });
      return false;
    }
  },

  refreshAuth: async () => {
    // If already refreshing, return the existing promise (PERFORMANCE: prevents duplicate work)
    if (isRefreshing && refreshPromise) {
      logger.debug('refreshAuth already in progress, waiting for existing promise');
      return refreshPromise;
    }

    // Mark as refreshing and create new promise
    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        logger.debug('refreshAuth starting');

        // PERFORMANCE: Don't set isLoading for background refresh - avoid UI flashing
        // Only set if there's actually no user data loaded yet
        const currentUser = get().user;
        if (!currentUser) {
          set({ isLoading: true });
        }

        // PERFORMANCE: Try current user first to avoid waiting for auth state
        let firebaseUser: FirebaseUser | null = auth.currentUser;

        // Only wait for auth state if we don't have a user yet
        if (!firebaseUser) {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              unsubscribe();
              resolve();
            }, 2000); // 2 second timeout

            const unsubscribe = auth.onAuthStateChanged((user) => {
              firebaseUser = user;
              clearTimeout(timeout);
              unsubscribe();
              resolve();
            });
          });
        }

        // Check stored user data first - this is more reliable than Firebase user
        // Firebase user might be null temporarily due to initialization timing
        const storedUser = await secureStorage.getUserData<User>();
        const storedToken = await secureStorage.getAuthToken();

        // If we have stored credentials, try to restore them
        if (storedUser && storedToken) {
          // PERFORMANCE: Quick check - if we already have this user loaded and Firebase user unchanged, skip refresh
          const currentState = get();
          if (currentState.user?.id === storedUser.id && firebaseUser && !currentState.isLoading) {
            logger.debug('Auth already loaded and unchanged, skipping refresh');
            set({ isLoading: false });
            return;
          }

          // If Firebase user exists, get fresh token
          if (firebaseUser) {
            try {
              const freshToken = await (firebaseUser as FirebaseUser).getIdToken(false);
              await secureStorage.setAuthToken(freshToken);

              set({
                user: storedUser,
                token: freshToken,
                isAuthenticated: true,
                isLoading: false,
              });
              logger.info('Auth refreshed successfully with Firebase token', {
                firstName: storedUser.firstName,
                lastName: storedUser.lastName
              });
              return;
            } catch (tokenError) {
              logger.warn('Failed to get fresh Firebase token, trying stored token', tokenError);
              // Fall through to use stored token
            }
          }

          // Try to use stored token - verify it's still valid by making a test request
          try {
            // Set token in store temporarily to test it
            set({
              user: storedUser,
              token: storedToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // Verify token is valid by fetching user data
            const response = await apiClient.get('/auth/me');
            if (response.data?.success && response.data?.data) {
              const userData = response.data.data;
              // Get fresh token if Firebase user exists now
              if (firebaseUser) {
                try {
                  const freshToken = await (firebaseUser as FirebaseUser).getIdToken(false);
                  await secureStorage.setAuthToken(freshToken);
                  set({
                    user: userData,
                    token: freshToken,
                    isAuthenticated: true,
                    isLoading: false,
                  });
                } catch {
                  // Use stored token if fresh token fails
                  await secureStorage.setAuthToken(storedToken);
                  set({
                    user: userData,
                    token: storedToken,
                    isAuthenticated: true,
                    isLoading: false,
                  });
                }
              } else {
                // No Firebase user but token is valid - keep using stored token
                await secureStorage.setAuthToken(storedToken);
                set({
                  user: userData,
                  token: storedToken,
                  isAuthenticated: true,
                  isLoading: false,
                });
              }
              logger.info('Auth restored from storage - token verified');
              return;
            }
          } catch (verifyError: any) {
            logger.warn('Stored token validation failed', verifyError);
            // Token is invalid - clear and continue to check Firebase
          }
        }

        // If Firebase user exists but no stored data, fetch from backend
        if (firebaseUser && !storedUser) {
          try {
            logger.info(
              'Firebase user exists but no stored user data, fetching from backend'
            );
            const firebaseToken = await (firebaseUser as FirebaseUser).getIdToken(false);
            const response = await apiClient.get('/auth/me');
            if (response.data?.success && response.data?.data) {
              const userData = response.data.data;
              await secureStorage.setUserData(userData);
              await secureStorage.setAuthToken(firebaseToken);

              set({
                user: userData,
                token: firebaseToken,
                isAuthenticated: true,
                isLoading: false,
              });
              logger.info('User data fetched and auth restored');
              return;
            }
          } catch (fetchError) {
            logger.warn('Failed to fetch user data from backend', fetchError);
          }
        }

        // If we get here, we couldn't restore auth - clear it
        // Only clear if we truly have no valid credentials
        if (!storedUser || !storedToken) {
          logger.info('No valid auth credentials found, clearing auth');
          await secureStorage.clearAuthData();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } else {
          // We have stored credentials but they might be temporarily invalid
          // Don't clear - keep them and let the 401 handler try to refresh
          logger.info('Stored credentials exist but validation failed - keeping for retry');
          set({
            user: storedUser,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } catch (error: any) {
        logger.error('Refresh auth error', error);
        // Don't immediately clear on error - might be temporary
        // Check if we have stored credentials first
        const storedUser = await secureStorage.getUserData<User>();
        const storedToken = await secureStorage.getAuthToken();

        if (storedUser && storedToken) {
          // Keep stored credentials for retry
          set({
            user: storedUser,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
          });
          logger.info('Error during refresh, but keeping stored credentials for retry');
        } else {
          // No stored credentials - clear everything
          await secureStorage.clearAuthData();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } finally {
        // Always reset the refresh guard
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    // Return the promise
    return refreshPromise;
  },

  clearError: () => set({ error: null }),

  updateUser: async (user: User) => {
    try {
      console.log('📝 Updating user in store:', user);
      // Update both state and secure storage
      set({ user });
      await secureStorage.setUserData(user);
      console.log('✅ User data saved to state and storage');
      logger.info('User data updated in state and storage', {
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error('❌ Failed to update user data in storage:', error);
      logger.error('Failed to update user data in storage', error);
      // Still update state even if storage fails
      set({ user });
    }
  },

  registerPushToken: async () => {
    try {
      // Only register push tokens on physical devices
      if (!Device.isDevice) {
        logger.info('Skipping push token registration - not a physical device');
        return;
      }

      const tokenData = await registerForPushNotifications();

      if (tokenData) {
        set({ pushToken: tokenData.token });

        // Send push token to backend with platform and deviceId
        const pushTokenRequest: PushTokenRequest = {
          pushToken: tokenData.token,
          platform: tokenData.platform as 'ios' | 'android',
          deviceId: tokenData.deviceId || 'unknown',
          osVersion:
            typeof Platform.Version === 'number'
              ? Platform.Version.toString()
              : Platform.Version,
        };

        await userApi.updatePushToken(pushTokenRequest);

        logger.info('Push token registered successfully', {
          platform: tokenData.platform,
        });
      }
    } catch (error: any) {
      // Push notification registration is optional - don't fail the login
      logger.error('Error registering push token (non-blocking)', {
        message: error?.message,
        code: error?.code,
        note: 'Login continues normally - push notifications may not work',
      });
    }
  },

  loginWithBiometric: async () => {
    try {
      set({ isLoading: true, error: null });

      const credentials = await biometricAuthService.authenticateForLogin();

      if (!credentials) {
        set({
          error: 'Biometric authentication failed',
          isLoading: false,
        });
        return false;
      }

      // Use regular login with stored credentials
      const success = await get().login(credentials);
      return success;
    } catch (error: any) {
      logger.error('Biometric login error', error);
      
      // Sanitize error message - never expose backend details to user
      const userFriendlyError = sanitizeErrorMessage(error);
      
      set({
        error: userFriendlyError,
        isLoading: false,
      });
      return false;
    }
  },

  enableBiometric: async (email: string, password: string) => {
    try {
      const success = await biometricAuthService.enableBiometric();

      if (success) {
        await biometricAuthService.storeBiometricCredentials(email, password);
        set({ biometricEnabled: true });
        logger.info('Biometric authentication enabled');
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Enable biometric error', error);
      return false;
    }
  },

  disableBiometric: async () => {
    try {
      await biometricAuthService.clearBiometricCredentials();
      set({ biometricEnabled: false });
      logger.info('Biometric authentication disabled');
    } catch (error: any) {
      logger.error('Disable biometric error', error);
    }
  },

  checkBiometricStatus: async () => {
    try {
      const available = await biometricAuthService.isAvailable();
      const enabled = await biometricAuthService.isBiometricEnabled();

      set({
        biometricAvailable: available,
        biometricEnabled: enabled,
      });

      logger.info('Biometric status checked', { available, enabled });
    } catch (error: any) {
      logger.error('Check biometric status error', error);
    }
  },
  
  // PERFORMANCE: Optimistic profile update - O(1) shallow merge
  updateUserOptimistic: (updates: Partial<User>) =>
    set((state) => {
      if (!state.user) return state;
      
      return {
        previousUser: state.user, // Save for rollback
        user: { ...state.user, ...updates }, // Shallow merge
      };
    }),
  
  // PERFORMANCE: Instant rollback - O(1)
  revertUserUpdate: () =>
    set((state) => ({
      user: state.previousUser,
      previousUser: null,
    })),
}));
