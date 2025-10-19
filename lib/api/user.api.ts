import { apiClient } from './axios';
import { User, ApiResponse, DashboardStats } from '../types';
import { logger } from '../utils/logger';

export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export const userApi = {
    async getProfile(): Promise<ApiResponse<User>> {
        try {
            const response = await apiClient.get<ApiResponse<User>>('/users/profile');
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to load profile.',
            };
        }
    },

    async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
        try {
            logger.info('Updating profile');
            const response = await apiClient.put<ApiResponse<User>>('/users/profile', data);
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to update profile. Please try again.',
            };
        }
    },

    async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
        try {
            logger.info('Changing password');
            const response = await apiClient.put<ApiResponse<void>>('/users/password', data);
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to change password. Please try again.',
            };
        }
    },

    async deleteAccount(): Promise<ApiResponse<void>> {
        try {
            logger.info('Deleting account');
            const response = await apiClient.delete<ApiResponse<void>>('/users/account');
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to delete account. Please try again.',
            };
        }
    },

    async exportData(): Promise<string | null> {
        try {
            logger.info('Exporting user data');
            const response = await apiClient.get('/users/data-export');
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor
            return null;
        }
    },

    async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
        try {
            const response = await apiClient.get<ApiResponse<DashboardStats>>('/users/dashboard-stats');
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to load dashboard statistics.',
                data: {
                    totalCases: 0,
                    activeCases: 0,
                    pendingDocuments: 0,
                    unreadMessages: 0,
                },
            };
        }
    },
};

