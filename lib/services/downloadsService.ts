/**
 * Downloads Service
 * Tracks and manages downloaded files (email attachments, templates, etc.)
 */

import { secureStorage } from '../storage/secureStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../utils/logger';

export interface DownloadedFile {
  id: string;
  name: string;
  localUri: string;
  originalUrl: string;
  mimeType: string;
  size: number;
  downloadedAt: number;
  source: 'email' | 'template' | 'document' | 'other';
  sourceId?: string; // emailId, templateId, etc.
}

const DOWNLOADS_STORAGE_KEY = 'user_downloads';

class DownloadsService {
  /**
   * Add a downloaded file to the tracking list
   */
  async addDownloadedFile(file: Omit<DownloadedFile, 'id' | 'downloadedAt'>): Promise<DownloadedFile> {
    try {
      const downloads = await this.getDownloads();
      
      const downloadedFile: DownloadedFile = {
        ...file,
        id: `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        downloadedAt: Date.now(),
      };

      // Add to beginning of list (most recent first)
      downloads.unshift(downloadedFile);

      // Limit to 1000 downloads to prevent storage issues
      if (downloads.length > 1000) {
        // Remove oldest downloads and clean up their files
        const removed = downloads.splice(1000);
        for (const removedFile of removed) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(removedFile.localUri);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(removedFile.localUri, { idempotent: true });
            }
          } catch (error) {
            logger.warn('Failed to delete old downloaded file', { error, file: removedFile.name });
          }
        }
      }

      await secureStorage.set(DOWNLOADS_STORAGE_KEY, downloads);
      
      logger.info('Downloaded file tracked', {
        id: downloadedFile.id,
        name: downloadedFile.name,
        source: downloadedFile.source,
      });

      return downloadedFile;
    } catch (error) {
      logger.error('Failed to track downloaded file', error);
      throw error;
    }
  }

  /**
   * Get all downloaded files
   */
  async getDownloads(): Promise<DownloadedFile[]> {
    try {
      const downloads = await secureStorage.get<DownloadedFile[]>(DOWNLOADS_STORAGE_KEY);
      if (!downloads || !Array.isArray(downloads)) {
        return [];
      }

      // Verify files still exist and remove deleted ones
      const validDownloads: DownloadedFile[] = [];
      for (const file of downloads) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(file.localUri);
          if (fileInfo.exists) {
            // Update size in case it changed
            file.size = fileInfo.size || file.size;
            validDownloads.push(file);
          }
        } catch (error) {
          logger.warn('Downloaded file no longer exists, removing from list', {
            name: file.name,
            localUri: file.localUri,
          });
        }
      }

      // Update storage if files were removed
      if (validDownloads.length !== downloads.length) {
        await secureStorage.set(DOWNLOADS_STORAGE_KEY, validDownloads);
      }

      return validDownloads;
    } catch (error) {
      logger.error('Failed to get downloads', error);
      return [];
    }
  }

  /**
   * Delete a downloaded file
   */
  async deleteDownload(id: string): Promise<boolean> {
    try {
      const downloads = await this.getDownloads();
      const fileIndex = downloads.findIndex((f) => f.id === id);
      
      if (fileIndex === -1) {
        return false;
      }

      const file = downloads[fileIndex];
      
      // Delete the actual file
      try {
        const fileInfo = await FileSystem.getInfoAsync(file.localUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(file.localUri, { idempotent: true });
        }
      } catch (error) {
        logger.warn('Failed to delete file', { error, file: file.name });
      }

      // Remove from list
      downloads.splice(fileIndex, 1);
      await secureStorage.set(DOWNLOADS_STORAGE_KEY, downloads);

      logger.info('Downloaded file deleted', { id, name: file.name });
      return true;
    } catch (error) {
      logger.error('Failed to delete download', error);
      return false;
    }
  }

  /**
   * Clear all downloads
   */
  async clearAllDownloads(): Promise<void> {
    try {
      const downloads = await this.getDownloads();
      
      // Delete all files
      for (const file of downloads) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(file.localUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(file.localUri, { idempotent: true });
          }
        } catch (error) {
          logger.warn('Failed to delete file during clear', { error, file: file.name });
        }
      }

      await secureStorage.set(DOWNLOADS_STORAGE_KEY, []);
      logger.info('All downloads cleared');
    } catch (error) {
      logger.error('Failed to clear downloads', error);
      throw error;
    }
  }

  /**
   * Get download by ID
   */
  async getDownloadById(id: string): Promise<DownloadedFile | null> {
    const downloads = await this.getDownloads();
    return downloads.find((f) => f.id === id) || null;
  }

  /**
   * Get downloads by source
   */
  async getDownloadsBySource(source: DownloadedFile['source']): Promise<DownloadedFile[]> {
    const downloads = await this.getDownloads();
    return downloads.filter((f) => f.source === source);
  }
}

export const downloadsService = new DownloadsService();

