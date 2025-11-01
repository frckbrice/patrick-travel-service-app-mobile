import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedTemplate } from '../types';
import { logger } from '../utils/logger';
import * as FileSystem from 'expo-file-system';

class TemplateCache {
  private readonly CACHE_PREFIX = 'template_cache_';
  private readonly CACHE_VERSION = '1.0';
  private readonly KEYS_LIST_KEY = 'template_cache_keys';

  /**
   * Maintain a list of cache keys in AsyncStorage
   */
  private async addToKeysList(key: string): Promise<void> {
    try {
      const keysStr = await AsyncStorage.getItem(this.KEYS_LIST_KEY);
      const keys = keysStr ? JSON.parse(keysStr) : [];
      if (!keys.includes(key)) {
        keys.push(key);
        await AsyncStorage.setItem(this.KEYS_LIST_KEY, JSON.stringify(keys));
      }
    } catch (error) {
      logger.warn('Error adding key to list', { key, error });
    }
  }

  private async removeFromKeysList(key: string): Promise<void> {
    try {
      const keysStr = await AsyncStorage.getItem(this.KEYS_LIST_KEY);
      const keys = keysStr ? JSON.parse(keysStr) : [];
      const newKeys = keys.filter((k: string) => k !== key);
      await AsyncStorage.setItem(this.KEYS_LIST_KEY, JSON.stringify(newKeys));
    } catch (error) {
      logger.warn('Error removing key from list', { key, error });
    }
  }

  private async getAllCacheKeys(): Promise<string[]> {
    try {
      const keysStr = await AsyncStorage.getItem(this.KEYS_LIST_KEY);
      return keysStr ? JSON.parse(keysStr) : [];
    } catch (error) {
      logger.warn('Error getting cache keys list', { error });
      return [];
    }
  }

  /**
   * Get cached template information
   */
  async get(templateId: string): Promise<CachedTemplate | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${templateId}`;
      const cachedData = await SecureStore.getItemAsync(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      const cached: CachedTemplate = JSON.parse(cachedData);
      
      // Verify file still exists
      const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
      
      if (!fileInfo.exists) {
        logger.warn('Cached file no longer exists, clearing cache', { templateId });
        await SecureStore.deleteItemAsync(cacheKey);
        await this.removeFromKeysList(cacheKey);
        return null;
      }

      return cached;
    } catch (error) {
      logger.error('Error getting cached template', { templateId, error });
      return null;
    }
  }

  /**
   * Store template in cache
   */
  async set(
    templateId: string,
    localUri: string,
    version: string,
    fileName: string
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${templateId}`;
      const cached: CachedTemplate = {
        templateId,
        localUri,
        version,
        cachedAt: new Date().toISOString(),
        fileName,
      };

      await SecureStore.setItemAsync(cacheKey, JSON.stringify(cached));
      await this.addToKeysList(cacheKey);
      logger.info('Template cached successfully', { templateId, version });
    } catch (error) {
      logger.error('Error caching template', { templateId, error });
      throw error;
    }
  }

  /**
   * Clear cached template
   */
  async clear(templateId: string): Promise<void> {
    try {
      // Get cached data first
      const cached = await this.get(templateId);
      
      if (cached) {
        // Delete the file
        await FileSystem.deleteAsync(cached.localUri, { idempotent: true });
        
        // Delete cache metadata
        const cacheKey = `${this.CACHE_PREFIX}${templateId}`;
        await SecureStore.deleteItemAsync(cacheKey);
        await this.removeFromKeysList(cacheKey);
        
        logger.info('Template cache cleared', { templateId });
      }
    } catch (error) {
      logger.error('Error clearing template cache', { templateId, error });
    }
  }

  /**
   * Clear all cached templates
   */
  async clearAll(): Promise<void> {
    try {
      const templateKeys = await this.getAllCacheKeys();
      
      for (const key of templateKeys) {
        try {
          const cachedData = await SecureStore.getItemAsync(key);
          if (cachedData) {
            const cached: CachedTemplate = JSON.parse(cachedData);
            
            // Delete the file
            await FileSystem.deleteAsync(cached.localUri, { idempotent: true });
            
            // Delete cache metadata
            await SecureStore.deleteItemAsync(key);
          }
        } catch (error) {
          logger.warn('Error clearing template cache entry', { key, error });
        }
      }
      
      // Clear the keys list
      await AsyncStorage.removeItem(this.KEYS_LIST_KEY);

      logger.info('All template caches cleared', { count: templateKeys.length });
    } catch (error) {
      logger.error('Error clearing all template caches', { error });
    }
  }

  /**
   * Get all cached templates
   */
  async getAll(): Promise<CachedTemplate[]> {
    try {
      const templateKeys = await this.getAllCacheKeys();
      
      const cachedTemplates: CachedTemplate[] = [];
      
      for (const key of templateKeys) {
        try {
          const cachedData = await SecureStore.getItemAsync(key);
          if (cachedData) {
            const cached: CachedTemplate = JSON.parse(cachedData);
            
            // Verify file exists
            const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
            if (fileInfo.exists) {
              cachedTemplates.push(cached);
            }
          }
        } catch (error) {
          logger.warn('Error reading cached template', { key, error });
        }
      }
      
      return cachedTemplates;
    } catch (error) {
      logger.error('Error getting all cached templates', { error });
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; totalSize: number }> {
    const cachedTemplates = await this.getAll();
    let totalSize = 0;
    
    for (const cached of cachedTemplates) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      } catch (error) {
        // File might have been deleted, skip it
      }
    }
    
    return {
      count: cachedTemplates.length,
      totalSize,
    };
  }

  /**
   * Clean up orphaned cache entries (files that don't exist anymore)
   */
  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    
    try {
      const templateKeys = await this.getAllCacheKeys();
      
      for (const key of templateKeys) {
        try {
          const cachedData = await SecureStore.getItemAsync(key);
          if (cachedData) {
            const cached: CachedTemplate = JSON.parse(cachedData);
            const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
            
            if (!fileInfo.exists) {
              await SecureStore.deleteItemAsync(key);
              await this.removeFromKeysList(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Delete the key if there's an error reading it
          await SecureStore.deleteItemAsync(key);
          await this.removeFromKeysList(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info('Cache cleanup completed', { cleanedCount });
      }
    } catch (error) {
      logger.error('Error during cache cleanup', { error });
    }
    
    return cleanedCount;
  }

  /**
   * Check if a template is cached
   */
  async isCached(templateId: string): Promise<boolean> {
    const cached = await this.get(templateId);
    return !!cached;
  }
}

export const templateCache = new TemplateCache();

