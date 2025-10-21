import { create } from 'zustand';
import { User, PushTokenRequest } from '../../lib/types';
import { secureStorage } from '../../lib/storage/secureStorage';
import { authApi, RegisterRequest } from '../../lib/api/auth.api';
import { userApi } from '../../lib/api/user.api';
import { apiClient } from '../../lib/api/axios';
import { logger } from '../../lib/utils/logger';
import { auth } from '../../lib/firebase/config';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { signInWithGoogle, signOutFromGoogle } from '../../lib/auth/googleAuth';
import { registerForPushNotifications } from '../../lib/services/pushNotifications';
import { biometricAuthService } from '../../lib/services/biometricAuth';
import { Platform } from 'react-native';

interface AuthState {
  user: User | null;
  token: string | null;
  pushToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  pushToken: null,
  isLoading: false,
  isAuthenticated: false,
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

      const { user } = response.data;

      // Validate response data
      if (!user) {
        logger.error(
          'Invalid Google login response from server - missing user'
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

      set({
        user,
        token: firebaseToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Register push token
      await get().registerPushToken();

      logger.info('User logged in with Google successfully', {
        userId: user.id,
      });
      return true;
    } catch (error: any) {
      logger.error('Google login error', error);
      set({
        error: error.message || 'An error occurred during Google login',
        isLoading: false,
      });
      return false;
    }
  },

  login: async (data: { email: string; password: string }) => {
    try {
      set({ isLoading: true, error: null });

      // Sign in with Firebase first to obtain ID token
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Get Firebase tokens (these are what we'll use throughout the app)
      const firebaseToken = await userCredential.user.getIdToken();
      const firebaseRefreshToken = userCredential.user.refreshToken;

      // With Firebase user signed in, axios interceptor will attach ID token
      // Backend verifies token, syncs user in DB, and sets custom claims
      const response = await authApi.login({});

      if (!response.success || !response.data) {
        set({ error: response.error || 'Login failed', isLoading: false });
        return false;
      }

      const { user } = response.data;

      // Validate response data
      if (!user) {
        logger.error('Invalid login response from server - missing user');
        set({
          error: 'Invalid server response. Please contact support.',
          isLoading: false,
        });
        return false;
      }

      // Store Firebase tokens (not custom backend tokens)
      await secureStorage.setAuthToken(firebaseToken);
      await secureStorage.setRefreshToken(firebaseRefreshToken);
      await secureStorage.setUserData(user);

      set({
        user,
        token: firebaseToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Register push token
      await get().registerPushToken();

      logger.info('User logged in successfully', { userId: user.id });
      return true;
    } catch (error: any) {
      logger.error('Login error', error);
      set({
        error: error.message || 'An error occurred during login',
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
      set({
        error: error.message || 'An error occurred during registration',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });

      // Remove push token from backend
      try {
        await userApi.removePushToken();
      } catch (error) {
        logger.warn('Failed to remove push token', error);
      }

      // Logout from API
      await authApi.logout();

      // Logout from Firebase
      try {
        await firebaseSignOut(auth);
        await signOutFromGoogle();
      } catch (firebaseError) {
        logger.warn('Firebase logout failed', firebaseError);
      }

      // Clear stored data
      await secureStorage.clearAuthData();

      set({
        user: null,
        token: null,
        pushToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      logger.info('User logged out successfully');
    } catch (error: any) {
      logger.error('Logout error', error);
      set({ isLoading: false });
    }
  },

  refreshAuth: async () => {
    try {
      console.log('🔄 refreshAuth - Starting...');
      set({ isLoading: true });

      // Wait for Firebase auth state to initialize
      await new Promise<void>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
          unsubscribe();
          resolve();
        });
      });

      const firebaseUser = auth.currentUser;
      console.log('🔄 refreshAuth - Firebase user:', !!firebaseUser);

      if (firebaseUser) {
        // Get fresh Firebase token
        const firebaseToken = await firebaseUser.getIdToken(false); // Don't force refresh on app load

        // Get stored user data
        const user = await secureStorage.getUserData<User>();
        console.log('📖 Loaded user from storage:', user ? `${user.firstName} ${user.lastName}` : 'null');

        if (user) {
          // Update stored token
          await secureStorage.setAuthToken(firebaseToken);

          set({
            user,
            token: firebaseToken,
            isAuthenticated: true,
            isLoading: false,
          });
          logger.info('Auth refreshed successfully with Firebase token', {
            firstName: user.firstName,
            lastName: user.lastName
          });
          return;
        } else {
          // Firebase user exists but no stored user data - fetch from backend
          logger.info(
            'Firebase user exists but no stored user data, fetching from backend'
          );
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
        }
      }

      // If no Firebase user or data fetch failed, clear auth
      await secureStorage.clearAuthData();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      logger.info('No active Firebase session, cleared auth');
    } catch (error: any) {
      logger.error('Refresh auth error', error);
      await secureStorage.clearAuthData();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
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

        logger.info('Push token registered', {
          token: tokenData.token,
          platform: tokenData.platform,
          deviceId: tokenData.deviceId,
        });
      }
    } catch (error) {
      logger.error('Error registering push token', error);
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
      set({
        error: error.message || 'Biometric login failed',
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
