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
import { messagesApi } from '../api/messages.api';

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

export interface ChatParticipants {
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
}

export interface ChatMetadata {
  caseReference: string;
  participants: ChatParticipants;
  createdAt: number;
  lastMessage: string | null;
  lastMessageTime: number | null;
}

// Local conversation type used within this service
export interface Conversation {
  id: string;
  caseId: string;
  caseReference: string;
  lastMessage: string | null;
  lastMessageTime: number | null;
  unreadCount: number;
  participants: ChatParticipants;
}

// Types for API responses used in mapping (no 'any')
interface ApiChatSender {
  firstName?: string;
  lastName?: string;
}

interface ApiChatAttachment {
  fileName?: string;
  name?: string;
  url: string;
  mimeType?: string;
  type?: string;
  fileSize?: number;
  size?: number;
}

interface ApiChatMessage {
  id: string;
  caseId?: string;
  senderId: string;
  senderFirstName?: string;
  senderLastName?: string;
  sender?: ApiChatSender;
  content: string;
  sentAt: string | number | Date;
  isRead: boolean;
  attachments?: ApiChatAttachment[];
}

class ChatService {
  // Send a message (aligned with web app)
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
      const messageId = newMessageRef.key!;

      const timestamp = Date.now();
      const messageData = {
        id: messageId,
        senderId,
        senderName,
        content: message,
        sentAt: timestamp,
        isRead: false,
        caseId,
        attachments: attachments || [],
      };

      // Ensure metadata exists before writing message
      const metadataRef = ref(database, `chats/${caseId}/metadata`);
      const existingMetadata = await get(metadataRef);

      if (!existingMetadata.exists()) {
        logger.warn('Chat metadata not found, message may fail due to Firebase rules', { caseId });
      } else {
        // Update metadata with new last message
        const currentData = existingMetadata.val();
        await update(metadataRef, {
          participants: currentData.participants,
          lastMessage: message.substring(0, 100),
          lastMessageTime: timestamp,
        });

        // Update userChats index for both participants
        const { agentId, clientId } = currentData.participants;
        if (agentId && clientId) {
          await Promise.all([
            update(ref(database, `userChats/${agentId}/${caseId}`), {
              lastMessage: message.substring(0, 100),
              lastMessageTime: timestamp,
            }),
            update(ref(database, `userChats/${clientId}/${caseId}`), {
              lastMessage: message.substring(0, 100),
              lastMessageTime: timestamp,
            }),
          ]);
        }
      }

      // Write the message
      await set(newMessageRef, messageData);

      // Update cache with the new message
      const newMessage: ChatMessage = {
        id: messageId,
        caseId,
        senderId,
        senderName,
        senderRole,
        message,
        timestamp,
        isRead: false,
        attachments,
        status: 'sent',
      };
      
      await chatCacheService.addMessageToCache(caseId, newMessage);

      logger.info('Message sent successfully', { caseId, messageId });
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

  // Load initial messages (last 20) with caching
  async loadInitialMessages(caseId: string): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      logger.info('\n\n loadInitialMessages from chat service called', { caseId });
      
      // Clear corrupted cache entries first
      await chatCacheService.clearCorruptedCache();
      
      // Try cache first
      const cachedData = await chatCacheService.getCachedMessages(caseId);
      logger.info('\n\n Cache check completed', { caseId, hasCache: !!cachedData, cachedData });
      
      if (cachedData && cachedData.messages && Array.isArray(cachedData.messages)) {
        logger.info('\n\n Initial messages loaded from cache', { caseId, count: cachedData.messages.length });
        return {
          messages: cachedData.messages.slice(-50), // Return last 50 from cache
          hasMore: cachedData.hasMore || false,
          totalCount: cachedData.totalCount || 0,
        };
      }

      // Load from Firebase
      logger.info('\n\n Loading from Firebase', { caseId });
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      logger.info('\n\n Messages ref created', { path: messagesRef.toString() });
      
      // Try without orderByChild first to see if data exists
      let messagesQuery;
      try {
        messagesQuery = query(
          messagesRef, 
          orderByChild('sentAt'),
          limitToLast(20)
        );
      } catch (error: any) {
        logger.warn('orderByChild failed, trying without ordering', { caseId, error: error.message });
        messagesQuery = query(messagesRef, limitToLast(20));
      }

      let snapshot = await get(messagesQuery);
      logger.info('\n\n Firebase snapshot received', { caseId, size: snapshot.size, exists: snapshot.exists() });
      
