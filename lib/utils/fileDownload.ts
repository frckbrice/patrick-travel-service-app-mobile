/**
 * File Download Utility
 * Handles downloading and sharing files from chat attachments
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logger } from './logger';
import { Platform } from 'react-native';
import { Alert } from './alert';
import { apiClient } from '../api/axios';
import { auth } from '../firebase/config';
import { downloadsService } from '../services/downloadsService';

export interface DownloadOptions {
  url: string;
  filename: string;
  mimeType?: string;
  source?: 'email' | 'template' | 'document' | 'other';
  sourceId?: string; // emailId, templateId, etc.
}

export interface DownloadResult {
  success: boolean;
  localUri?: string;
  error?: string;
}

/**
 * Download file and save to device
 * Handles both public URLs and authenticated API URLs
 */
export const downloadFile = async ({
  url,
  filename,
  mimeType,
}: DownloadOptions): Promise<DownloadResult> => {
  try {
    logger.info('Starting file download', { filename, url });

    // Create unique filename to avoid conflicts
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}_${filename}`;
    const fileUri = FileSystem.documentDirectory + uniqueFilename;

    // Check if URL is from our API (requires authentication)
    const isApiUrl = url.includes(apiClient.defaults.baseURL || '/api') || url.startsWith('/');

    if (isApiUrl) {
      // For API URLs, use axios with authentication headers
      // Convert relative URLs to absolute if needed
      const downloadUrl = url.startsWith('/')
        ? `${apiClient.defaults.baseURL}${url}`
        : url;

      logger.info('Downloading authenticated file', { downloadUrl });

      // Get auth token for manual fetch
      const user = auth.currentUser;
      let authToken = '';
      if (user) {
        try {
          authToken = await user.getIdToken();
        } catch (error) {
          logger.warn('Failed to get auth token for download', error);
        }
      }

      // Use fetch with auth headers (FileSystem.downloadAsync doesn't support custom headers well)
      const fetchResponse = await fetch(downloadUrl, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      });

      if (!fetchResponse.ok) {
        throw new Error(`Download failed with status ${fetchResponse.status}`);
      }

      // Get response as arrayBuffer and convert to base64
      const arrayBuffer = await fetchResponse.arrayBuffer();
      // Convert arrayBuffer to base64 (React Native compatible)
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }

      // Use btoa if available, otherwise use a polyfill
      let base64: string;
      if (typeof btoa !== 'undefined') {
        base64 = btoa(binary);
      } else {
        // Simple base64 polyfill for React Native
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let result = '';
        let i = 0;
        while (i < binary.length) {
          const a = binary.charCodeAt(i++);
          const b = i < binary.length ? binary.charCodeAt(i++) : 0;
          const c = i < binary.length ? binary.charCodeAt(i++) : 0;
          const bitmap = (a << 16) | (b << 8) | c;
          result += chars.charAt((bitmap >> 18) & 63);
          result += chars.charAt((bitmap >> 12) & 63);
          result += i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : '=';
          result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : '=';
        }
        base64 = result;
      }

      // Write base64 to file
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      logger.info('Authenticated file downloaded successfully', {
        filename: uniqueFilename,
        localUri: fileUri,
      });

      return {
        success: true,
        localUri: fileUri,
      };
    } else {
      // For public URLs, use FileSystem.downloadAsync
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      logger.info('File downloaded successfully', {
        filename: uniqueFilename,
        localUri: downloadResult.uri,
      });

      return {
        success: true,
        localUri: downloadResult.uri,
      };
    }
  } catch (error: any) {
    logger.error('File download error', error);
    return {
      success: false,
      error: error.message || 'Failed to download file',
    };
  }
};

/**
 * Download and track file (without sharing)
 * Downloads file and tracks it in downloads service
 * Use this for initial downloads - sharing can be done later from Downloads tab
 */
export const downloadAndTrackFile = async ({
  url,
  filename,
  mimeType,
  source,
  sourceId,
}: DownloadOptions): Promise<{ success: boolean; localUri?: string; error?: string }> => {
  try {
    // Download file first
    const result = await downloadFile({ url, filename, mimeType });

    if (!result.success || !result.localUri) {
      return {
        success: false,
        error: result.error || 'Failed to download file',
      };
    }

    logger.info('File downloaded and saved successfully', { filename, localUri: result.localUri });

    // Track the download if source is provided
    if (source && result.localUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(result.localUri);
        if (fileInfo.exists) {
          await downloadsService.addDownloadedFile({
            name: filename,
            localUri: result.localUri,
            originalUrl: url,
            mimeType: mimeType || 'application/octet-stream',
            size: fileInfo.size || 0,
            source,
            sourceId,
          });
        }
      } catch (trackError) {
        // Don't fail download if tracking fails
        logger.warn('Failed to track download', { error: trackError, filename });
      }
    }

    return {
      success: true,
      localUri: result.localUri,
    };
  } catch (error: any) {
    logger.error('File download error', error);
    return {
      success: false,
      error: error.message || 'Failed to download file',
    };
  }
};

/**
 * Download and share file (iOS/Android)
 * Downloads file first, then shares it
 * Use this when you want to immediately share after download
 */
export const downloadAndShareFile = async ({
  url,
  filename,
  mimeType,
  source,
  sourceId,
}: DownloadOptions): Promise<{ success: boolean; localUri?: string; error?: string }> => {
  try {
    // Download file first
    const result = await downloadFile({ url, filename, mimeType });

    if (!result.success || !result.localUri) {
      return {
        success: false,
        error: result.error || 'Failed to download file',
      };
    }

    // File is now saved, offer to share
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      // Share the file
      try {
        await Sharing.shareAsync(result.localUri, {
          mimeType,
          dialogTitle: `Share ${filename}`,
          UTI: mimeType,
        });
        logger.info('File shared successfully', { filename });
      } catch (shareError) {
        // Share failed but download succeeded, so log but don't fail
        logger.warn('File downloaded but sharing failed', { error: shareError, filename });
      }
    }

    logger.info('File downloaded and saved successfully', { filename, localUri: result.localUri });

    // Track the download if source is provided
    if (source && result.localUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(result.localUri);
        if (fileInfo.exists) {
          await downloadsService.addDownloadedFile({
            name: filename,
            localUri: result.localUri,
            originalUrl: url,
            mimeType: mimeType || 'application/octet-stream',
            size: fileInfo.size || 0,
            source,
            sourceId,
          });
        }
      } catch (trackError) {
        // Don't fail download if tracking fails
        logger.warn('Failed to track download', { error: trackError, filename });
      }
    }

    return {
      success: true,
      localUri: result.localUri,
    };
  } catch (error: any) {
    logger.error('File download/share error', error);
    return {
      success: false,
      error: error.message || 'Failed to download file',
    };
  }
};

/**
 * Download file only (without sharing)
 * Returns the local file URI for direct use
 */
export const downloadFileOnly = async ({
  url,
  filename,
  mimeType,
}: DownloadOptions): Promise<DownloadResult> => {
  return downloadFile({ url, filename, mimeType });
};

/**
 * Get file icon based on mime type
 */
export const getFileIconForMimeType = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return 'file-pdf-box';
  if (mimeType.includes('image')) return 'file-image';
  if (mimeType.includes('video')) return 'file-video';
  if (mimeType.includes('audio')) return 'file-music';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'folder-zip';
  if (mimeType.includes('word') || mimeType.includes('document'))
    return 'file-word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return 'file-excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
    return 'file-powerpoint';
  return 'file-document';
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Validate file before upload
 */
export const validateFile = (
  fileSize: number,
  mimeType: string,
  maxSize: number = 16 * 1024 * 1024 // 16MB
): { valid: boolean; error?: string } => {
  // Check file size
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)} limit`,
    };
  }

  // Check mime type (allow common types)
  const allowedTypes = [
    'image/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats',
    'video/',
    'audio/',
  ];

  const isAllowedType = allowedTypes.some((type) => mimeType.includes(type));

  if (!isAllowedType) {
    return {
      valid: false,
      error: 'File type not supported',
    };
  }

  return { valid: true };
};

/**
 * Open file with default viewer (iOS/Android)
 */
export const openFile = async (
  localUri: string,
  mimeType?: string
): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, { mimeType });
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error('Error opening file', error);
    return false;
  }
};
