import { apiClient } from './axios';
import {
  Case,
  ApiResponse,
  PaginatedResponse,
  CaseStatus,
  ServiceType,
  StatusHistory,
} from '../types';
import { logger } from '../utils/logger';

export interface CreateCaseRequest {
  serviceType: ServiceType;
  destinationId?: string;
  formData: any;
}

export interface UpdateCaseRequest {
  formData: any;
}

export const casesApi = {
  async getCases(
    status?: CaseStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Case>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) {
        params.append('status', status);
      }

      // Web returns: { success: true, data: { cases: [...], pagination } }
      const response = await apiClient.get<ApiResponse<{ cases: Case[], pagination: any }>>(
        `/cases?${params.toString()}`
      );
      
      return {
        success: response.data.success,
        data: response.data.data?.cases || [],
        pagination: response.data.data?.pagination || { page, limit, total: 0, totalPages: 0 },
      };
    } catch (error: any) {
      logger.error('Get cases failed', error);
      return {
        success: false,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  },

  async getCaseById(id: string): Promise<ApiResponse<Case>> {
    try {
      const response = await apiClient.get<ApiResponse<Case>>(`/cases/${id}`);
      // Handle both { success, data: Case } and { success, data: { case: Case } }
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        if ('case' in data && typeof data === 'object') {
          return { ...response.data, data: (data as any).case };
        }
      }
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load case details.',
      };
    }
  },

  async createCase(data: CreateCaseRequest): Promise<ApiResponse<Case>> {
    try {
      logger.info('Creating new case', { serviceType: data.serviceType });
      // Web returns: { success: true, data: { case: {...} } }
      const response = await apiClient.post<ApiResponse<{ case: Case }>>('/cases', data);
      
      return {
        success: response.data.success,
        data: response.data.data?.case,
        error: response.data.error,
      };
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to create case. Please try again.',
      };
    }
  },

  async updateCase(
    id: string,
    data: UpdateCaseRequest
  ): Promise<ApiResponse<Case>> {
    try {
      logger.info('Updating case', { id });
      const response = await apiClient.put<ApiResponse<Case>>(
        `/cases/${id}`,
        data
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to update case. Please try again.',
      };
    }
  },

  async getCaseHistory(id: string): Promise<ApiResponse<StatusHistory[]>> {
    try {
      const response = await apiClient.get<ApiResponse<StatusHistory[]>>(
        `/cases/${id}/history`
      );
      // Handle both { success, data: StatusHistory[] } and { success, data: { history: StatusHistory[] } }
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        if ('history' in data && typeof data === 'object') {
          return { ...response.data, data: (data as any).history };
        }
      }
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load case history.',
      };
    }
  },
};
