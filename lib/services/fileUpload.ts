import { apiClient } from '../api/axios';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';

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

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    // Upload to Cloudinary via web API endpoint
    const response = await apiClient.post<{
      success: boolean;
      data?: { url: string };
      error?: string;
    }>('/cloudinary/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: options?.onProgress
        ? (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          options.onProgress?.(percentCompleted);
        }
        : undefined,
    });

    // Extract URL from response
    const uploadedUrl = response.data.data?.url;
    if (!uploadedUrl) {
      throw new Error(response.data.error || 'Upload failed: No URL returned');
    }

    logger.info('File uploaded successfully', {
      fileName,
      url: uploadedUrl,
    });

    return {
      success: true,
      url: uploadedUrl,
    };
  } catch (error: any) {
    logger.error('File upload error', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Upload failed',
    };
  }
}
