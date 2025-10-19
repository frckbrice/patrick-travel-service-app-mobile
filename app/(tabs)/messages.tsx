import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { chatService, Conversation } from '../../lib/services/chat';
import { Card, EmptyState, Badge } from '../../components/ui';
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

    // Memoize render function for performance
    const renderConversationItem = useCallback(({ item, index }: { item: Conversation; index: number }) => {
        const hasUnread = item.unreadCount > 0;

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <Card onPress={() => router.push(`/message/${item.caseId}`)} style={styles.card}>
                    <View style={styles.cardContent}>
                        <Avatar.Icon
                            size={56}
                            icon="message-text"
                            style={[styles.avatar, hasUnread && styles.avatarUnread]}
                            color={hasUnread ? COLORS.primary : COLORS.textSecondary}
                        />
                        <View style={styles.messageInfo}>
                            <View style={styles.header}>
                                <Text style={[styles.caseRef, hasUnread && styles.unreadText]}>
                                    {item.caseReference}
                                </Text>
                                {hasUnread && (
                                    <Badge variant="primary" rounded size="sm">
                                        {item.unreadCount}
                                    </Badge>
                                )}
                            </View>
                            {item.participants.agentName && (
                                <View style={styles.advisorRow}>
                                    <MaterialCommunityIcons
                                        name="account"
                                        size={14}
                                        color={COLORS.textSecondary}
                                    />
                                    <Text style={styles.advisor}>
                                        {item.participants.agentName}
                                    </Text>
                                </View>
                            )}
                            <Text
                                numberOfLines={2}
                                style={hasUnread ? styles.unreadMessage : styles.lastMessage}
                            >
                                {item.lastMessage || t('messages.startConversation')}
                            </Text>
                            {item.lastMessageTime && (
                                <Text style={styles.time}>
                                    {format(new Date(item.lastMessageTime), 'MMM dd, h:mm a')}
                                </Text>
                            )}
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={20}
                            color={COLORS.textSecondary}
                        />
                    </View>
                </Card>
            </Animated.View>
        );
    }, [router, t]);

    // Memoize key extractor
    const keyExtractor = useCallback((item: Conversation) => item.id, []);

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.list}
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
                maxToRenderPerBatch={8}
                initialNumToRender={8}
                windowSize={5}
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
        padding: SPACING.md,
    },
    avatar: {
        backgroundColor: COLORS.background,
    },
    avatarUnread: {
        backgroundColor: COLORS.primary + '15',
    },
    messageInfo: {
        flex: 1,
        marginLeft: SPACING.md,
        marginRight: SPACING.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    caseRef: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    advisorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    advisor: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    unreadText: {
        fontWeight: '700',
    },
    unreadMessage: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
});

