import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { Message, MessageType } from '../../lib/types';
import { messagesApi } from '../../lib/api/messages.api';
import { notificationsApi } from '../../lib/api/notifications.api';
import { COLORS, SPACING } from '../../lib/constants';
import { format, isToday, isYesterday } from 'date-fns';
import { logger } from '../../lib/utils/logger';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { ModernHeader } from '../../components/ui/ModernHeader';
import { NotFound } from '../../components/ui/NotFound';
import { Alert } from '../../lib/utils/alert';

interface EmailReaderProps {
  emailId: string;
}

export default function EmailReaderScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { id: emailId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [email, setEmail] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Load email message
  useEffect(() => {
    if (!emailId || !user) return;

    const loadEmail = async () => {
      try {
        setIsLoading(true);
        setNotFound(false);
        const result = await messagesApi.getEmail(emailId);
        
        if (result.success && result.data) {
          setEmail(result.data);
        } else {
          logger.error('Failed to load email', result.error);
          // Check if it's a 404 or "not found" error
          const errorMessage = result.error?.toLowerCase() || '';
          if (
            errorMessage.includes('not found') ||
            errorMessage.includes('not exist') ||
            errorMessage.includes('404')
          ) {
            setNotFound(true);
          } else {
            // For other errors, show alert but keep loading state
            Alert.alert(
              t('common.error'),
              result.error || t('email.failedToLoad') || 'Failed to load email message'
            );
          }
        }
      } catch (error: any) {
        logger.error('Failed to load email', error);
        // Check if it's a 404 error
        if (
          error?.response?.status === 404 ||
          error?.message?.toLowerCase().includes('not found') ||
          error?.message?.toLowerCase().includes('404')
        ) {
          setNotFound(true);
        } else {
          Alert.alert(
            t('common.error'),
            t('email.failedToLoad') || 'Failed to load email message'
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEmail();
  }, [emailId, user, t]);

  // Mark email as read (silently - don't show errors to user)
  const markAsRead = useCallback(async () => {
    if (!email || email.isRead || !user) return;
    // Only mark as read if this user is the recipient (inbox). Do not mark sent emails.
    const senderUserId = email.senderId || (email as any)?.sender?.id || (email as any)?.fromUserId || (email as any)?.from?.id;
    if (senderUserId === user.id) return;

    try {
      setIsMarkingAsRead(true);
      const result = await messagesApi.markEmailAsRead(email.id);
      
      if (result.success) {
        // Update local state
        setEmail(prev => prev ? { ...prev, isRead: true, readAt: new Date() } : null);
        logger.info('Email marked as read', { emailId: email.id });
        DeviceEventEmitter.emit('email:read', { id: email.id });
        // Best-effort: also mark any related notification as read (if exists)
        try {
          const notifResp = await notificationsApi.getNotifications(1, 20);
          if (notifResp.success && Array.isArray(notifResp.data)) {
            const related = notifResp.data.find((n: any) => {
              const url: string | undefined = (n as any)?.actionUrl;
              return url ? url.includes(email.id) : false;
            });
            if (related?.id) {
              await notificationsApi.markAsRead(related.id);
              DeviceEventEmitter.emit('notifications:read', { id: related.id });
            }
          }
        } catch { }
      } else {
        // Silently log error - marking as read is not critical
        logger.warn('Failed to mark email as read', result.error);
        // Still update local state to avoid re-trying
        setEmail(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (error) {
      // Silently log error - don't interrupt user experience
      logger.warn('Failed to mark email as read', error);
      // Still update local state to avoid re-trying
      if (email) {
        setEmail(prev => prev ? { ...prev, isRead: true } : null);
      }
    } finally {
      setIsMarkingAsRead(false);
    }
  }, [email, user]);

  // Format date for display
  const formatEmailDate = useCallback((date: Date) => {
    const now = new Date();
    const emailDate = new Date(date);

    if (isToday(emailDate)) {
      return format(emailDate, 'HH:mm');
    } else if (isYesterday(emailDate)) {
      return t('email.yesterday') || 'Yesterday';
    } else {
      return format(emailDate, 'MMM d, yyyy');
    }
  }, [t]);

  // Get sender name from API data
  const senderName = useMemo(() => {
    if (!email) return '';
    // Prefer embedded sender object when provided by API; fall back to ID
    type EmailWithSender = Message & { sender?: { firstName?: string; lastName?: string } };
    const e = email as EmailWithSender;
    const name = `${e.sender?.firstName || ''} ${e.sender?.lastName || ''}`.trim();
    return name || email.senderId || 'Unknown Sender';
  }, [email]);

  // Get sender email from API data
  const senderEmail = useMemo(() => {
    if (!email) return '';
    type EmailWithSender = Message & { sender?: { email?: string } };
    const e = email as EmailWithSender;
    return e.sender?.email || 'unknown@example.com';
  }, [email]);

  // Handle attachment download
  const handleAttachmentDownload = useCallback(async (attachment: any) => {
    try {
      Alert.alert(
        t('email.downloadAttachment') || 'Download Attachment',
        `${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`,
        [
          { text: t('common.cancel') || 'Cancel', style: 'cancel' },
          {
            text: t('common.download') || 'Download',
            onPress: () => {
              // In a real implementation, this would download the file
              Alert.alert(
                t('common.success') || 'Success',
                t('email.downloadStarted') || 'Download started'
              );
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to download attachment', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('email.downloadFailed') || 'Failed to download attachment'
      );
    }
  }, [t]);

  // Auto-mark as read when email loads
  useEffect(() => {
    if (email && !email.isRead) {
      markAsRead();
    }
  }, [email, markAsRead]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {t('email.loading') || 'Loading email...'}
        </Text>
      </View>
    );
  }

  if (notFound || !email) {
    return (
      <NotFound
        variant="email"
        showGoBack={true}
        showGoHome={true}
      />
    );
  }

  return (
    <TouchDetector>
      <View style={styles.container}>
        <ModernHeader
          variant="gradient"
          gradientColors={[COLORS.primary, '#7A9BB8', '#94B5A0']}
          title={t('email.reader') || 'Email'}
          subtitle={email.subject || t('email.noSubject') || 'No Subject'}
          showBackButton
          rightActions={
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => {
                // Future: Add more actions like reply, forward, etc.
                Alert.alert(
                  t('email.actions') || 'Email Actions',
                  t('email.actionsDesc') || 'Reply, forward, and other actions will be available soon.'
                );
              }}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          }
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Email Header */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emailHeader}>
            <View style={styles.senderInfo}>
              <View style={styles.senderAvatar}>
                <Text style={styles.senderInitials}>
                  {senderName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.senderDetails}>
                <Text style={styles.senderName}>{senderName}</Text>
                <Text style={styles.senderEmail}>
                  {senderEmail}
                </Text>
              </View>
            </View>
            
            <View style={styles.emailMeta}>
              <Text style={styles.emailDate}>
                {formatEmailDate(email.sentAt)}
              </Text>
              {!email.isRead && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {t('email.unread') || 'Unread'}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Email Subject */}
          {email.subject && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.subjectContainer}>
              <Text style={styles.subjectText}>{email.subject}</Text>
            </Animated.View>
          )}

          {/* Email Content */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.contentContainer}>
            <Text style={styles.contentText}>{email.content}</Text>
          </Animated.View>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 ? (
            <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.attachmentsContainer}>
              <Text style={styles.attachmentsTitle}>
                {t('email.attachments') || 'Attachments'} ({email.attachments.length})
              </Text>
              {email.attachments.map((attachment, index) => (
                <TouchableOpacity
                  key={(attachment.id as string) || `${attachment.name || 'attachment'}-${index}`}
                  style={styles.attachmentItem}
                  onPress={() => handleAttachmentDownload(attachment)}
                  activeOpacity={0.7}
                >
                  <View style={styles.attachmentIcon}>
                    <MaterialCommunityIcons
                      name="file-pdf-box"
                      size={24}
                      color="#DC2626"
                    />
                  </View>
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <Text style={styles.attachmentSize}>
                      {(attachment.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="download"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.attachmentsContainer}>
              <View style={{ alignItems: 'center', paddingVertical: SPACING.md }}>
                <MaterialCommunityIcons name="attachment" size={32} color={COLORS.textSecondary} />
                <Text style={{ marginTop: 8, color: COLORS.textSecondary }}>
                  {t('email.noAttachments') || 'No attachments for this email'}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Case Reference */}
          {email.caseId && (
            <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.caseReferenceContainer}>
              <View style={styles.caseReferenceHeader}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.caseReferenceTitle}>
                  {t('email.relatedCase') || 'Related Case'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.caseReferenceButton}
                onPress={() => router.push(`/case/${email.caseId}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.caseReferenceText}>
                  {(() => {
                    type EmailWithCase = Message & { case?: { referenceNumber?: string } };
                    const e = email as EmailWithCase;
                    const ref = e.case?.referenceNumber || email.caseId;
                    return `Case #${ref}`;
                  })()}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </TouchDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  emailHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  senderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  senderInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  senderEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subjectContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 24,
  },
  contentContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  contentText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  attachmentsContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  attachmentIcon: {
    marginRight: SPACING.md,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  caseReferenceContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  caseReferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  caseReferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  caseReferenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  caseReferenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
});