      // If no data with query, try without any restrictions
      if (!snapshot.exists() || snapshot.size === 0) {
        logger.info('\n\n No data with query, trying without restrictions', { caseId });
        snapshot = await get(messagesRef);
        logger.info('\n\n Direct ref snapshot', { caseId, size: snapshot.size, exists: snapshot.exists() });
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

      // Ensure chronological order (oldest → newest)
      messages.sort((a, b) => a.timestamp - b.timestamp);

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

      // Ensure chronological order (oldest → newest)
      messages.sort((a, b) => a.timestamp - b.timestamp);

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

  // Mark messages as read (aligned with web app)
  async markMessagesAsRead(caseId: string, userId: string): Promise<void> {
    try {
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      const snapshot = await get(messagesRef);

      if (!snapshot.exists()) {
        logger.info('No messages found to mark as read', { caseId });
        return;
      }

      const updatePromises: Promise<void>[] = [];

      snapshot.forEach((msgSnap) => {
        const msg = msgSnap.val();
        // Only mark messages as read if they weren't sent by the current user and aren't already read
        if (msg.senderId !== userId && !msg.isRead) {
          const messageRef = ref(database, `chats/${caseId}/messages/${msgSnap.key}`);
          updatePromises.push(
            update(messageRef, { isRead: true }).catch((err: any) => {
              if (err.code !== 'PERMISSION_DENIED') {
                logger.error(
                  `Failed to mark message as read (caseId=${caseId}, messageId=${msgSnap.key}, userId=${userId})`,
                  err
                );
              }
            })
          );
        }
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        logger.info('Messages marked as read', {
          caseId,
          userId,
          count: updatePromises.length,
        });
      }
    } catch (error) {
      logger.error(`Failed to mark messages as read (caseId=${caseId}, userId=${userId})`, error);
      // Don't throw - this is non-critical
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

  // Get total unread chat messages count across all cases for a user
  async getTotalUnreadCount(userId: string, caseIds: string[]): Promise<number> {
    try {
      if (!caseIds || caseIds.length === 0) {
        return 0;
      }

      // Get unread counts for all cases in parallel
      const countPromises = caseIds.map(caseId => this.getUnreadCount(caseId, userId));
      const counts = await Promise.all(countPromises);
      
      // Sum all counts
      const total = counts.reduce((sum, count) => sum + count, 0);
      
      logger.info('Total unread chat messages', { userId, total, caseCount: caseIds.length });
      return total;
    } catch (error) {
      logger.error('Failed to get total unread count', error);
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

  // Initialize a conversation for a case (aligned with web app)
  async initializeConversation(
    caseId: string,
    caseReference: string,
    clientId: string,
    clientName: string,
    agentId: string,
    agentName: string
  ): Promise<void> {
    try {
      const conversationRef = ref(database, `chats/${caseId}/metadata`);
      
      // Check if conversation already exists
      const snapshot = await get(conversationRef);

      if (snapshot.exists()) {
        // Update existing conversation with new agent info
        await update(conversationRef, {
          participants: {
            clientId,
            clientName,
            agentId,
            agentName,
          },
          updatedAt: Date.now(),
        });

        logger.info('Firebase chat updated with new agent', {
          caseId,
          clientId,
          agentId,
          action: 'update',
        });
      } else {
        // Create new conversation
        const chatMetadata: ChatMetadata = {
          caseReference,
          participants: {
            clientId,
            clientName,
            agentId,
            agentName,
          },
          createdAt: Date.now(),
          lastMessage: null,
          lastMessageTime: null,
        };

        await set(conversationRef, chatMetadata);

        // Create userChats index entries
        await Promise.all([
          set(ref(database, `userChats/${agentId}/${caseId}`), {
            chatId: caseId,
            participantName: clientName,
            lastMessage: null,
            lastMessageTime: null,
          }),
          set(ref(database, `userChats/${clientId}/${caseId}`), {
            chatId: caseId,
            participantName: agentName,
            lastMessage: null,
            lastMessageTime: null,
          }),
        ]);

        logger.info('Firebase chat initialized', {
          caseId,
          clientId,
          agentId,
          action: 'create',
        });
      }
    } catch (error) {
      logger.error('Failed to initialize conversation', error);
      // Don't throw - chat initialization failure shouldn't block case assignment
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
      logger.error(`Failed to delete Firebase chat or clean up userChats (caseId=${caseId})`, error);
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

  // Send initial welcome message from agent to client (aligned with web app)
  async sendWelcomeMessage(
    caseId: string,
    agentId: string,
    agentName: string,
    clientName: string,
    caseReference: string
  ): Promise<void> {
    try {
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      const welcomeMessageRef = ref(database, `chats/${caseId}/messages/${Date.now()}`);

      const welcomeMessage = {
        caseId,
        senderId: agentId,
        senderName: agentName,
        content: `Hello ${clientName.split(' ')[0]}, I'm ${agentName}, your advisor for case ${caseReference}. I've reviewed your case and I'm here to help. Feel free to ask any questions!`,
        sentAt: Date.now(),
        isRead: false,
      };

      await set(welcomeMessageRef, welcomeMessage);

      // Update conversation metadata
      const metadataRef = ref(database, `chats/${caseId}/metadata`);
      await update(metadataRef, {
        lastMessage: welcomeMessage.content.substring(0, 100),
        lastMessageTime: Date.now(),
      });

      logger.info('Welcome message sent', { caseId, agentId });
    } catch (error) {
      logger.error('Failed to send welcome message', error);
      // Don't throw - welcome message is optional
    }
  }

  // Update agent information in existing conversation (aligned with web app)
  async updateChatAgent(
    caseId: string,
    newAgentId: string,
    newAgentName: string
  ): Promise<void> {
    try {
      const participantsRef = ref(database, `chats/${caseId}/metadata/participants`);

      await update(participantsRef, {
        agentId: newAgentId,
        agentName: newAgentName,
      });

      logger.info('Chat agent updated', { caseId, newAgentId });
    } catch (error) {
      logger.error('Failed to update chat agent', error);
      throw error;
    }
  }

  // API Integration Methods for Message Read Status
  // These methods sync with the backend API for persistent read status

  /**
   * Mark a single chat message as read via API
   * This updates both Firebase (real-time) and PostgreSQL (persistent)
   */
  async markMessageAsReadApi(messageId: string): Promise<boolean> {
    try {
      const result = await messagesApi.markChatMessageAsRead(messageId);
      
      if (result.success) {
        logger.info('Message marked as read via API', { messageId });
        return true;
      } else {
        logger.error('Failed to mark message as read via API', result.error);
        return false;
      }
    } catch (error) {
      logger.error('Error marking message as read via API', error);
      return false;
    }
  }

  /**
   * Mark multiple chat messages as read via API
   * This updates both Firebase (real-time) and PostgreSQL (persistent)
   */
  async markMessagesAsReadApi(messageIds: string[], chatRoomId?: string): Promise<boolean> {
    try {
      const result = await messagesApi.markChatMessagesAsRead(messageIds, chatRoomId);
      
      if (result.success) {
        logger.info('Messages marked as read via API', { 
          messageCount: messageIds.length, 
          chatRoomId 
        });
        return true;
      } else {
        logger.error('Failed to mark messages as read via API', result.error);
        return false;
      }
    } catch (error) {
      logger.error('Error marking messages as read via API', error);
      return false;
    }
  }

  /**
   * Get a single chat message from API
   * This can be used to get message details with full sender/recipient info
   */
  async getChatMessageApi(messageId: string): Promise<ChatMessage | null> {
    try {
      const result = await messagesApi.getChatMessage(messageId);
      
      if (result.success && result.data) {
        // Convert API message format to ChatMessage format
        const apiMessage = result.data as unknown as ApiChatMessage;
        const firstName = apiMessage.senderFirstName ?? apiMessage.sender?.firstName ?? '';
        const lastName = apiMessage.senderLastName ?? apiMessage.sender?.lastName ?? '';

        const attachments: ChatMessage['attachments'] = (apiMessage.attachments || []).map((att) => ({
          name: att.fileName ?? att.name ?? 'file',
          url: att.url,
          type: att.mimeType ?? att.type ?? 'application/octet-stream',
          size: att.fileSize ?? att.size ?? 0,
        }));

        const sentAtMs = typeof apiMessage.sentAt === 'number'
          ? apiMessage.sentAt
          : new Date(apiMessage.sentAt).getTime();

        return {
          id: apiMessage.id,
          caseId: apiMessage.caseId || '',
          senderId: apiMessage.senderId,
          senderName: `${firstName} ${lastName}`.trim(),
          senderRole: 'AGENT', // Default, could be determined from user role
          message: apiMessage.content,
          timestamp: sentAtMs,
          isRead: apiMessage.isRead,
          attachments,
        };
      } else {
        logger.error('Failed to get chat message via API', result.error);
        return null;
      }
    } catch (error) {
      logger.error('Error getting chat message via API', error);
      return null;
    }
  }

  /**
   * Mark all messages in a chat room as read
   * This is useful when a user opens a chat conversation
   */
  async markChatRoomAsRead(caseId: string, userId: string): Promise<boolean> {
    try {
      // Get all unread messages for this case/user
      const messagesRef = ref(database, `chats/${caseId}/messages`);
      const snapshot = await get(messagesRef);
      
      if (!snapshot.exists()) {
        return true; // No messages to mark as read
      }

      const messages: ChatMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        if (message.senderId !== userId && !message.isRead) {
          messages.push({
            ...message,
            id: childSnapshot.key!,
          });
        }
      });

      if (messages.length === 0) {
        return true; // No unread messages
      }

      // Extract message IDs for API call
      const messageIds = messages.map(msg => msg.id);
      
      // Mark as read via API (this will sync to Firebase)
      return await this.markMessagesAsReadApi(messageIds, caseId);
    } catch (error) {
      logger.error('Error marking chat room as read', error);
      return false;
    }
  }

  /**
   * Clean up cache when chat is closed (FIFO - keep only last 20 messages)
   * This reduces memory usage by keeping only the most recent messages in cache
   */
  async cleanupCacheOnChatClose(caseId: string): Promise<void> {
    try {
      await chatCacheService.cleanupCacheOnChatClose(caseId, 20);
    } catch (error) {
      logger.error('Error cleaning up cache on chat close', error);
      // Don't throw - cleanup is non-critical
    }
  }
}

export const chatService = new ChatService();
