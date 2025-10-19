import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, Text, Avatar } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { chatService, ChatMessage } from '../../lib/services/chat';
import { COLORS, SPACING } from '../../lib/constants';
import { format } from 'date-fns';

export default function ChatScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const { id: caseId } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!caseId) return;

        const unsubscribe = chatService.onMessagesChange(caseId, (msgs) => {
            setMessages(msgs);
            flatListRef.current?.scrollToEnd();
        });

        // Mark messages as read
        if (user) {
            chatService.markMessagesAsRead(caseId, user.id);
        }

        return () => unsubscribe();
    }, [caseId, user]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user || !caseId) return;

        await chatService.sendMessage(
            caseId,
            user.id,
            `${user.firstName} ${user.lastName}`,
            user.role as 'CLIENT',
            newMessage.trim()
        );

        setNewMessage('');
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isMyMessage = item.senderId === user?.id;

        return (
            <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                {!isMyMessage && (
                    <Avatar.Text
                        size={32}
                        label={item.senderName.charAt(0)}
                        style={styles.avatar}
                    />
                )}
                <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
                    {!isMyMessage && (
                        <Text variant="labelSmall" style={styles.senderName}>
                            {item.senderName}
                        </Text>
                    )}
                    <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                        {item.message}
                    </Text>
                    <Text variant="labelSmall" style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
                        {format(new Date(item.timestamp), 'h:mm a')}
                    </Text>
                </View>
            </View>
        );
    };

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
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    mode="outlined"
                    placeholder={t('messages.typeMessage')}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    style={styles.input}
                    multiline
                    maxLength={500}
                />
                <IconButton
                    icon="send"
                    mode="contained"
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim()}
                    style={styles.sendButton}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        backgroundColor: COLORS.primary + '40',
    },
    messageBubble: {
        maxWidth: '75%',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
    },
    myMessageBubble: {
        backgroundColor: COLORS.primary,
    },
    senderName: {
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
        color: COLORS.textSecondary,
    },
    messageText: {
        color: COLORS.text,
    },
    myMessageText: {
        color: COLORS.surface,
    },
    timestamp: {
        marginTop: SPACING.xs,
        color: COLORS.textSecondary,
    },
    myTimestamp: {
        color: COLORS.surface + 'CC',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
    },
});

