import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, Platform, TouchableOpacity } from 'react-native';
import { Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/auth/authStore';
import { chatService, Conversation } from '../../lib/services/chat';
import { EmptyState } from '../../components/ui';
import { COLORS, SPACING } from '../../lib/constants';
import { format, isToday, isYesterday } from 'date-fns';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load conversations with caching
    const loadConversations = async () => {
      try {
        const conversations = await chatService.loadConversations(user.id);
        setConversations(conversations);
        
        // Set up real-time listener for conversation updates
        const unsubscribe = chatService.onConversationUpdates(
          user.id,
          (updatedConversations) => {
            setConversations(updatedConversations);
          }
        );
        
        return unsubscribe;
      } catch (error) {
        console.error('Failed to load conversations', error);
        return () => {};
      }
    };

    loadConversations().then(unsubscribe => {
      return () => unsubscribe();
    });
  }, [user]);

  // Generate initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get conversation title based on context
  const getConversationTitle = (item: Conversation) => {
    // If user is client, show agent name
    if (item.participants.agentName && user?.role === 'CLIENT') {
      return item.participants.agentName;
    }
    // If user is agent, show client name
    if (item.participants.clientName && user?.role !== 'CLIENT') {
      return item.participants.clientName;
    }
    // Fallback to case reference (truncated)
    return item.caseReference?.substring(0, 20) + (item.caseReference?.length > 20 ? '...' : '') || 'Case';
  };

  // Smart time formatting
  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (new Date().getTime() - timestamp < 7 * 24 * 60 * 60 * 1000) {
      return format(date, 'EEE'); // Day of week
    } else {
      return format(date, 'MMM d');
    }
  };

  // Memoize render function for performance
  const renderConversationItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => {
      const hasUnread = item.unreadCount > 0;
      const title = getConversationTitle(item);
      const initials = getInitials(title);
      
      return (
        <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
          <TouchableOpacity
            onPress={() => router.push(`/message/${item.caseId}`)}
            style={styles.conversationItem}
            activeOpacity={0.7}
          >
            <View style={[styles.avatarContainer, hasUnread && styles.avatarContainerUnread]}>
              <Avatar.Text
                size={56}
                label={initials}
                style={[styles.avatar, hasUnread && styles.avatarUnread]}
                labelStyle={styles.avatarLabel}
                color={hasUnread ? COLORS.surface : COLORS.primary}
              />
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text
                  style={[
                    styles.conversationTitle,
                    hasUnread && styles.unreadTitle
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {item.lastMessageTime && (
                  <Text style={[styles.timestamp, hasUnread && styles.unreadTimestamp]}>
                    {formatTime(item.lastMessageTime)}
                  </Text>
                )}
              </View>
              
              {item.participants.agentName && user?.role === 'CLIENT' && (
                <View style={styles.advisorRow}>
                  <MaterialCommunityIcons
                    name="account-supervisor"
                    size={12}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.advisorName}>Your Advisor</Text>
                </View>
              )}
              
              <Text
                numberOfLines={2}
                style={[
                  styles.lastMessage,
                  hasUnread && styles.unreadMessage
                ]}
              >
                {item.lastMessage || t('messages.startConversation')}
              </Text>
            </View>
            
            {hasUnread && (
              <View style={styles.unreadIndicator}>
                <View style={styles.unreadDot} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [router, t, user]
  );

  // Memoize key extractor
  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="message-outline"
            title={t('messages.noConversations')}
            description={t('messages.noConversationsDesc')}
            actionText={t('messages.viewCases')}
            onAction={() => router.push('/(tabs)/cases')}
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    paddingHorizontal: 0,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 80,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatarContainerUnread: {
    opacity: 1,
  },
  avatar: {
    backgroundColor: COLORS.primary + '15',
  },
  avatarUnread: {
    backgroundColor: COLORS.primary,
  },
  avatarLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  unreadBadgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.xs,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  unreadTimestamp: {
    fontWeight: '600',
  },
  advisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  advisorName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  unreadMessage: {
    color: COLORS.text,
    fontWeight: '600',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});
