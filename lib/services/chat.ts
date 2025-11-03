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
  endAt,
} from 'firebase/database';
import { logger } from '../utils/logger';
import { chatCacheService } from './chatCache';
import { messagesApi } from '../api/messages.api';
import { notificationsApi } from '../api/notifications.api';

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

export interface CaseReference {
  caseId: string;
  caseReference: string;
  assignedAt: number;
}

export interface ChatMetadata {
  participants: ChatParticipants;
  caseReferences?: CaseReference[]; // Array of all cases for this client-agent pair
  createdAt: number;
  lastMessage: string | null;
  lastMessageTime: number | null;
  updatedAt?: number;
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

/**
 * Generate deterministic chat room ID from client-agent pair
 * Always sorts IDs alphabetically to ensure consistency
 */
function getChatRoomId(clientId: string, agentId: string): string {
  const sorted = [clientId, agentId].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

class ChatService {
  // Fetch chat metadata (supports both old case-based and new client-agent pair room IDs)
  async getChatMetadata(roomId: string): Promise<ChatMetadata | null> {
    try {
      const metadataRef = ref(database, `chats/${roomId}/metadata`);
      const snap = await get(metadataRef);
      if (!snap.exists()) return null;
      const raw = snap.val();
      const metadata: ChatMetadata = {
        participants: raw.participants || {
          clientId: '',
          clientName: '',
          agentId: '',
          agentName: '',
        },
        caseReferences: raw.caseReferences || [],
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
        lastMessage: raw.lastMessage ?? null,
        lastMessageTime: raw.lastMessageTime ?? null,
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
      };
      return metadata;
    } catch (error) {
      logger.error('Failed to get chat metadata', error);
      return null;
    }
  }

  // Helper method to get chat room ID from client-agent pair
  getChatRoomIdFromPair(clientId: string, agentId: string): string {
    return getChatRoomId(clientId, agentId);
  }
  // Helper method to get Firebase UID from PostgreSQL ID
  // First tries to get from metadata, then from API if needed
  async getFirebaseUidFromPostgresId(postgresId: string, metadata?: ChatMetadata | null): Promise<string | null> {
    try {
      // If metadata is provided, check participants first
      if (metadata) {
        if (metadata.participants.clientId === postgresId || metadata.participants.agentId === postgresId) {
          // These should already be Firebase UIDs in metadata
          return postgresId; // If it matches, it's likely already a Firebase UID
        }
      }

      // Check if it's already a Firebase UID (Firebase UIDs are typically 28 chars)
      // PostgreSQL UUIDs are 36 chars with hyphens
      if (postgresId.length < 30 && !postgresId.includes('-')) {
        // Likely already a Firebase UID
        return postgresId;
      }

      // Try to get from API (if available)
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/users/${postgresId}/firebase-uid`);
        if (response.ok) {
          const data = (await response.json()) as { data?: { firebaseId?: string } };
          return data.data?.firebaseId || null;
        }
      } catch (apiError) {
        logger.warn('Failed to get Firebase UID from API', { postgresId, error: apiError });
      }

      return null;
    } catch (error) {
      logger.error('Failed to get Firebase UID from PostgreSQL ID', error);
      return null;
    }
  }

  // Helper method to resolve chat room ID from caseId
  // Tries new format first (client-agent pair), then falls back to old format (caseId)
  // IMPORTANT: clientId and agentId should be Firebase UIDs, not PostgreSQL IDs
  async resolveChatRoomIdFromCase(caseId: string, clientId?: string, agentId?: string): Promise<string | null> {
    try {
      // If we have both clientId and agentId, try new format first
      if (clientId && agentId) {
        // Check if IDs are Firebase UIDs (Firebase UIDs are typically 28 chars, no hyphens)
        // PostgreSQL UUIDs are 36 chars with hyphens
        const clientIsFirebaseUid = clientId.length < 30 && !clientId.includes('-');
        const agentIsFirebaseUid = agentId.length < 30 && !agentId.includes('-');

        // Use IDs as-is if they look like Firebase UIDs
        // Otherwise, they might be PostgreSQL IDs - try to use them anyway
        // (metadata lookup will handle conversion)
        const newRoomId = getChatRoomId(clientId, agentId);
        const newMetadataRef = ref(database, `chats/${newRoomId}/metadata`);
        const newMetadataSnap = await get(newMetadataRef);

        if (newMetadataSnap.exists()) {
          const metadata = newMetadataSnap.val();
          // Check if this case is in the caseReferences array
          const caseRefs = metadata.caseReferences || [];
          if (caseRefs.some((ref: CaseReference) => ref.caseId === caseId)) {
            return newRoomId;
          }
        }

        // If metadata exists but case not found, still return the room ID
        // (it's the correct room, just doesn't have this case reference yet)
        if (newMetadataSnap.exists()) {
          const metadata = newMetadataSnap.val();
          // Check if participants match (accounting for possible ID format mismatch)
          const participants = metadata.participants || {};
          const matchesClient = participants.clientId === clientId ||
            (!clientIsFirebaseUid && participants.clientId?.endsWith?.(clientId.slice(-8)));
          const matchesAgent = participants.agentId === agentId ||
            (!agentIsFirebaseUid && participants.agentId?.endsWith?.(agentId.slice(-8)));

          if (matchesClient && matchesAgent) {
            return newRoomId;
          }
        }
      }

      // Fallback to old format (caseId as room ID)
      const oldMetadataRef = ref(database, `chats/${caseId}/metadata`);
      const oldMetadataSnap = await get(oldMetadataRef);
      if (oldMetadataSnap.exists()) {
        return caseId;
      }

      return null;
    } catch (error) {
      logger.error('Failed to resolve chat room ID from case', error);
      return null;
    }
  }

  // Send a message (aligned with web app - uses client-agent pair room ID)
  // Accepts either chatRoomId directly or caseId (for backward compatibility)
  async sendMessage(
    caseIdOrRoomId: string,
    senderId: string,
    senderName: string,
    senderRole: 'CLIENT' | 'AGENT' | 'ADMIN',
    message: string,
    attachments?: ChatMessage['attachments'],
    clientId?: string,
    agentId?: string
  ): Promise<boolean> {
    try {
      // Determine the chat room ID
      let chatRoomId: string | null = null;

      // Try to resolve as new format (client-agent pair room ID) if clientId and agentId provided
      if (clientId && agentId) {
        const resolvedRoomId = await this.resolveChatRoomIdFromCase(caseIdOrRoomId, clientId, agentId);
        if (resolvedRoomId) {
          chatRoomId = resolvedRoomId;
        } else {
          // Room doesn't exist yet, create it using new format
          chatRoomId = getChatRoomId(clientId, agentId);
        }
      } else {
        // Fallback: try old format (caseId as room ID) or assume caseIdOrRoomId is already a room ID
        const caseMetadataRef = ref(database, `chats/${caseIdOrRoomId}/metadata`);
        const caseMetadataSnap = await get(caseMetadataRef);

        if (caseMetadataSnap.exists()) {
          // Old format - room ID is the caseId
          chatRoomId = caseIdOrRoomId;
        } else {
          logger.warn('Cannot resolve chat room ID', { caseIdOrRoomId });
          return false;
        }
      }

      const messagesRef = ref(database, `chats/${chatRoomId}/messages`);
      const newMessageRef = push(messagesRef);
      const messageId = newMessageRef.key!;

      const timestamp = Date.now();

      // Ensure metadata exists before writing message (needed to get caseId)
      const metadataRef = ref(database, `chats/${chatRoomId}/metadata`);
      const existingMetadata = await get(metadataRef);

      // Get caseId from metadata if available, otherwise use the parameter
      let messageCaseId = caseIdOrRoomId;
      if (existingMetadata.exists()) {
        const metadata = existingMetadata.val();
        // For new format, get the first caseId from caseReferences, or use the parameter
        if (metadata.caseReferences && metadata.caseReferences.length > 0) {
          messageCaseId = metadata.caseReferences[0].caseId;
        }
      }

      const messageData = {
        id: messageId,
        senderId,
        senderName,
        content: message,
        sentAt: timestamp,
        isRead: false,
        caseId: messageCaseId, // Keep caseId in message for context
        attachments: attachments || [],
      };

      if (!existingMetadata.exists()) {
        logger.warn('Chat metadata not found, message may fail due to Firebase rules', { chatRoomId });
      } else {
        // Update metadata with new last message
        const currentData = existingMetadata.val();
        await update(metadataRef, {
          lastMessage: message.substring(0, 100),
          lastMessageTime: timestamp,
        });

        // Update userChats index for both participants
        const { agentId: metadataAgentId, clientId: metadataClientId } = currentData.participants;
        if (metadataAgentId && metadataClientId) {
          const roomIdForUserChats = chatRoomId; // Use the actual room ID
          await Promise.all([
            update(ref(database, `userChats/${metadataAgentId}/${roomIdForUserChats}`), {
              lastMessage: message.substring(0, 100),
              lastMessageTime: timestamp,
            }),
            update(ref(database, `userChats/${metadataClientId}/${roomIdForUserChats}`), {
              lastMessage: message.substring(0, 100),
              lastMessageTime: timestamp,
            }),
          ]);
        }
      }

      // Write the message
      await set(newMessageRef, messageData);

      // Update cache with the new message (use chatRoomId for cache key)

      logger.info('Message sent successfully', { caseIdOrRoomId, chatRoomId, messageId });
      // Note: No cache update - messages are loaded directly from Firebase in real-time
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

  /**
   * Optimized Firebase subscription for NEW messages only (performance optimized)
   * Listens only to new messages using child_added, not all messages
   * This is much more efficient - only receives new messages as they arrive
   * Use loadInitialMessages for initial load, then this for real-time updates
   */
  subscribeToNewMessagesOptimized(
    chatRoomId: string,
    onNewMessage: (message: ChatMessage) => void,
    lastKnownTimestamp?: number
  ): () => void {
    const messagesRef = ref(database, `chats/${chatRoomId}/messages`);

    // Use child_added to listen only to NEW messages (incremental updates)
    // This is much more efficient than listening to all messages
    const unsubscribe = onChildAdded(
      messagesRef,
      (snapshot) => {
        const firebaseData = snapshot.val();
        if (!firebaseData || typeof firebaseData !== 'object') return;

        const timestamp = firebaseData.sentAt || firebaseData.timestamp || Date.now();

        // Only process messages newer than last known timestamp (if provided)
        if (lastKnownTimestamp && timestamp <= lastKnownTimestamp) {
          return;
        }

        const mapped: ChatMessage = {
          id: snapshot.key!,
          caseId: firebaseData.caseId || '',
          senderId: firebaseData.senderId || '',
          senderName: firebaseData.senderName || 'Unknown',
          senderRole: firebaseData.senderRole || 'CLIENT',
          message: firebaseData.content || firebaseData.message || '',
          timestamp,
          isRead: firebaseData.isRead || false,
          attachments: firebaseData.attachments || [],
        };

        logger.debug(
          `[Firebase New Message] Received new message ${snapshot.key?.substring(0, 8)}... for room ${chatRoomId.substring(0, 8)}...`
        );

        onNewMessage(mapped);
      },
      (error) => {
        logger.error(
          `[Firebase New Message] Error listening to new messages for room ${chatRoomId.substring(0, 8)}...`,
          error
        );
      }
    );

    return () => off(messagesRef, 'child_added', unsubscribe);
  }

  // Listen to messages for an active chat only (attach when chat is open)
  // Supports both old (case-based) and new (client-agent pair) format
  // DEPRECATED: Use subscribeToRoomMessagesOptimized instead for better performance
  async listenToChatMessages(
    caseId: string,
    onNew: (messages: ChatMessage[]) => void,
    limit: number = 30,
    clientId?: string,
    agentId?: string
  ): Promise<() => void> {
    // Resolve the actual chat room ID (could be clientId-agentId format)
    let resolvedRoomId = caseId;

    // Check if caseId is already in clientId-agentId format
    // Room IDs are exactly two IDs separated by a single hyphen (e.g., "clientId-agentId")
    // UUIDs have 4 hyphens (5 parts), so they won't match
    const parts = caseId.split('-');
    const isAlreadyRoomId = parts.length === 2 && parts[0].length > 10 && parts[1].length > 10;

    if (!isAlreadyRoomId && clientId && agentId) {
      // Try to resolve room ID from caseId if clientId and agentId are provided
      try {
        const resolvedId = await this.resolveChatRoomIdFromCase(caseId, clientId, agentId);
        if (resolvedId) {
          resolvedRoomId = resolvedId;
          logger.info('Resolved chat room ID for listener', { caseId, resolvedRoomId });
        } else {
          // Room doesn't exist yet, create room ID from clientId-agentId
          resolvedRoomId = getChatRoomId(clientId, agentId);
          logger.info('Created new room ID for listener', { resolvedRoomId });
        }
      } catch (error) {
        logger.warn('Failed to resolve room ID for listener, using caseId', { error, caseId });
        resolvedRoomId = caseId;
      }
    }

    const messagesRef = ref(database, `chats/${resolvedRoomId}/messages`);
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

      // Emit to UI (no cache - messages loaded directly from Firebase)
      onNew([mapped]);
    });

    return () => off(q, 'child_added', listener);
  }

  // Load and merge messages from both old (case-based) and new (client-agent pair) format rooms
  async loadMergedMessages(
    newRoomId: string,
    oldRoomId: string | null,
    limit: number = 50
  ): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      const allMessages: ChatMessage[] = [];
      const roomsToCheck = [newRoomId];
      if (oldRoomId && oldRoomId !== newRoomId) {
        roomsToCheck.push(oldRoomId);
      }

      // Load messages from all relevant rooms
      for (const roomId of roomsToCheck) {
        try {
          const messagesRef = ref(database, `chats/${roomId}/messages`);
          let messagesQuery;
          try {
            messagesQuery = query(
              messagesRef,
              orderByChild('sentAt'),
              limitToLast(limit * 2) // Load more to account for merging
            );
          } catch (error: any) {
            logger.warn('orderByChild failed, trying without ordering', { roomId, error: error.message });
            messagesQuery = query(messagesRef, limitToLast(limit * 2));
          }

          const snapshot = await get(messagesQuery);

          snapshot.forEach((childSnapshot) => {
            const firebaseData = childSnapshot.val();
            if (!firebaseData || typeof firebaseData !== 'object') return;

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

            allMessages.push(mappedMessage);
          });
        } catch (error) {
          logger.warn('Failed to load messages from room', { roomId, error });
        }
      }

      // Remove duplicates (by message ID) and sort chronologically
      const uniqueMessages = new Map<string, ChatMessage>();
      allMessages.forEach(msg => {
        if (!uniqueMessages.has(msg.id)) {
          uniqueMessages.set(msg.id, msg);
        }
      });

      const mergedMessages = Array.from(uniqueMessages.values());
      mergedMessages.sort((a, b) => a.timestamp - b.timestamp);

      // Take the last `limit` messages (most recent)
      const latestMessages = mergedMessages.slice(-limit);

      // Get total count from both rooms
      let totalCount = 0;
      for (const roomId of roomsToCheck) {
        try {
          const messagesRef = ref(database, `chats/${roomId}/messages`);
          const totalSnapshot = await get(messagesRef);
          totalCount += totalSnapshot.size;
        } catch (error) {
          // Ignore errors for total count
        }
      }

      logger.info('Merged messages loaded', {
        newRoomId,
        oldRoomId,
        mergedCount: latestMessages.length,
        totalCount,
      });

      return {
        messages: latestMessages,
        hasMore: mergedMessages.length > limit,
        totalCount,
      };
    } catch (error) {
      logger.error('Error loading merged messages', error);
      return { messages: [], hasMore: false, totalCount: 0 };
    }
  }

  // Load initial messages directly from Firebase (optimized, no cache)
  // Supports both old (case-based) and new (client-agent pair) format
  async loadInitialMessages(caseIdOrRoomId: string, clientId?: string, agentId?: string): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      logger.info('loadInitialMessages from Firebase (optimized)', { caseIdOrRoomId, clientId, agentId });

      // Resolve the actual chat room ID (could be clientId-agentId format)
      let resolvedRoomId = caseIdOrRoomId;

      // Check if caseIdOrRoomId is already in clientId-agentId format
      const parts = caseIdOrRoomId.split('-');
      const isAlreadyRoomId = parts.length === 2 && parts[0].length > 10 && parts[1].length > 10;

      if (isAlreadyRoomId) {
        resolvedRoomId = caseIdOrRoomId;
        logger.info('Using provided room ID directly', { resolvedRoomId });
      } else if (clientId && agentId) {
        try {
          const resolvedId = await this.resolveChatRoomIdFromCase(caseIdOrRoomId, clientId, agentId);
          if (resolvedId) {
            resolvedRoomId = resolvedId;
            logger.info('Resolved chat room ID', { caseId: caseIdOrRoomId, resolvedRoomId });
          } else {
            resolvedRoomId = getChatRoomId(clientId, agentId);
            logger.info('Created new room ID from client-agent pair', { resolvedRoomId });
          }
        } catch (error) {
          logger.warn('Failed to resolve room ID, using caseId', { error, caseIdOrRoomId });
          resolvedRoomId = caseIdOrRoomId;
        }
      } else {
        logger.info('Using caseId directly (no clientId/agentId provided)', { caseIdOrRoomId });
        resolvedRoomId = caseIdOrRoomId;
      }

      // Load from Firebase using optimized query (limitToLast for performance)
      const messagesRef = ref(database, `chats/${resolvedRoomId}/messages`);

      // PERFORMANCE: Load only last 50 messages initially (on-demand loading)
      // This dramatically reduces initial data transfer and improves load time
      let messagesQuery;
      try {
        messagesQuery = query(
          messagesRef,
          orderByChild('sentAt'),
          limitToLast(50) // Load ONLY last 50 messages for initial display
        );
      } catch (error: any) {
        // Fallback if ordering fails
        logger.warn('Ordered query failed, using basic query with limit', { error: error.message });
        messagesQuery = query(messagesRef, limitToLast(50));
      }

      const snapshot = await get(messagesQuery);

      const messages: ChatMessage[] = [];

      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const firebaseData = childSnapshot.val();
          if (!firebaseData || typeof firebaseData !== 'object') return;

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
          };

          messages.push(mappedMessage);
        });
      }

      // Sort chronologically (oldest → newest)
      messages.sort((a, b) => a.timestamp - b.timestamp);

      // Check if there are more messages efficiently
      // If we got exactly 50 messages, there might be more
      let totalCount = messages.length;
      let hasMore = false;

      if (messages.length === 50) {
        // Check if there are more by getting a count efficiently
        // Use a single query to check total count without loading all messages
        try {
          // Query for messages older than the oldest one we have
          const oldestTimestamp = Math.min(...messages.map(m => m.timestamp));
          const olderQuery = query(
            messagesRef,
            orderByChild('sentAt'),
            endAt(oldestTimestamp - 1),
            limitToLast(1) // Just check if any exist, don't load them
          );
          const olderSnapshot = await get(olderQuery);
          hasMore = olderSnapshot.exists();
          // Estimate total count (we have 50, plus any older ones)
          totalCount = messages.length + (hasMore ? 1 : 0); // Conservative estimate
        } catch (error) {
          // If check fails, assume there might be more if we got exactly 50
          hasMore = true;
          totalCount = messages.length;
        }
      }

      logger.info('Initial messages loaded from Firebase (optimized)', {
        caseIdOrRoomId,
        resolvedRoomId,
        count: messages.length,
        hasMore,
        totalCount
      });

      return {
        messages,
        hasMore,
        totalCount,
      };
    } catch (error) {
      logger.error('Error loading initial messages', error);
      return { messages: [], hasMore: false, totalCount: 0 };
    }
  }

  // Load older messages (pagination) - optimized, no cache
  async loadOlderMessages(
    caseId: string,
    beforeTimestamp: number,
    limit: number = 20,
    clientId?: string,
    agentId?: string
  ): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
  }> {
    try {
      // Resolve the actual chat room ID (could be clientId-agentId format)
      let resolvedRoomId = caseId;

      const parts = caseId.split('-');
      const isAlreadyRoomId = parts.length === 2 && parts[0].length > 10 && parts[1].length > 10;

      if (!isAlreadyRoomId && clientId && agentId) {
        try {
          const resolvedId = await this.resolveChatRoomIdFromCase(caseId, clientId, agentId);
          if (resolvedId) {
            resolvedRoomId = resolvedId;
            logger.info('Resolved chat room ID for loadOlderMessages', { caseId, resolvedRoomId });
          } else {
            resolvedRoomId = getChatRoomId(clientId, agentId);
            logger.info('Created new room ID for loadOlderMessages', { resolvedRoomId });
          }
        } catch (error) {
          logger.warn('Failed to resolve room ID for loadOlderMessages, using caseId', { error, caseId });
          resolvedRoomId = caseId;
        }
      }

      const messagesRef = ref(database, `chats/${resolvedRoomId}/messages`);

      // Use optimized ordered query with endAt for efficient pagination
      let snapshot;
      try {
        const messagesQuery = query(
          messagesRef,
          orderByChild('sentAt'),
          endAt(beforeTimestamp - 1),
          limitToLast(limit) // Get last 'limit' messages before the timestamp
        );
        snapshot = await get(messagesQuery);
      } catch (queryError: any) {
        // Fallback if ordered query fails
        logger.warn('Ordered query failed, falling back to full load', { caseId, resolvedRoomId, error: queryError.message });
        snapshot = await get(messagesRef);
      }

      const messages: ChatMessage[] = [];

      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const firebaseData = childSnapshot.val();
          if (!firebaseData || typeof firebaseData !== 'object') return;

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
          };

          messages.push(mappedMessage);
        });
      }

      // Filter to strictly older than boundary and sort chronologically
      const filtered = messages
        .filter(m => m.timestamp < beforeTimestamp)
        .sort((a, b) => a.timestamp - b.timestamp);

      // Take the last 'limit' messages (most recent before boundary)
      const resultMessages = filtered.slice(-limit);

      // Check if there are more by seeing if we got exactly 'limit' messages
      const hasMore = filtered.length >= limit;

      logger.info('Older messages loaded from Firebase (optimized)', {
        caseId,
        resolvedRoomId,
        count: resultMessages.length,
        hasMore
      });

      return {
        messages: resultMessages,
        hasMore,
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

  // Initialize a conversation for a case (aligned with web app - uses client-agent pair room ID)
  async initializeConversation(
    caseId: string,
    caseReference: string,
    clientId: string,
    clientName: string,
    agentId: string,
    agentName: string
  ): Promise<void> {
    try {
      // Use client-agent pair for room ID instead of caseId
      const chatRoomId = getChatRoomId(clientId, agentId);
      const conversationRef = ref(database, `chats/${chatRoomId}/metadata`);

      // Check if conversation already exists
      const snapshot = await get(conversationRef);

      if (snapshot.exists()) {
        // Chat room exists - add this case to the caseReferences array if not already present
        const existingData = snapshot.val();
        const caseRefs = existingData.caseReferences || [];

        // Check if this case is already in the array
        const caseExists = caseRefs.some((ref: CaseReference) => ref.caseId === caseId);

        if (!caseExists) {
          // Add new case to the array
          const updatedCaseRefs = [
            ...caseRefs,
            {
              caseId,
              caseReference,
              assignedAt: Date.now(),
            },
          ];

          await update(conversationRef, {
            caseReferences: updatedCaseRefs,
            updatedAt: Date.now(),
          });

          logger.info('Added case to existing chat room', {
            caseId,
            caseReference,
            chatRoomId,
            totalCases: updatedCaseRefs.length,
          });
        } else {
          logger.info('Case already exists in chat room', {
            caseId,
            chatRoomId,
          });
        }

        // Update participants if agent changed (reassignment case)
        const needsParticipantUpdate =
          existingData.participants?.agentId !== agentId ||
          existingData.participants?.agentName !== agentName;

        if (needsParticipantUpdate) {
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
            chatRoomId,
            oldAgent: existingData.participants?.agentId?.substring(0, 8),
            newAgent: agentId.substring(0, 8),
          });
        }
      } else {
        // Create new conversation with this case
        const chatMetadata: ChatMetadata = {
          participants: {
            clientId,
            clientName,
            agentId,
            agentName,
          },
          caseReferences: [
            {
              caseId,
              caseReference,
              assignedAt: Date.now(),
            },
          ],
          createdAt: Date.now(),
          lastMessage: null,
          lastMessageTime: null,
        };

        await set(conversationRef, chatMetadata);

        // Create userChats index entries
        await Promise.all([
          set(ref(database, `userChats/${agentId}/${chatRoomId}`), {
            chatId: chatRoomId,
            participantName: clientName,
            lastMessage: null,
            lastMessageTime: null,
          }),
          set(ref(database, `userChats/${clientId}/${chatRoomId}`), {
            chatId: chatRoomId,
            participantName: agentName,
            lastMessage: null,
            lastMessageTime: null,
          }),
        ]);

        logger.info('Firebase chat initialized', {
          caseId,
          caseReference,
          chatRoomId,
          clientId: clientId.substring(0, 8) + '...',
          agentId: agentId.substring(0, 8) + '...',
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
   * Matches web API pattern: validates user is recipient, checks if already read (idempotent)
   */
  async markMessageAsReadApi(messageId: string, chatRoomId?: string): Promise<boolean> {
    try {
      const result = await messagesApi.markChatMessageAsRead(messageId);

      if (result.success) {
        logger.info('Message marked as read via API', { messageId });

        // Also update Firebase for immediate UI consistency (non-blocking)
        if (chatRoomId) {
          try {
            const readAt = Date.now();
            const messageRef = ref(database, `chats/${chatRoomId}/messages/${messageId}`);
            await update(messageRef, {
              isRead: true,
              readAt: readAt
            }).catch((err: any) => {
              if (err.code !== 'PERMISSION_DENIED') {
                logger.error(`Failed to update Firebase for message ${messageId}`, err);
              }
            });
          } catch (firebaseError) {
            // Don't fail if Firebase update fails - API update is the source of truth
            logger.error('Failed to update Firebase for read status', firebaseError);
          }
        }

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
   * Matches web API pattern: updates PostgreSQL first, then syncs to Firebase
   */
  async markMessagesAsReadApi(messageIds: string[], chatRoomId?: string): Promise<boolean> {
    try {
      // Limit batch size to 100 (matching web API behavior)
      const batchLimit = 100;
      const batches: string[][] = [];

      for (let i = 0; i < messageIds.length; i += batchLimit) {
        batches.push(messageIds.slice(i, i + batchLimit));
      }

      const readAt = Date.now();
      let allSuccess = true;

      // Process each batch
      for (const batch of batches) {
        const result = await messagesApi.markChatMessagesAsRead(batch, chatRoomId);

        if (result.success) {
          logger.info('Messages marked as read via API', {
            messageCount: batch.length,
            chatRoomId,
            batchNumber: batches.indexOf(batch) + 1,
            totalBatches: batches.length
          });

          // Update Firebase directly for immediate UI consistency
          // This mirrors the web API's non-blocking Firebase sync
          if (chatRoomId && batch.length > 0) {
            try {
              const updatePromises = batch.map(messageId => {
                const messageRef = ref(database, `chats/${chatRoomId}/messages/${messageId}`);
                return update(messageRef, {
                  isRead: true,
                  readAt: readAt
                }).catch((err: any) => {
                  if (err.code !== 'PERMISSION_DENIED') {
                    logger.error(`Failed to update Firebase for message ${messageId}`, err);
                  }
                });
              });

              await Promise.all(updatePromises);
              logger.info('Firebase updated with read status', {
                messageCount: batch.length,
                chatRoomId
              });
            } catch (firebaseError) {
              // Don't fail if Firebase update fails - API update is the source of truth
              logger.error('Failed to update Firebase for read status', firebaseError);
            }
          }
        } else {
          logger.error('Failed to mark messages as read via API', result.error);
          allSuccess = false;
        }
      }

      return allSuccess;
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
   * Matches web API pattern: filters only unread messages for the recipient
   */
  async markChatRoomAsRead(caseId: string, userId: string): Promise<boolean> {
    try {
      logger.info('Marking chat room as read', { caseId, userId });

      // Use Firebase-only method since messages are stored in Firebase
      // This updates the isRead flag directly in Firebase
      await this.markMessagesAsRead(caseId, userId);

      // Auto-mark related NEW_MESSAGE notification as read (best-effort)
      try {
        const notifResp = await notificationsApi.getNotifications(1, 50);
        if (notifResp.success && Array.isArray(notifResp.data)) {
          const related = notifResp.data.find((n: any) =>
            n.type === 'NEW_MESSAGE' &&
            n.caseId === caseId &&
            !n.isRead
          );
          if (related?.id) {
            await notificationsApi.markAsRead(related.id);
            logger.info('Auto-marked NEW_MESSAGE notification as read', {
              notificationId: related.id,
              caseId
            });
          }
        }
      } catch (notifError) {
        // Non-critical - don't fail the whole operation
        logger.warn('Failed to auto-mark NEW_MESSAGE notification as read', notifError);
      }

      logger.info('Chat room marked as read successfully', { caseId, userId });
      return true;
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
