import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, Switch, List, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { notificationService } from '../../lib/services/notifications';
import {
  registerForPushNotifications,
  areNotificationsEnabled,
  requestNotificationPermissions,
} from '../../lib/services/pushNotifications';
import { secureStorage } from '../../lib/storage/secureStorage';
import { SPACING } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { ThemeAwareHeader } from '../../components/ui/ThemeAwareHeader';
import { toast } from '../../lib/services/toast';
import { useAuthStore } from '../../stores/auth/authStore';
import { logger } from '../../lib/utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const registerPushToken = useAuthStore((state) => state.registerPushToken);
  const pushTokenFromStore = useAuthStore((state) => state.pushToken);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: false,
    emailEnabled: true,
    caseUpdates: true,
    documentUpdates: true,
    messageNotifications: true,
    marketing: false,
  });
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'checking'>('checking');

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: SPACING.lg,
    },
    section: {
      marginBottom: SPACING.lg,
      paddingHorizontal: SPACING.md,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: SPACING.sm,
      marginLeft: SPACING.xs,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: SPACING.md,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    listItemContent: {
      flex: 1,
    },
    listItemTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    listItemDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    divider: {
      marginLeft: SPACING.md + 40 + SPACING.md,
      backgroundColor: colors.border,
    },
    testSection: {
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.md,
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    testButtonText: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    tokenInfo: {
      padding: SPACING.md,
      backgroundColor: colors.surface,
      margin: SPACING.lg,
      marginTop: SPACING.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tokenLabel: {
      fontWeight: 'bold',
      marginBottom: SPACING.xs,
      color: colors.text,
      fontSize: 13,
    },
    tokenText: {
      color: colors.textSecondary,
      fontFamily: 'monospace',
      fontSize: 11,
    },
  }), [colors]);

  useEffect(() => {
    loadPreferences();
  }, [pushTokenFromStore]); // Reload when push token becomes available

  const loadPreferences = async () => {
    // Check notification permissions status
    let hasPermission = false;
    try {
      hasPermission = await areNotificationsEnabled();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
    } catch (error) {
      logger.error('Error checking permissions', error);
      setPermissionStatus('undetermined');
    }

    const saved = await secureStorage.get<NotificationPreferences>(
      'notificationPreferences'
    );

    // Get token from auth store (this is the token registered with backend)
    const token = pushTokenFromStore || notificationService.getExpoPushToken();
    setPushToken(token);

    // Merge saved preferences with push token status
    // If token exists and permissions granted, push is enabled
    // If no saved preference but token exists and permissions granted, enable it
    const finalPreferences: NotificationPreferences = {
      pushEnabled: saved?.pushEnabled ?? (!!token && hasPermission), // Use saved preference, or enable if token exists and permission granted
      emailEnabled: saved?.emailEnabled ?? true,
      caseUpdates: saved?.caseUpdates ?? true,
      documentUpdates: saved?.documentUpdates ?? true,
      messageNotifications: saved?.messageNotifications ?? true,
      marketing: saved?.marketing ?? false,
    };

    setPreferences(finalPreferences);
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    await secureStorage.set('notificationPreferences', newPreferences);
    setPreferences(newPreferences);
  };

  const handleTogglePush = async (enabled: boolean) => {
    if (enabled) {
      try {
        // Step 1: Check if permissions are already granted
        const hasPermission = await areNotificationsEnabled();

        if (!hasPermission) {
          // Step 2: Request permissions
          logger.info('Requesting notification permissions...');
          const permissionGranted = await requestNotificationPermissions();

          if (!permissionGranted) {
            // Permission was denied - show helpful message
            setPermissionStatus('denied');
            toast.error({
              title: t('common.error'),
              message: 'Notification permissions are required. Please enable them in your device settings.',
            });
            setPreferences(prev => ({ ...prev, pushEnabled: false }));
            return;
          }

          logger.info('Notification permissions granted');
          setPermissionStatus('granted');
        }

        // Step 3: Register token with backend (this uses registerForPushNotifications internally)
        await registerPushToken();

        // Step 4: Get updated token from store after registration
        const updatedToken = useAuthStore.getState().pushToken;

        if (updatedToken) {
          setPushToken(updatedToken);
          savePreferences({ ...preferences, pushEnabled: true });

          toast.success({
            title: t('common.success'),
            message: 'Push notifications enabled',
          });
        } else {
          // Token might still be registering, check again
          const tokenData = await registerForPushNotifications();
          if (tokenData?.token) {
            setPushToken(tokenData.token);
            savePreferences({ ...preferences, pushEnabled: true });
            toast.success({
              title: t('common.success'),
              message: 'Push notifications enabled',
            });
          } else {
            throw new Error('Failed to obtain push token. Please check your device settings.');
          }
        }
      } catch (error: any) {
        logger.error('Failed to enable push notifications', error);

        // Provide specific error messages
        let errorMessage = 'Failed to enable push notifications.';
        if (error?.message?.includes('permission') || error?.message?.includes('Permission')) {
          errorMessage = 'Notification permissions are required. Please enable them in your device settings.';
        } else if (error?.message) {
          errorMessage = error.message;
        }

        toast.error({
          title: t('common.error'),
          message: errorMessage,
        });
        // Reset switch if failed
        setPreferences(prev => ({ ...prev, pushEnabled: false }));
      }
    } else {
      savePreferences({ ...preferences, pushEnabled: false });
      // Note: We don't remove the token from backend here - it will be removed on logout
      // User can still receive notifications but preferences say they're disabled
    }
  };

  const handleTestNotification = async () => {
    await notificationService.scheduleLocalNotification(
      'Test Notification',
      'This is a test notification from Patrick Travel Services'
    );
    toast.info({
      title: t('common.success'),
      message: 'Test notification sent',
    });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + SPACING.lg }]}>
      <ThemeAwareHeader
        variant="gradient"
        gradientColors={[colors.primary, colors.secondary, colors.accent]}
        title={t('profile.notificationPreferences')}
        subtitle={t('profile.manageNotifications')}
        showBackButton
      />
      <ScrollView
        style={[styles.scrollContainer, { paddingBottom: insets.bottom + SPACING.lg + SPACING.xl }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.channels')}</Text>

          <View style={styles.card}>
            <View style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="cellphone"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {t('notifications.pushNotifications')}
                  </Text>
                  <Text style={styles.listItemDescription}>
                    {permissionStatus === 'denied'
                      ? 'Notification permissions are required. Enable in device settings.'
                      : pushToken
                        ? t('notifications.pushEnabled')
                        : t('notifications.pushDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.pushEnabled}
                onValueChange={handleTogglePush}
                color={colors.primary}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="email"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {t('notifications.emailNotifications')}
                  </Text>
                  <Text style={styles.listItemDescription}>
                    {t('notifications.emailDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.emailEnabled}
                onValueChange={(value) =>
                  savePreferences({ ...preferences, emailEnabled: value })
                }
                color={colors.primary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.types')}</Text>

          <View style={styles.card}>
            <View style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="briefcase"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {t('notifications.caseUpdates')}
                  </Text>
                  <Text style={styles.listItemDescription}>
                    {t('notifications.caseUpdatesDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.caseUpdates}
                onValueChange={(value) =>
                  savePreferences({ ...preferences, caseUpdates: value })
                }
                color={colors.primary}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="file-document"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {t('notifications.documentUpdates')}
                  </Text>
                  <Text style={styles.listItemDescription}>
                    {t('notifications.documentUpdatesDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.documentUpdates}
                onValueChange={(value) =>
                  savePreferences({ ...preferences, documentUpdates: value })
                }
                color={colors.primary}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="message"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {t('notifications.messageNotifications')}
                  </Text>
                  <Text style={styles.listItemDescription}>
                    {t('notifications.messageNotificationsDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.messageNotifications}
                onValueChange={(value) =>
                  savePreferences({
                    ...preferences,
                    messageNotifications: value,
                  })
                }
                color={colors.primary}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="bullhorn"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {t('notifications.marketing')}
                  </Text>
                  <Text style={styles.listItemDescription}>
                    {t('notifications.marketingDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.marketing}
                onValueChange={(value) =>
                  savePreferences({ ...preferences, marketing: value })
                }
                color={colors.primary}
              />
            </View>
          </View>
        </View>

        {/* {preferences.pushEnabled && (
          <View style={styles.testSection}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestNotification}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="bell-ring"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.testButtonText}>
                {t('notifications.testNotification')}
              </Text>
            </TouchableOpacity>
          </View>
        )} */}

        {/* {pushToken && (
          <View style={styles.tokenInfo}>
            <Text variant="bodySmall" style={styles.tokenLabel}>
              {t('notifications.pushToken')}
            </Text>
            <Text
              variant="bodySmall"
              style={styles.tokenText}
              numberOfLines={2}
            >
              {pushToken}
            </Text>
          </View>
        )} */}
      </ScrollView>
    </View>
  );
}
