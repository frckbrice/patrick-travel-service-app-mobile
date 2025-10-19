import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Switch, List, Button, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { notificationService } from '../../lib/services/notifications';
import { secureStorage } from '../../lib/storage/secureStorage';
import { COLORS, SPACING } from '../../lib/constants';

interface NotificationPreferences {
    pushEnabled: boolean;
    emailEnabled: boolean;
    caseUpdates: boolean;
    documentUpdates: boolean;
    messageNotifications: boolean;
    marketing: boolean;
}

export default function NotificationPreferencesScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        pushEnabled: false,
        emailEnabled: true,
        caseUpdates: true,
        documentUpdates: true,
        messageNotifications: true,
        marketing: false,
    });
    const [pushToken, setPushToken] = useState<string | null>(null);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        const saved = await secureStorage.get<NotificationPreferences>('notificationPreferences');
        if (saved) {
            setPreferences(saved);
        }

        const token = notificationService.getExpoPushToken();
        setPushToken(token);
    };

    const savePreferences = async (newPreferences: NotificationPreferences) => {
        await secureStorage.set('notificationPreferences', newPreferences);
        setPreferences(newPreferences);
    };

    const handleTogglePush = async (enabled: boolean) => {
        if (enabled) {
            const token = await notificationService.registerForPushNotifications();
            if (token) {
                setPushToken(token);
                savePreferences({ ...preferences, pushEnabled: true });
                Alert.alert(t('common.success'), 'Push notifications enabled');
            } else {
                Alert.alert(t('common.error'), 'Failed to enable push notifications. Please check your device settings.');
            }
        } else {
            savePreferences({ ...preferences, pushEnabled: false });
        }
    };

    const handleTestNotification = async () => {
        await notificationService.scheduleLocalNotification(
            'Test Notification',
            'This is a test notification from Patrick Travel Services'
        );
        Alert.alert(t('common.success'), 'Test notification sent');
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="bodyLarge" style={styles.description}>
                    {t('profile.manageNotifications')}
                </Text>

                <List.Section>
                    <List.Subheader>{t('notifications.channels')}</List.Subheader>

                    <List.Item
                        title={t('notifications.pushNotifications')}
                        description={pushToken ? t('notifications.pushEnabled') : t('notifications.pushDesc')}
                        left={(props) => <List.Icon {...props} icon="cellphone" />}
                        right={() => (
                            <Switch
                                value={preferences.pushEnabled}
                                onValueChange={handleTogglePush}
                            />
                        )}
                    />

                    <Divider />

                    <List.Item
                        title={t('notifications.emailNotifications')}
                        description={t('notifications.emailDesc')}
                        left={(props) => <List.Icon {...props} icon="email" />}
                        right={() => (
                            <Switch
                                value={preferences.emailEnabled}
                                onValueChange={(value) =>
                                    savePreferences({ ...preferences, emailEnabled: value })
                                }
                            />
                        )}
                    />
                </List.Section>

                <List.Section>
                    <List.Subheader>{t('notifications.types')}</List.Subheader>

                    <List.Item
                        title={t('notifications.caseUpdates')}
                        description={t('notifications.caseUpdatesDesc')}
                        left={(props) => <List.Icon {...props} icon="briefcase" />}
                        right={() => (
                            <Switch
                                value={preferences.caseUpdates}
                                onValueChange={(value) =>
                                    savePreferences({ ...preferences, caseUpdates: value })
                                }
                            />
                        )}
                    />

                    <Divider />

                    <List.Item
                        title={t('notifications.documentUpdates')}
                        description={t('notifications.documentUpdatesDesc')}
                        left={(props) => <List.Icon {...props} icon="file-document" />}
                        right={() => (
                            <Switch
                                value={preferences.documentUpdates}
                                onValueChange={(value) =>
                                    savePreferences({ ...preferences, documentUpdates: value })
                                }
                            />
                        )}
                    />

                    <Divider />

                    <List.Item
                        title={t('notifications.messageNotifications')}
                        description={t('notifications.messageNotificationsDesc')}
                        left={(props) => <List.Icon {...props} icon="message" />}
                        right={() => (
                            <Switch
                                value={preferences.messageNotifications}
                                onValueChange={(value) =>
                                    savePreferences({ ...preferences, messageNotifications: value })
                                }
                            />
                        )}
                    />

                    <Divider />

                    <List.Item
                        title={t('notifications.marketing')}
                        description={t('notifications.marketingDesc')}
                        left={(props) => <List.Icon {...props} icon="bullhorn" />}
                        right={() => (
                            <Switch
                                value={preferences.marketing}
                                onValueChange={(value) =>
                                    savePreferences({ ...preferences, marketing: value })
                                }
                            />
                        )}
                    />
                </List.Section>

                {preferences.pushEnabled && (
                    <View style={styles.testSection}>
                        <Button
                            mode="outlined"
                            onPress={handleTestNotification}
                            icon="bell-ring"
                        >
                            {t('notifications.testNotification')}
                        </Button>
                    </View>
                )}

                {pushToken && (
                    <View style={styles.tokenInfo}>
                        <Text variant="bodySmall" style={styles.tokenLabel}>
                            {t('notifications.pushToken')}
                        </Text>
                        <Text variant="bodySmall" style={styles.tokenText} numberOfLines={2}>
                            {pushToken}
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
    },
    description: {
        padding: SPACING.lg,
        color: COLORS.textSecondary,
    },
    testSection: {
        padding: SPACING.lg,
    },
    tokenInfo: {
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        margin: SPACING.lg,
        borderRadius: 8,
    },
    tokenLabel: {
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
        color: COLORS.text,
    },
    tokenText: {
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
    },
});

