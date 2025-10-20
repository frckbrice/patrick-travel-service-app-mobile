import { apiClient } from './axios';
import { User, ApiResponse, DashboardStats, DataExportResponse, PushTokenRequest } from '../types';
import { logger } from '../utils/logger';

// Web API Contract: PATCH /api/users/profile
export interface UpdateProfileRequest {
    firstName?: string; // Min 2 chars
    lastName?: string; // Min 2 chars
    phone?: string; // International format: +1234567890 or national: 0123456789
    profilePicture?: string; // Must be HTTP/HTTPS URL
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
            // Web API uses PATCH for partial updates, mobile uses PUT
            const response = await apiClient.patch<ApiResponse<User>>('/users/profile', data);
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

    async exportData(): Promise<ApiResponse<DataExportResponse>> {
        try {
            logger.info('Exporting user data');
            const response = await apiClient.get<ApiResponse<DataExportResponse>>('/users/data-export');
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to export data. Please try again.',
            };
        }
    },

    async updatePushToken(data: PushTokenRequest): Promise<ApiResponse<void>> {
        try {
            logger.info('Updating push token', { platform: data.platform, deviceId: data.deviceId });
            // Web API uses POST for saving push tokens, transform mobile request to match
            const requestData = {
                token: data.pushToken,
                platform: data.platform,
                deviceId: data.deviceId,
            };
            const response = await apiClient.post<ApiResponse<void>>('/users/push-token', requestData);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to update push token.',
            };
        }
    },

    async removePushToken(platform?: string, deviceId?: string): Promise<ApiResponse<void>> {
        try {
            logger.info('Removing push token', { platform, deviceId });
            const params = new URLSearchParams();
            if (platform) params.append('platform', platform);
            if (deviceId) params.append('deviceId', deviceId);

            const response = await apiClient.delete<ApiResponse<void>>(
                `/users/push-token${params.toString() ? `?${params.toString()}` : ''}`
            );
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to remove push token.',
            };
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

