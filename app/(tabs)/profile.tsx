import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity } from 'react-native';
import { List, Avatar, Dialog, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth, useAuth } from '../../features/auth/hooks/useAuth';
import { Card, Button } from '../../components/ui';
import { COLORS, SPACING } from '../../lib/constants';

export default function ProfileScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

    const handleLogout = useCallback(async () => {
        setLogoutDialogVisible(false);
        await logout();
        router.replace('/(auth)/login');
    }, [logout, router]);

    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            t('profile.deleteAccount'),
            t('profile.confirmDelete'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        // TODO: Implement delete account logic
                    },
                },
            ]
        );
    }, [t]);

    const MenuCard = useCallback(({ icon, title, description, onPress, danger = false }: any) => (
        <TouchableOpacity onPress={onPress}>
            <Card style={styles.menuCard}>
                <View style={styles.menuContent}>
                    <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
                        <MaterialCommunityIcons
                            name={icon}
                            size={24}
                            color={danger ? COLORS.error : COLORS.primary}
                        />
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>
                            {title}
                        </Text>
                        {description && (
                            <Text style={styles.menuDescription}>{description}</Text>
                        )}
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={COLORS.textSecondary}
                    />
                </View>
            </Card>
        </TouchableOpacity>
    ), []);

    return (
        <ScrollView style={styles.container}>
            <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
                <Avatar.Text
                    size={100}
                    label={`${user?.firstName.charAt(0)}${user?.lastName.charAt(0)}`}
                    style={styles.avatar}
                    labelStyle={styles.avatarLabel}
                />
                <Text style={styles.name}>
                    {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.email}>
                    {user?.email}
                </Text>
                {user?.phone && (
                    <Text style={styles.phone}>
                        {user.phone}
                    </Text>
                )}
            </Animated.View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <MenuCard
                        icon="account-edit"
                        title={t('profile.editProfile')}
                        description={t('profile.updateInfo')}
                        onPress={() => router.push('/profile/edit')}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                    <MenuCard
                        icon="lock-reset"
                        title={t('profile.changePassword')}
                        description={t('profile.updatePassword')}
                        onPress={() => router.push('/profile/change-password')}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                    <MenuCard
                        icon="bell"
                        title={t('profile.notificationPreferences')}
                        description={t('profile.manageNotifications')}
                        onPress={() => router.push('/profile/notifications')}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(250).duration(400)}>
                    <MenuCard
                        icon="cog"
                        title={t('profile.settings')}
                        description={t('profile.appPreferences')}
                        onPress={() => router.push('/profile/settings')}
                    />
                </Animated.View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.helpAndSupport')}</Text>
                <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                    <MenuCard
                        icon="help-circle"
                        title={t('profile.faq')}
                        description={t('profile.faqDesc')}
                        onPress={() => router.push('/help/faq')}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(350).duration(400)}>
                    <MenuCard
                        icon="email"
                        title={t('profile.contactSupport')}
                        description={t('profile.contactDesc')}
                        onPress={() => router.push('/help/contact')}
                    />
                </Animated.View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.privacy')}</Text>
                <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                    <MenuCard
                        icon="shield-check"
                        title="Privacy Policy"
                        description="View our privacy policy and data protection"
                        onPress={() => router.push('/(auth)/privacy-policy')}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(425).duration(400)}>
                    <MenuCard
                        icon="file-document"
                        title="Terms & Conditions"
                        description="View our terms of service"
                        onPress={() => router.push('/(auth)/terms')}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(450).duration(400)}>
                    <MenuCard
                        icon="download"
                        title={t('profile.exportData')}
                        description={t('profile.exportDesc')}
                        onPress={() => Alert.alert('Feature Coming Soon', 'Data export will be available soon')}
                    />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(475).duration(400)}>
                    <MenuCard
                        icon="delete"
                        title={t('profile.deleteAccount')}
                        description={t('profile.deleteDesc')}
                        onPress={handleDeleteAccount}
                        danger
                    />
                </Animated.View>
            </View>

            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.footer}>
                <Button
                    title={t('profile.logout')}
                    onPress={() => setLogoutDialogVisible(true)}
                    icon="logout"
                    variant="danger"
                    fullWidth
                />
                <Text style={styles.version}>
                    {t('common.version')} 1.0.0
                </Text>
            </Animated.View>

            <Portal>
                <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
                    <Dialog.Title>{t('profile.logout')}</Dialog.Title>
                    <Dialog.Content>
                        <Text>{t('profile.confirmLogout')}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button title={t('common.cancel')} variant="ghost" onPress={() => setLogoutDialogVisible(false)} />
                        <Button title={t('profile.logout')} variant="danger" onPress={handleLogout} />
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
        paddingTop: SPACING.xxl,
        backgroundColor: COLORS.surface,
    },
    avatar: {
        backgroundColor: COLORS.primary,
        marginBottom: SPACING.md,
    },
    avatarLabel: {
        fontSize: 36,
        fontWeight: '600',
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    phone: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    section: {
        padding: SPACING.md,
        paddingTop: SPACING.lg,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    menuCard: {
        marginBottom: SPACING.sm,
    },
    menuContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    iconContainerDanger: {
        backgroundColor: COLORS.error + '15',
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    menuTitleDanger: {
        color: COLORS.error,
    },
    menuDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    footer: {
        padding: SPACING.lg,
        paddingTop: SPACING.xl,
        alignItems: 'center',
    },
    version: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },
});

