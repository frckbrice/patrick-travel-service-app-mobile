import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
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
import { SPACING } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { format, isToday, isYesterday } from 'date-fns';
import { logger } from '../../lib/utils/logger';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { ThemeAwareHeader } from '../../components/ui/ThemeAwareHeader';
import { NotFound } from '../../components/ui/NotFound';
import { Alert } from '../../lib/utils/alert';
import { useTabBarPadding } from '../../lib/hooks/useTabBarPadding';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';
import { sendEmail, sendEmailReply } from '../../lib/api/email.api';
import { toast } from '../../lib/services/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EmailReaderProps {
  emailId: string;
}

export default function EmailReaderScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarPadding = useTabBarPadding();
  const scrollProps = useTabBarScroll();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { id: emailId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [email, setEmail] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

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

  // Handle reply to email
  const handleReply = useCallback(() => {
    if (!email || !user) return;

    // Check if this is an inbox email (user is recipient, not sender)
    const senderUserId = email.senderId || (email as any)?.sender?.id || (email as any)?.fromUserId || (email as any)?.from?.id;
    if (senderUserId === user.id) {
      Alert.alert(
        t('email.cannotReply') || 'Cannot Reply',
        t('email.cannotReplySent') || 'You cannot reply to your own sent emails.'
      );
      return;
    }

    // Backend provides threadId directly (mapped from emailThreadId)
    const threadId = email.threadId || email.emailThreadId;

    // Debug logging for troubleshooting
    if (!threadId) {
      logger.warn('Cannot reply - missing threadId', {
        emailId: email.id,
        hasThreadId: !!email.threadId,
        hasEmailThreadId: !!email.emailThreadId,
        subject: email.subject,
        messageType: email.messageType,
        senderId: email.senderId,
        recipientId: email.recipientId,
      });
    }

    // Thread ID is required for replying to emails
    if (!threadId) {
      Alert.alert(
        t('email.cannotReply') || 'Cannot Reply',
        t('email.systemNotification') || 'This is a system notification and cannot be replied to. Please use the dashboard to contact support.'
      );
      return;
    }

    // Show reply modal
    setReplyText('');
    setShowReplyModal(true);
  }, [email, user, t]);

  // Send reply
  const handleSendReply = useCallback(async () => {
    if (!email || !user || !replyText.trim()) {
      toast.error({
        title: t('common.error') || 'Error',
        message: t('email.replyEmpty') || 'Reply cannot be empty',
      });
      return;
    }

    setIsSendingReply(true);
    try {
      // Backend provides threadId directly (mapped from emailThreadId)
      const threadId = email.threadId || email.emailThreadId;

      if (!threadId) {
        throw new Error(t('email.noThreadId') || 'Cannot reply: Missing thread ID');
      }

      // Clean subject: remove [THREAD:...] prefix if present
      const cleanSubject = email.subject?.replace(/\[THREAD:[^\]]+\]\s*/, '') || t('email.noSubject') || 'No Subject';

      // Use incoming endpoint for replying to messages (requires thread ID)
      const result = await sendEmailReply({
        threadId,
        senderId: user.id,
        content: replyText.trim(),
        subject: `Re: ${cleanSubject}`,
      });

      if (result && result.success) {
        toast.success({
          title: t('common.success') || 'Success',
          message: t('email.replySent') || 'Reply sent successfully',
        });
        // Refresh email list
        DeviceEventEmitter.emit('email:sent', {});
        // Close modal
        setShowReplyModal(false);
        setReplyText('');
      } else {
        throw new Error(result?.error || t('email.replyFailed') || 'Failed to send reply');
      }
    } catch (error: any) {
      logger.error('Failed to send reply', error);
      toast.error({
        title: t('common.error') || 'Error',
        message: error.message || t('email.replyFailed') || 'Failed to send reply. Please try again.',
      });
    } finally {
      setIsSendingReply(false);
    }
  }, [email, user, replyText, t]);

  // Auto-mark as read when email loads
  useEffect(() => {
    if (email && !email.isRead) {
      markAsRead();
    }
  }, [email, markAsRead]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
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
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ThemeAwareHeader
          variant="gradient"
        gradientColors={[themeColors.primary, themeColors.secondary, themeColors.accent]}
          title={t('email.reader') || 'Email'}
          subtitle={email.subject || t('email.noSubject') || 'No Subject'}
          showBackButton
          rightActions={
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleReply}
            >
              <MaterialCommunityIcons
                name="reply"
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          }
        />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xl + tabBarPadding }}
        onScroll={scrollProps.onScroll}
        scrollEventThrottle={scrollProps.scrollEventThrottle}
      >
          {/* Email Header */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.emailHeader, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
            <View style={styles.senderInfo}>
              <View style={[styles.senderAvatar, { backgroundColor: themeColors.primary }]}>
                <Text style={styles.senderInitials}>
                  {senderName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.senderDetails}>
                <Text style={[styles.senderName, { color: themeColors.text }]}>{senderName}</Text>
                <Text style={[styles.senderEmail, { color: themeColors.textSecondary }]}>
                  {senderEmail}
                </Text>
              </View>
            </View>
            
            <View style={styles.emailMeta}>
              <Text style={[styles.emailDate, { color: themeColors.textSecondary }]}>
                {formatEmailDate(email.sentAt)}
              </Text>
              {!email.isRead && (
                <View style={[styles.unreadBadge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.unreadText}>
                    {t('email.unread') || 'Unread'}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Email Subject */}
          {email.subject && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.subjectContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
              <Text style={[styles.subjectText, { color: themeColors.text }]}>{email.subject}</Text>
            </Animated.View>
          )}

          {/* Email Content */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.contentContainer, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.contentText, { color: themeColors.text }]}>{email.content}</Text>
          </Animated.View>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 ? (
            <Animated.View entering={FadeInUp.delay(400).springify()} style={[styles.attachmentsContainer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
              <Text style={[styles.attachmentsTitle, { color: themeColors.text }]}>
                {t('email.attachments') || 'Attachments'} ({email.attachments.length})
              </Text>
              {email.attachments.map((attachment, index) => (
                <TouchableOpacity
                  key={(attachment.id as string) || `${attachment.name || 'attachment'}-${index}`}
                  style={[styles.attachmentItem, { borderBottomColor: themeColors.border }]}
                  onPress={() => handleAttachmentDownload(attachment)}
                  activeOpacity={0.7}
                >
                  <View style={styles.attachmentIcon}>
                    <MaterialCommunityIcons
                      name="file-pdf-box"
                      size={24}
                      color={themeColors.error}
                    />
                  </View>
                  <View style={styles.attachmentInfo}>
                    <Text style={[styles.attachmentName, { color: themeColors.text }]} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <Text style={[styles.attachmentSize, { color: themeColors.textSecondary }]}>
                      {(attachment.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="download"
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </Animated.View>
          ) : (
              <Animated.View entering={FadeInUp.delay(400).springify()} style={[styles.attachmentsContainer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
              <View style={{ alignItems: 'center', paddingVertical: SPACING.md }}>
                  <MaterialCommunityIcons name="attachment" size={32} color={themeColors.textSecondary} />
                  <Text style={{ marginTop: 8, color: themeColors.textSecondary }}>
                  {t('email.noAttachments') || 'No attachments for this email'}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Case Reference */}
          {email.caseId && (
            <Animated.View entering={FadeInUp.delay(500).springify()} style={[styles.caseReferenceContainer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
              <View style={styles.caseReferenceHeader}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color={themeColors.primary}
                />
                <Text style={[styles.caseReferenceTitle, { color: themeColors.text }]}>
                  {t('email.relatedCase') || 'Related Case'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.caseReferenceButton, { backgroundColor: themeColors.primary + '10' }]}
                onPress={() => router.push(`/case/${email.caseId}`)}
                activeOpacity={0.7}
              >
                <Text style={[styles.caseReferenceText, { color: themeColors.primary }]}>
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
                  color={themeColors.primary}
                />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Reply Modal */}
        <Modal
          visible={showReplyModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReplyModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.surface,
                paddingBottom: Math.max(insets.bottom + SPACING.lg, Platform.OS === 'ios' ? insets.bottom + SPACING.xl + 10 : SPACING.xl)
              }
            ]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                  {t('email.reply') || 'Reply'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowReplyModal(false)}
                  disabled={isSendingReply}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={themeColors.text}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.modalSubject, { color: themeColors.text, backgroundColor: themeColors.background }]}>
                  {`Re: ${email?.subject || t('email.noSubject') || 'No Subject'}`}
                </Text>

                <TextInput
                  style={[styles.modalInput, { color: themeColors.text, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                  placeholder={t('email.replyMessage') || 'Enter your reply...'}
                  placeholderTextColor={themeColors.textSecondary}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  numberOfLines={6}
                  maxLength={1000}
                  editable={!isSendingReply}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: themeColors.background, borderColor: themeColors.border }, isSendingReply && styles.modalButtonDisabled]}
                    onPress={() => setShowReplyModal(false)}
                    disabled={isSendingReply}
                  >
                    <Text style={[styles.modalButtonTextCancel, { color: themeColors.text }]}>
                      {t('common.cancel') || 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      { backgroundColor: themeColors.primary },
                      (!replyText.trim() || isSendingReply) && styles.modalButtonDisabled,
                    ]}
                    onPress={handleSendReply}
                    disabled={!replyText.trim() || isSendingReply}
                  >
                    {isSendingReply ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.modalButtonTextSend}>
                        {t('email.send') || 'Send'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </TouchDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
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
    marginBottom: 2,
  },
  senderEmail: {
    fontSize: 14,
  },
  emailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailDate: {
    fontSize: 14,
  },
  unreadBadge: {
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  attachmentsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
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
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 14,
  },
  caseReferenceContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  caseReferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  caseReferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  caseReferenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  caseReferenceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
  // Reply Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    paddingTop: SPACING.sm,
  },
  modalSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSend: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
