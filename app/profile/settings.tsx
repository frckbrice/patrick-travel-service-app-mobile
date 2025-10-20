import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, List, RadioButton, Divider, Switch } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useTheme } from '../../lib/theme/ThemeContext';
import { useAuthStore } from '../../stores/auth/authStore';
import { COLORS, SPACING } from '../../lib/constants';

type ThemeMode = 'light' | 'dark' | 'auto';

export default function SettingsScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const {
    biometricAvailable,
    biometricEnabled,
    checkBiometricStatus,
    enableBiometric,
    disableBiometric,
  } = useAuthStore();

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const handleThemeChange = (mode: string) => {
    setThemeMode(mode as ThemeMode);
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      Alert.alert(
        t('settings.disableBiometric'),
        'Are you sure you want to disable biometric authentication?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.yes'),
            style: 'destructive',
            onPress: async () => {
              await disableBiometric();
              Alert.alert(t('common.success'), t('settings.biometricDisabled'));
            },
          },
        ]
      );
    } else {
      // Need to get user credentials - redirect to enable it after login
      Alert.alert(
        t('settings.enableBiometric'),
        'Please login again to enable biometric authentication',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.ok'),
            onPress: () => {
              // User should re-login from login screen to enable biometric
              Alert.alert(
                'Info',
                'Biometric authentication will be available after your next login'
              );
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="bodyLarge" style={styles.description}>
          {t('settings.customize')}
        </Text>

        <List.Section>
          <List.Subheader>{t('settings.appearance')}</List.Subheader>

          <List.Item
            title={t('settings.lightMode')}
            description={t('settings.lightDesc')}
            left={(props) => (
              <List.Icon {...props} icon="white-balance-sunny" />
            )}
            right={() => (
              <RadioButton
                value="light"
                status={themeMode === 'light' ? 'checked' : 'unchecked'}
                onPress={() => handleThemeChange('light')}
              />
            )}
            onPress={() => handleThemeChange('light')}
          />

          <Divider />

          <List.Item
            title={t('settings.darkMode')}
            description={t('settings.darkDesc')}
            left={(props) => (
              <List.Icon {...props} icon="moon-waning-crescent" />
            )}
            right={() => (
              <RadioButton
                value="dark"
                status={themeMode === 'dark' ? 'checked' : 'unchecked'}
                onPress={() => handleThemeChange('dark')}
              />
            )}
            onPress={() => handleThemeChange('dark')}
          />

          <Divider />

          <List.Item
            title={t('settings.autoMode')}
            description={t('settings.autoDesc')}
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <RadioButton
                value="auto"
                status={themeMode === 'auto' ? 'checked' : 'unchecked'}
                onPress={() => handleThemeChange('auto')}
              />
            )}
            onPress={() => handleThemeChange('auto')}
          />
        </List.Section>

        <View style={styles.note}>
          <Text variant="bodySmall" style={styles.noteText}>
            {t('settings.darkModeNote')}
          </Text>
        </View>

        {/* Biometric Authentication Section */}
        {biometricAvailable && (
          <List.Section>
            <List.Subheader>{t('settings.security')}</List.Subheader>

            <List.Item
              title={t('settings.biometric')}
              description={t('settings.biometricDesc')}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={
                    Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'
                  }
                />
              )}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                />
              )}
            />
          </List.Section>
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
  note: {
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  noteText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
