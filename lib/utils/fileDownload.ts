/**
 * File Download Utility
 * Handles downloading and sharing files from chat attachments
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logger } from './logger';
import { Platform, Alert } from 'react-native';

export interface DownloadOptions {
  url: string;
  filename: string;
  mimeType?: string;
}

export interface DownloadResult {
  success: boolean;
  localUri?: string;
  error?: string;
}

/**
 * Download file and save to device
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

    // Download file
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
 */
export const downloadAndShareFile = async ({
  url,
  filename,
  mimeType,
}: DownloadOptions): Promise<boolean> => {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }

    // Download file first
    const result = await downloadFile({ url, filename, mimeType });

    if (!result.success || !result.localUri) {
      Alert.alert('Error', result.error || 'Failed to download file');
      return false;
    }

    // Share the downloaded file
    await Sharing.shareAsync(result.localUri, {
      mimeType,
      dialogTitle: `Share ${filename}`,
      UTI: mimeType,
    });

    logger.info('File shared successfully', { filename });
    return true;
  } catch (error: any) {
    logger.error('File sharing error', error);
    Alert.alert('Error', 'Failed to share file');
    return false;
  }
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
