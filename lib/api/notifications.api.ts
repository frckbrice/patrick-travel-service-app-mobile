import { apiClient } from './axios';
import { Notification, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const notificationsApi = {
  async getNotifications(
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<Notification[]>> {
    try {
      // Web returns: { success: true, data: { notifications: [...], unreadCount, pagination, filters } }
      const response = await apiClient.get<ApiResponse<{ notifications: Notification[], unreadCount: number, pagination: any }>>(
        `/notifications?page=${page}&limit=${pageSize}`
      );
      
      return {
        success: response.data.success,
        data: response.data.data?.notifications || [],
        error: response.data.error,
      };
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load notifications.',
        data: [],
      };
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count'
      );
      return response.data.data?.count || 0;
    } catch (error: any) {
      // Error already sanitized by interceptor
      return 0;
    }
  },

  async markAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.patch<ApiResponse<void>>(
        `/notifications/${id}/read`
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to mark as read. Please try again.',
      };
    }
  },

  async markAllAsRead(): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        '/notifications/read-all'
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to mark all as read. Please try again.',
      };
    }
  },

  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/notifications/${id}`
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to delete notification. Please try again.',
      };
    }
  },
};
