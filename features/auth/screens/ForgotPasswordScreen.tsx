import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from '../schemas/authSchemas';
import { authApi } from '../../../lib/api/auth.api';
import { COLORS, SPACING } from '../../../lib/constants';
import { logger } from '../../../lib/utils/logger';
import { Alert } from '../../../lib/utils/alert';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Requesting password reset via backend API', {
        email: data.email,
      });

      const response = await authApi.forgotPassword(data.email.trim());

      if (response.success) {
        // Generic success message to prevent user enumeration
        Alert.alert(
          t('auth.checkEmail') || 'Check Your Email',
          t('auth.resetEmailSent') ||
          "If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.",
          [
            {
              text: t('common.ok') || 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        // Still show generic message for security
        Alert.alert(
          t('auth.checkEmail') || 'Check Your Email',
          t('auth.resetEmailSent') ||
          "If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.",
          [
            {
              text: t('common.ok') || 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (e: any) {
      logger.error('Failed to request password reset', e);
      // Show generic message even on error to prevent user enumeration
      Alert.alert(
        t('auth.checkEmail') || 'Check Your Email',
        t('auth.resetEmailSent') ||
        "If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.",
        [
          {
            text: t('common.ok') || 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

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
});
