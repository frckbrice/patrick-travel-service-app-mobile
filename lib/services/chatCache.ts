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
  lastTimestamp: number;
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
  
  // Cache expiration times (in milliseconds)
  private readonly MESSAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CONVERSATION_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_MESSAGES_IN_CACHE = 50; // Maximum messages per chat (FIFO)
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached conversations

  static getInstance(): ChatCacheService {
    if (!ChatCacheService.instance) {
      ChatCacheService.instance = new ChatCacheService();
    }
    return ChatCacheService.instance;
  }

  // Message caching methods
  async getCachedMessages(caseId: string): Promise<PaginatedMessageCache | null> {
    try {
      // Check in-memory cache first
      const memoryCache = this.messageCache[caseId];
      if (memoryCache && Date.now() < memoryCache.expiresAt) {
        logger.info('Messages served from memory cache', { caseId });
        return memoryCache.data;
      }

      // Check persistent storage
      const storageKey = `chat_messages_${caseId}`;
      const cachedData = await AsyncStorage.getItem(storageKey);
      
      if (cachedData) {
        const cacheEntry: CacheEntry<PaginatedMessageCache> = JSON.parse(cachedData);
        if (Date.now() < cacheEntry.expiresAt) {
          // Update memory cache
          this.messageCache[caseId] = cacheEntry;
          logger.info('Messages served from persistent cache', { caseId });
          return cacheEntry.data;
        } else {
          // Remove expired cache
          await AsyncStorage.removeItem(storageKey);
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting cached messages', error);
      return null;
    }
  }

  async setCachedMessages(
    caseId: string, 
    messages: ChatMessage[], 
    hasMore: boolean = true,
    totalCount: number = 0
  ): Promise<void> {
    try {
      const now = Date.now();
      const lastTimestamp = messages.length > 0 ? Math.min(...messages.map(m => m.timestamp)) : 0;
      
      const cacheEntry: CacheEntry<PaginatedMessageCache> = {
        data: {
          messages,
          hasMore,
          lastTimestamp,
          totalCount,
        },
        timestamp: now,
        expiresAt: now + this.MESSAGE_CACHE_TTL,
      };

      // Update memory cache
      this.messageCache[caseId] = cacheEntry;

      // Update persistent storage
      const storageKey = `chat_messages_${caseId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(cacheEntry));

      logger.info('Messages cached successfully', { caseId, count: messages.length, hasMore });
    } catch (error) {
      logger.error('Error caching messages', error);
    }
  }

  async addMessageToCache(caseId: string, message: ChatMessage): Promise<void> {
    try {
      const cachedData = await this.getCachedMessages(caseId);
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        // Check for duplicates
        const exists = cachedData.messages.some(
          m => m.id === message.id || m.tempId === message.tempId || 
          (m.timestamp === message.timestamp && m.senderId === message.senderId)
        );
        if (exists) return;
        
        // Add message and enforce FIFO limit
        const updatedMessages = [...cachedData.messages, message];
        const fifoMessages = updatedMessages.slice(-this.MAX_MESSAGES_IN_CACHE);
        
        await this.setCachedMessages(caseId, fifoMessages, cachedData.hasMore, cachedData.totalCount);
      } else {
        // If no cache exists, create new cache with this message
        await this.setCachedMessages(caseId, [message], true, 1);
      }
    } catch (error) {
      logger.error('Error adding message to cache', error);
    }
  }

  async prependMessagesToCache(caseId: string, olderMessages: ChatMessage[]): Promise<void> {
    try {
      const cachedData = await this.getCachedMessages(caseId);
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        // Filter out duplicates before prepending
        const uniqueOlderMessages = olderMessages.filter(newMsg => 
          !cachedData.messages.some(existingMsg => 
            existingMsg.id === newMsg.id || existingMsg.tempId === newMsg.tempId
          )
        );
        
        if (uniqueOlderMessages.length > 0) {
          const updatedMessages = [...uniqueOlderMessages, ...cachedData.messages];
          await this.setCachedMessages(caseId, updatedMessages, cachedData.hasMore, cachedData.totalCount);
        }
      } else {
        // If no cache exists, create new cache with these messages
        await this.setCachedMessages(caseId, olderMessages, true, olderMessages.length);
      }
    } catch (error) {
      logger.error('Error prepending messages to cache', error);
    }
  }

  async updateMessageInCache(caseId: string, messageId: string, updates: Partial<ChatMessage>): Promise<void> {
    try {
      const cachedData = await this.getCachedMessages(caseId);
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        const updatedMessages = cachedData.messages.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
        await this.setCachedMessages(caseId, updatedMessages, cachedData.hasMore, cachedData.totalCount);
      }
    } catch (error) {
      logger.error('Error updating message in cache', error);
    }
  }

  // Conversation caching methods
  async getCachedConversations(userId: string): Promise<Conversation[] | null> {
    try {
      // Check in-memory cache first
      const memoryCache = this.conversationCache[userId];
      if (memoryCache && Date.now() < memoryCache.expiresAt) {
        logger.info('Conversations served from memory cache', { userId });
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
          logger.info('Conversations served from persistent cache', { userId });
          return cacheEntry.data;
        } else {
          // Remove expired cache
          await AsyncStorage.removeItem(storageKey);
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting cached conversations', error);
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

      // Update persistent storage
      const storageKey = `chat_conversations_${userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(cacheEntry));

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
