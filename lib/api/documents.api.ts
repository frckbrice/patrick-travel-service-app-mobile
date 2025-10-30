import { apiClient } from './axios';
import { Document, ApiResponse, DocumentType } from '../types';
import { logger } from '../utils/logger';

export interface UploadDocumentRequest {
  caseId: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export const documentsApi = {
  async getCaseDocuments(caseId: string): Promise<ApiResponse<Document[]>> {
    try {
      const response = await apiClient.get<ApiResponse<Document[]>>(
        `/cases/${caseId}/documents`
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load documents.',
        data: [],
      };
    }
  },

  async uploadDocument(
    data: UploadDocumentRequest
  ): Promise<ApiResponse<Document>> {
    try {
      logger.info('Uploading document', {
        caseId: data.caseId,
        type: data.documentType,
      });
      const response = await apiClient.post<ApiResponse<Document>>(
        `/cases/${data.caseId}/documents`,
        data
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to upload document. Please try again.',
      };
    }
  },

  async downloadDocument(id: string): Promise<string | null> {
    try {
      const response = await apiClient.get(`/documents/${id}/download`);
      return response.data.url;
    } catch (error: any) {
      // Error already sanitized by interceptor
      return null;
    }
  },

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    try {
      logger.info('Deleting document', { id });
      const response = await apiClient.delete<ApiResponse<void>>(
        `/documents/${id}`
      );
      return response.data;
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error:
          error.response?.data?.error ||
          'Unable to delete document. Please try again.',
      };
    }
  },

  async getAllDocuments(
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<Document[]>> {
    try {
      // Web returns: { success: true, data: { documents: [...], pagination } }
      const response = await apiClient.get<ApiResponse<{ documents: Document[], pagination: any }>>(
        `/documents?page=${page}&limit=${pageSize}`
      );
      
      return {
        success: response.data.success,
        data: response.data.data?.documents || [],
        error: response.data.error,
      };
    } catch (error: any) {
      // Error already sanitized by interceptor - safe to use
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load documents.',
        data: [],
      };
    }
  },
};
