import { database } from '../firebase/config';
import {
  ref,
  push,
  onValue,
  onChildChanged,
  onChildAdded,
  off,
  query,
  orderByChild,
  equalTo,
  set,
  update,
  get,
  limitToLast,
  startAfter,
} from 'firebase/database';
import { logger } from '../utils/logger';
import { chatCacheService } from './chatCache';

export interface ChatMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderName: string;
  senderRole: 'CLIENT' | 'AGENT' | 'ADMIN';
  message: string;
  timestamp: number;
  isRead: boolean;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  // Optimistic update states
  status?: 'pending' | 'sent' | 'failed';
  tempId?: string; // Temporary ID for optimistic messages
  error?: string; // Error message if failed
}

export interface Conversation {
  id: string;
  caseId: string;
  caseReference: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  participants: {
    clientId: string;
    clientName: string;
    agentId?: string;
    agentName?: string;
  };
}

class ChatService {
  // Send a message
  async sendMessage(
    caseId: string,
    senderId: string,
    senderName: string,
    senderRole: 'CLIENT' | 'AGENT' | 'ADMIN',
    message: string,
    attachments?: ChatMessage['attachments']
  ): Promise<boolean> {
    try {
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      const newMessageRef = push(messagesRef);

      const chatMessage: Omit<ChatMessage, 'id'> = {
        caseId,
        senderId,
        senderName,
        senderRole,
        message,
        timestamp: Date.now(), // Save timestamp
        isRead: false,
        attachments,
      };

      // Save with Firebase-compatible field names
      const firebaseMessage = {
        caseId,
        senderId,
        senderName,
        senderRole,
        content: message, // Firebase uses 'content'
        message, // Also keep 'message' for backward compatibility
        sentAt: Date.now(), // Firebase uses 'sentAt'
        timestamp: Date.now(), // Also keep 'timestamp' for backward compatibility
        isRead: false,
        attachments,
      };

      await set(newMessageRef, firebaseMessage);

      // Update cache with the new message
      const newMessage: ChatMessage = {
        id: newMessageRef.key!,
        caseId,
        senderId,
        senderName,
        senderRole,
        message,
        timestamp: Date.now(),
        isRead: false,
        attachments,
        status: 'sent',
      };
      
      await chatCacheService.addMessageToCache(caseId, newMessage);

      // Update conversation metadata
      await this.updateConversationMetadata(caseId, message);

      logger.info('Message sent successfully', { caseId });
      return true;
    } catch (error) {
      logger.error('Failed to send message', error);
      return false;
    }
  }

  // Listen globally to a user's chats' metadata updates (lightweight)
  listenToUserChats(
    userId: string,
    onPreviewUpdate?: (chatId: string, data: Partial<Conversation>) => void
  ): () => void {
    // We assume a userChats index exists for efficiency
    const userChatsRef = ref(database, `userChats/${userId}`);

    let metadataUnsubscribers: Array<() => void> = [];

    const userChatsListener = onValue(userChatsRef, async (snap) => {
      // Detach prior metadata listeners to avoid duplicates
      metadataUnsubscribers.forEach((u) => u());
      metadataUnsubscribers = [];

      const userChats = snap.val() || {};
      const chatIds = Object.keys(userChats);

      chatIds.forEach((chatId) => {
        const metadataRef = ref(database, `chats/${chatId}/metadata`);
        const unsub = onChildChanged(metadataRef, async (childSnap) => {
          const key = childSnap.key;
          const value = childSnap.val();
          if (key === 'lastMessage' || key === 'lastMessageTime') {
            const data: Partial<Conversation> = { [key]: value } as any;
            // Update cache
            await chatCacheService.updateConversationPreview(userId, chatId, data);
            // Notify UI
            onPreviewUpdate?.(chatId, data);
          }
        });
        metadataUnsubscribers.push(() => off(metadataRef, 'child_changed', unsub));
      });
    });

    // Return a single unsubscribe that clears all
    return () => {
      off(userChatsRef, 'value', userChatsListener);
      metadataUnsubscribers.forEach((u) => u());
      metadataUnsubscribers = [];
    };
  }

