import React, { useEffect, useState, useRef, useCallback, memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  Alert,Keyboard, KeyboardEvent 
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
import { chatService, ChatMessage, Conversation } from '../../lib/services/chat';
import { auth } from '../../lib/firebase/config';
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
import { SafeAreaView } from 'react-native-safe-area-context'; // Make sure this import exists

import { ModernHeader } from '../../components/ui/ModernHeader';


 // Standalone memoized chat input prevents parent re-renders on keystrokes
 const ChatInput = memo(function ChatInput({
  value,
  onChangeText,
  placeholder,
  editable,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable: boolean;
}) {
  const onChange = React.useCallback((text: string) => onChangeText(text), [onChangeText]);
  return (
    <View style={styles.inputWrapperInner}>
      <RNTextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        style={styles.input}
        multiline
        maxLength={500}
        placeholderTextColor={COLORS.textSecondary}
        editable={editable}
      />
    </View>
  );
});

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const latestTimestampRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      const height = (e as any)?.endCoordinates?.height ?? 0;
      console.log('keyboard show, height', height);
      setKeyboardHeight(height);
    };
    const onHide = () => {
      console.log('keyboard hide');
      setKeyboardHeight(0);
    };

    const subs = Platform.OS === 'ios'
      ? [
          Keyboard.addListener('keyboardWillShow', onShow),
          Keyboard.addListener('keyboardWillHide', onHide),
        ]
      : [
          Keyboard.addListener('keyboardDidShow', onShow),
          Keyboard.addListener('keyboardDidHide', onHide),
        ];

    return () => {
      subs.forEach(sub => sub.remove());
    };
  }, []);

  // Use pagination hook for messages
  const {
    data: messages,
    setData: setMessages,
    prependData,
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

    // Clear processed messages ref for new chat
    processedMessagesRef.current.clear();

    // Load initial messages using pagination hook
    const initializeChat = async () => {
      try {
        logger.info('Starting chat initialization', { caseId });
        await loadInitial();
        logger.info('Chat initialization completed', { caseId, messageCount: messages.length });
      } catch (error) {
        logger.error('Failed to initialize chat', error);
      }
    };

    initializeChat();

    // Mark messages as read when opening chat
    if (user) {
      chatService.markMessagesAsRead(caseId, user.id).catch(error => {
        // Silently handle permission errors - user may not have permission to mark messages as read
        logger.warn('Failed to mark messages as read (non-blocking)', error);
      });
    }

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
      if (scrollToEndTimeoutRef.current) {
        clearTimeout(scrollToEndTimeoutRef.current);
      }
      
      // Clean up cache when chat is closed (FIFO - keep only last 20 messages)
      if (caseId) {
        chatService.cleanupCacheOnChatClose(caseId).catch(error => {
          logger.warn('Failed to cleanup cache on chat close', error);
        });
      }
    };
  }, [caseId, user]);

  

  useEffect(() => {
    if (!caseId) return;
  
    // Ensure only one listener at a time
    if (unsubscribeMessages) {
      unsubscribeMessages();
      setUnsubscribeMessages(null);
    }
  
     logger.info('Setting up real-time listener for case', { caseId });
  
    const unsubscribe = chatService.onNewMessagesChange(
      caseId,
      (newMessages) => {
        logger.info('Real-time update received', { count: newMessages.length });

        // Read latestTimestampRef.current dynamically (not captured value)
        const latestTimestamp = latestTimestampRef.current;
        logger.info('Filtering with latest timestamp', { latestTimestamp, messageCount: newMessages.length });

        // Filter out messages sent by current user (already handled optimistically)
        // Use Firebase UID for comparison since senderId is Firebase UID
        const currentUserFirebaseId = auth.currentUser?.uid || user?.id;
        const messagesFromOthers = newMessages.filter(msg => msg.senderId !== currentUserFirebaseId);
        
        if (messagesFromOthers.length > 0) {
          logger.info('Adding messages from others', { count: messagesFromOthers.length });
          appendMessages(messagesFromOthers);
        } else {
          logger.info('No messages from others to add', { totalReceived: newMessages.length });
        }

        // Scroll to bottom immediately for new messages
        if (scrollToEndTimeoutRef.current) {
          clearTimeout(scrollToEndTimeoutRef.current);
        }
        scrollToEndTimeoutRef.current = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 50);
      },
      undefined  // Don't pass timestamp - let the listener handle filtering internally
    );
  
    setUnsubscribeMessages(() => unsubscribe);
  
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [caseId]);

  // Update latest timestamp ref when messages change
  useEffect(() => {
    if (messages.length > 0) {
      latestTimestampRef.current = messages[messages.length - 1].timestamp;
    }
  }, [messages]);

  // Debug: Monitor when messages are loaded
  useEffect(() => {
    logger.info('Messages array updated', { 
      caseId, 
      count: messages.length,
      messageIds: messages.map(m => m.id),
      timestamps: messages.map(m => m.timestamp)
    });
  }, [messages, caseId]);

  

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
      senderId: auth.currentUser?.uid || user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      senderRole: (user.role === 'CLIENT' ? 'CLIENT' : 'AGENT'),
      message: messageText || '📎 Attachment',
      timestamp: Date.now(),
      isRead: false,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'pending', // Mark as pending
    };

    // 1. Add message to UI immediately
    setMessages((prev) => {
      // Check for duplicates
      const exists = prev.some(m => m.tempId === tempId || (m.id === tempId));
      if (exists) return prev;
      
      // Add to end of array
      return [...prev, optimisticMessage];
    });

    // 2. Clear input immediately for better UX
    setNewMessage('');
    setSelectedAttachments([]);

    // 3. Scroll to bottom immediately to show new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 50);

    try {
      // 4. Send to server in background
      await chatService.sendMessage(
        caseId,
        auth.currentUser?.uid || user.id,
        `${user.firstName} ${user.lastName}`,
        (user.role === 'CLIENT' ? 'CLIENT' : 'AGENT'),
        messageText || '📎 Attachment',
        attachments.length > 0 ? attachments : undefined
      );

      // 5. Update message status to sent
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

      // Friendly feedback for permission issues
      const errorMessage = String(error?.message || '');
      const errorCode = (error as any)?.code;
      if (errorCode === 'PERMISSION_DENIED' || /PERMISSION_DENIED/i.test(errorMessage)) {
        Alert.alert(
          t('common.error'),
          t('messages.permissionDeniedSend') || 'You do not have permission to send messages in this conversation.'
        );
      }
    }
  }, [newMessage, selectedAttachments, user, caseId]);

