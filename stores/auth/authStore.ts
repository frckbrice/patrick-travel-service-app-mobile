import { create } from 'zustand';
import { User } from '../../lib/types';
import { secureStorage } from '../../lib/storage/secureStorage';
import { authApi, LoginRequest, RegisterRequest } from '../../lib/api/auth.api';
import { logger } from '../../lib/utils/logger';
import { auth } from '../../lib/firebase/config';
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { signInWithGoogle, signOutFromGoogle } from '../../lib/auth/googleAuth';
import { registerForPushNotifications } from '../../lib/services/pushNotifications';

interface AuthState {
  user: User | null;
  token: string | null;
  pushToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<boolean>;
  loginWithGoogle: (idToken: string, accessToken?: string) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
  registerPushToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  pushToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  loginWithGoogle: async (idToken: string, accessToken?: string) => {
    try {
      set({ isLoading: true, error: null });

      // Sign in to Firebase with Google
      const googleResult = await signInWithGoogle(idToken, accessToken);

      if (!googleResult.success || !googleResult.user) {
        set({
          error: googleResult.error || 'Google sign-in failed',
          isLoading: false
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
          isLoading: false
        });
        return false;
      }

      const { user, token, refreshToken } = response.data;

      // Store auth data
      await secureStorage.setAuthToken(token);
      await secureStorage.setRefreshToken(refreshToken);
      await secureStorage.setUserData(user);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Register push token
      await get().registerPushToken();

      logger.info('User logged in with Google successfully', { userId: user.id });
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

  login: async (data: LoginRequest) => {
    try {
      set({ isLoading: true, error: null });

      // Login via API
      const response = await authApi.login(data);

      if (!response.success || !response.data) {
        set({ error: response.error || 'Login failed', isLoading: false });
        return false;
      }

      const { user, token, refreshToken } = response.data;

      // Also sign in to Firebase for chat functionality
      try {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      } catch (firebaseError) {
        logger.warn('Firebase login failed', firebaseError);
        // Continue even if Firebase login fails
      }

      // Store auth data
      await secureStorage.setAuthToken(token);
      await secureStorage.setRefreshToken(refreshToken);
      await secureStorage.setUserData(user);

      set({
        user,
        token,
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
        set({ error: response.error || 'Registration failed', isLoading: false });
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
      set({ isLoading: true });

      // Get stored data
      const token = await secureStorage.getAuthToken();
      const user = await secureStorage.getUserData<User>();

      if (token && user) {
        // Verify token is still valid by fetching current user
        const response = await authApi.getMe();

        if (response.success && response.data) {
          set({
            user: response.data,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          logger.info('Auth refreshed successfully');
          return;
        }
      }

      // If token invalid or not found, clear auth
      await secureStorage.clearAuthData();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
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

  updateUser: (user: User) => set({ user }),

  registerPushToken: async () => {
    try {
      const tokenData = await registerForPushNotifications();

      if (tokenData) {
        set({ pushToken: tokenData.token });

        // Send push token to backend
        await authApi.updatePushToken(tokenData.token);

        logger.info('Push token registered', { token: tokenData.token });
      }
    } catch (error) {
      logger.error('Error registering push token', error);
    }
  },
}));
