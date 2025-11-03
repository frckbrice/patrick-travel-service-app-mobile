import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, Conversation } from './chat';
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PaginatedMessageCache {
  messages: ChatMessage[];
  hasMore: boolean;
  oldestTimestamp: number; // Renamed from lastTimestamp for clarity (oldest = pagination boundary)
  totalCount: number;
}

interface MessageCache {
  [caseId: string]: CacheEntry<PaginatedMessageCache>;
}

interface ConversationCache {
  [userId: string]: CacheEntry<Conversation[]>;
}

class ChatCacheService {
  private static instance: ChatCacheService;
  private messageCache: MessageCache = {};
  private conversationCache: ConversationCache = {};
  
  // Locks to prevent race conditions (per caseId/userId)
  private messageCacheLocks: Map<string, Promise<void>> = new Map();
  private conversationCacheLocks: Map<string, Promise<void>> = new Map();

  // Cache expiration times (in milliseconds)
  private readonly MESSAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CONVERSATION_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_MESSAGES_IN_CACHE = 50; // Maximum messages per chat (FIFO)
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached conversations
  private readonly ASYNC_STORAGE_RETRY_ATTEMPTS = 3; // Retry attempts for AsyncStorage operations

  static getInstance(): ChatCacheService {
    if (!ChatCacheService.instance) {
      ChatCacheService.instance = new ChatCacheService();
      // Start periodic cleanup of expired cache
      setInterval(() => {
        ChatCacheService.instance.clearExpiredCache().catch(() => {
          // Silently handle cleanup errors
        });
      }, 60 * 1000); // Every minute
    }
    return ChatCacheService.instance;
  }

  /**
   * Helper to check if two messages are duplicates
   */
  private isDuplicateMessage(msg1: ChatMessage, msg2: ChatMessage): boolean {
    // Check by ID (most reliable)
    if (msg1.id && msg2.id && msg1.id === msg2.id) return true;
    // Check by tempId (for optimistic updates)
    if (msg1.tempId && msg2.tempId && msg1.tempId === msg2.tempId) return true;
    // Check by timestamp + senderId (fallback for messages without IDs)
    if (msg1.timestamp === msg2.timestamp && msg1.senderId === msg2.senderId) return true;
    return false;
  }

