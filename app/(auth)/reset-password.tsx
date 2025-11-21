/**
 * Reset Password Screen
 * Handles password reset via deep link with oobCode
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import {
  TextInput,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../lib/api/auth.api';
import { COLORS, SPACING } from '../../lib/constants';
import { logger } from '../../lib/utils/logger';
import { validatePassword, PasswordValidationResult } from '../../lib/utils/passwordValidation';
import { Alert } from '../../lib/utils/alert';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ oobCode?: string; mode?: string }>();
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validation, setValidation] = useState<PasswordValidationResult>({
    valid: false,
    errors: [],
  });
  const [error, setError] = useState<string | null>(null);

  // Extract oobCode from URL parameters or deep link
  useEffect(() => {
    const extractOobCode = async () => {
      try {
        // First, check route params (from deep link handling in _layout.tsx)
        if (params.oobCode && params.mode === 'resetPassword') {
          setOobCode(params.oobCode);
          setIsLoading(false);
          return;
        }

        // Check initial URL (cold start) - fallback if params not set
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          try {
            const url = new URL(initialUrl);
            const code = url.searchParams.get('oobCode');
            const mode = url.searchParams.get('mode');
            if (code && mode === 'resetPassword') {
              setOobCode(code);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            // URL parsing failed, try alternative format (deep link without protocol)
            const match = initialUrl.match(/[?&]oobCode=([^&]+)/);
            const modeMatch = initialUrl.match(/[?&]mode=([^&]+)/);
            if (match && modeMatch && modeMatch[1] === 'resetPassword') {
              // Decode URL-encoded oobCode (safe even if not encoded)
              const decodedOobCode = decodeURIComponent(match[1]);
              setOobCode(decodedOobCode);
              setIsLoading(false);
              return;
            }
          }
        }

        setIsLoading(false);
      } catch (e: any) {
        logger.error('Error extracting oobCode', e);
        setIsLoading(false);
      }
    };

    extractOobCode();
  }, [params]);

  // Validate password in real-time
  useEffect(() => {
    if (password) {
      const result = validatePassword(password);
      setValidation(result);
    } else {
      setValidation({ valid: false, errors: [] });
    }
  }, [password]);

  // Redirect if no oobCode
  useEffect(() => {
    if (!isLoading && !oobCode) {
      Alert.alert(
        t('auth.invalidResetLink') || 'Invalid Reset Link',
        t('auth.resetLinkExpired') ||
        'This password reset link is invalid or has expired. Please request a new one.',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: () => router.replace('/(auth)/forgot-password'),
          },
        ]
      );
    }
  }, [isLoading, oobCode, router, t]);

  const handleSubmit = async () => {
    if (!oobCode) {
      setError('Invalid reset code. Please request a new link.');
      return;
    }

    if (!validation.valid) {
      setError('Please fix password validation errors');
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      logger.info('Resetting password via backend API');
      const response = await authApi.resetPassword(oobCode, password.trim());

      if (response.success) {
        Alert.alert(
          t('auth.passwordResetSuccess') || 'Password Reset Successful',
          t('auth.passwordResetMessage') ||
          'Your password has been reset successfully. You can now login with your new password.',
          [
            {
              text: t('auth.goToLogin') || 'Go to Login',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        setError(
          response.error ||
          'Unable to reset password. The link may have expired. Please request a new one.'
        );
      }
    } catch (e: any) {
      logger.error('Failed to reset password', e);
      setError(
        'Unable to reset password. The link may have expired. Please request a new one.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestNewLink = () => {
    router.replace('/(auth)/forgot-password');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {t('common.loading') || 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!oobCode) {
    return null; // Will redirect via useEffect
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Company Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.header}>
        <Text variant="headlineLarge" style={styles.title}>
          {t('auth.resetPassword') || 'Reset Password'}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {t('auth.enterNewPassword') ||
            'Enter your new password below.'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.requestLinkButton}
            onPress={handleRequestNewLink}
          >
            <Text style={styles.requestLinkText}>
              {t('auth.requestNewLink') || 'Request New Link'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.form}>
        {/* Password Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>
            {t('auth.passwordRequirements') || 'Password Requirements:'}
          </Text>
          <View style={styles.requirementsList}>
            <Text
              style={[
                styles.requirement,
                password.length >= 8 && styles.requirementMet,
              ]}
            >
              • {t('auth.min8Characters') || 'At least 8 characters'}
            </Text>
            <Text
              style={[
                styles.requirement,
                /[A-Z]/.test(password) && styles.requirementMet,
              ]}
            >
              • {t('auth.oneUppercase') || 'One uppercase letter'}
            </Text>
            <Text
              style={[
                styles.requirement,
                /[a-z]/.test(password) && styles.requirementMet,
              ]}
            >
              • {t('auth.oneLowercase') || 'One lowercase letter'}
            </Text>
            <Text
              style={[
                styles.requirement,
                /[0-9]/.test(password) && styles.requirementMet,
              ]}
            >
              • {t('auth.oneNumber') || 'One number'}
            </Text>
            <Text
              style={[
                styles.requirement,
                /[!@#$%^&*(),.?":{}|<>]/.test(password) &&
                styles.requirementMet,
              ]}
            >
              • {t('auth.oneSpecialChar') || 'One special character'}
            </Text>
          </View>
        </View>

        <TextInput
          label={t('auth.newPassword') || 'New Password'}
          mode="outlined"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          error={!!error && !validation.valid && password.length > 0}
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
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
              color={COLORS.textSecondary}
            />
          }
        />
        {validation.errors.length > 0 && password.length > 0 && (
          <View style={styles.validationErrors}>
            {validation.errors.map((err, index) => (
              <Text key={index} style={styles.validationError}>
                {err}
              </Text>
            ))}
          </View>
        )}

        <TextInput
          label={t('auth.confirmPassword') || 'Confirm Password'}
          mode="outlined"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          error={
            !!error &&
            password !== confirmPassword &&
            confirmPassword.length > 0
          }
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
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              color={COLORS.textSecondary}
            />
          }
        />
        {password !== confirmPassword && confirmPassword.length > 0 && (
          <Text style={styles.fieldError}>
            {t('auth.passwordsDontMatch') || "Passwords don't match"}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          style={[
            styles.button,
            (!validation.valid ||
              password !== confirmPassword ||
              isSubmitting) &&
            styles.buttonDisabled,
          ]}
          disabled={
            !validation.valid ||
            password !== confirmPassword ||
            isSubmitting
          }
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator color={COLORS.surface} size="small" />
              <Text style={styles.buttonLabel}>
                {t('auth.resetting') || 'Resetting...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonLabel}>
              {t('auth.resetPassword') || 'Reset Password'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.backButtonText}>
            {t('auth.backToLogin') || 'Back to Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
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
  requirementsContainer: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  requirementsList: {
    gap: 4,
  },
  requirement: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  requirementMet: {
    color: COLORS.success,
    fontWeight: '500',
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
    marginTop: -4,
  },
  validationErrors: {
    marginBottom: SPACING.sm,
  },
  validationError: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: 2,
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
    marginBottom: SPACING.sm,
  },
  requestLinkButton: {
    alignSelf: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  requestLinkText: {
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
  buttonDisabled: {
    opacity: 0.5,
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
  backButton: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});

