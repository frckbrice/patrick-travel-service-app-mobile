import * as SecureStore from 'expo-secure-store';
import { CachedTemplate } from '../types';
import { logger } from '../utils/logger';
import * as FileSystem from 'expo-file-system';

class TemplateCache {
  private readonly CACHE_PREFIX = 'template_cache_';
  private readonly CACHE_VERSION = '1.0';

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
      const allKeys = await SecureStore.getAllKeysAsync();
      const templateKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
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
      const allKeys = await SecureStore.getAllKeysAsync();
      const templateKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
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
      const allKeys = await SecureStore.getAllKeysAsync();
      const templateKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      for (const key of templateKeys) {
        try {
          const cachedData = await SecureStore.getItemAsync(key);
          if (cachedData) {
            const cached: CachedTemplate = JSON.parse(cachedData);
            const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
            
            if (!fileInfo.exists) {
              await SecureStore.deleteItemAsync(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Delete the key if there's an error reading it
          await SecureStore.deleteItemAsync(key);
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

