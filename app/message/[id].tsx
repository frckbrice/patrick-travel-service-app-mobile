import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TextInput as RNTextInput, TouchableOpacity, Alert, Image } from 'react-native';
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
import { downloadAndShareFile, formatFileSize, getFileIconForMimeType } from '../../lib/utils/fileDownload';
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
    const [selectedAttachments, setSelectedAttachments] = useState<Array<{
        name: string;
        url: string;
        type: string;
        size: number;
    }>>([]);
    const flatListRef = useRef<FlatList>(null);
    const scrollToEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!caseId) return;

        logger.info('Chat screen mounted', { caseId });

        // Subscribe to messages with limit for performance
        const unsubscribe = chatService.onMessagesChange(caseId, (msgs) => {
            setMessages(msgs);

            // Throttle scroll to end to avoid performance issues
            if (scrollToEndTimeoutRef.current) {
                clearTimeout(scrollToEndTimeoutRef.current);
            }
            scrollToEndTimeoutRef.current = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }, 100); // Limit to last 100 messages

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
        if ((!newMessage.trim() && selectedAttachments.length === 0) || !user || !caseId) return;

        const messageText = newMessage.trim();
        const attachments = [...selectedAttachments];
        
        // Clear input immediately for better UX
        setNewMessage('');
        setSelectedAttachments([]);

        try {
        await chatService.sendMessage(
            caseId,
            user.id,
            `${user.firstName} ${user.lastName}`,
            user.role as 'CLIENT',
                messageText || '📎 Attachment',
                attachments.length > 0 ? attachments : undefined
            );
            logger.info('Message sent', { 
                caseId, 
                messageLength: messageText.length,
                attachmentsCount: attachments.length 
            });
        } catch (error) {
            logger.error('Failed to send message', error);
            setNewMessage(messageText);
            setSelectedAttachments(attachments);
        }
    }, [newMessage, selectedAttachments, user, caseId]);

    const handlePickFile = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.8,
                allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets[0]) {
                const file = result.assets[0];
                // TODO: Upload file to storage and get URL
                // For now, just show it's selected
                Alert.alert('Feature Coming Soon', 'File attachments will be available in the next update');
            }
        } catch (error) {
            logger.error('File picker error', error);
        }
    }, []);

    const handleDownloadAttachment = useCallback(async (attachment: {
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
    }, []);

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
    const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
        const isMyMessage = item.senderId === user?.id;
        const AnimatedView = isMyMessage ?
            Animated.createAnimatedComponent(View) :
            Animated.createAnimatedComponent(View);

        return (
            <AnimatedView
                entering={isMyMessage ? FadeInRight.delay(index * 20) : FadeInLeft.delay(index * 20)}
                style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}
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
                <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
                    {!isMyMessage && (
                        <Text style={styles.senderName}>
                            {item.senderName}
                        </Text>
                    )}
                    {item.message && (
                    <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                        {item.message}
                    </Text>
                    )}
                    
                    {/* Render attachments */}
                    {item.attachments && item.attachments.length > 0 && (
                        <View style={styles.attachmentsContainer}>
                            {item.attachments.map((attachment, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.attachmentCard, isMyMessage && styles.myAttachmentCard]}
                                    onPress={() => handleDownloadAttachment(attachment)}
                                >
                                    <MaterialCommunityIcons
                                        name={getFileIconForMimeType(attachment.type)}
                                        size={32}
                                        color={isMyMessage ? COLORS.surface : COLORS.primary}
                                    />
                                    <View style={styles.attachmentInfo}>
                                        <Text 
                                            style={[styles.attachmentName, isMyMessage && styles.myAttachmentName]}
                                            numberOfLines={1}
                                        >
                                            {attachment.name}
                                        </Text>
                                        <Text style={[styles.attachmentSize, isMyMessage && styles.myAttachmentSize]}>
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
                    
                    <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
                        {formatMessageTime(item.timestamp)}
                    </Text>
                </View>
            </AnimatedView>
        );
    }, [user, formatMessageTime, handleDownloadAttachment]);

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
                <TouchableOpacity
                    style={styles.attachButton}
                    onPress={handlePickFile}
                >
                    <MaterialCommunityIcons
                        name="paperclip"
                        size={24}
                        color={COLORS.primary}
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
                    />
                </View>
                
                <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() && selectedAttachments.length === 0}
                    style={[
                        styles.sendButton,
                        (!newMessage.trim() && selectedAttachments.length === 0) && styles.sendButtonDisabled
                    ]}
                >
                    <MaterialCommunityIcons
                        name="send"
                        size={24}
                        color={COLORS.surface}
                    />
                </TouchableOpacity>
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
        flexDirection: 'row',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
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
});

