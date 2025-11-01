import { apiClient } from './axios';
import { Message, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const messagesApi = {
  // Simple in-memory cache for single email fetches (opt-in, short TTL)
  _emailCache: new Map<string, { data: Message; ts: number }>(),
  _emailCacheTtlMs: 60 * 1000,

  _getCachedEmail(id: string): Message | undefined {
    const entry = this._emailCache.get(id);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this._emailCacheTtlMs) {
      this._emailCache.delete(id);
      return undefined;
    }
    return entry.data;
  },

  _setCachedEmail(id: string, data: Message) {
    this._emailCache.set(id, { data, ts: Date.now() });
  },

  // Preload an email into cache without blocking navigation
  async prefetchEmail(id: string): Promise<void> {
    try {
      const safeId = encodeURIComponent(id);
      const response = await apiClient.get<ApiResponse<{ email: Message }>>(`/emails/${safeId}`);
      if (response.data.success && response.data.data?.email) {
        this._setCachedEmail(id, response.data.data.email);
      }
    } catch { }
  },

  // Get single email message by ID
  async getEmail(id: string): Promise<ApiResponse<Message>> {
    try {
      // Serve from cache when fresh
      const cached = this._getCachedEmail(id);
      if (cached) {
        return { success: true, data: cached } as ApiResponse<Message>;
      }
      const response = await apiClient.get<ApiResponse<{ email: Message }>>(`/emails/${id}`);
      console.log("\n\n the email info: ", { response });
      if (response.data.success && response.data.data?.email) {
        this._setCachedEmail(id, response.data.data.email);
      }
      return {
        success: response.data.success,
        data: response.data.data?.email,
        error: response.data.error,
      };
    } catch (error: any) {
      logger.error('Failed to get email', error);
      
      // Check for 404 specifically
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Email not found',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load email.',
      };
    }
  },

  // Mark single email as read
  async markEmailAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      const safeId = encodeURIComponent(id);
      // Spec: Single Email — PUT /api/emails/{emailId}
      const response = await apiClient.put<ApiResponse<void>>(`/emails/${safeId}`);
      console.log("\n\n the mark email as read info: ", { response });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to mark email as read', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to mark email as read.',
      };
    }
  },

  // Get all emails for user
  async getEmails(
    page = 1,
    pageSize = 20,
    filters?: {
      caseId?: string;
      isRead?: boolean;
    }
  ): Promise<ApiResponse<Message[]>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (filters?.caseId) params.append('caseId', filters.caseId);
      if (filters?.isRead !== undefined) params.append('isRead', filters.isRead.toString());

      const response = await apiClient.get<ApiResponse<{ emails: Message[] }>>(`/emails?${params}`);
      console.log("\n\n the get emails info: ", {
        success: response.data.success,
        data: response.data.data?.emails || [],
        error: response.data.error,
      });
      return {
        success: response.data.success,
        data: response.data.data?.emails || [],
        error: response.data.error,
      };
    } catch (error: any) {
      logger.error('Failed to get emails', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load emails.',
        data: [],
      };
    }
  },

  // Mark multiple emails as read (batch operation)
  async markEmailsAsRead(emailIds: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put<ApiResponse<void>>('/emails/mark-read', {
        emailIds,
      });
      console.log("\n\n the mark emails as read info: ", { response });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to mark emails as read', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to mark emails as read.',
      };
    }
  },

  // Chat message methods
  async getChatMessage(id: string): Promise<ApiResponse<Message>> {
    try {
      const response = await apiClient.get<ApiResponse<{ message: Message }>>(`/chat/messages/${id}`);
      console.log("\n\n the get chat message info: ", { response });
      return {
        success: response.data.success,
        data: response.data.data?.message,
        error: response.data.error,
      };
    } catch (error: any) {
      logger.error('Failed to get chat message', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load chat message.',
      };
    }
  },

  async markChatMessageAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put<ApiResponse<void>>(`/chat/messages/${id}/read`);
      console.log("\n\n the mark chat message as read info: ", { response });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to mark chat message as read', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to mark chat message as read.',
      };
    }
  },

  async markChatMessagesAsRead(messageIds: string[], chatRoomId?: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put<ApiResponse<void>>('/chat/messages/mark-read', {
        messageIds,
        chatRoomId,
      });
      console.log("\n\n the mark chat messages as read info: ", { response });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to mark chat messages as read', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to mark chat messages as read.',
      };
    }
  },

  // Get unread emails count
  async getUnreadEmailsCount(): Promise<number> {
    try {
      // Get unread emails with a minimal page size just to get the count
      const response = await this.getEmails(1, 1, { isRead: false });
      if (!response.success || !response.data) {
        return 0;
      }
      
      // If backend returns pagination info, use it
      // Otherwise, fetch a larger batch to count
      const fullResponse = await this.getEmails(1, 100, { isRead: false });
      if (fullResponse.success && fullResponse.data) {
        return fullResponse.data.length;
      }
      
      return 0;
    } catch (error: any) {
      logger.error('Failed to get unread emails count', error);
      return 0;
    }
  },

  // Legacy methods for backward compatibility
  async getMessage(id: string): Promise<ApiResponse<Message>> {
    return this.getEmail(id);
  },

  async markAsRead(id: string): Promise<ApiResponse<void>> {
    return this.markEmailAsRead(id);
  },

  async getMessages(
    page = 1,
    pageSize = 20,
    filters?: {
      type?: 'EMAIL' | 'CHAT';
      caseId?: string;
      isRead?: boolean;
    }
  ): Promise<ApiResponse<Message[]>> {
    // Only handle EMAIL type for now
    if (filters?.type === 'EMAIL' || !filters?.type) {
      return this.getEmails(page, pageSize, {
        caseId: filters?.caseId,
        isRead: filters?.isRead,
      });
    }
    
    // For CHAT type, return empty array (handled by Firebase)
    return {
      success: true,
      data: [],
    };
  },
};
