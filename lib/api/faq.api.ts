import { apiClient } from './axios';
import { FAQ, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const faqApi = {
    async getAllFAQs(): Promise<ApiResponse<FAQ[]>> {
        try {
            const response = await apiClient.get<ApiResponse<FAQ[]>>('/faq');
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to load FAQs.',
                data: [],
            };
        }
    },

    async getFAQCategories(): Promise<ApiResponse<string[]>> {
        try {
            const response = await apiClient.get<ApiResponse<string[]>>('/faq/categories');
            return response.data;
        } catch (error: any) {
            // Error already sanitized by interceptor - safe to use
            return {
                success: false,
                error: error.response?.data?.error || 'Unable to load categories.',
                data: [],
            };
        }
    },
};

