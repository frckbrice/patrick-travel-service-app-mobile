import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Avatar, Dialog, Portal } from 'react-native-paper';
// import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Card, Button } from '../../components/ui';
import { SPACING } from '../../lib/constants';
import { toast } from '../../lib/services/toast';
import { useThemeColors } from '../../lib/theme/ThemeContext';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const colors = useThemeColors();

  const handleLogout = useCallback(async () => {
    setLogoutDialogVisible(false);
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  const handleDeleteAccount = useCallback(() => {
    // Keep Alert for confirmation (critical destructive action)
    Alert.alert(t('profile.deleteAccount'), t('profile.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          // TODO: Implement delete account logic
        },
      },
    ]);
  }, [t]);

  const MenuCard = useCallback(
    ({ icon, title, description, onPress, danger = false }: any) => (
      <TouchableOpacity onPress={onPress}>
        <Card style={styles.menuCard}>
          <View style={styles.menuContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: danger ? colors.error + '15' : colors.primary + '15' },
              ]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={24}
                color={danger ? colors.error : colors.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text
                style={[styles.menuTitle, { color: danger ? colors.error : colors.text }]}
              >
                {title}
              </Text>
              {description && (
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{description}</Text>
              )}
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </View>
        </Card>
      </TouchableOpacity>
    ),
    [colors]
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}
    >
          <View style={[styles.headerGradient, { backgroundColor: colors.primary }]}>
        <Animated.View
          entering={FadeInDown.delay(0).duration(400)}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <Avatar.Text
              size={110}
              label={
                user?.firstName && user?.lastName
                  ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                  : user?.email?.charAt(0)?.toUpperCase() || 'U'
              }
              style={styles.avatar}
              labelStyle={[styles.avatarLabel, { color: colors.primary }]}
            />
          </View>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
        </Animated.View>
          </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.account')}</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.helpAndSupport')}</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.privacy')}</Text>
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
            onPress={() =>
              toast.info({
                title: 'Feature Coming Soon',
                message: 'Data export will be available soon',
              })
            }
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

      <Animated.View
        entering={FadeInDown.delay(500).duration(400)}
        style={styles.footer}
      >
        <Button
          title={t('profile.logout')}
          onPress={() => setLogoutDialogVisible(true)}
          icon="logout"
          variant="danger"
          fullWidth
        />
        <Text style={[styles.version, { color: colors.textSecondary }]}>{t('common.version')} 1.0.0</Text>
      </Animated.View>

      <Portal>
        <Dialog
          visible={logoutDialogVisible}
          onDismiss={() => setLogoutDialogVisible(false)}
        >
          <Dialog.Title>{t('profile.logout')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('profile.confirmLogout')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              title={t('common.cancel')}
              variant="ghost"
              onPress={() => setLogoutDialogVisible(false)}
            />
            <Button
              title={t('profile.logout')}
              variant="danger"
              onPress={handleLogout}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarLabel: {
    fontSize: 42,
    fontWeight: '700',
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  email: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 4,
  },
  phone: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuCard: {
    marginBottom: SPACING.sm,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
  },
  footer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    marginTop: SPACING.md,
  },
});
