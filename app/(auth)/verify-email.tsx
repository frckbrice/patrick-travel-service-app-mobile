import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../../lib/constants';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          {t('auth.verifyEmail')}
        </Text>
        <Text variant="bodyLarge" style={styles.message}>
          {t('auth.verificationEmailSent')}
        </Text>
        <Text variant="bodyMedium" style={styles.note}>
          Didn't receive the email? Check your spam folder or request a new
          verification email.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Button mode="contained" style={styles.button}>
            {t('auth.goToLogin')}
          </Button>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    color: COLORS.primary,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  note: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  button: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
});