  /**
   * Acquire a lock for a specific caseId to prevent concurrent modifications
   */
  private async acquireMessageLock(caseId: string): Promise<() => void> {
    // Wait for any existing lock to complete
    const existingLock = this.messageCacheLocks.get(caseId);
    if (existingLock) {
      await existingLock;
    }

    // Create new lock
    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = () => {
        this.messageCacheLocks.delete(caseId);
        resolve();
      };
    });
    this.messageCacheLocks.set(caseId, lockPromise);

    return releaseLock;
  }

  /**
   * Retry AsyncStorage operations with exponential backoff
   */
  private async retryAsyncStorage<T>(
    operation: () => Promise<T>,
    attempts: number = this.ASYNC_STORAGE_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        // Exponential backoff: 50ms, 100ms, 200ms
        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, i)));
        }
      }
    }
    throw lastError || new Error('AsyncStorage operation failed');
  }

  /**
   * Enforce MAX_CACHE_SIZE by evicting least recently used entries
   */
  private enforceCacheSizeLimit(): void {
    // Enforce conversation cache size limit with LRU eviction
    const conversationKeys = Object.keys(this.conversationCache);
    if (conversationKeys.length > this.MAX_CACHE_SIZE) {
      // Sort by timestamp (oldest first) and remove excess
      const sorted = conversationKeys
        .map(key => ({ key, timestamp: this.conversationCache[key].timestamp }))
        .sort((a, b) => a.timestamp - b.timestamp);

      const toRemove = sorted.slice(0, conversationKeys.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(({ key }) => {
        delete this.conversationCache[key];
      });

      logger.info('Evicted conversations from cache (LRU)', {
        evicted: toRemove.length,
        remaining: this.MAX_CACHE_SIZE,
      });
    }
  }

  // Message caching methods
  async getCachedMessages(caseId: string): Promise<PaginatedMessageCache | null> {
    try {
      // Check in-memory cache first
      const memoryCache = this.messageCache[caseId];
      if (memoryCache && Date.now() < memoryCache.expiresAt) {
        const messageCount = memoryCache.data?.messages?.length || 0;
        logger.info('Messages served from memory cache', {
          caseId,
          messageCount,
        });
        return memoryCache.data;
      }

      // Check persistent storage
      const storageKey = `chat_messages_${caseId}`;
      const cachedData = await this.retryAsyncStorage(() =>
        AsyncStorage.getItem(storageKey)
      );
      
      if (cachedData) {
        const cacheEntry: CacheEntry<PaginatedMessageCache> = JSON.parse(cachedData);
        if (Date.now() < cacheEntry.expiresAt) {
          // Update memory cache
          this.messageCache[caseId] = cacheEntry;
          logger.info('Messages served from persistent cache', { caseId });
          return cacheEntry.data;
        } else {
          // Remove expired cache
          await this.retryAsyncStorage(() => AsyncStorage.removeItem(storageKey));
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting cached messages', error);
      return null;
    }
  }

  /**
   * Internal method to set cached messages without acquiring a lock
   * Used by other methods that already hold locks
   */
  private async _setCachedMessagesInternal(
    caseId: string, 
    messages: ChatMessage[], 
    hasMore: boolean = true,
    totalCount: number = 0
  ): Promise<void> {
    try {
      const now = Date.now();
      // Ensure chronological order (oldest → newest)
      const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
      // Calculate oldest timestamp for pagination (oldest = boundary for loading older messages)
      const oldestTimestamp = sortedMessages.length > 0 ? Math.min(...sortedMessages.map(m => m.timestamp)) : 0;
      
      const cacheEntry: CacheEntry<PaginatedMessageCache> = {
        data: {
          messages: sortedMessages,
          hasMore,
          oldestTimestamp,
          totalCount,
        },
        timestamp: now,
        expiresAt: now + this.MESSAGE_CACHE_TTL,
      };

      // Update memory cache
      this.messageCache[caseId] = cacheEntry;

      // Update persistent storage with retry
      const storageKey = `chat_messages_${caseId}`;
      await this.retryAsyncStorage(() =>
        AsyncStorage.setItem(storageKey, JSON.stringify(cacheEntry))
      );

      logger.info('Messages cached successfully', {
        caseId,
        count: messages.length,
        hasMore,
      });
    } catch (error) {
      logger.error('Error caching messages', error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Public method to set cached messages (acquires lock for thread safety)
   */
  async setCachedMessages(
    caseId: string,
    messages: ChatMessage[],
    hasMore: boolean = true,
    totalCount: number = 0
  ): Promise<void> {
    const releaseLock = await this.acquireMessageLock(caseId);
    try {
      await this._setCachedMessagesInternal(caseId, messages, hasMore, totalCount);
    } finally {
      releaseLock();
    }
  }

  async addMessageToCache(caseId: string, message: ChatMessage): Promise<void> {
    const releaseLock = await this.acquireMessageLock(caseId);
    try {
      const cachedData = await this.getCachedMessages(caseId);
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        // Check for duplicates using standardized logic
        const exists = cachedData.messages.some(existingMsg =>
          this.isDuplicateMessage(existingMsg, message)
        );
        if (exists) return;
        
        // Add message and enforce FIFO limit (keep last N messages = newest)
        const updatedMessages = [...cachedData.messages, message];
        const fifoMessages = updatedMessages.slice(-this.MAX_MESSAGES_IN_CACHE);
        
        await this._setCachedMessagesInternal(caseId, fifoMessages, cachedData.hasMore, cachedData.totalCount);
      } else {
        // If no cache exists, create new cache with this message
        await this._setCachedMessagesInternal(caseId, [message], true, 1);
      }
    } catch (error) {
      logger.error('Error adding message to cache', error);
    } finally {
      releaseLock();
    }
  }

  async prependMessagesToCache(caseId: string, olderMessages: ChatMessage[]): Promise<void> {
    const releaseLock = await this.acquireMessageLock(caseId);
    try {
      const cachedData = await this.getCachedMessages(caseId);
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        // Filter out duplicates using standardized logic
        const uniqueOlderMessages = olderMessages.filter(newMsg => 
          !cachedData.messages.some(existingMsg => 
            this.isDuplicateMessage(existingMsg, newMsg)
          )
        );
        
        if (uniqueOlderMessages.length > 0) {
          const updatedMessages = [...uniqueOlderMessages, ...cachedData.messages];
          await this._setCachedMessagesInternal(caseId, updatedMessages, cachedData.hasMore, cachedData.totalCount);
        }
      } else {
        // If no cache exists, create new cache with these messages
        await this._setCachedMessagesInternal(caseId, olderMessages, true, olderMessages.length);
      }
    } catch (error) {
      logger.error('Error prepending messages to cache', error);
    } finally {
      releaseLock();
    }
  }

  async updateMessageInCache(caseId: string, messageId: string, updates: Partial<ChatMessage>): Promise<void> {
    const releaseLock = await this.acquireMessageLock(caseId);
    try {
      const cachedData = await this.getCachedMessages(caseId);
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        const updatedMessages = cachedData.messages.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
        await this._setCachedMessagesInternal(caseId, updatedMessages, cachedData.hasMore, cachedData.totalCount);
      }
    } catch (error) {
      logger.error('Error updating message in cache', error);
    } finally {
      releaseLock();
    }
  }

  // Conversation caching methods
  async getCachedConversations(userId: string): Promise<Conversation[] | null> {
    try {
      // Check in-memory cache first
      const memoryCache = this.conversationCache[userId];
      if (memoryCache && Date.now() < memoryCache.expiresAt) {
        logger.info('\n\n Conversations served from memory cache', { userId });
        return memoryCache.data;
      }

      // Check persistent storage
      const storageKey = `chat_conversations_${userId}`;
      const cachedData = await AsyncStorage.getItem(storageKey);
      
      if (cachedData) {
        const cacheEntry: CacheEntry<Conversation[]> = JSON.parse(cachedData);
        if (Date.now() < cacheEntry.expiresAt) {
          // Update memory cache
          this.conversationCache[userId] = cacheEntry;
          logger.info('\n\n Conversations served from persistent cache', { userId });
          return cacheEntry.data;
        } else {
          // Remove expired cache
          await AsyncStorage.removeItem(storageKey);
        }
      }

      return null;
    } catch (error) {
      logger.error('\n\n Error getting cached conversations', error);
      return null;
    }
  }

  async setCachedConversations(userId: string, conversations: Conversation[]): Promise<void> {
    try {
      const now = Date.now();
      const cacheEntry: CacheEntry<Conversation[]> = {
        data: conversations,
        timestamp: now,
        expiresAt: now + this.CONVERSATION_CACHE_TTL,
      };

      // Update memory cache
      this.conversationCache[userId] = cacheEntry;

      // Enforce cache size limit
      this.enforceCacheSizeLimit();

      // Update persistent storage with retry
      const storageKey = `chat_conversations_${userId}`;
      await this.retryAsyncStorage(() =>
        AsyncStorage.setItem(storageKey, JSON.stringify(cacheEntry))
      );

      logger.info('Conversations cached successfully', { userId, count: conversations.length });
    } catch (error) {
      logger.error('Error caching conversations', error);
    }
  }

  // Update a single conversation preview (e.g., lastMessage/lastMessageTime)
  async updateConversationPreview(
    userId: string,
    conversationId: string,
    data: Partial<Conversation>
  ): Promise<void> {
    try {
      const existing = await this.getCachedConversations(userId);

      let updatedList: Conversation[] = [];
      if (existing && Array.isArray(existing)) {
        const index = existing.findIndex((c) => c.id === conversationId);
        if (index >= 0) {
          const updated = { ...existing[index], ...data } as Conversation;
          updatedList = [...existing];
          updatedList[index] = updated;
        } else {
          // If not found, upsert a minimal conversation entry
          updatedList = [
            ...existing,
            {
              id: conversationId,
              caseId: conversationId,
              caseReference: conversationId,
              unreadCount: 0,
              participants: { clientId: '', clientName: '' },
              ...data,
            } as Conversation,
          ];
        }
      } else {
        updatedList = [
          {
            id: conversationId,
            caseId: conversationId,
            caseReference: conversationId,
            unreadCount: 0,
            participants: { clientId: '', clientName: '' },
            ...data,
          } as Conversation,
        ];
      }

      await this.setCachedConversations(userId, updatedList);
    } catch (error) {
      logger.error('Error updating conversation preview in cache', error);
    }
  }

  // Cache management methods
  async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      this.messageCache = {};
      this.conversationCache = {};

      // Clear persistent storage
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => 
        key.startsWith('chat_messages_') || key.startsWith('chat_conversations_')
      );
      
      if (chatKeys.length > 0) {
        await AsyncStorage.multiRemove(chatKeys);
      }

      logger.info('Chat cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing cache', error);
    }
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const now = Date.now();
      
      // Clear expired memory cache
      Object.keys(this.messageCache).forEach(caseId => {
        if (now >= this.messageCache[caseId].expiresAt) {
          delete this.messageCache[caseId];
        }
      });

      Object.keys(this.conversationCache).forEach(userId => {
        if (now >= this.conversationCache[userId].expiresAt) {
          delete this.conversationCache[userId];
        }
      });

      // Clear expired persistent storage
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => 
        key.startsWith('chat_messages_') || key.startsWith('chat_conversations_')
      );

      for (const key of chatKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(key);
          if (cachedData) {
            const cacheEntry: CacheEntry<any> = JSON.parse(cachedData);
            if (now >= cacheEntry.expiresAt) {
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          await AsyncStorage.removeItem(key);
        }
      }

      logger.info('Expired cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing expired cache', error);
    }
  }

  // Get cache statistics
  getCacheStats(): { messageCacheSize: number; conversationCacheSize: number } {
    return {
      messageCacheSize: Object.keys(this.messageCache).length,
      conversationCacheSize: Object.keys(this.conversationCache).length,
    };
  }

  // Get detailed cache statistics with message counts
  async getDetailedCacheStats(): Promise<{
    messageCaches: number;
    conversationCaches: number;
    totalMessages: number;
    messagesPerChat: Array<{ caseId: string; messageCount: number }>;
    persistentStorageKeys: number;
  }> {
    let totalMessages = 0;
    const messagesPerChat: Array<{ caseId: string; messageCount: number }> = [];

    // Count messages in memory cache
    Object.keys(this.messageCache).forEach(caseId => {
      const cache = this.messageCache[caseId];
      const messageCount = cache?.data?.messages?.length || 0;
      totalMessages += messageCount;
      if (messageCount > 0) {
        messagesPerChat.push({ caseId, messageCount });
      }
    });

    // Count messages in persistent storage
    let persistentStorageKeys = 0;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatMessageKeys = keys.filter(key => key.startsWith('chat_messages_'));
      persistentStorageKeys = chatMessageKeys.length;

      // Also count messages from persistent storage if not in memory
      for (const key of chatMessageKeys) {
        const caseId = key.replace('chat_messages_', '');
        if (!this.messageCache[caseId]) {
          try {
            const cachedData = await AsyncStorage.getItem(key);
            if (cachedData) {
              const cacheEntry: CacheEntry<PaginatedMessageCache> = JSON.parse(cachedData);
              const messageCount = cacheEntry?.data?.messages?.length || 0;
              totalMessages += messageCount;
              if (messageCount > 0) {
                messagesPerChat.push({ caseId, messageCount });
              }
            }
          } catch (error) {
            // Skip corrupted entries
          }
        }
      }
    } catch (error) {
      logger.error('Error reading persistent storage stats', error);
    }

    return {
      messageCaches: Object.keys(this.messageCache).length,
      conversationCaches: Object.keys(this.conversationCache).length,
      totalMessages,
      messagesPerChat,
      persistentStorageKeys,
    };
  }

  // Clear corrupted cache entries
  async clearCorruptedCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => 
        key.startsWith('chat_messages_') || key.startsWith('chat_conversations_')
      );

      for (const key of chatKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(key);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            // Check if the structure is valid
            if (key.startsWith('chat_messages_')) {
              if (!parsed.data || !parsed.data.messages || !Array.isArray(parsed.data.messages)) {
                await AsyncStorage.removeItem(key);
                logger.info('Removed corrupted message cache', { key });
              }
            } else if (key.startsWith('chat_conversations_')) {
              if (!parsed.data || !Array.isArray(parsed.data)) {
                await AsyncStorage.removeItem(key);
                logger.info('Removed corrupted conversation cache', { key });
              }
            }
          }
        } catch (error) {
          // Remove corrupted entries
          await AsyncStorage.removeItem(key);
          logger.info('Removed corrupted cache entry', { key });
        }
      }
    } catch (error) {
      logger.error('Error clearing corrupted cache', error);
    }
  }

  /**
   * Clean up cache when chat is closed (FIFO - keep only last N messages)
   * This reduces memory usage by keeping only the most recent messages in cache
   */
  async cleanupCacheOnChatClose(caseId: string, keepLast: number = 20): Promise<void> {
    try {
      const cachedData = await this.getCachedMessages(caseId);
      
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        // Keep only the last N messages (most recent)
        const messagesToKeep = cachedData.messages.slice(-keepLast);
        
        if (messagesToKeep.length < cachedData.messages.length) {
          // Update cache with reduced messages
          await this.setCachedMessages(
            caseId,
            messagesToKeep,
            cachedData.hasMore,
            cachedData.totalCount
          );
          logger.info('Cache cleaned up on chat close', {
            caseId,
            originalCount: cachedData.messages.length,
            keptCount: messagesToKeep.length,
          });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up cache on chat close', error);
      // Don't throw - cleanup is non-critical
    }
  }
}

export const chatCacheService = ChatCacheService.getInstance();
