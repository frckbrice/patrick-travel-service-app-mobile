import axios from 'axios';
import Constants from 'expo-constants';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';
import { Platform } from 'react-native';

// Get the configured API URL from expo config (set in app.config.ts)
// This value comes from the .env file's EXPO_PUBLIC_API_URL
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

// Debug logging
console.log('🔍 API Configuration Debug:', {
  'Constants.expoConfig.extra.apiUrl': Constants.expoConfig?.extra?.apiUrl,
  'Final baseURL': API_BASE_URL,
  'Platform': Platform.OS,
});

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add Firebase auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        if (__DEV__) {
          console.log(`🔑 API Request to ${config.url} with auth token`);
        }
      } else {
        // Only log warnings for API calls that require auth (not public endpoints)
        // Suppress warnings for auth-related endpoints and dashboard during initial load
        const isAuthEndpoint = config.url?.includes('/auth/') || 
                               config.url?.includes('/login') ||
                               config.url?.includes('/register');
        if (!isAuthEndpoint && __DEV__) {
          console.warn(
            `⚠️ API Request to ${config.url} WITHOUT auth token`
          );
        }
      }
    } catch (error) {
      logger.error('Error getting auth token', error);
    }
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken(true); // Force refresh
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        logger.error('Token refresh failed', refreshError);
        // Sign out user if token refresh fails
        await auth.signOut();
      }
    }

    // Don't log errors for network errors when user is not authenticated
    // This is expected behavior when the app starts without a user session
    const isNetworkError = !error.response && error.message === 'Network Error';
    const hasNoAuth = !error.config?.headers?.Authorization;
    
    if (isNetworkError && hasNoAuth) {
      // Silently handle network errors for unauthenticated requests
      return Promise.reject(error);
    }

    // Sanitize error for logging
    const sanitizedError = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
    };

    logger.error('API request failed', sanitizedError);
    return Promise.reject(error);
  }
);
