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
      // Web returns unreadCount in the GET /notifications response
      // Use limit=1 to minimize data transfer since we only need the unreadCount
      const response = await apiClient.get<ApiResponse<{ notifications: Notification[], unreadCount: number, pagination: any }>>(
        '/notifications?page=1&limit=1'
      );
      const count = response.data.data?.unreadCount || 0;
      logger.info('Fetched unread notifications count', { count });
      return count;
    } catch (error: any) {
      // Error already sanitized by interceptor
      logger.error('Failed to get unread count', error);
      return 0;
    }
  },

  async markAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      logger.info('Marking notification as read', { id });
      const response = await apiClient.put<ApiResponse<void>>(
        `/notifications/${id}`
      );
      logger.info('Successfully marked notification as read', { id });
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      logger.error('Failed to mark notification as read', { id, error });
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
      const response = await apiClient.put<ApiResponse<void>>(
        '/notifications/mark-all-read'
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
