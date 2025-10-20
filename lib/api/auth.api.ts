import { apiClient } from './axios';
import { User, ApiResponse, Role } from '../types';
import { logger } from '../utils/logger';

export interface LoginRequest {
  email: string;
  password: string;
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
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      logger.info('Logging in user', { email: data.email });
      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        '/auth/login',
        data
      );
      return response.data;
    } catch (error: any) {
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
    token: string,
    password: string
  ): Promise<ApiResponse<void>> {
    try {
      logger.info('Resetting password');
      const response = await apiClient.post<ApiResponse<void>>(
        '/auth/reset-password',
        {
          token,
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
