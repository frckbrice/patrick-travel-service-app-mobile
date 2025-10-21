import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Text, Switch, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useTheme } from '../../lib/theme/ThemeContext';
import { useAuthStore } from '../../stores/auth/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, STORAGE_KEYS } from '../../lib/constants';
import { toast } from '../../lib/services/toast';

type ThemeMode = 'light' | 'dark' | 'auto';
type Language = 'en' | 'fr';

export default function SettingsScreen() {
  useRequireAuth();
  const { t, i18n } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const {
    biometricAvailable,
    biometricEnabled,
    checkBiometricStatus,
    disableBiometric,
  } = useAuthStore();

  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    (i18n.language as Language) || 'en'
  );
  const [pushNotificationsEnabled, setPushNotificationsEnabled] =
    useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(true);

  useEffect(() => {
    checkBiometricStatus();
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const push = await AsyncStorage.getItem('push_notifications');
      const email = await AsyncStorage.getItem('email_notifications');
      if (push !== null) setPushNotificationsEnabled(push === 'true');
      if (email !== null) setEmailNotificationsEnabled(email === 'true');
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    try {
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE_PREFERENCE, lang);
      setCurrentLanguage(lang);
    } catch (error) {
      toast.error({
        title: t('common.error'),
        message: 'Failed to change language',
      });
    }
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      // Keep Alert for confirmation (critical action)
      Alert.alert(
        t('settings.disableBiometric') || 'Disable Biometric',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.yes'),
            style: 'destructive',
            onPress: async () => {
              await disableBiometric();
              toast.success({
                title: t('common.success'),
                message: t('settings.biometricDisabled') || 'Biometric disabled',
              });
            },
          },
        ]
      );
    } else {
      // Use toast for informational message
      toast.info({
        title: t('settings.enableBiometric') || 'Enable Biometric',
        message: 'Please login again to enable biometric authentication',
      });
    }
  };

  const handlePushNotificationsToggle = async (value: boolean) => {
    setPushNotificationsEnabled(value);
    await AsyncStorage.setItem('push_notifications', value.toString());
  };

  const handleEmailNotificationsToggle = async (value: boolean) => {
    setEmailNotificationsEnabled(value);
    await AsyncStorage.setItem('email_notifications', value.toString());
  };

  const handleClearCache = () => {
    // Keep Alert for confirmation (destructive action)
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will free up storage space.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Add cache clearing logic here
            toast.success({
              title: t('common.success'),
              message: 'Cache cleared successfully',
            });
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    description,
    onPress,
    rightElement,
    delay = 0,
  }: {
    icon: string;
    title: string;
    description?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    delay?: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={icon as any}
              size={22}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{title}</Text>
            {description && (
              <Text style={styles.settingDescription}>{description}</Text>
            )}
          </View>
        </View>
        {rightElement}
      </TouchableOpacity>
    </Animated.View>
  );

  const ThemeOption = ({
    mode,
    label,
    icon,
  }: {
    mode: ThemeMode;
    label: string;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        themeMode === mode && styles.themeOptionActive,
      ]}
      onPress={() => handleThemeChange(mode)}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={24}
        color={themeMode === mode ? COLORS.primary : COLORS.textSecondary}
      />
      <Text
        style={[
          styles.themeOptionText,
          themeMode === mode && styles.themeOptionTextActive,
        ]}
      >
        {label}
      </Text>
      {themeMode === mode && (
        <MaterialCommunityIcons
          name="check-circle"
          size={20}
          color={COLORS.primary}
        />
      )}
    </TouchableOpacity>
  );

  const LanguageOption = ({
    lang,
    label,
    flag,
  }: {
    lang: Language;
    label: string;
    flag: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.languageOption,
        currentLanguage === lang && styles.languageOptionActive,
      ]}
      onPress={() => handleLanguageChange(lang)}
      activeOpacity={0.7}
    >
      <Text style={styles.flagEmoji}>{flag}</Text>
      <Text
        style={[
          styles.languageOptionText,
          currentLanguage === lang && styles.languageOptionTextActive,
        ]}
      >
        {label}
      </Text>
      {currentLanguage === lang && (
        <MaterialCommunityIcons
          name="check-circle"
          size={20}
          color={COLORS.primary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Language Section */}
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>
          {t('settings.language') || 'Language'}
        </Text>
        <View style={styles.optionsGrid}>
          <LanguageOption lang="en" label="English" flag="🇬🇧" />
          <LanguageOption lang="fr" label="Français" flag="🇫🇷" />
        </View>
      </Animated.View>

      {/* Appearance Section */}
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>
          {t('settings.appearance') || 'Appearance'}
        </Text>
        <View style={styles.optionsGrid}>
          <ThemeOption
            mode="light"
            label={t('settings.light') || 'Light'}
            icon="white-balance-sunny"
          />
          <ThemeOption
            mode="dark"
            label={t('settings.dark') || 'Dark'}
            icon="moon-waning-crescent"
          />
          <ThemeOption
            mode="auto"
            label={t('settings.auto') || 'Auto'}
            icon="theme-light-dark"
          />
        </View>
      </Animated.View>

      {/* Notifications Section */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>
          {t('settings.notifications') || 'Notifications'}
        </Text>
        <View style={styles.card}>
          <SettingItem
            icon="bell"
            title={t('settings.pushNotifications') || 'Push Notifications'}
            description={t('settings.pushDesc') || 'Receive push notifications'}
            rightElement={
              <Switch
                value={pushNotificationsEnabled}
                onValueChange={handlePushNotificationsToggle}
                color={COLORS.primary}
              />
            }
            delay={150}
          />
          <Divider style={styles.divider} />
          <SettingItem
            icon="email"
            title={t('settings.emailNotifications') || 'Email Notifications'}
            description={t('settings.emailDesc') || 'Receive email updates'}
            rightElement={
              <Switch
                value={emailNotificationsEnabled}
                onValueChange={handleEmailNotificationsToggle}
                color={COLORS.primary}
              />
            }
            delay={200}
          />
        </View>
      </Animated.View>

      {/* Security Section */}
      {biometricAvailable && (
        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>
            {t('settings.security') || 'Security'}
          </Text>
          <View style={styles.card}>
            <SettingItem
              icon={Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'}
              title={
                Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint'
              }
              description={
                t('settings.biometricDesc') ||
                'Use biometric authentication to login'
              }
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  color={COLORS.primary}
                />
              }
              delay={300}
            />
          </View>
        </Animated.View>
      )}

      {/* Storage Section */}
      <Animated.View
        entering={FadeInDown.delay(350).springify()}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>
          {t('settings.storage') || 'Storage'}
        </Text>
        <View style={styles.card}>
          <SettingItem
            icon="delete-sweep"
            title={t('settings.clearCache') || 'Clear Cache'}
            description={
              t('settings.clearCacheDesc') || 'Free up storage space'
            }
            onPress={handleClearCache}
            rightElement={
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={COLORS.textTertiary}
              />
            }
            delay={400}
          />
        </View>
      </Animated.View>

      {/* About Section */}
      <Animated.View
        entering={FadeInDown.delay(450).springify()}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>
          {t('settings.about') || 'About'}
        </Text>
        <View style={styles.card}>
          <SettingItem
            icon="information"
            title={t('settings.version') || 'App Version'}
            description="1.0.0"
            delay={500}
          />
          <Divider style={styles.divider} />
          <SettingItem
            icon="update"
            title={t('settings.checkUpdates') || 'Check for Updates'}
            description={t('settings.upToDate') || 'You are up to date'}
            delay={550}
          />
        </View>
      </Animated.View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    marginLeft: 72,
    backgroundColor: COLORS.divider,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  themeOption: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  themeOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  languageOption: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  languageOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  flagEmoji: {
    fontSize: 32,
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  languageOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
