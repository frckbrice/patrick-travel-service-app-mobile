import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { toast } from './toast';
import i18n from '../i18n';

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

interface OfflineQueueItem {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = true;
  private cachePrefix = 'offline_cache_';
  private queuePrefix = 'offline_queue_';
  private maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
  private maxRetryAttempts = 3;
  private retryDelay = 5000; // 5 seconds

  private constructor() {
    this.initializeNetworkListener();
    this.processOfflineQueue();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private async initializeNetworkListener() {
    // Initial connection check
    const initialState = await NetInfo.fetch();
    this.isOnline = initialState.isConnected ?? false;

    // Subscribe to network state changes
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        // Came back online
        this.processOfflineQueue();
        toast.success({
          title: i18n.t('offline.connectionRestored'),
          message: i18n.t('offline.youAreBackOnline'),
        });
      } else if (!wasOffline && !this.isOnline) {
        // Went offline
        toast.warning({
          title: i18n.t('offline.offlineMode'),
          message: i18n.t('offline.changesWillSync'),
        });
      }
    });
  }

  // Cache Management
  async setCache<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl || this.maxCacheAge),
        version: '1.0',
      };

      await AsyncStorage.setItem(
        `${this.cachePrefix}${key}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cacheItem.expiresAt) {
        await this.removeCache(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  async removeCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.cachePrefix}${key}`);
    } catch (error) {
      console.error('Failed to remove cache:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      let totalSize = 0;

      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  // Offline Queue Management
  async addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queueItem: OfflineQueueItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const queue = await this.getOfflineQueue();
      queue.push(queueItem);
      await this.saveOfflineQueue(queue);
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  }

  private async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    try {
      const queue = await AsyncStorage.getItem(`${this.queuePrefix}items`);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  private async saveOfflineQueue(queue: OfflineQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.queuePrefix}items`, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const queue = await this.getOfflineQueue();
      if (queue.length === 0) return;

      console.log(`Processing ${queue.length} offline queue items...`);

      for (const item of queue) {
        try {
          await this.processQueueItem(item);
          // Remove successful item from queue
          const updatedQueue = queue.filter(q => q.id !== item.id);
          await this.saveOfflineQueue(updatedQueue);
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          
          // Increment retry count
          item.retryCount++;
          
          if (item.retryCount >= this.maxRetryAttempts) {
            // Remove item after max retries
            const updatedQueue = queue.filter(q => q.id !== item.id);
            await this.saveOfflineQueue(updatedQueue);
            
            toast.error({
              title: i18n.t('offline.syncFailed'),
              message: i18n.t('offline.failedToSync', { 
                operation: item.type, 
                url: item.url, 
                attempts: this.maxRetryAttempts 
              }),
            });
          } else {
            // Update queue with incremented retry count
            const updatedQueue = queue.map(q => q.id === item.id ? item : q);
            await this.saveOfflineQueue(updatedQueue);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }

  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    // This would integrate with your actual API service
    // For now, we'll simulate the API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate success/failure
        if (Math.random() > 0.2) { // 80% success rate
          resolve();
        } else {
          reject(new Error('Simulated API failure'));
        }
      }, 1000);
    });
  }

  // Smart Data Fetching
  async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.getCache<T>(key);
    if (cached) {
      return cached;
    }

    // If online, fetch fresh data
    if (this.isOnline) {
      try {
        const data = await fetchFn();
        await this.setCache(key, data, ttl);
        return data;
      } catch (error) {
        // If fetch fails and we have cached data, return it
        const staleCache = await this.getCache<T>(key);
        if (staleCache) {
          console.warn('Using stale cache due to fetch failure');
          return staleCache;
        }
        throw error;
      }
    }

    // If offline and no cache, throw error
    throw new Error('No cached data available and offline');
  }

  // Utility Methods
  isConnected(): boolean {
    return this.isOnline;
  }

  async getQueueLength(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.length;
  }

  async getCacheInfo(): Promise<{
    size: number;
    itemCount: number;
    queueLength: number;
  }> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
    
    return {
      size: await this.getCacheSize(),
      itemCount: cacheKeys.length,
      queueLength: await this.getQueueLength(),
    };
  }
}

export const offlineService = OfflineService.getInstance();
export type { CacheItem, OfflineQueueItem };

