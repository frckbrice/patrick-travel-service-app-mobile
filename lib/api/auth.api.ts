import { apiClient } from './axios';
import { User, ApiResponse, Role } from '../types';
import { logger } from '../utils/logger';
import { auth } from '../firebase/config';

export interface LoginRequest {
  // Empty body – auth via Firebase ID token in Authorization header
}

// Web API Contract: POST /api/auth/register
export interface RegisterRequest {
  email: string; // Must be valid email
  password: string; // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  firstName: string; // Min 2 chars
  lastName: string; // Min 2 chars
  phone?: string; // Optional, format: +[country code][number]
  inviteCode?: string; // Required for AGENT/ADMIN registration

  // ⚠️ MOBILE-SPECIFIC GDPR FIELDS (Not in web API yet - needs backend implementation)
  consentedAt?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
}

export interface GoogleLoginRequest {
  idToken: string;
  firebaseToken: string;
  email: string;
  name: string;
  photoUrl?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const authApi = {
  async login(_data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const baseURL = apiClient.defaults.baseURL;
      const fullUrl = `${baseURL}/auth/login`;
      const hasAuthUser = !!auth.currentUser;
      
      logger.info('Calling login API', {
        baseURL,
        endpoint: '/auth/login',
        fullUrl,
        hasAuthUser,
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        note: 'Backend will auto-provision user in DB if Firebase user exists but DB record is missing',
      });
      
      // Verify we have a Firebase user before making the request
      if (!auth.currentUser) {
        logger.error('No Firebase user available for login API call');
        throw new Error('No authenticated user available');
      }
      
      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        '/auth/login',
        {}
      );
      
      logger.info('Login API response successful', {
        success: response.data.success,
        hasUser: !!response.data.data?.user,
        userId: response.data.data?.user?.id,
        email: response.data.data?.user?.email,
        note: 'User record exists in DB (may have been auto-provisioned by backend)',
      });
      
      return response.data;
    } catch (error: any) {
      const baseURL = apiClient.defaults.baseURL;
      const fullUrl = `${baseURL}/auth/login`;
      const hasAuthUser = !!auth.currentUser;
      
      logger.error('Login API error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        baseURL,
        fullUrl,
        hasAuthUser,
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        requestHadAuthHeader: !!error.config?.headers?.Authorization,
        // Don't log the actual token, just if it exists
        authHeaderLength: error.config?.headers?.Authorization?.length || 0,
      });
      
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error || 'Unable to login. Please try again.',
      };
    }
  },

  async register(data: RegisterRequest): Promise<ApiResponse<User>> {
    try {
      logger.info('Registering user', { email: data.email });
      const response = await apiClient.post<ApiResponse<User>>(
        '/auth/register',
        data
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to register. Please try again.',
      };
    }
  },

  async logout(): Promise<ApiResponse<void>> {
    try {
      logger.info('Logging out user');
      const response = await apiClient.post<ApiResponse<void>>('/auth/logout');
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error || 'Unable to logout. Please try again.',
      };
    }
  },

  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ token: string }>>(
        '/auth/refresh-token',
        {
          refreshToken,
        }
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error || 'Session expired. Please login again.',
      };
    }
  },

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      logger.info('Verifying email');
      const response = await apiClient.post<ApiResponse<void>>(
        '/auth/verify-email',
        { token }
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to verify email. Please try again.',
      };
    }
  },

  async resendVerification(email: string): Promise<ApiResponse<void>> {
    try {
      logger.info('Resending verification email', { email });
      const response = await apiClient.post<ApiResponse<void>>(
        '/auth/resend-verification',
        {
          email,
        }
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to resend verification. Please try again.',
      };
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    try {
      logger.info('Requesting password reset', { email });
      const response = await apiClient.post<ApiResponse<void>>(
        '/auth/forgot-password',
        {
          email,
        }
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to process request. Please try again.',
      };
    }
  },

  async resetPassword(
    oobCode: string,
    password: string
  ): Promise<ApiResponse<{ email?: string }>> {
    try {
      logger.info('Resetting password');
      const response = await apiClient.post<ApiResponse<{ email?: string }>>(
        '/auth/reset-password',
        {
          oobCode,
          password,
        }
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to reset password. Please try again.',
      };
    }
  },

  async getMe(): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error || 'Unable to fetch user information.',
      };
    }
  },

  async loginWithGoogle(
    data: GoogleLoginRequest
  ): Promise<ApiResponse<LoginResponse>> {
    try {
      logger.info('Logging in with Google', { email: data.email });
      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        '/auth/google',
        data
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to login with Google. Please try again.',
      };
    }
  },
};
