import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Badge, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { chatService, Conversation } from '../../lib/services/chat';
import { COLORS, SPACING } from '../../lib/constants';
import { format } from 'date-fns';

export default function MessagesScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const [conversations, setConversations] = useState<Conversation[]>([]);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = chatService.onConversationsChange(user.id, (convos) => {
            setConversations(convos);
        });

        return () => unsubscribe();
    }, [user]);

    const renderConversationItem = ({ item }: { item: Conversation }) => {
        const hasUnread = item.unreadCount > 0;

        return (
            <TouchableOpacity onPress={() => router.push(`/message/${item.caseId}`)}>
                <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                        <Avatar.Icon
                            size={48}
                            icon="account"
                            style={styles.avatar}
                            color={COLORS.primary}
                        />
                        <View style={styles.messageInfo}>
                            <View style={styles.header}>
                                <Text variant="titleMedium" style={hasUnread && styles.unreadText}>
                                    Case #{item.caseReference}
                                </Text>
                                {hasUnread && (
                                    <Badge size={20} style={styles.badge}>
                                        {item.unreadCount}
                                    </Badge>
                                )}
                            </View>
                            {item.participants.agentName && (
                                <Text variant="bodySmall" style={styles.advisor}>
                                    {t('messages.with')} {item.participants.agentName}
                                </Text>
                            )}
                            <Text
                                variant="bodyMedium"
                                numberOfLines={1}
                                style={hasUnread ? styles.unreadText : styles.lastMessage}
                            >
                                {item.lastMessage || t('messages.noConversations')}
                            </Text>
                            {item.lastMessageTime && (
                                <Text variant="bodySmall" style={styles.time}>
                                    {format(new Date(item.lastMessageTime), 'MMM dd, h:mm a')}
                                </Text>
                            )}
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color={COLORS.textSecondary}
                        />
                    </Card.Content>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons
                            name="message-outline"
                            size={64}
                            color={COLORS.textSecondary}
                        />
                        <Text variant="bodyLarge" style={styles.emptyText}>
                            {t('messages.noConversations')}
                        </Text>
                        <Text variant="bodyMedium" style={styles.emptySubtext}>
                            {t('messages.noConversationsDesc')}
                        </Text>
                    </View>
                }
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
        padding: SPACING.md,
    },
    card: {
        marginBottom: SPACING.md,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        backgroundColor: COLORS.primary + '20',
    },
    messageInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    advisor: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    lastMessage: {
        color: COLORS.textSecondary,
    },
    unreadText: {
        fontWeight: 'bold',
        color: COLORS.text,
    },
    time: {
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    badge: {
        backgroundColor: COLORS.primary,
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
        marginTop: SPACING.xxl,
    },
    emptyText: {
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
    },
    emptySubtext: {
        marginTop: SPACING.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});

