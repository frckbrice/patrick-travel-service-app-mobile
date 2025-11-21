import { apiClient } from '../api/axios';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';
import * as FileSystem from 'expo-file-system/legacy';

interface UploadFileOptions {
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload file to Cloudinary via web API endpoint
 * Returns the Cloudinary URL which can then be used with document/template APIs
 */
export async function uploadFileToAPI(
  fileUri: string,
  fileName: string,
  mimeType: string,
  options?: UploadFileOptions
): Promise<UploadResult> {
  try {
    // Verify user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Normalize MIME type - fix common issues
    let normalizedMimeType = mimeType;
    if (!normalizedMimeType || normalizedMimeType === 'image') {
      // Infer MIME type from file extension if not provided or invalid
      const extension = fileName.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      normalizedMimeType = mimeMap[extension || ''] || 'application/octet-stream';
      logger.info('Normalized MIME type', {
        original: mimeType,
        normalized: normalizedMimeType,
        fileName,
        extension,
      });
    }

    // Verify file exists and is accessible
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        logger.error('File does not exist', { fileUri, fileName });
        return {
          success: false,
          error: 'File not found. Please select the file again.',
        };
      }
      logger.info('File verified', {
        fileUri,
        exists: fileInfo.exists,
        size: (fileInfo as any).size,
      });
    } catch (fileCheckError) {
      logger.error('Failed to verify file', { fileUri, error: fileCheckError });
      return {
        success: false,
        error: 'Unable to access file. Please select the file again.',
      };
    }

    // Create FormData for file upload
    // In React Native, FormData requires specific format
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: normalizedMimeType,
    } as any);

    logger.info('Uploading file to Cloudinary', {
      fileName,
      originalMimeType: mimeType,
      normalizedMimeType,
      fileUri,
      isFormData: formData instanceof FormData,
    });

    // Get API base URL and auth token
    const baseURL = apiClient.defaults.baseURL || 'http://172.20.10.10:3000/api';
    const uploadUrl = `${baseURL}/cloudinary/upload`;

    // Get auth token
    let authToken = '';
    try {
      const token = await currentUser.getIdToken();
      authToken = token;
    } catch (tokenError) {
      logger.warn('Failed to get auth token for upload', tokenError);
    }

    logger.info('Upload config prepared', {
      url: uploadUrl,
      hasFormData: formData instanceof FormData,
      hasAuthToken: !!authToken,
    });

    // Use fetch directly for FormData uploads - more reliable in React Native than axios
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
          // Don't set Content-Type - fetch will set it automatically with boundary
        },
        body: formData as any, // React Native FormData type compatibility
        signal: controller.signal as any, // React Native AbortSignal type compatibility
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const responseData: any = await response.json();

      // Extract URL from response
      const uploadedUrl = responseData.data?.url;
      if (!uploadedUrl) {
        throw new Error(responseData.error || 'Upload failed: No URL returned');
      }

      logger.info('File uploaded successfully', {
        fileName,
        url: uploadedUrl,
      });

      return {
        success: true,
        url: uploadedUrl,
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      // Re-throw to outer catch
      throw fetchError;
    }
  } catch (error: any) {
    logger.error('File upload error', {
      error,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      fileName,
      fileUri,
    });

    // Provide more specific error messages
    let errorMessage = 'Upload failed';
    if (error.message === 'Network Error' || error.message === 'Network request failed') {
      errorMessage = 'Network error: Unable to reach server. Please check your connection and try again.';
    } else if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      errorMessage = 'Upload timeout: The file is too large or the connection is too slow.';
    } else if (error.response?.status === 413) {
      errorMessage = 'File too large. Please choose a smaller file.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
