import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Text, Switch, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useTheme, useThemeColors } from '../../lib/theme/ThemeContext';
import { useAuthStore } from '../../stores/auth/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPACING, STORAGE_KEYS } from '../../lib/constants';
import { toast } from '../../lib/services/toast';
import { ThemeAwareHeader } from '../../components/ui/ThemeAwareHeader';
import { Alert } from '../../lib/utils/alert';
import { useTabBarPadding } from '../../lib/hooks/useTabBarPadding';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ThemeMode = 'light' | 'dark' | 'auto';
type Language = 'en' | 'fr';

// Memoized components to prevent unnecessary re-renders
const SettingItem = memo(({
  icon,
  title,
  description,
  onPress,
  rightElement,
  delay = 0,
  colors,
}: {
  icon: string;
  title: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  delay?: number;
  colors: any;
}) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
      }}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: SPACING.sm,
      }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: SPACING.sm,
        }}>
          <MaterialCommunityIcons
            name={icon as any}
            size={22}
            color={colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 2,
          }}>{title}</Text>
          {description && (
            <Text style={{
              fontSize: 12,
              color: colors.textSecondary,
            }}>{description}</Text>
          )}
        </View>
      </View>
      {rightElement}
    </TouchableOpacity>
  </Animated.View>
));
SettingItem.displayName = 'SettingItem';

const ThemeOption = memo(({
  mode,
  label,
  icon,
  currentMode,
  onPress,
  colors,
}: {
  mode: ThemeMode;
  label: string;
  icon: string;
  currentMode: ThemeMode;
  onPress: (mode: ThemeMode) => void;
  colors: any;
}) => (
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: currentMode === mode ? colors.primary : colors.border,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.xs,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      ...(currentMode === mode && {
        backgroundColor: colors.primary + '08',
      }),
    }}
    onPress={() => onPress(mode)}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons
      name={icon as any}
      size={24}
      color={currentMode === mode ? colors.primary : colors.textSecondary}
    />
    <Text style={{
      fontSize: 12,
      fontWeight: currentMode === mode ? '600' : '500',
      color: currentMode === mode ? colors.primary : colors.textSecondary,
    }}>{label}</Text>
    {currentMode === mode && (
      <MaterialCommunityIcons
        name="check-circle"
        size={20}
        color={colors.primary}
      />
    )}
  </TouchableOpacity>
));
ThemeOption.displayName = 'ThemeOption';

const LanguageOption = memo(({
  lang,
  label,
  flag,
  currentLang,
  onPress,
  colors,
}: {
  lang: Language;
  label: string;
  flag: string;
  currentLang: Language;
  onPress: (lang: Language) => void;
  colors: any;
}) => (
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: currentLang === lang ? colors.primary : colors.border,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      ...(currentLang === lang && {
        backgroundColor: colors.primary + '08',
      }),
    }}
    onPress={() => onPress(lang)}
    activeOpacity={0.7}
  >
    <Text style={{ fontSize: 28 }}>{flag}</Text>
    <Text style={{
      fontSize: 12,
      fontWeight: currentLang === lang ? '600' : '500',
      color: currentLang === lang ? colors.primary : colors.textSecondary,
    }}>{label}</Text>
    {currentLang === lang && (
      <MaterialCommunityIcons
        name="check-circle"
        size={20}
        color={colors.primary}
      />
    )}
  </TouchableOpacity>
));
LanguageOption.displayName = 'LanguageOption';

// Memoized Push Notification Toggle Component
const PushNotificationToggle = memo(({
  enabled,
  onToggle,
  colors,
  title,
  description,
}: {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  colors: any;
  title: string;
  description: string;
}) => {
  return (
    <SettingItem
      icon="bell"
      title={title}
      description={description}
      delay={150}
      colors={colors}
      rightElement={
        <Switch
          value={enabled}
          onValueChange={onToggle}
          color={colors.primary}
        />
      }
    />
  );
});
PushNotificationToggle.displayName = 'PushNotificationToggle';

// Memoized Email Notification Toggle Component
const EmailNotificationToggle = memo(({
  enabled,
  onToggle,
  colors,
  title,
  description,
}: {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  colors: any;
  title: string;
  description: string;
}) => {
  return (
    <SettingItem
      icon="email"
      title={title}
      description={description}
      delay={200}
      colors={colors}
      rightElement={
        <Switch
          value={enabled}
          onValueChange={onToggle}
          color={colors.primary}
        />
      }
    />
  );
});
EmailNotificationToggle.displayName = 'EmailNotificationToggle';

