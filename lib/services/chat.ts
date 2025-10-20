import { database } from '../firebase/config';
import {
  ref,
  push,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  set,
  update,
  get,
} from 'firebase/database';
import { logger } from '../utils/logger';

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
        timestamp: Date.now(),
        isRead: false,
        attachments,
      };

      await set(newMessageRef, chatMessage);

      // Update conversation metadata
      await this.updateConversationMetadata(caseId, message);

      logger.info('Message sent successfully', { caseId });
      return true;
    } catch (error) {
      logger.error('Failed to send message', error);
      return false;
    }
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

  // Listen to messages for a case (optimized with limit)
  onMessagesChange(
    caseId: string,
    callback: (messages: ChatMessage[]) => void,
    limit: number = 100 // Limit messages for performance
  ): () => void {
    const messagesRef = ref(database, `chats/${caseId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));

    const listener = onValue(messagesQuery, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key!,
          ...childSnapshot.val(),
        });
      });

      // Get last N messages for performance
      const limitedMessages = messages.slice(-limit);
      callback(limitedMessages);
    });

    // Return cleanup function
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
        await update(messagesRef, updates);
      }
    } catch (error) {
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
}

export const chatService = new ChatService();
