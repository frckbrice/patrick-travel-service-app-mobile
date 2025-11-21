/**
 * Downloads Service
 * Tracks and manages downloaded files (email attachments, templates, etc.)
 * Downloads are stored per-user to prevent data leakage between users
 */

import { secureStorage } from '../storage/secureStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../utils/logger';
import { User } from '../types';

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

/**
 * Get the storage key for downloads based on current user ID
 * Returns null if no user is logged in
 */
const getDownloadsStorageKey = (userId?: string | null): string | null => {
  if (!userId) {
    logger.warn('Cannot get downloads storage key: no user ID');
    return null;
  }
  return `user_downloads_${userId}`;
};

class DownloadsService {
  /**
   * Get current user ID from secure storage (avoids require cycle with authStore)
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const user = await secureStorage.getUserData<User>();
      return user?.id || null;
    } catch (error) {
      logger.error('Failed to get current user ID', error);
      return null;
    }
  }

  /**
   * Add a downloaded file to the tracking list
   */
  async addDownloadedFile(file: Omit<DownloadedFile, 'id' | 'downloadedAt'>): Promise<DownloadedFile> {
    try {
      const userId = await this.getCurrentUserId();
      const storageKey = getDownloadsStorageKey(userId);
      
      if (!storageKey) {
        throw new Error('Cannot track download: user not logged in');
      }

      // Get downloads directly to avoid recursion
      const downloads = await secureStorage.get<DownloadedFile[]>(storageKey) || [];
      
      // Check for duplicates: same localUri or same sourceId (for templates/documents)
      const isDuplicate = downloads.some(
        (existing) =>
          existing.localUri === file.localUri ||
          (file.sourceId && existing.sourceId === file.sourceId && existing.source === file.source)
      );

      if (isDuplicate) {
        // Update the existing entry's downloadedAt timestamp instead of creating duplicate
        const existingIndex = downloads.findIndex(
          (existing) =>
            existing.localUri === file.localUri ||
            (file.sourceId && existing.sourceId === file.sourceId && existing.source === file.source)
        );
        
        if (existingIndex !== -1) {
          // Update timestamp and move to top (most recent first)
          const existing = downloads[existingIndex];
          existing.downloadedAt = Date.now();
          downloads.splice(existingIndex, 1);
          downloads.unshift(existing);
          
          logger.info('Download already exists, updated timestamp', {
            id: existing.id,
            name: existing.name,
            localUri: existing.localUri,
            userId,
          });
          
          await secureStorage.set(storageKey, downloads);
          return existing;
        }
      }
      
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

      await secureStorage.set(storageKey, downloads);
      
      logger.info('Downloaded file tracked', {
        id: downloadedFile.id,
        name: downloadedFile.name,
        source: downloadedFile.source,
        userId,
      });

      return downloadedFile;
    } catch (error) {
      logger.error('Failed to track downloaded file', error);
      throw error;
    }
  }

  /**
   * Get all downloaded files for the current user
   */
  async getDownloads(): Promise<DownloadedFile[]> {
    try {
      const userId = await this.getCurrentUserId();
      const storageKey = getDownloadsStorageKey(userId);
      
      if (!storageKey) {
        logger.warn('Cannot get downloads: user not logged in');
        return [];
      }

      const downloads = await secureStorage.get<DownloadedFile[]>(storageKey);
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
        await secureStorage.set(storageKey, validDownloads);
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
      const userId = await this.getCurrentUserId();
      const storageKey = getDownloadsStorageKey(userId);
      
      if (!storageKey) {
        logger.warn('Cannot delete download: user not logged in');
        return false;
      }

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
      await secureStorage.set(storageKey, downloads);

      logger.info('Downloaded file deleted', { id, name: file.name, userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete download', error);
      return false;
    }
  }

  /**
   * Clear all downloads for the current user
   */
  async clearAllDownloads(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const storageKey = getDownloadsStorageKey(userId);
      
      if (!storageKey) {
        logger.warn('Cannot clear downloads: user not logged in');
        return;
      }

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

      await secureStorage.set(storageKey, []);
      logger.info('All downloads cleared', { userId });
    } catch (error) {
      logger.error('Failed to clear downloads', error);
      throw error;
    }
  }

  /**
   * Clear downloads for a specific user (used during logout)
   */
  async clearDownloadsForUser(userId: string): Promise<void> {
    try {
      const storageKey = getDownloadsStorageKey(userId);
      if (!storageKey) {
        return;
      }

      // Get downloads for this user
      const downloads = await secureStorage.get<DownloadedFile[]>(storageKey);
      if (!downloads || !Array.isArray(downloads)) {
        return;
      }

      // Delete all files
      for (const file of downloads) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(file.localUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(file.localUri, { idempotent: true });
          }
        } catch (error) {
          logger.warn('Failed to delete file during user logout clear', { error, file: file.name });
        }
      }

      // Clear the storage key
      await secureStorage.remove(storageKey);
      logger.info('Downloads cleared for user', { userId });
    } catch (error) {
      logger.error('Failed to clear downloads for user', error);
      // Don't throw - this is cleanup during logout
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