  // Listen to messages for an active chat only (attach when chat is open)
  listenToChatMessages(
    caseId: string,
    onNew: (messages: ChatMessage[]) => void,
    limit: number = 30
  ): () => void {
    const messagesRef = ref(database, `chats/${caseId}/messages`);
    const q = query(messagesRef, orderByChild('sentAt'), limitToLast(limit));

    const listener = onChildAdded(q, async (snap) => {
      const firebaseData = snap.val();
      if (!firebaseData || typeof firebaseData !== 'object') return;
      const mapped: ChatMessage = {
        id: snap.key!,
        caseId: firebaseData.caseId || caseId,
        senderId: firebaseData.senderId || '',
        senderName: firebaseData.senderName || 'Unknown',
        senderRole: firebaseData.senderRole || 'CLIENT',
        message: firebaseData.content || firebaseData.message || '',
        timestamp: firebaseData.sentAt || firebaseData.timestamp || Date.now(),
        isRead: firebaseData.isRead || false,
        attachments: firebaseData.attachments || [],
      };

      // Update cache and emit to UI
      await chatCacheService.addMessageToCache(caseId, mapped);
      onNew([mapped]);
    });

    return () => off(q, 'child_added', listener);
  }

  // Update conversation metadata
  private async updateConversationMetadata(
    caseId: string,
    lastMessage: string
  ): Promise<void> {
    const conversationRef = ref(database, `chats/${caseId}/metadata`);
    await update(conversationRef, {
      lastMessage: lastMessage.substring(0, 100),
      lastMessageTime: Date.now(),
    });
  }

  // Load initial messages (last 20) with caching
  async loadInitialMessages(caseId: string): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      logger.info('loadInitialMessages called', { caseId });
      
      // Clear corrupted cache entries first
      await chatCacheService.clearCorruptedCache();
      
