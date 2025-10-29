import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, Platform, TouchableOpacity } from 'react-native';
import { Avatar, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/auth/authStore';
import { chatService, Conversation } from '../../lib/services/chat';
import { notificationsApi } from '../../lib/api/notifications.api';
import { messagesApi } from '../../lib/api/messages.api';
import { Notification, NotificationType, Message } from '../../lib/types';
import { EmptyState } from '../../components/ui';
import { ModernHeader } from '../../components/ui/ModernHeader';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { COLORS, SPACING } from '../../lib/constants';
import { format, isToday, isYesterday } from 'date-fns';

type TabType = 'notifications' | 'messages' | 'inbox' | 'sent';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emails, setEmails] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load conversations, notifications, and emails in parallel
        const [conversationsData, notificationsResponse, emailsResponse] = await Promise.all([
          chatService.loadConversations(user.id),
          notificationsApi.getNotifications().catch(error => {
            console.log('Notifications API error:', error);
            return { success: true, data: [] };
          }),
          messagesApi.getEmails(1, 50).catch(error => {
            console.log('Emails API error:', error);
            return { success: true, data: [] };
          })
        ]);
        
        setConversations(conversationsData);
        
        if (notificationsResponse.success && notificationsResponse.data) {
          setNotifications(notificationsResponse.data);
        }
        
        if (emailsResponse.success && emailsResponse.data) {
          setEmails(emailsResponse.data);
        }
        
        // Set up real-time listener for conversation updates
        const unsubscribe = chatService.onConversationUpdates(
          user.id,
          (updatedConversations) => {
            setConversations(updatedConversations);
          }
        );
        
        return unsubscribe;
      } catch (error) {
        console.error('Failed to load notifications data', error);
        return () => {};
      } finally {
        setIsLoading(false);
      }
    };

    loadData().then(unsubscribe => {
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

  // Get notification badge color based on type
  const getNotificationBadgeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.CASE_STATUS_UPDATE:
        return '#3B82F6'; // Blue
      case NotificationType.NEW_MESSAGE:
        return '#10B981'; // Green
      case NotificationType.NEW_EMAIL:
        return '#F59E0B'; // Orange
      case NotificationType.DOCUMENT_UPLOADED:
        return '#8B5CF6'; // Purple
      case NotificationType.DOCUMENT_VERIFIED:
        return '#10B981'; // Green
      case NotificationType.DOCUMENT_REJECTED:
        return '#EF4444'; // Red
      case NotificationType.CASE_ASSIGNED:
        return '#06B6D4'; // Cyan
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return '#6B7280'; // Gray
      default:
        return COLORS.primary;
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.CASE_STATUS_UPDATE:
        return 'file-document-edit';
      case NotificationType.NEW_MESSAGE:
        return 'message-text';
      case NotificationType.NEW_EMAIL:
        return 'email';
      case NotificationType.DOCUMENT_UPLOADED:
        return 'upload';
      case NotificationType.DOCUMENT_VERIFIED:
        return 'check-circle';
      case NotificationType.DOCUMENT_REJECTED:
        return 'close-circle';
      case NotificationType.CASE_ASSIGNED:
        return 'account-plus';
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return 'bullhorn';
      default:
        return 'bell';
    }
  };

  // Get notification priority badge
  const getNotificationPriority = (type: NotificationType) => {
    switch (type) {
      case NotificationType.DOCUMENT_REJECTED:
      case NotificationType.CASE_STATUS_UPDATE:
        return 'URGENT';
      case NotificationType.NEW_MESSAGE:
      case NotificationType.NEW_EMAIL:
        return 'HIGH';
      case NotificationType.DOCUMENT_UPLOADED:
      case NotificationType.DOCUMENT_VERIFIED:
        return 'NORMAL';
      default:
        return 'LOW';
    }
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

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await notificationsApi.markAllAsRead();
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
        );
        console.log('All notifications marked as read');
      } else {
        console.error('Failed to mark all notifications as read:', result.error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Get unread count for display
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Render notification item
  const renderNotificationItem = useCallback(
    ({ item, index }: { item: Notification; index: number }) => {
      const badgeColor = getNotificationBadgeColor(item.type);
      const icon = getNotificationIcon(item.type);
      const priority = getNotificationPriority(item.type);
      
      return (
        <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
          <TouchableOpacity
            style={[
              styles.notificationItem,
              !item.isRead && styles.unreadNotification,
            ]}
            onPress={async () => {
              // Mark as read and navigate if actionUrl exists
              if (!item.isRead) {
                try {
                  const result = await notificationsApi.markAsRead(item.id);
                  if (result.success) {
                    // Update local state
                    setNotifications(prev => 
                      prev.map(n => n.id === item.id ? { ...n, isRead: true, readAt: new Date() } : n)
                    );
                    console.log('Notification marked as read:', item.id);
                  } else {
                    console.error('Failed to mark notification as read:', result.error);
                  }
                } catch (error) {
                  console.error('Error marking notification as read:', error);
                }
              }
              // Navigate based on notification type
              if (item.type === 'NEW_EMAIL') {
                const handleEmailNavigation = async () => {
                  let emailId: string | null = null;
                  
                  // Try to extract email ID from actionUrl
                  if (item.actionUrl) {
                    const match = item.actionUrl.match(/email[s]?\/([a-zA-Z0-9_-]+)/);
                    if (match && match[1]) {
                      emailId = match[1];
                    }
                  }
                  
                  // If no email ID from actionUrl, fetch latest unread email (inbox only)
                  if (!emailId) {
                    try {
                      const response = await messagesApi.getEmails(1, 20, { isRead: false });
                      if (response.success && response.data && response.data.length > 0) {
                        const inboxEmail = response.data.find(m => (m.recipientId || (m as any)?.recipient?.id || (m as any)?.toUserId || (m as any)?.to?.id) === user?.id);
                        emailId = inboxEmail?.id || null;
                      }
                    } catch (error) {
                      console.error('Failed to fetch latest email:', error);
                    }
                  }
                  
                  if (emailId) {
                    router.push(`/email/${emailId}`);
                  } else {
                    // Switch to inbox tab to show emails
                    setActiveTab('inbox');
                  }
                };
                
                handleEmailNavigation();
              } else if (item.actionUrl) {
                router.push(item.actionUrl);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.notificationContent}>
              <View style={[styles.notificationIcon, { backgroundColor: badgeColor + '15' }]}>
                <MaterialCommunityIcons
                  name={icon as any}
                  size={20}
                  color={badgeColor}
                />
              </View>
              
              <View style={styles.notificationText}>
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]}>
                    {item.title}
                  </Text>
                  <View style={styles.notificationMeta}>
                    {priority === 'URGENT' && (
                      <View style={[styles.priorityBadge, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.priorityText}>URGENT</Text>
                      </View>
                    )}
                    <Text style={styles.notificationTime}>
                      {formatTime(new Date(item.createdAt).getTime())}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.notificationMessage, !item.isRead && styles.unreadText]}>
                  {item.message}
                </Text>
                {item.case && (
                  <Text style={styles.caseReference}>
                    Case: {item.case.referenceNumber}
                  </Text>
                )}
              </View>
              
              {!item.isRead && (
                <View style={[styles.unreadDot, { backgroundColor: badgeColor }]} />
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [router]
  );

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

  // Build a unified list for the Notifications tab: backend notifications + chat conversations
  const combinedNotifications = React.useMemo(() => {
    // Map backend notifications as-is
    const mappedNotifications = (notifications || []).map((n) => ({
      id: `notif-${n.id}`,
      type: n.type,
      title: n.title,
      message: n.message,
      createdAt: new Date(n.createdAt).getTime(),
      isRead: !!n.isRead,
      actionUrl: n.actionUrl || null,
      caseId: (n as any).caseId || null,
      _source: 'notification' as const,
    }));

    // Map conversations to notification-like items (latest activity)
    const mappedConversations = (conversations || [])
      .filter((c) => c.lastMessage && c.lastMessageTime)
      .map((c) => {
        const isClient = user?.role === 'CLIENT';
        const counterpartName = isClient ? c.participants?.agentName : c.participants?.clientName;
        const title = counterpartName
          ? (t('messages.with') || 'with') && (t('messages.chat') || 'Chat')
            ? `${t('messages.chat') || 'Chat'} ${t('messages.with') || 'with'} ${counterpartName}`
            : `Chat with ${counterpartName}`
          : t('messages.chat') || 'Chat';

        return {
          id: `conv-${c.id}`,
          type: NotificationType.NEW_MESSAGE,
          title,
          message: c.lastMessage || '',
          createdAt: c.lastMessageTime || 0,
          isRead: (c.unreadCount || 0) === 0,
          actionUrl: `/message/${c.caseId}`,
          caseId: c.caseId,
          _source: 'conversation' as const,
        };
      });

    // Merge and sort by newest first
    const merged = [...mappedNotifications, ...mappedConversations];
    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return merged;
  }, [notifications, conversations, user, t]);

  // Organize emails by inbox and sent
  // Normalize IDs to support responses with nested relations (sender/recipient objects)
  const getRecipientUserId = (m: any) => m?.recipientId || m?.recipient?.id || m?.toUserId || m?.to?.id;
  const getSenderUserId = (m: any) => m?.senderId || m?.sender?.id || m?.fromUserId || m?.from?.id;
  const getRecipientEmail = (m: any) => m?.recipientEmail || m?.recipient?.email || m?.to?.email;
  const getSenderEmail = (m: any) => m?.senderEmail || m?.sender?.email || m?.from?.email;

  let inboxEmails = emails.filter((email) => {
    const byId = getRecipientUserId(email) === user?.id;
    if (byId) return true;
    const userEmail = user?.email?.toLowerCase?.();
    const recipientEmail = getRecipientEmail(email)?.toLowerCase?.();
    return !!userEmail && !!recipientEmail && userEmail === recipientEmail;
  });

  let sentEmails = emails.filter((email) => {
    const byId = getSenderUserId(email) === user?.id;
    if (byId) return true;
    const userEmail = user?.email?.toLowerCase?.();
    const senderEmail = getSenderEmail(email)?.toLowerCase?.();
    return !!userEmail && !!senderEmail && userEmail === senderEmail;
  });

  // Fallback classification if IDs/emails are missing from payload
  if (emails.length > 0) {
    if (inboxEmails.length === 0) {
      inboxEmails = emails.filter((email) => {
        // Treat any message not sent by current user as received
        const senderId = getSenderUserId(email);
        const senderEmail = getSenderEmail(email)?.toLowerCase?.();
        const userEmail = user?.email?.toLowerCase?.();
        const notSentByMe = (senderId && user?.id && senderId !== user.id) || (!!senderEmail && !!userEmail && senderEmail !== userEmail);
        return notSentByMe;
      });
    }
    if (sentEmails.length === 0) {
      sentEmails = emails.filter((email) => {
        const senderId = getSenderUserId(email);
        const senderEmail = getSenderEmail(email)?.toLowerCase?.();
        const userEmail = user?.email?.toLowerCase?.();
        const sentByMe = (senderId && user?.id && senderId === user.id) || (!!senderEmail && !!userEmail && senderEmail === userEmail);
        return sentByMe;
      });
    }
  }

  // Format email date
  const formatEmailDate = useCallback((date: Date) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return t('email.yesterday') || 'Yesterday';
    return format(d, 'MMM d, yyyy');
  }, [t]);

  // Render email item
  const renderEmailItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isInbox = (() => {
      if (getRecipientUserId(item) === user?.id) return true;
      const userEmail = user?.email?.toLowerCase?.();
      const recipientEmail = getRecipientEmail(item)?.toLowerCase?.();
      return !!userEmail && !!recipientEmail && userEmail === recipientEmail;
    })();
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
        <TouchableOpacity
          style={[
            styles.emailItem,
            !item.isRead && isInbox && styles.unreadEmail,
          ]}
          onPress={() => router.push(`/email/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.emailContent}>
            <View style={styles.emailHeader}>
              <Text style={[styles.emailSubject, !item.isRead && isInbox && styles.unreadText]}>
                {item.subject || t('email.noSubject') || 'No Subject'}
              </Text>
              <Text style={styles.emailDate}>{formatEmailDate(item.sentAt)}</Text>
            </View>
            <Text numberOfLines={2} style={styles.emailPreview}>
              {item.content}
            </Text>
            {isInbox && !item.isRead && (
              <View style={[styles.unreadDot, { backgroundColor: '#F59E0B' }]} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [user, formatEmailDate, router, t]);

  return (
    <TouchDetector>
      <View style={styles.container}>
      {/* Modern Gradient Header */}
      <ModernHeader
        variant="gradient"
        gradientColors={[COLORS.primary, '#7A9BB8', '#94B5A0']}
        title={t('notifications.title') || 'Notifications'}
        subtitle={t('notifications.subtitle') || 'Stay updated with your cases'}
        showBackButton
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <MaterialCommunityIcons
            name="bell"
            size={18}
            color={activeTab === 'notifications' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            {t('notifications.tab') || 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <MaterialCommunityIcons
            name="message-text"
            size={18}
            color={activeTab === 'messages' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            {t('messages.tab') || 'Messages'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
          onPress={() => setActiveTab('inbox')}
        >
          <MaterialCommunityIcons
            name="email"
            size={18}
            color={activeTab === 'inbox' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
            {t('email.inbox') || 'Inbox'}
          </Text>
          {inboxEmails.filter(e => !e.isRead).length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{inboxEmails.filter(e => !e.isRead).length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <MaterialCommunityIcons
            name="send"
            size={18}
            color={activeTab === 'sent' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            {t('email.sent') || 'Sent'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <>
            {combinedNotifications.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t('notifications.emailNotifications') || 'Notifications'}
                  </Text>
                  {unreadCount > 0 && (
                    <TouchableOpacity
                      style={styles.markAllButton}
                      onPress={markAllAsRead}
                    >
                      <MaterialCommunityIcons
                        name="check-all"
                        size={16}
                        color={COLORS.primary}
                      />
                      <Text style={styles.markAllText}>
                        {t('notifications.markAllRead') || 'Mark All Read'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <FlatList
                  data={combinedNotifications}
                  renderItem={({ item, index }) => {
                    // Reuse existing renderer for Notification shape by adapting item
                    if (item._source === 'notification') {
                      return renderNotificationItem({ item: (notifications.find(n => `notif-${n.id}` === item.id) as any) || notifications[0], index } as any);
                    }
                    // Conversation item: render a simple unified tile
                    const badgeColor = getNotificationBadgeColor(NotificationType.NEW_MESSAGE);
                    return (
                      <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
                        <TouchableOpacity
                          style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
                          onPress={() => {
                            if (item.caseId) {
                              router.push(`/message/${item.caseId}`);
                            } else if (item.actionUrl) {
                              router.push(item.actionUrl);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.notificationContent}>
                            <View style={[styles.notificationIcon, { backgroundColor: badgeColor + '15' }]}>
                              <MaterialCommunityIcons name="message-text" size={20} color={badgeColor} />
                            </View>
                            <View style={styles.notificationText}>
                              <View style={styles.notificationHeader}>
                                <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]}>
                                  {item.title}
                                </Text>
                                <Text style={styles.notificationTime}>
                                  {formatTime(item.createdAt)}
                                </Text>
                              </View>
                              <Text numberOfLines={2} style={[styles.notificationMessage, !item.isRead && styles.unreadText]}>
                                {item.message}
                              </Text>
                            </View>
                            {!item.isRead && (
                              <View style={[styles.unreadDot, { backgroundColor: badgeColor }]} />
                            )}
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  }}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <EmptyState
                icon="bell-outline"
                title={t('notifications.noNotifications') || 'No Notifications'}
                description={t('notifications.noNotificationsDesc') || 'You\'re all caught up! New notifications will appear here.'}
              />
            )}
          </>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <>
            {conversations.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('notifications.chatMessages') || 'Chat Messages'}
                </Text>
                <FlatList
                  data={conversations}
                  renderItem={renderConversationItem}
                  keyExtractor={keyExtractor}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <EmptyState
                icon="message-outline"
                title={t('messages.noMessages') || 'No Messages'}
                description={t('messages.noMessagesDesc') || 'Start a conversation with your advisor.'}
              />
            )}
          </>
        )}

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <>
            {inboxEmails.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t('email.inbox') || 'Inbox'} ({inboxEmails.length})
                  </Text>
                </View>
                <FlatList
                  data={inboxEmails}
                  renderItem={renderEmailItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <EmptyState
                icon="email-outline"
                title={t('email.noInboxEmails') || 'No Inbox Emails'}
                description={t('email.noInboxEmailsDesc') || 'You don\'t have any received emails yet.'}
              />
            )}
          </>
        )}

        {/* Sent Tab */}
        {activeTab === 'sent' && (
          <>
            {sentEmails.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t('email.sent') || 'Sent'} ({sentEmails.length})
                  </Text>
                </View>
                <FlatList
                  data={sentEmails}
                  renderItem={renderEmailItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <EmptyState
                icon="send-outline"
                title={t('email.noSentEmails') || 'No Sent Emails'}
                description={t('email.noSentEmailsDesc') || 'You haven\'t sent any emails yet.'}
              />
            )}
          </>
        )}
      </View>
    </View>
    </TouchDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.xs,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: SPACING.xs,
    borderRadius: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    position: 'relative',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: -4,
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
    gap: SPACING.xs,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  notificationItem: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.border,
  },
  unreadNotification: {
    backgroundColor: COLORS.primary + '08',
    borderLeftColor: COLORS.primary,
  },
  emailItem: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  unreadEmail: {
    backgroundColor: COLORS.primary + '05',
  },
  emailContent: {
    flex: 1,
    position: 'relative',
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  emailSubject: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginRight: SPACING.md,
  },
  emailDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emailPreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  caseReference: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
    marginTop: SPACING.xs,
  },
});