// Memoized Biometric Toggle Component
const BiometricToggle = memo(({
  enabled,
  onToggle,
  colors,
  title,
  description,
}: {
  enabled: boolean;
  onToggle: () => void;
  colors: any;
  title: string;
  description: string;
}) => {
  return (
    <SettingItem
      icon={Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'}
      title={title}
      description={description}
      delay={300}
      colors={colors}
      rightElement={
        <Switch
          value={enabled}
          onValueChange={onToggle}
          color={colors.primary}
        />
      }
    />
  );
});
BiometricToggle.displayName = 'BiometricToggle';

export default function SettingsScreen() {
  useRequireAuth();
  const { t, i18n } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const COLORS = useThemeColors();
  const tabBarPadding = useTabBarPadding();
  const scrollProps = useTabBarScroll();
  const insets = useSafeAreaInsets();
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

  const handleLanguageChange = useCallback(async (lang: Language) => {
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
  }, [i18n, t]);

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, [setThemeMode]);

  const handleBiometricToggle = useCallback(async () => {
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
  }, [biometricEnabled, disableBiometric, t]);

  const handlePushNotificationsToggle = useCallback(async (value: boolean) => {
    setPushNotificationsEnabled(value);
    await AsyncStorage.setItem('push_notifications', value.toString());
  }, []);

  const handleEmailNotificationsToggle = useCallback(async (value: boolean) => {
    setEmailNotificationsEnabled(value);
    await AsyncStorage.setItem('email_notifications', value.toString());
  }, []);

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

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: SPACING.xl,
    },
    section: {
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.md,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: SPACING.sm,
    },
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: SPACING.sm,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.sm,
    },
    settingText: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 12,
      color: COLORS.textSecondary,
    },
    divider: {
      marginLeft: 56,
      backgroundColor: COLORS.divider,
    },
    optionsGrid: {
      flexDirection: 'row',
      gap: SPACING.xs,
    },
    themeOption: {
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.xs,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    themeOptionActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary + '08',
    },
    themeOptionText: {
      fontSize: 12,
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
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    languageOptionActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary + '08',
    },
    flagEmoji: {
      fontSize: 28,
    },
    languageOptionText: {
      fontSize: 12,
      fontWeight: '500',
      color: COLORS.textSecondary,
    },
    languageOptionTextActive: {
      color: COLORS.primary,
      fontWeight: '600',
    },
  }), [COLORS]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + SPACING.lg }]}>
      <ThemeAwareHeader
        variant="gradient"
        gradientColors={[COLORS.primary, COLORS.secondary, COLORS.accent]}
        title={t('profile.settings') || 'Preferences'}
        showBackButton
      />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: SPACING.xl + insets.bottom + SPACING.lg }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollProps.onScroll}
        scrollEventThrottle={scrollProps.scrollEventThrottle}
      >
      {/* Language Section */}
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>
          {t('settings.language') || 'Language'}
        </Text>
        <View style={styles.optionsGrid}>
            <LanguageOption
              lang="en"
              label="English"
              flag="🇬🇧"
              currentLang={currentLanguage}
              onPress={handleLanguageChange}
              colors={COLORS}
            />
            <LanguageOption
              lang="fr"
              label="Français"
              flag="🇫🇷"
              currentLang={currentLanguage}
              onPress={handleLanguageChange}
              colors={COLORS}
            />
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
              currentMode={themeMode}
              onPress={handleThemeChange}
              colors={COLORS}
          />
          <ThemeOption
            mode="dark"
            label={t('settings.dark') || 'Dark'}
            icon="moon-waning-crescent"
              currentMode={themeMode}
              onPress={handleThemeChange}
              colors={COLORS}
          />
          <ThemeOption
            mode="auto"
            label={t('settings.auto') || 'Auto'}
            icon="theme-light-dark"
              currentMode={themeMode}
              onPress={handleThemeChange}
              colors={COLORS}
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
            <PushNotificationToggle
              enabled={pushNotificationsEnabled}
              onToggle={handlePushNotificationsToggle}
              colors={COLORS}
            title={t('settings.pushNotifications') || 'Push Notifications'}
              description={t('settings.pushDesc') || 'Receive push notifications'}
          />
          <Divider style={styles.divider} />
            <EmailNotificationToggle
              enabled={emailNotificationsEnabled}
              onToggle={handleEmailNotificationsToggle}
              colors={COLORS}
            title={t('settings.emailNotifications') || 'Email Notifications'}
              description={t('settings.emailDesc') || 'Receive email updates'}
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
              <BiometricToggle
                enabled={biometricEnabled}
                onToggle={handleBiometricToggle}
                colors={COLORS}
                title={Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint'}
                description={t('settings.biometricDesc') || 'Use biometric authentication to login'}
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
              colors={COLORS}
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
              colors={COLORS}
          />
          <Divider style={styles.divider} />
          <SettingItem
            icon="update"
            title={t('settings.checkUpdates') || 'Check for Updates'}
            description={t('settings.upToDate') || 'You are up to date'}
            delay={550}
              colors={COLORS}
          />
        </View>
      </Animated.View>

      <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}
