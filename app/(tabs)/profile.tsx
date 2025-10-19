import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Avatar, Button, Dialog, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRequireAuth, useAuth } from '../../features/auth/hooks/useAuth';
import { COLORS, SPACING } from '../../lib/constants';

export default function ProfileScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('profile.deleteAccount'),
            t('profile.confirmDelete'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        // TODO:Implement delete account logic
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text
                    size={80}
                    label={`${user?.firstName.charAt(0)}${user?.lastName.charAt(0)}`}
                    style={styles.avatar}
                />
                <Text variant="headlineSmall" style={styles.name}>
                    {user?.firstName} {user?.lastName}
                </Text>
                <Text variant="bodyMedium" style={styles.email}>
                    {user?.email}
                </Text>
            </View>

            <List.Section>
                <List.Subheader>{t('profile.account')}</List.Subheader>
                <List.Item
                    title={t('profile.editProfile')}
                    description={t('profile.updateInfo')}
                    left={(props) => <List.Icon {...props} icon="account-edit" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => router.push('/profile/edit')}
                />
                <List.Item
                    title={t('profile.changePassword')}
                    description={t('profile.updatePassword')}
                    left={(props) => <List.Icon {...props} icon="lock-reset" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => router.push('/profile/change-password')}
                />
                <List.Item
                    title={t('profile.notificationPreferences')}
                    description={t('profile.manageNotifications')}
                    left={(props) => <List.Icon {...props} icon="bell" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => router.push('/profile/notifications')}
                />
                <List.Item
                    title={t('profile.settings')}
                    description={t('profile.appPreferences')}
                    left={(props) => <List.Icon {...props} icon="cog" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => router.push('/profile/settings')}
                />
            </List.Section>

            <List.Section>
                <List.Subheader>{t('profile.helpAndSupport')}</List.Subheader>
                <List.Item
                    title={t('profile.faq')}
                    description={t('profile.faqDesc')}
                    left={(props) => <List.Icon {...props} icon="help-circle" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => router.push('/help/faq')}
                />
                <List.Item
                    title={t('profile.contactSupport')}
                    description={t('profile.contactDesc')}
                    left={(props) => <List.Icon {...props} icon="email" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => router.push('/help/contact')}
                />
            </List.Section>

            <List.Section>
                <List.Subheader>{t('profile.privacy')}</List.Subheader>
                <List.Item
                    title={t('profile.exportData')}
                    description={t('profile.exportDesc')}
                    left={(props) => <List.Icon {...props} icon="download" />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => {
                        // Implement export data
                    }}
                />
                <List.Item
                    title={t('profile.deleteAccount')}
                    description={t('profile.deleteDesc')}
                    left={(props) => <List.Icon {...props} icon="delete" color={COLORS.error} />}
                    right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    onPress={handleDeleteAccount}
                    titleStyle={{ color: COLORS.error }}
                />
            </List.Section>

            <View style={styles.footer}>
                <Button
                    mode="outlined"
                    onPress={() => setLogoutDialogVisible(true)}
                    icon="logout"
                    style={styles.logoutButton}
                >
                    {t('profile.logout')}
                </Button>
                <Text variant="bodySmall" style={styles.version}>
                    {t('common.version')} 1.0.0
                </Text>
            </View>

            <Portal>
                <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
                    <Dialog.Title>{t('profile.logout')}</Dialog.Title>
                    <Dialog.Content>
                        <Text>{t('profile.confirmLogout')}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setLogoutDialogVisible(false)}>{t('common.cancel')}</Button>
                        <Button onPress={handleLogout}>{t('profile.logout')}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.surface,
    },
    avatar: {
        backgroundColor: COLORS.primary,
        marginBottom: SPACING.md,
    },
    name: {
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    email: {
        color: COLORS.textSecondary,
    },
    footer: {
        padding: SPACING.lg,
        alignItems: 'center',
    },
    logoutButton: {
        marginBottom: SPACING.md,
        borderColor: COLORS.error,
    },
    version: {
        color: COLORS.textSecondary,
    },
});

