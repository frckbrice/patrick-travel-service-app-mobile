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
} from 'react-native';
import { Avatar } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { chatService, ChatMessage } from '../../lib/services/chat';
import { useChatPagination } from '../../lib/hooks/usePagination';
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
  const insets = useSafeAreaInsets();
  const { id: caseId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
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
  const [unsubscribeMessages, setUnsubscribeMessages] = useState<(() => void) | null>(null);

  // Use pagination hook for messages
  const {
    data: messages,
    setData: setMessages,
    appendData: appendMessages,
    isLoading,
    isLoadingMore,
    hasMore,
    error: paginationError,
    loadInitial,
    loadMore,
    refresh,
  } = useChatPagination(
    caseId || '',
    chatService.loadInitialMessages,
    (beforeTimestamp: number) => chatService.loadOlderMessages(caseId || '', beforeTimestamp)
  );

  useEffect(() => {
    if (!caseId) return;

    logger.info('Chat screen mounted', { caseId });

    // Load initial messages using pagination hook
    const initializeChat = async () => {
      try {
        logger.info('Starting chat initialization', { caseId });
        await loadInitial();
        logger.info('Chat initialization completed', { caseId });
      } catch (error) {
        logger.error('Failed to initialize chat', error);
      }
    };

    initializeChat();

    // Set up real-time listener for new messages only
    const unsubscribe = chatService.onNewMessagesChange(
      caseId,
      (newMessages) => {
        logger.info('Received new messages', { count: newMessages.length });
        appendMessages(newMessages);
        
        // Throttle scroll to end to avoid performance issues
        if (scrollToEndTimeoutRef.current) {
          clearTimeout(scrollToEndTimeoutRef.current);
        }
        scrollToEndTimeoutRef.current = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    setUnsubscribeMessages(unsubscribe);

    // Mark messages as read when opening chat
    if (user) {
      chatService.markMessagesAsRead(caseId, user.id).catch(error => {
        // Silently handle permission errors - user may not have permission to mark messages as read
        logger.warn('Failed to mark messages as read (non-blocking)', error);
      });
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
    appendMessages([optimisticMessage]);

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
      try {
        logger.info('Downloading attachment', { filename: attachment.name });

        const success = await downloadAndShareFile({
          url: attachment.url,
          filename: attachment.name,
          mimeType: attachment.type,
        });

        if (success) {
          logger.info('Attachment downloaded successfully');
        } else {
          logger.warn('Attachment download failed');
        }
      } catch (error) {
        logger.error('Error downloading attachment', error);
      }
    },
    []
  );

  // Format message timestamp with smart formatting
  const formatMessageTime = useCallback((timestamp: number) => {
    // Validate timestamp
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      return 'Invalid date';
    }
    
    try {
      const date = new Date(timestamp);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      if (isToday(date)) {
        return format(date, 'h:mm a');
      } else if (isYesterday(date)) {
        return `Yesterday ${format(date, 'h:mm a')}`;
      } else {
        return format(date, 'MMM dd, h:mm a');
      }
    } catch (error) {
      logger.error('Error formatting timestamp', { timestamp, error });
      return 'Invalid date';
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
            {(item.message && item.message.trim() !== '') && (
              <Text
                style={[
                  styles.messageText,
                  isMyMessage && styles.myMessageText,
                  item.status === 'pending' && styles.pendingMessageText,
                  item.status === 'failed' && styles.failedMessageText,
                ]}
                numberOfLines={100}
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

  // Memoize key extractor with unique key generation
  const keyExtractor = useCallback((item: ChatMessage, index: number) => {
    // Use tempId for optimistic messages, otherwise use id with index for uniqueness
    return item.tempId || `${item.id}-${index}`;
  }, []);

  // Throttled scroll to end for performance
  const scrollToEnd = useThrottle(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, 200);

  // Handle load more (pull to refresh for older messages)
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // Handle pull to refresh
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Calculate exact input area height for proper message spacing
  const inputAreaHeight = React.useMemo(() => {
    const containerPadding = SPACING.xs; // paddingTop from styles
    const rowPadding = 6 + 10; // paddingVertical + paddingBottom
    const inputHeight = 44; // minHeight of inputWrapperInner
    const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 30;
    const extraPadding = 10; // Additional padding for visual separation
    
    return containerPadding + rowPadding + inputHeight + bottomPadding + extraPadding;
  }, [insets.bottom]);

  // Memoize input container style to prevent re-renders
  const inputContainerStyle = React.useMemo(() => [
    styles.inputContainer, 
    { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 30 }
  ], [insets.bottom]);

  // Memoize input component to prevent re-renders
  const InputComponent = React.useMemo(() => (
    <View style={styles.inputWrapperInner}>
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
  ), [newMessage, isUploading, t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: inputAreaHeight } // Precise spacing for input area
        ]}
        onContentSizeChange={scrollToEnd}
        // Pagination features
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        refreshing={isLoading}
        onRefresh={handleRefresh}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        initialNumToRender={15}
        windowSize={10}
        inverted={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Loading indicators
        ListHeaderComponent={
          isLoadingMore ? (
            <View style={styles.loadingIndicator}>
              <Text style={styles.loadingText}>{t('common.loading')}...</Text>
            </View>
          ) : null
        }
      />

      {/* <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 120}
        style={styles.inputWrapper}
      > */}
        <View style={inputContainerStyle}>
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

          {InputComponent}

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
    backgroundColor: COLORS.background,
    // Subtle pattern background effect
  },
  // inputWrapper: {
  //   position: 'absolute',
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   backgroundColor: 'red',
  //   borderTopLeftRadius: 20,
  //   borderTopRightRadius: 20,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: -4 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 12,
  //   elevation: 12,
  // },
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    paddingHorizontal: 0,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
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
    maxWidth: '80%',
    minWidth: 60,
    minHeight: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4, // Tail at bottom left for incoming messages
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
  
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4, // Tail at bottom right for my messages
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.primary,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 1,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
    fontSize: 16,
    lineHeight: 22,
    opacity: 1,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  myTimestamp: {
    color: COLORS.surface + 'DD',
  },
  attachmentsContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  myAttachmentCard: {
    backgroundColor: COLORS.primary + 'E6',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
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
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  myAttachmentSize: {
    color: COLORS.surface + 'DD',
  },
  inputContainer: {
    paddingTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  selectedAttachmentsContainer: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    padding: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
    marginRight: SPACING.xs,
  },
  selectedAttachmentName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  uploadProgressContainer: {
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  uploadProgressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 6,
    paddingBottom: 10,
  },
  attachButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 22,
  },
  inputWrapperInner: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 10,
    marginRight: SPACING.sm,
    maxHeight: 120,
    minHeight: 44,
  },
  input: {
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
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
  loadingIndicator: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
