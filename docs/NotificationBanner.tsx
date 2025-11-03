/**
 * Custom Notification Banner Component
 * Displays push notifications with auto-dismiss delay
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/theme/ThemeContext';
import { SPACING, FONT_SIZES } from '../lib/constants';

export interface NotificationBannerData {
    id: string;
    title: string;
    body: string;
    type?: 'message' | 'email' | 'case' | 'document' | 'system';
    data?: {
        type?: string;
        caseId?: string;
        messageId?: string;
        documentId?: string;
        emailId?: string;
        url?: string;
    };
}

interface NotificationBannerProps {
    notification: NotificationBannerData | null;
    onDismiss: () => void;
    autoDismissDelay?: number; // in milliseconds, default 5000ms (5 seconds)
    onPress?: () => void;
}

const NotificationBannerComponent: React.FC<NotificationBannerProps> = ({
    notification,
    onDismiss,
    autoDismissDelay = 2000,
    onPress,
}) => {
    const router = useRouter();
    const { theme } = useTheme();
    const colors = theme.colors;
    const translateY = useRef(new Animated.Value(-200)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (notification) {
            // Clear any existing timer
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }

            // Animate in
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 8,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-dismiss after delay
            dismissTimerRef.current = setTimeout(() => {
                handleDismiss();
            }, autoDismissDelay);
        } else {
            // Animate out
            handleDismiss();
        }

        return () => {
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
        };
    }, [notification, autoDismissDelay]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -200,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };

    const handlePress = () => {
        // Clear auto-dismiss timer
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
        }

        // Navigate based on notification type
        if (notification?.data) {
            const { type, caseId, messageId, documentId, emailId, url } = notification.data;

            if (url) {
                router.push(url as any);
            } else if (type === 'NEW_MESSAGE' || type === 'MESSAGE') {
                if (caseId) {
                    router.push(`/message/${caseId}`);
                }
            } else if (type === 'EMAIL' || emailId) {
                if (emailId) {
                    router.push(`/email/${emailId}`);
                }
            } else if (type === 'CASE_STATUS_UPDATE' || type === 'CASE_ASSIGNED' || caseId) {
                if (caseId) {
                    router.push(`/case/${caseId}`);
                }
            } else if (type?.includes('DOCUMENT') || documentId) {
                if (documentId) {
                    router.push(`/document/${documentId}`);
                }
            }
        }

        // Call custom onPress handler if provided
        if (onPress) {
            onPress();
        }

        // Dismiss after navigation
        handleDismiss();
    };

    if (!notification) {
        return null;
    }

    // Determine icon and color based on notification type
    const getNotificationStyle = () => {
        const notificationType = notification.type || notification.data?.type || 'system';

        switch (notificationType.toLowerCase()) {
            case 'message':
            case 'new_message':
                return {
                    icon: 'message-text' as const,
                    color: '#3B82F6', // Blue
                    backgroundColor: theme.colors.surface || '#FFFFFF',
                    borderColor: '#3B82F6',
                };
            case 'email':
                return {
                    icon: 'email' as const,
                    color: '#10B981', // Green
                    backgroundColor: theme.colors.surface || '#FFFFFF',
                    borderColor: '#10B981',
                };
            case 'case':
            case 'case_status_update':
            case 'case_assigned':
                return {
                    icon: 'briefcase' as const,
                    color: '#F59E0B', // Amber
                    backgroundColor: theme.colors.surface || '#FFFFFF',
                    borderColor: '#F59E0B',
                };
            case 'document':
            case 'document_uploaded':
            case 'document_verified':
            case 'document_rejected':
                return {
                    icon: 'file-document' as const,
                    color: '#8B5CF6', // Purple
                    backgroundColor: theme.colors.surface || '#FFFFFF',
                    borderColor: '#8B5CF6',
                };
            default:
                return {
                    icon: 'bell' as const,
                    color: theme.colors.primary || '#6366F1',
                    backgroundColor: theme.colors.surface || '#FFFFFF',
                    borderColor: theme.colors.primary || '#6366F1',
                };
        }
    };

    const notificationStyle = getNotificationStyle();
    const styles = createStyles(colors, notificationStyle);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
            pointerEvents="box-none"
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePress}
                style={styles.banner}
            >
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                        name={notificationStyle.icon}
                        size={24}
                        color={notificationStyle.color}
                    />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={1}>
                        {notification.title}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {notification.body}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleDismiss}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons
                        name="close"
                        size={20}
                        color={colors.onSurfaceVariant || '#9CA3AF'}
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
};

const createStyles = (colors: any, notificationStyle: any) =>
    StyleSheet.create({
        container: {
            position: 'absolute',
            top: Platform.OS === 'ios' ? 50 : 10,
            left: SPACING.md,
            right: SPACING.md,
            zIndex: 9999,
            pointerEvents: 'box-none',
        },
        banner: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: notificationStyle.backgroundColor,
            borderRadius: 12,
            padding: SPACING.md,
            marginHorizontal: SPACING.xs,
            borderLeftWidth: 4,
            borderLeftColor: notificationStyle.borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            minHeight: 70,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${notificationStyle.color}15`, // 15 = ~8% opacity
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: SPACING.md,
        },
        content: {
            flex: 1,
            marginRight: SPACING.sm,
        },
        title: {
            fontSize: FONT_SIZES.md,
            fontWeight: '600',
            color: colors.onSurface || '#1F2937',
            marginBottom: 4,
        },
        body: {
            fontSize: FONT_SIZES.sm,
            color: colors.onSurfaceVariant || '#6B7280',
            lineHeight: 18,
        },
        closeButton: {
            padding: SPACING.xs,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

export default NotificationBannerComponent;
