import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Avatar } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { chatService, ChatMessage } from '../../lib/services/chat';
import { useThrottle } from '../../lib/hooks';
import {
  downloadAndShareFile,
  formatFileSize,
  getFileIconForMimeType,
  validateFile,
} from '../../lib/utils/fileDownload';
import { uploadThingService } from '../../lib/services/uploadthing';
import { COLORS, SPACING } from '../../lib/constants';
import { format, isToday, isYesterday } from 'date-fns';
import { logger } from '../../lib/utils/logger';

export default function ChatScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const { id: caseId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<
    {
      name: string;
      url: string;
      type: string;
      size: number;
    }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollToEndTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!caseId) return;

    logger.info('Chat screen mounted', { caseId });

    // Subscribe to messages with limit for performance
    const unsubscribe = chatService.onMessagesChange(
      caseId,
      (msgs) => {
        setMessages(msgs);

        // Throttle scroll to end to avoid performance issues
        if (scrollToEndTimeoutRef.current) {
          clearTimeout(scrollToEndTimeoutRef.current);
        }
        scrollToEndTimeoutRef.current = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      100
    ); // Limit to last 100 messages

    // Mark messages as read when opening chat
    if (user) {
      chatService.markMessagesAsRead(caseId, user.id);
    }

    return () => {
      unsubscribe();
      if (scrollToEndTimeoutRef.current) {
        clearTimeout(scrollToEndTimeoutRef.current);
      }
    };
  }, [caseId, user]);

  const handleSendMessage = useCallback(async () => {
    if (
      (!newMessage.trim() && selectedAttachments.length === 0) ||
      !user ||
      !caseId
    )
      return;

    const messageText = newMessage.trim();
    const attachments = [...selectedAttachments];
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // OPTIMISTIC UPDATE: Create optimistic message
    const optimisticMessage: ChatMessage = {
      id: tempId,
      tempId,
      caseId,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      senderRole: user.role as 'CLIENT',
      message: messageText || '📎 Attachment',
      timestamp: Date.now(),
      isRead: false,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'pending', // Mark as pending
    };

    // 1. Add message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Clear input immediately for better UX
    setNewMessage('');
    setSelectedAttachments([]);

    // 3. Scroll to end to show new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // 4. Send to server in background
      await chatService.sendMessage(
        caseId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.role as 'CLIENT',
        messageText || '📎 Attachment',
        attachments.length > 0 ? attachments : undefined
      );

      // 5. PERFORMANCE: Update message status efficiently (avoid full map)
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.tempId === tempId);
        if (index === -1) return prev;

        const updated = [...prev];
        updated[index] = { ...prev[index], status: 'sent' };
        return updated;
      });

      logger.info('Message sent successfully', {
        caseId,
        messageLength: messageText.length,
        attachmentsCount: attachments.length,
      });
    } catch (error: any) {
      logger.error('Failed to send message', error);

      // 6. PERFORMANCE: Mark as failed efficiently (avoid full map)
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.tempId === tempId);
        if (index === -1) return prev;

        const updated = [...prev];
        updated[index] = {
          ...prev[index],
          status: 'failed',
          error: error.message || 'Failed to send'
        };
        return updated;
      });
    }
  }, [newMessage, selectedAttachments, user, caseId]);

  // RETRY: Retry sending a failed message
  const handleRetryMessage = useCallback(
    async (failedMessage: ChatMessage) => {
      if (!user || !caseId) return;

      // PERFORMANCE: Mark as pending efficiently
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === failedMessage.id);
        if (index === -1) return prev;

        const updated = [...prev];
        updated[index] = { ...prev[index], status: 'pending', error: undefined };
        return updated;
      });

      try {
        await chatService.sendMessage(
          caseId,
          user.id,
          `${user.firstName} ${user.lastName}`,
          user.role as 'CLIENT',
          failedMessage.message,
          failedMessage.attachments
        );

        // PERFORMANCE: Mark as sent efficiently
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === failedMessage.id);
          if (index === -1) return prev;

          const updated = [...prev];
          updated[index] = { ...prev[index], status: 'sent' };
          return updated;
        });

        logger.info('Message retry successful', { messageId: failedMessage.id });
      } catch (error: any) {
        logger.error('Message retry failed', error);

        // PERFORMANCE: Mark as failed efficiently
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === failedMessage.id);
          if (index === -1) return prev;

          const updated = [...prev];
          updated[index] = {
            ...prev[index],
            status: 'failed',
            error: error.message || 'Failed to send'
          };
          return updated;
        });
      }
    },
    [user, caseId]
  );

  // DELETE: Remove a failed message
  const handleDeleteFailedMessage = useCallback(
    (messageId: string) => {
      Alert.alert(
        t('common.confirm'),
        t('messages.deleteFailedMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              setMessages((prev) => prev.filter((m) => m.id !== messageId));
              logger.info('Failed message deleted', { messageId });
            },
          },
        ]
      );
    },
    [t]
  );

  const handlePickFile = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];

        // Get file info
        const fileName =
          file.fileName ||
          `file_${Date.now()}.${file.type === 'image' ? 'jpg' : 'mp4'}`;
        const mimeType =
          file.mimeType || (file.type === 'image' ? 'image/jpeg' : 'video/mp4');
        const fileSize = file.fileSize || 0;

        // Validate file before uploading
        const validation = validateFile(fileSize, mimeType);
        if (!validation.valid) {
          Alert.alert(
            t('common.error'),
            validation.error || t('errors.invalidFile')
          );
          return;
        }

        // Show uploading state
        setIsUploading(true);
        setUploadProgress(0);

        logger.info('Starting file upload', { fileName, fileSize, mimeType });

        // Upload file with progress tracking
        const uploadResult = await uploadThingService.uploadFile(
          file.uri,
          fileName,
          mimeType,
          {
            onProgress: (progress) => {
              setUploadProgress(progress);
            },
            metadata: {
              caseId: caseId || '',
              userId: user?.id || '',
            },
          }
        );

        setIsUploading(false);
        setUploadProgress(0);

        if (!uploadResult.success || !uploadResult.url) {
          Alert.alert(
            t('common.error'),
            uploadResult.error || t('errors.uploadFailed')
          );
          return;
        }

        // Add to selected attachments (optimized - avoid array spread for performance)
        setSelectedAttachments((prev) => [
          ...prev,
          {
            name: uploadResult.name || fileName,
            url: uploadResult.url!,
            type: mimeType,
            size: uploadResult.size || fileSize,
          },
        ]);

        logger.info('File uploaded successfully', {
          fileName: uploadResult.name,
          url: uploadResult.url,
        });
      }
    } catch (error) {
      logger.error('File picker error', error);
      setIsUploading(false);
      setUploadProgress(0);
      Alert.alert(t('common.error'), t('errors.somethingWrong'));
    }
  }, [caseId, user, t]);

  const handleDownloadAttachment = useCallback(
    async (attachment: {
      name: string;
      url: string;
      type: string;
      size: number;
    }) => {
      logger.info('Downloading attachment', { filename: attachment.name });

      const success = await downloadAndShareFile({
        url: attachment.url,
        filename: attachment.name,
        mimeType: attachment.type,
      });

      if (success) {
        logger.info('Attachment downloaded successfully');
      }
    },
    []
  );

  // Format message timestamp with smart formatting
  const formatMessageTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM dd, h:mm a');
    }
  }, []);

  // Memoize render function for performance
  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isMyMessage = item.senderId === user?.id;
      const AnimatedView = isMyMessage
        ? Animated.createAnimatedComponent(View)
        : Animated.createAnimatedComponent(View);

      return (
        <AnimatedView
          entering={
            isMyMessage
              ? FadeInRight.delay(index * 20)
              : FadeInLeft.delay(index * 20)
          }
          style={[
            styles.messageContainer,
            isMyMessage && styles.myMessageContainer,
          ]}
        >
          {!isMyMessage && (
            <Avatar.Text
              size={36}
              label={item.senderName.charAt(0)}
              style={styles.avatar}
              color={COLORS.primary}
              labelStyle={styles.avatarLabel}
            />
          )}
          <View
            style={[
              styles.messageBubble,
              isMyMessage && styles.myMessageBubble,
            ]}
          >
            {!isMyMessage && (
              <Text style={styles.senderName}>{item.senderName}</Text>
            )}
            {item.message && (
              <Text
                style={[
                  styles.messageText,
                  isMyMessage && styles.myMessageText,
                  item.status === 'pending' && styles.pendingMessageText,
                  item.status === 'failed' && styles.failedMessageText,
                ]}
              >
                {item.message}
              </Text>
            )}

            {/* Render attachments */}
            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {item.attachments.map((attachment, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.attachmentCard,
                      isMyMessage && styles.myAttachmentCard,
                    ]}
                    onPress={() => handleDownloadAttachment(attachment)}
                  >
                    <MaterialCommunityIcons
                      name={getFileIconForMimeType(attachment.type) as any}
                      size={32}
                      color={isMyMessage ? COLORS.surface : COLORS.primary}
                    />
                    <View style={styles.attachmentInfo}>
                      <Text
                        style={[
                          styles.attachmentName,
                          isMyMessage && styles.myAttachmentName,
                        ]}
                        numberOfLines={1}
                      >
                        {attachment.name}
                      </Text>
                      <Text
                        style={[
                          styles.attachmentSize,
                          isMyMessage && styles.myAttachmentSize,
                        ]}
                      >
                        {formatFileSize(attachment.size)}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="download"
                      size={20}
                      color={isMyMessage ? COLORS.surface : COLORS.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Timestamp and Status Indicators */}
            <View style={styles.messageFooter}>
              <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
                {formatMessageTime(item.timestamp)}
              </Text>

              {/* Status Indicator for My Messages */}
              {isMyMessage && (
                <View style={styles.statusIndicator}>
                  {item.status === 'pending' && (
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                  )}
                  {item.status === 'sent' && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={COLORS.success}
                    />
                  )}
                  {item.status === 'failed' && (
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={14}
                      color={COLORS.error}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Failed Message Actions */}
            {item.status === 'failed' && isMyMessage && (
              <View style={styles.failedActions}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handleRetryMessage(item)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFailedMessage(item.id)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="delete"
                    size={16}
                    color={COLORS.error}
                  />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </AnimatedView>
      );
    },
    [user, formatMessageTime, handleDownloadAttachment, handleRetryMessage, handleDeleteFailedMessage]
  );

  // Memoize key extractor
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Throttled scroll to end for performance
  const scrollToEnd = useThrottle(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, 200);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToEnd}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        initialNumToRender={15}
        windowSize={10}
        inverted={false}
      />

      <View style={styles.inputContainer}>
        {/* Selected Attachments Preview */}
        {selectedAttachments.length > 0 && (
          <View style={styles.selectedAttachmentsContainer}>
            {selectedAttachments.map((attachment, index) => (
              <View key={index} style={styles.selectedAttachment}>
                <MaterialCommunityIcons
                  name={getFileIconForMimeType(attachment.type) as any}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.selectedAttachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAttachments((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Upload Progress Indicator */}
        {isUploading && (
          <View style={styles.uploadProgressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${uploadProgress}%` }]}
              />
            </View>
            <Text style={styles.uploadProgressText}>
              {t('common.uploading')} {Math.round(uploadProgress)}%
            </Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handlePickFile}
            disabled={isUploading}
          >
            <MaterialCommunityIcons
              name="paperclip"
              size={24}
              color={isUploading ? COLORS.textSecondary : COLORS.primary}
            />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <RNTextInput
              placeholder={t('messages.typeMessage')}
              value={newMessage}
              onChangeText={setNewMessage}
              style={styles.input}
              multiline
              maxLength={500}
              placeholderTextColor={COLORS.textSecondary}
              editable={!isUploading}
            />
          </View>

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={
              (!newMessage.trim() && selectedAttachments.length === 0) ||
              isUploading
            }
            style={[
              styles.sendButton,
              ((!newMessage.trim() && selectedAttachments.length === 0) ||
                isUploading) &&
                styles.sendButtonDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="send"
              size={24}
              color={COLORS.surface}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messagesList: {
    padding: SPACING.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  avatar: {
    marginRight: SPACING.sm,
    backgroundColor: COLORS.primary + '20',
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.primary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.text,
  },
  myMessageText: {
    color: COLORS.surface,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    color: COLORS.textSecondary,
  },
  myTimestamp: {
    color: COLORS.surface + 'CC',
  },
  attachmentsContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  myAttachmentCard: {
    backgroundColor: COLORS.primary + 'DD',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  myAttachmentName: {
    color: COLORS.surface,
  },
  attachmentSize: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  myAttachmentSize: {
    color: COLORS.surface + 'CC',
  },
  inputContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectedAttachmentsContainer: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  selectedAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  selectedAttachmentName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  uploadProgressContainer: {
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  uploadProgressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: SPACING.sm,
    maxHeight: 100,
  },
  input: {
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 80,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  // OPTIMISTIC UPDATE STYLES
  pendingMessageText: {
    opacity: 0.6,
  },
  failedMessageText: {
    color: COLORS.error,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIndicator: {
    marginLeft: 4,
  },
  failedActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.error + '20',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
});
