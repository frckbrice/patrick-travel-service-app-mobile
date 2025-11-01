import axios from 'axios';
import Constants from 'expo-constants';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';
import { Platform } from 'react-native';

// Lazy import to avoid circular dependency with authStore
const getAuthStore = () => {
  return require('../../stores/auth/authStore').useAuthStore;
};

// Get API URL from environment or config
const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

    // Safety check: if there's no original request config, just reject
    if (!originalRequest) {
      logger.error('API error with no request config', error);
      return Promise.reject(error);
    }

    // Handle 403 Forbidden - Account inactive or insufficient permissions
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error || 'Access forbidden';
      
      // Check if account is inactive (common 403 reason)
      if (errorMessage.toLowerCase().includes('inactive') || 
          errorMessage.toLowerCase().includes('account')) {
        logger.warn('403 Forbidden: Account inactive or access denied', {
          message: errorMessage,
          url: originalRequest.url,
        });
        
        // Log out user if account is inactive - they cannot continue
        // Don't retry - this is a permanent state until admin reactivates
        const logout = getAuthStore().getState().logout;
        await logout();
        
        // Return error with user-friendly message
        error.response.data = {
          ...error.response.data,
          error: 'Your account has been deactivated. Please contact support.',
        };
        return Promise.reject(error);
      }
      
      // For other 403 errors (permission-based), just reject
      logger.warn('403 Forbidden: Insufficient permissions', {
        message: errorMessage,
        url: originalRequest.url,
      });
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - Invalid or expired token
    if (error.response?.status === 401) {
      // Skip logout if this is already a logout/auth-related endpoint to prevent loops
      const url = originalRequest?.url || '';
      const isAuthEndpoint = url.includes('/auth/logout') ||
        url.includes('/users/push-token') ||
        url.includes('/auth/');

      // If we already retried, log out immediately (unless it's an auth endpoint)
      if (originalRequest._retry && !isAuthEndpoint) {
        logger.warn('401 received after token refresh - logging out user');
        const logout = getAuthStore().getState().logout;
        await logout();
        return Promise.reject(error);
      } else if (originalRequest._retry && isAuthEndpoint) {
        logger.warn('401 received after token refresh on auth endpoint - skipping logout to prevent loop');
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Try to refresh token
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken(true); // Force refresh
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
          // Retry the request with new token
          try {
            return await apiClient(originalRequest);
          } catch (retryError: any) {
            // If retry also returns 401, the token is invalid or user unauthorized
            if (retryError?.response?.status === 401 && !isAuthEndpoint) {
              logger.warn('401 received after token refresh retry - logging out user');
              const logout = getAuthStore().getState().logout;
              await logout();
            } else if (retryError?.response?.status === 401 && isAuthEndpoint) {
              logger.warn('401 received after token refresh retry on auth endpoint - skipping logout to prevent loop');
            }
            return Promise.reject(retryError);
          }
        } else {
          // No Firebase user - clear auth state
          // Skip logout if this is already a logout/auth-related endpoint to prevent loops
          const url = originalRequest?.url || '';
          const isAuthEndpoint = url.includes('/auth/logout') ||
            url.includes('/users/push-token') ||
            url.includes('/auth/');

          if (!isAuthEndpoint) {
            logger.info('401 received with no Firebase user - clearing auth state');
            const logout = getAuthStore().getState().logout;
            await logout();
          } else {
            logger.info('401 received on auth endpoint - skipping logout to prevent loop');
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        logger.error('Token refresh failed - logging out user', refreshError);
        // Skip logout if this is already a logout/auth-related endpoint to prevent loops
        const url = originalRequest?.url || '';
        const isAuthEndpoint = url.includes('/auth/logout') ||
          url.includes('/users/push-token') ||
          url.includes('/auth/');

        if (!isAuthEndpoint) {
          // Sign out user from Firebase
          try {
            await auth.signOut();
          } catch (signOutError) {
            logger.error('Firebase sign out error', signOutError);
          }
          // Clear auth store state - this will trigger navigation to login
          const logout = getAuthStore().getState().logout;
          await logout();
        } else {
          logger.info('Token refresh failed on auth endpoint - skipping logout to prevent loop');
        }
        return Promise.reject(error);
      }
    }

    // Handle 429 Too Many Requests - Rate limiting with exponential backoff
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const retryCount = originalRequest._retryCount || 0;
      const maxRetries = 3;

      // Don't retry more than maxRetries times
      if (retryCount >= maxRetries) {
        logger.warn('429 Rate limit exceeded - max retries reached', {
          url: originalRequest.url,
          retryCount,
        });
        const sanitizedError = {
          message: 'Too many requests. Please try again later.',
          status: 429,
          url: originalRequest.url,
        };
        logger.error('API request failed', sanitizedError);
        return Promise.reject(error);
      }

      // Calculate delay: use retry-after header if available, otherwise exponential backoff
      let delay: number;
      if (retryAfter) {
        delay = parseInt(retryAfter, 10) * 1000; // Convert seconds to milliseconds
      } else {
        // Exponential backoff: 1s, 2s, 4s
        delay = Math.pow(2, retryCount) * 1000;
      }

      originalRequest._retryCount = retryCount + 1;

      logger.warn('429 Rate limit exceeded - retrying with backoff', {
        url: originalRequest.url,
        retryCount: originalRequest._retryCount,
        delayMs: delay,
      });

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry the request
      try {
        return await apiClient(originalRequest);
      } catch (retryError: any) {
        // If retry still fails with 429, reject after max retries
        if (retryError?.response?.status === 429 && originalRequest._retryCount >= maxRetries) {
          const sanitizedError = {
            message: 'Too many requests. Please try again later.',
            status: 429,
            url: originalRequest.url,
          };
          logger.error('API request failed', sanitizedError);
        }
        return Promise.reject(retryError);
      }
    }

    // Don't log 404 as error - resource not found is normal
    if (error.response?.status === 404) {
      return Promise.reject(error);
    }

    // Don't log errors for network errors when user is not authenticated
    const isNetworkError = !error.response && error.message === 'Network Error';
    const hasNoAuth = !error.config?.headers?.Authorization;
    
    if (isNetworkError && hasNoAuth) {
      return Promise.reject(error);
    }

    // Log other errors
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
