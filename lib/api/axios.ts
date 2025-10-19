import axios from 'axios';
import Constants from 'expo-constants';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

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