// Ensure Firebase conversation exists (metadata + userChats) before messaging
useEffect(() => {
  const ensureConversation = async () => {
    if (chatInitializedRef.current) return;
    if (!user || !caseId) return;
    try {
      const resp = await casesApi.getCaseById(caseId);
      const c: any = resp?.data;
      if (resp?.success && c?.assignedAgent) {
        await chatService.initializeConversation(
          caseId,
          c.referenceNumber || caseId,
          user.id,
          `${user.firstName} ${user.lastName}`,
          c.assignedAgent.id,
          `${c.assignedAgent.firstName || ''} ${c.assignedAgent.lastName || ''}`.trim()
        );
        chatInitializedRef.current = true;
      }
    } catch {}
  };
  ensureConversation();
}, [user, caseId]);

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
          auth.currentUser?.uid || user.id,
        `${user.firstName} ${user.lastName}`,
          (user.role === 'CLIENT' ? 'CLIENT' : 'AGENT'),
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
        entering={Platform.OS === 'android' ? undefined : (isMyMessage ? FadeInRight.delay(index * 20) : FadeInLeft.delay(index * 20))}
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
 // Memoize key extractor with unique key generation
 const keyExtractor = useCallback((item: ChatMessage, index: number) => {
  // Use tempId for optimistic messages, otherwise use id with index for uniqueness
  return item.tempId || `${item.id}-${index}`;
}, []);

  // Throttled scroll to end for performance
  const scrollToEnd = useThrottle(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, 200);

  // Handle load more (pull to refresh for older messages)
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && messages.length > 0) {
      const oldestMessage = messages[messages.length - 1];
      if (oldestMessage) {
        loadMore(oldestMessage.timestamp);
      }
    }
  }, [hasMore, isLoadingMore, messages.length, loadMore]);

