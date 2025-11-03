import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from '../schemas/authSchemas';
import { auth } from '../../../lib/firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { COLORS, SPACING } from '../../../lib/constants';
import { logger } from '../../../lib/utils/logger';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    console.log('🔥 Forgot Password - Form submitted with email:', data.email);
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Sending password reset email via Firebase', {
        email: data.email,
      });
      console.log('🔥 Calling sendPasswordResetEmail...');

      await sendPasswordResetEmail(auth, data.email);

      console.log('✅ Password reset email sent successfully');
      logger.info('Password reset email sent successfully');
      setSuccess(true);
    } catch (e: any) {
      console.error('❌ Failed to send password reset email:', e);
      logger.error('Failed to send password reset email', e);
      const errorMessage = e?.code
        ? `Firebase error: ${e.code} - ${e.message}`
        : e?.message || 'Failed to send reset email';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        {/* Company Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.successContainer}>
          <Text variant="headlineMedium" style={styles.successTitle}>
            {t('auth.checkEmail') || 'Check Your Email'}
          </Text>
          <Text variant="bodyLarge" style={styles.successText}>
            {t('auth.resetEmailSent') ||
              "We've sent you instructions to reset your password. Please check your inbox and spam folder."}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.button} activeOpacity={0.8}>
              <Text style={styles.buttonLabel}>
                {t('auth.backToLogin') || 'Back to Login'}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Company Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.header}>
        <Text variant="headlineLarge" style={styles.title}>
          {t('auth.forgotPassword')}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {t('auth.enterEmailToReset') ||
            'Enter your email to reset your password.'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('auth.email')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!errors.email}
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
          )}
        />
        {errors.email && (
          <Text style={styles.fieldError}>{errors.email.message}</Text>
        )}

        <TouchableOpacity
          onPress={() => {
            if (isLoading) return;
            handleSubmit(onSubmit)();
          }}
          style={styles.button}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator color={COLORS.surface} size="small" />
              <Text style={styles.buttonLabel}>{t('auth.resetPassword')}</Text>
            </View>
          ) : (
            <Text style={styles.buttonLabel}>{t('auth.resetPassword')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')} </Text>
          <Link href="/(auth)/login" asChild>
            <Text style={styles.link}>{t('auth.signIn')}</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  logo: {
    width: 120,
    height: 120,
  },
  header: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginTop: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  fieldError: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    marginTop: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    color: COLORS.success,
  },
  successText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
});
