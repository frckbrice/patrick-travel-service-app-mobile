import { apiClient } from './axios';
import { FAQ, ApiResponse } from '../types';
import { logger } from '../utils/logger';

interface FAQResponse {
  success: boolean;
  data: {
    faqs: FAQ[];
    faqsByCategory: Record<string, FAQ[]>;
    categories: string[];
    total: number;
  };
  error?: string;
}

export const faqApi = {
  async getAllFAQs(category?: string): Promise<ApiResponse<FAQ[]>> {
    try {
      const params = category
        ? `?category=${encodeURIComponent(category)}`
        : '';
      const response = await apiClient.get<FAQResponse>(`/faq${params}`);

      // Handle nested response structure: { success, data: { faqs: [...], categories: [...] } }
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data.faqs || [],
        };
      }

      return {
        success: false,
        error: 'Invalid response format',
        data: [],
      };
    } catch (error: any) {
      logger.error('Get FAQs failed', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load FAQs.',
        data: [],
      };
    }
  },

  async getFAQCategories(): Promise<ApiResponse<string[]>> {
    try {
      const response = await apiClient.get<FAQResponse>('/faq');

      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data.categories || [],
        };
      }

      return {
        success: false,
        error: 'Invalid response format',
        data: [],
      };
    } catch (error: any) {
      logger.error('Get FAQ categories failed', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load categories.',
        data: [],
      };
    }
  },
};