      // Try cache first
      const cachedData = await chatCacheService.getCachedMessages(caseId);
      logger.info('Cache check completed', { caseId, hasCache: !!cachedData });
      
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        logger.info('Initial messages loaded from cache', { caseId, count: cachedData.messages.length });
        return {
          messages: cachedData.messages.slice(-20), // Return last 20 from cache
          hasMore: cachedData.hasMore || false,
          totalCount: cachedData.totalCount || 0,
        };
      }

      // Load from Firebase
      logger.info('Loading from Firebase', { caseId });
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      logger.info('Messages ref created', { path: messagesRef.toString() });
      
      // Try without orderByChild first to see if data exists
      let messagesQuery;
      try {
        messagesQuery = query(
          messagesRef, 
          orderByChild('sentAt'),
          limitToLast(20)
        );
      } catch (error) {
        logger.warn('orderByChild failed, trying without ordering', { caseId, error: error.message });
        messagesQuery = query(messagesRef, limitToLast(20));
      }

      let snapshot = await get(messagesQuery);
      logger.info('Firebase snapshot received', { caseId, size: snapshot.size, exists: snapshot.exists() });
      
      // If no data with query, try without any restrictions
      if (!snapshot.exists() || snapshot.size === 0) {
        logger.info('No data with query, trying without restrictions', { caseId });
        snapshot = await get(messagesRef);
        logger.info('Direct ref snapshot', { caseId, size: snapshot.size, exists: snapshot.exists() });
      }
      
      // Log the actual data structure
      if (snapshot.exists()) {
        logger.info('Snapshot data structure', { 
          caseId, 
          keys: Object.keys(snapshot.val() || {}),
          firstKey: Object.keys(snapshot.val() || {})[0]
        });
      }
      const messages: ChatMessage[] = [];

      snapshot.forEach((childSnapshot) => {
        const firebaseData = childSnapshot.val();

        // Skip if firebaseData is null or undefined
        if (!firebaseData || typeof firebaseData !== 'object') {
          logger.warn('Skipping invalid message data', { key: childSnapshot.key });
          return;
        }

        const mappedMessage: ChatMessage = {
          id: childSnapshot.key!,
          caseId: firebaseData.caseId || '',
          senderId: firebaseData.senderId || '',
          senderName: firebaseData.senderName || 'Unknown',
          senderRole: firebaseData.senderRole || 'CLIENT',
          message: firebaseData.content || firebaseData.message || '',
          timestamp: firebaseData.sentAt || firebaseData.timestamp || Date.now(),
          isRead: firebaseData.isRead || false,
          attachments: firebaseData.attachments || [],
          status: firebaseData.status,
          tempId: firebaseData.tempId,
          error: firebaseData.error,
        };

        messages.push(mappedMessage);
      });

      logger.info('Messages processed from Firebase', { caseId, count: messages.length });

      // Get total count for pagination info
      const totalSnapshot = await get(messagesRef);
      const totalCount = totalSnapshot.size;

      // Cache the messages
      await chatCacheService.setCachedMessages(
        caseId, 
        messages, 
        totalCount > 20, // hasMore
        totalCount
      );

      logger.info('Initial messages loaded from Firebase', { caseId, count: messages.length, totalCount });
      return {
        messages: Array.isArray(messages) ? messages : [],
        hasMore: totalCount > 20,
        totalCount: totalCount || 0,
      };
    } catch (error) {
      logger.error('Error loading initial messages', error);
      return { messages: [], hasMore: false, totalCount: 0 };
    }
  }

  // Load older messages (pagination)
  async loadOlderMessages(
    caseId: string,
    beforeTimestamp: number,
    limit: number = 20
  ): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
  }> {
    try {
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      const messagesQuery = query(
        messagesRef,
        orderByChild('sentAt'),
        limitToLast(limit),
        startAfter(beforeTimestamp)
      );

      const snapshot = await get(messagesQuery);
      const messages: ChatMessage[] = [];

      snapshot.forEach((childSnapshot) => {
        const firebaseData = childSnapshot.val();
        
        // Skip if firebaseData is null or undefined
        if (!firebaseData || typeof firebaseData !== 'object') {
          logger.warn('Skipping invalid message data in loadOlderMessages', { key: childSnapshot.key });
          return;
        }
        
        const mappedMessage: ChatMessage = {
          id: childSnapshot.key!,
          caseId: firebaseData.caseId || '',
          senderId: firebaseData.senderId || '',
          senderName: firebaseData.senderName || 'Unknown',
          senderRole: firebaseData.senderRole || 'CLIENT',
          message: firebaseData.content || firebaseData.message || '',
          timestamp: firebaseData.sentAt || firebaseData.timestamp || Date.now(),
          isRead: firebaseData.isRead || false,
          attachments: firebaseData.attachments || [],
          status: firebaseData.status,
          tempId: firebaseData.tempId,
          error: firebaseData.error,
        };

        messages.push(mappedMessage);
      });

      // Update cache with older messages
      await chatCacheService.prependMessagesToCache(caseId, messages);

      logger.info('Older messages loaded from Firebase', { caseId, count: messages.length });
      return {
        messages: Array.isArray(messages) ? messages : [],
        hasMore: messages.length === limit, // If we got exactly the limit, there might be more
      };
    } catch (error) {
      logger.error('Error loading older messages', error);
      return { messages: [], hasMore: false };
    }
  }

  // Listen to new messages only (real-time updates)
  onNewMessagesChange(
    caseId: string,
    callback: (newMessages: ChatMessage[]) => void,
    lastKnownTimestamp?: number
  ): () => void {
    const messagesRef = ref(database, `chats/${caseId}/messages`);
    const messagesQuery = query(
      messagesRef, 
      orderByChild('sentAt'),
      limitToLast(20) // Only listen to last 20 messages for real-time updates
    );

    const listener = onValue(messagesQuery, async (snapshot) => {
      const messages: ChatMessage[] = [];
      
      snapshot.forEach((childSnapshot) => {
        const firebaseData = childSnapshot.val();
        
        // Skip if firebaseData is null or undefined
        if (!firebaseData || typeof firebaseData !== 'object') {
          logger.warn('Skipping invalid message data in onNewMessagesChange', { key: childSnapshot.key });
          return;
        }
        
        const mappedMessage: ChatMessage = {
          id: childSnapshot.key!,
          caseId: firebaseData.caseId || '',
          senderId: firebaseData.senderId || '',
          senderName: firebaseData.senderName || 'Unknown',
          senderRole: firebaseData.senderRole || 'CLIENT',
          message: firebaseData.content || firebaseData.message || '',
          timestamp: firebaseData.sentAt || firebaseData.timestamp || Date.now(),
          isRead: firebaseData.isRead || false,
          attachments: firebaseData.attachments || [],
          status: firebaseData.status,
          tempId: firebaseData.tempId,
          error: firebaseData.error,
        };

        messages.push(mappedMessage);
      });

      // Filter only new messages if lastKnownTimestamp is provided
      const newMessages = lastKnownTimestamp 
        ? messages.filter(msg => msg.timestamp > lastKnownTimestamp)
        : messages;

      if (newMessages && newMessages.length > 0) {
        // Update cache with new messages
        const cachedData = await chatCacheService.getCachedMessages(caseId);
        if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
          // Filter out duplicates before updating cache
          const uniqueNewMessages = newMessages.filter(newMsg => 
            !cachedData.messages.some(existingMsg => 
              existingMsg.id === newMsg.id || existingMsg.tempId === newMsg.tempId
            )
          );
          
          if (uniqueNewMessages.length > 0) {
            const updatedMessages = [...cachedData.messages, ...uniqueNewMessages];
            await chatCacheService.setCachedMessages(caseId, updatedMessages, cachedData.hasMore, cachedData.totalCount);
            callback(uniqueNewMessages);
          }
        } else {
          // If no cache exists or cache is corrupted, just cache the new messages
          await chatCacheService.setCachedMessages(caseId, newMessages, true, newMessages.length);
          callback(newMessages);
        }
      }
    });

    return () => off(messagesRef, 'value', listener);
  }

  // Mark messages as read
  async markMessagesAsRead(caseId: string, userId: string): Promise<void> {
    try {
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      const snapshot = await get(messagesRef);

      const updates: Record<string, any> = {};
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        if (message.senderId !== userId && !message.isRead) {
          updates[`${childSnapshot.key}/isRead`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        try {
          await update(messagesRef, updates);
        } catch (updateError: any) {
          // Handle permission denied gracefully
          if (updateError.code === 'PERMISSION_DENIED') {
            logger.warn('Permission denied when marking messages as read - this is normal for some users', {
              caseId,
              userId
            });
            return;
          }
          throw updateError;
        }
      }
    } catch (error) {
      // Don't throw error - just log it, as permission issues are expected for some users
      logger.error('Failed to mark messages as read', error);
    }
  }

  // Get unread count for a case
  async getUnreadCount(caseId: string, userId: string): Promise<number> {
    try {
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      const snapshot = await get(messagesRef);

      let count = 0;
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        if (message.senderId !== userId && !message.isRead) {
          count++;
        }
      });

      return count;
    } catch (error) {
      logger.error('Failed to get unread count', error);
      return 0;
    }
  }

  // Listen to all conversations for a user (optimized)
  onConversationsChange(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    const chatsRef = ref(database, 'chats');

    const listener = onValue(chatsRef, async (snapshot) => {
      const conversations: Conversation[] = [];
      const conversationPromises: Promise<void>[] = [];

      snapshot.forEach((childSnapshot) => {
        const caseId = childSnapshot.key!;
        const caseData = childSnapshot.val();
        const metadata = caseData.metadata || {};

        // Check if user is a participant
        if (
          metadata.participants?.clientId === userId ||
          metadata.participants?.agentId === userId
        ) {
          // Use Promise to get unread count asynchronously
          conversationPromises.push(
            this.getUnreadCount(caseId, userId).then((unreadCount) => {
              conversations.push({
                id: caseId,
                caseId,
                caseReference: metadata.caseReference || caseId,
                lastMessage: metadata.lastMessage,
                lastMessageTime: metadata.lastMessageTime,
                unreadCount,
                participants: metadata.participants,
              });
            })
          );
        }
      });

      // Wait for all unread counts (parallel for performance)
      await Promise.all(conversationPromises);

      // Sort by last message time
      conversations.sort(
        (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
      );

      callback(conversations);
    });

    return () => off(chatsRef, 'value', listener);
  }

  // Initialize a conversation for a case
  async initializeConversation(
    caseId: string,
    caseReference: string,
    clientId: string,
    clientName: string,
    agentId?: string,
    agentName?: string
  ): Promise<void> {
    try {
      const conversationRef = ref(database, `chats/${caseId}/metadata`);
      await set(conversationRef, {
        caseReference,
        participants: {
          clientId,
          clientName,
          agentId: agentId || null,
          agentName: agentName || null,
        },
        createdAt: Date.now(),
      });

      logger.info('Conversation initialized', { caseId });
    } catch (error) {
      logger.error('Failed to initialize conversation', error);
    }
  }

  // Delete a conversation
  async deleteConversation(caseId: string): Promise<void> {
    try {
      const conversationRef = ref(database, `chats/${caseId}`);
      await set(conversationRef, null);
      logger.info('Conversation deleted', { caseId });
    } catch (error) {
      logger.error('Failed to delete conversation', error);
    }
  }

  /**
   * Delete a chat conversation and clean up userChats entries
   * Should only be called when a case is permanently deleted
   */
  async deleteFirebaseChat(caseId: string): Promise<void> {
    try {
      const chatRef = ref(database, `chats/${caseId}`);
      const metadataRef = ref(database, `chats/${caseId}/metadata`);

      // 1) Fetch participants from metadata
      const metadataSnap = await get(metadataRef);
      if (!metadataSnap.exists()) {
        logger.warn('Chat metadata not found, skipping userChats cleanup', { caseId });
        await set(chatRef, null);
        return;
      }

      const participants = metadataSnap.val()?.participants;
      const { agentId, clientId } = participants || {};

      // 2) Remove chat node
      await set(chatRef, null);

      // 3) Remove entries from userChats for both participants
      if (agentId && clientId) {
        await Promise.all([
          set(ref(database, `userChats/${agentId}/${caseId}`), null),
          set(ref(database, `userChats/${clientId}/${caseId}`), null),
        ]);
        logger.info('Firebase chat and userChats entries deleted', { caseId, agentId, clientId });
      } else {
        logger.warn('Missing participant IDs during deletion', { caseId, participants });
      }
    } catch (error) {
      logger.error('Failed to delete Firebase chat or clean up userChats', error, { caseId });
      throw error;
    }
  }

  // Load conversations with caching
  async loadConversations(userId: string): Promise<Conversation[]> {
    try {
      // Try cache first
      const cachedConversations = await chatCacheService.getCachedConversations(userId);
      if (cachedConversations) {
        logger.info('Conversations loaded from cache', { userId, count: cachedConversations.length });
        return cachedConversations;
      }

      // Load from Firebase
      const chatsRef = ref(database, 'chats');
      const snapshot = await get(chatsRef);
      const conversations: Conversation[] = [];
      const conversationPromises: Promise<void>[] = [];

      snapshot.forEach((childSnapshot) => {
        const caseId = childSnapshot.key!;
        const caseData = childSnapshot.val();
        const metadata = caseData.metadata || {};

        // Check if user is a participant
        if (
          metadata.participants?.clientId === userId ||
          metadata.participants?.agentId === userId
        ) {
          conversationPromises.push(
            this.getUnreadCount(caseId, userId).then((unreadCount) => {
              conversations.push({
                id: caseId,
                caseId,
                caseReference: metadata.caseReference || caseId,
                lastMessage: metadata.lastMessage,
                lastMessageTime: metadata.lastMessageTime,
                unreadCount,
                participants: metadata.participants,
              });
            })
          );
        }
      });

      await Promise.all(conversationPromises);
      conversations.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

      // Cache the conversations
      await chatCacheService.setCachedConversations(userId, conversations);

      logger.info('Conversations loaded from Firebase', { userId, count: conversations.length });
      return conversations;
    } catch (error) {
      logger.error('Error loading conversations', error);
      return [];
    }
  }

  // Listen to conversation updates only (real-time)
  onConversationUpdates(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    const chatsRef = ref(database, 'chats');

    const listener = onValue(chatsRef, async (snapshot) => {
      const conversations: Conversation[] = [];
      const conversationPromises: Promise<void>[] = [];

      snapshot.forEach((childSnapshot) => {
        const caseId = childSnapshot.key!;
        const caseData = childSnapshot.val();
        const metadata = caseData.metadata || {};

        // Check if user is a participant
        if (
          metadata.participants?.clientId === userId ||
          metadata.participants?.agentId === userId
        ) {
          conversationPromises.push(
            this.getUnreadCount(caseId, userId).then((unreadCount) => {
              conversations.push({
                id: caseId,
                caseId,
                caseReference: metadata.caseReference || caseId,
                lastMessage: metadata.lastMessage,
                lastMessageTime: metadata.lastMessageTime,
                unreadCount,
                participants: metadata.participants,
              });
            })
          );
        }
      });

      await Promise.all(conversationPromises);
      conversations.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

      // Update cache
      await chatCacheService.setCachedConversations(userId, conversations);
      callback(conversations);
    });

    return () => off(chatsRef, 'value', listener);
  }
}

export const chatService = new ChatService();