// Handle pull to refresh
const handleRefresh = useCallback(() => {
  refresh();
}, [refresh]);

 // Dynamically measure input container height (includes safe area) to avoid overlap
 const [inputHeight, setInputHeight] = useState(0);

  const inputContainerStyle = useMemo(
    () => [
      styles.inputContainer,
      { paddingBottom: keyboardHeight > 0 ? keyboardHeight + insets.bottom : insets.bottom }
    ],
    [keyboardHeight, insets.bottom]
  );

  const flatListContentStyle = useMemo(() => ({
    paddingBottom: inputHeight + (keyboardHeight > 0 ? 12 : insets.bottom) + 12,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  }), [inputHeight, keyboardHeight, insets.bottom]);

// Memoize ListHeaderComponent to prevent re-renders
const ListHeaderComponent = useMemo(() => {
  if (!isLoadingMore) return null;
  return (
    <View style={styles.loadingIndicator}>
      <Text style={styles.loadingText}>{t('common.loading')}...</Text>
    </View>
  );
}, [isLoadingMore, t]);

// Memoize FlatList props
const flatListProps = useMemo(() => ({
  removeClippedSubviews: true,
  maxToRenderPerBatch: 15,
  initialNumToRender: 15,
  windowSize: 10,
  inverted: false,
  showsVerticalScrollIndicator: false,
  keyboardShouldPersistTaps: 'handled' as const,
  onEndReachedThreshold: 0.1,
}), []);

  // Memoize attachment removal callback
  const removeAttachment = useCallback((index: number) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  console.log('keyboardHeight', keyboardHeight);



return (
  // <TouchDetector>
    <KeyboardAvoidingView
      style={[styles.container, ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={flatListContentStyle}
        onContentSizeChange={scrollToEnd}
        onEndReached={handleLoadMore}
        refreshing={isLoading}
        onRefresh={handleRefresh}
        ListHeaderComponent={ListHeaderComponent}
        {...flatListProps}
        removeClippedSubviews={
          Platform.OS === 'android' ? false : flatListProps.removeClippedSubviews
        }
      />

<View
  style={inputContainerStyle}
  onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
>
        {selectedAttachments.length > 0 && (
          <View style={styles.selectedAttachmentsContainer}>
            {selectedAttachments.map((attachment, index) => (
              <View key={index} style={styles.selectedAttachment}>
                <MaterialCommunityIcons
                  name={getFileIconForMimeType(attachment.type) as any}
                  size={18}
                  color="#1F7CE6"
                />
                <Text style={styles.selectedAttachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeAttachment(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="close-circle" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {isUploading && (
          <View style={styles.uploadProgressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
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
              name="attachment"
              size={24}
              color={isUploading ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <ChatInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={t('messages.typeMessage') || 'Type your message...'}
              editable={!isUploading}
            />
          </View>

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={
              (!newMessage.trim() && selectedAttachments.length === 0) || isUploading
            }
            style={[
              styles.sendButton,
              ((!newMessage.trim() && selectedAttachments.length === 0) || isUploading) &&
                styles.sendButtonDisabled,
            ]}
          >
            <MaterialCommunityIcons name="send" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  // </TouchDetector>
);
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#E5DDD5',
},

messagesList: {
  paddingHorizontal: SPACING.md,
  paddingTop: SPACING.md,
  paddingBottom: SPACING.lg,
},
messageContainer: {
  flexDirection: 'row',
  marginBottom: 8,
  alignItems: 'flex-end',
  paddingHorizontal: 0,
},
myMessageContainer: {
  justifyContent: 'flex-end',
  alignItems: 'flex-end',
},
avatar: {
  marginRight: 8,
  backgroundColor: '#D1D5DB',
  marginBottom: 2,
},
avatarLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: '#4B5563',
},
messageBubble: {
  maxWidth: '75%',
  minWidth: 80,
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 1,
  },
  shadowOpacity: 0.1,
  shadowRadius: 1.5,
  elevation: 1,
},
myMessageBubble: {
  backgroundColor: '#1F7CE6',
  alignSelf: 'flex-end',
},
senderName: {
  fontSize: 12,
  fontWeight: '600',
  marginBottom: 4,
  color: '#6B7280',
},
messageText: {
  fontSize: 15,
  lineHeight: 20,
  color: '#000000',
  marginBottom: 4,
},
myMessageText: {
  color: '#FFFFFF',
},
timestamp: {
  fontSize: 11,
  marginTop: 2,
  color: '#9CA3AF',
  fontWeight: '400',
},
myTimestamp: {
  color: '#FFFFFF',
  opacity: 0.8,
},
attachmentsContainer: {
  marginTop: 8,
  marginBottom: 4,
},
attachmentCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F3F4F6',
  padding: 12,
  borderRadius: 12,
  marginBottom: 6,
},
myAttachmentCard: {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
},
attachmentIconContainer: {
  width: 40,
  height: 40,
  borderRadius: 8,
  backgroundColor: 'rgba(31, 124, 230, 0.1)',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},
attachmentInfo: {
  flex: 1,
},
attachmentName: {
  fontSize: 14,
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: 2,
},
myAttachmentName: {
  color: '#FFFFFF',
},
attachmentSize: {
  fontSize: 12,
  color: '#6B7280',
  fontWeight: '400',
},
myAttachmentSize: {
  color: '#FFFFFF',
  opacity: 0.8,
},

inputContainer: {
  paddingTop: 8,
  paddingHorizontal: 8,
  backgroundColor: '#F7F7F7',
  borderTopWidth: 1,
  borderTopColor: '#E5E7EB',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
},
// inputContainer: {
//   paddingTop: SPACING.xs,
//   paddingHorizontal: SPACING.sm,
//   backgroundColor: COLORS.surface,
//   borderTopWidth: 1,
//   borderTopColor: COLORS.border,

//   // Remove border radius to make it flush with bottom
  
//   shadowColor: '#000',
//   shadowOffset: { width: 0, height: -3 },
//   shadowOpacity: 0.08,
//   shadowRadius: 8,
//   elevation: 6,
//   // Remove any bottom margin/padding that might create space
//   marginBottom: 0,
//   paddingBottom: 0,
// },
selectedAttachmentsContainer: {
  marginBottom: 8,
  gap: 6,
  flexDirection: 'row',
  flexWrap: 'wrap',
},
selectedAttachment: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#E0F2FE',
  padding: 8,
  borderRadius: 16,
  gap: 6,
  marginRight: 6,
},
selectedAttachmentName: {
  flex: 1,
  fontSize: 12,
  color: '#1F2937',
  fontWeight: '500',
},
uploadProgressContainer: {
  marginBottom: 8,
},
progressBar: {
  height: 3,
  backgroundColor: '#E5E7EB',
  borderRadius: 3,
  overflow: 'hidden',
  marginBottom: 4,
},
progressFill: {
  height: '100%',
  backgroundColor: '#1F7CE6',
  borderRadius: 3,
},
uploadProgressText: {
  fontSize: 11,
  color: '#6B7280',
  textAlign: 'center',
  fontWeight: '500',
},
inputRow: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  paddingBottom: 8,
  gap: 6,
},
attachButton: {
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 20,
},
inputWrapper: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 10,
  minHeight: 40,
  maxHeight: 120,
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
input: {
  fontSize: 15,
  color: '#1F2937',
  maxHeight: 100,
  lineHeight: 20,
  paddingVertical: 0,
},
sendButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#1F7CE6',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#1F7CE6',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  elevation: 3,
},
sendButtonDisabled: {
  backgroundColor: '#9CA3AF',
  opacity: 0.5,
  shadowOpacity: 0,
  elevation: 0,
},
// OPTIMISTIC UPDATE STYLES
pendingMessageText: {
  opacity: 0.6,
},
failedMessageText: {
  color: '#FF3B30',
},
messageFooter: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  marginTop: 2,
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
  borderTopColor: 'rgba(255, 59, 48, 0.2)',
},
retryButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(31, 124, 230, 0.1)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  gap: 4,
},
retryButtonText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#1F7CE6',
},
deleteButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 59, 48, 0.1)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  gap: 4,
},
deleteButtonText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#FF3B30',
},
loadingIndicator: {
  paddingVertical: SPACING.md,
  alignItems: 'center',
  justifyContent: 'center',
},
loadingText: {
  fontSize: 14,
  color: '#6B7280',
  fontWeight: '500',
},
});
