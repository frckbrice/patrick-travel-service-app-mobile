import { apiClient } from './axios';
import { Case, ApiResponse, PaginatedResponse, CaseStatus, ServiceType, StatusHistory } from '../types';
import { logger } from '../utils/logger';

export interface CreateCaseRequest {
    serviceType: ServiceType;
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

            const response = await apiClient.get<PaginatedResponse<Case>>(
                `/cases?${params.toString()}`
            );
            return response.data;
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
            const response = await apiClient.post<ApiResponse<Case>>('/cases', data);
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to create case. Please try again.',
            };
        }
    },

    async updateCase(id: string, data: UpdateCaseRequest): Promise<ApiResponse<Case>> {
        try {
            logger.info('Updating case', { id });
            const response = await apiClient.put<ApiResponse<Case>>(`/cases/${id}`, data);
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to update case. Please try again.',
            };
        }
    },

    async getCaseHistory(id: string): Promise<ApiResponse<StatusHistory[]>> {
        try {
            const response = await apiClient.get<ApiResponse<StatusHistory[]>>(
                `/admin/cases/${id}/history`
            );
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

