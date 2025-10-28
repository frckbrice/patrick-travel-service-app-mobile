import { apiClient } from './axios';
import { ServiceType, TemplateCategory, ApiResponse, DocumentTemplate } from '../types';
import { logger } from '../utils/logger';
import * as FileSystem from 'expo-file-system';
import { templateCache } from '../services/templateCache';

// Import axios default export for base URL access
import axios from 'axios';

export interface ListTemplatesRequest {
  serviceType?: ServiceType;
  category?: TemplateCategory;
  isRequired?: boolean;
}

export interface DownloadTemplateResponse {
  template: DocumentTemplate;
  fileUrl: string;
}

class TemplatesApi {
  /**
   * List all available templates with optional filters
   */
  async listTemplates(
    filters?: ListTemplatesRequest
  ): Promise<ApiResponse<DocumentTemplate[]>> {
    try {
      logger.info('Fetching templates', { filters });
      
      const params = new URLSearchParams();
      if (filters?.serviceType) params.append('serviceType', filters.serviceType);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.isRequired !== undefined) {
        params.append('isRequired', String(filters.isRequired));
      }

      const queryString = params.toString();
      const url = `/templates${queryString ? `?${queryString}` : ''}`;
      
      // Web API returns: { success: true, data: { templates: [...] } }
      const response = await apiClient.get<ApiResponse<{ templates: DocumentTemplate[] }>>(url);
      
      return {
        success: response.data.success,
        data: response.data.data?.templates || [],
        error: response.data.error,
      };
    } catch (error: any) {
      logger.error('Error fetching templates', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load templates.',
        data: [],
      };
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<ApiResponse<DocumentTemplate>> {
    try {
      logger.info('Fetching template', { id });
      
      // Web API returns: { success: true, data: { template: {...} } }
      const response = await apiClient.get<ApiResponse<{ template: DocumentTemplate }>>(`/templates/${id}`);
      
      return {
        success: response.data.success,
        data: response.data.data?.template,
        error: response.data.error,
      };
    } catch (error: any) {
      logger.error('Error fetching template', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Unable to load template.',
      };
    }
  }

  /**
   * Download template with caching support
   * Checks cache first, then downloads from API if needed
   */
  async downloadTemplate(templateId: string): Promise<string> {
    try {
      logger.info('Downloading template', { templateId });

      // Check cache first
      const cached = await templateCache.get(templateId);
      if (cached) {
        logger.info('Using cached template', { templateId });
        return cached.localUri;
      }

      // Get template info from API
      const response = await this.getTemplate(templateId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Template not found');
      }

      const template = response.data;
      const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
      const fileUrl = template.fileUrl || `${baseUrl}/api/templates/${templateId}/file`;

      // Download the file
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}_${template.fileName}`;
      const fileUri = FileSystem.documentDirectory + uniqueFilename;

      logger.info('Downloading file', { 
        templateId, 
        fileName: template.fileName,
        fileUrl 
      });

      const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Cache the template
      await templateCache.set(templateId, downloadResult.uri, template.version, template.fileName);

      logger.info('Template downloaded and cached', { 
        templateId, 
        localUri: downloadResult.uri 
      });

      return downloadResult.uri;
    } catch (error: any) {
      logger.error('Error downloading template', error);
      throw error;
    }
  }

  /**
   * Download and share template (opens system share dialog)
   */
  async downloadAndShareTemplate(templateId: string): Promise<void> {
    const localUri = await this.downloadTemplate(templateId);
    
    // Share the downloaded file
    const { isAvailableAsync, shareAsync } = await import('expo-sharing');
    const canShare = await isAvailableAsync();
    
    if (canShare) {
      await shareAsync(localUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Template',
      });
    } else {
      logger.warn('Sharing not available on this device');
      throw new Error('Sharing is not available on this device');
    }
  }

  /**
   * Clear cached template
   */
  async clearCachedTemplate(templateId: string): Promise<void> {
    await templateCache.clear(templateId);
    logger.info('Template cache cleared', { templateId });
  }

  /**
   * Clear all cached templates
   */
  async clearAllCachedTemplates(): Promise<void> {
    await templateCache.clearAll();
    logger.info('All template caches cleared');
  }

  /**
   * Get cache status for a template
   */
  async getCacheStatus(templateId: string): Promise<{ cached: boolean; version?: string }> {
    const cached = await templateCache.get(templateId);
    return {
      cached: !!cached,
      version: cached?.version,
    };
  }

  /**
   * Preload templates for offline use
   */
  async preloadTemplates(templateIds: string[]): Promise<void> {
    logger.info('Preloading templates', { count: templateIds.length });
    
    for (const templateId of templateIds) {
      try {
        await this.downloadTemplate(templateId);
      } catch (error) {
        logger.error('Error preloading template', { templateId, error });
      }
    }
  }
}

export const templatesApi = new TemplatesApi();

