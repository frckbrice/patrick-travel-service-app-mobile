import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../../lib/constants';
import { authApi } from '../../lib/api/auth.api';
import { useAuthStore } from '../../stores/auth/authStore';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState(user?.email || '');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isValidEmail = /.+@.+\..+/.test(email);

  return (
    <View style={styles.container}>
      {/* Company Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          {t('auth.verifyEmail')}
        </Text>
        <Text variant="bodyLarge" style={styles.message}>
          {t('auth.verificationEmailSent')}
        </Text>
        <Text variant="bodyMedium" style={styles.note}>
          {
            "Didn't receive the email? Check your spam folder or request a new verification email."
          }
        </Text>

        <TextInput
          mode="outlined"
          label={t('auth.email')}
          value={email}
          onChangeText={(v) => setEmail(v.trim())}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          outlineStyle={styles.inputOutline}
          textColor={COLORS.text}
          placeholderTextColor={COLORS.textSecondary}
          theme={{
            colors: {
              onSurfaceVariant: COLORS.textSecondary,
              onSurface: COLORS.text,
            },
          }}
        />
        {!!error && <HelperText type="error">{error}</HelperText>}
        {!!feedback && !error && (
          <HelperText type="info" style={styles.infoText}>
            {feedback}
          </HelperText>
        )}

        <Button
          mode="outlined"
          onPress={async () => {
            if (isSending || !isValidEmail) return;
            setError(null);
            setFeedback(null);
            setIsSending(true);
            const res = await authApi.resendVerification(email);
            setIsSending(false);
            if (res.success) {
              setFeedback('Verification email sent. Please check your inbox.');
            } else {
              setError(
                res.error || 'Unable to resend email. Please try again.'
              );
            }
          }}
          disabled={isSending || !isValidEmail}
          style={styles.resendButton}
          contentStyle={styles.resendButtonContent}
        >
          {isSending ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" />
              <Text style={styles.resendLabel}>
                {' '}
                {t('auth.resendEmail') || 'Resend Email'}
              </Text>
            </View>
          ) : (
            t('auth.resendEmail') || 'Resend Email'
          )}
        </Button>
        <Link href="/(auth)/login" asChild>
          <Button
            mode="contained"
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 120,
    height: 120,
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
  input: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  infoText: {
    marginTop: -6,
    marginBottom: SPACING.md,
  },
  resendButton: {
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  resendButtonContent: {
    paddingVertical: 8,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendLabel: {
    marginLeft: 8,
    color: COLORS.text,
    fontWeight: '600',
  },
  button: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
  },
  buttonLabel: {
    color: COLORS.surface,
    fontWeight: '600',
  },
});
