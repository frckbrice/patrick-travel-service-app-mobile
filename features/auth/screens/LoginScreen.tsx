import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Text, Divider } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth, useGuestOnly } from '../hooks/useAuth';
import { loginSchema, LoginFormData } from '../schemas/authSchemas';
import { COLORS, SPACING } from '../../../lib/constants';
import { secureStorage } from '../../../lib/storage/secureStorage';
import {
  useGoogleAuth,
  handleGoogleAuthResponse,
} from '../../../lib/auth/googleAuth';
import { useAuthStore } from '../../../stores/auth/authStore';
import { logger } from '../../../lib/utils/logger';

export default function LoginScreen() {
  useGuestOnly();
  const { t } = useTranslation();
  const { login, isLoading, error } = useAuth();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const loginWithBiometric = useAuthStore((state) => state.loginWithBiometric);
  const biometricEnabled = useAuthStore((state) => state.biometricEnabled);
  const biometricAvailable = useAuthStore((state) => state.biometricAvailable);
  const checkBiometricStatus = useAuthStore(
    (state) => state.checkBiometricStatus
  );
  const enableBiometric = useAuthStore((state) => state.enableBiometric);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  // Google OAuth
  const { request, response, promptAsync } = useGoogleAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check biometric status on mount
  useEffect(() => {
    checkBiometricStatus();
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response) {
      handleGoogleSignIn();
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    if (!response) return;

    setIsGoogleLoading(true);
    try {
      const result = await handleGoogleAuthResponse(response);

      if (result.success && result.idToken) {
        const success = await loginWithGoogle(
          result.idToken,
          result.accessToken
        );

        if (success) {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      logger.error('Google sign-in error', error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await promptAsync();
    } catch (error) {
      logger.error('Error initiating Google sign-in', error);
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    const success = await login(data);

    if (success) {
      // Offer to enable biometric if available and not already enabled
      if (biometricAvailable && !biometricEnabled) {
        setTimeout(() => {
          promptEnableBiometric(data.email, data.password);
        }, 500);
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const promptEnableBiometric = (email: string, password: string) => {
    const biometricType =
      Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint';

    logger.info('Prompting biometric enable', { email });

    // Show native alert using React Native's Alert
    const { Alert } = require('react-native');
    Alert.alert(
      t('settings.enableBiometric'),
      `Enable ${biometricType} for faster login?`,
      [
        {
          text: t('common.no'),
          style: 'cancel',
          onPress: () => router.replace('/(tabs)'),
        },
        {
          text: t('common.yes'),
          onPress: async () => {
            const success = await enableBiometric(email, password);
            if (success) {
              Alert.alert(t('common.success'), t('settings.biometricEnabled'));
            }
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    const success = await loginWithBiometric();

    if (success) {
      router.replace('/(tabs)');
    }
    setIsBiometricLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>
            {t('auth.welcomeBack')}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t('auth.signInToContinue')}
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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.password')}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                error={!!errors.password}
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
            )}
          />
          {errors.password && (
            <Text style={styles.fieldError}>{errors.password.message}</Text>
          )}

          <View style={styles.forgotPasswordContainer}>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (isLoading || isGoogleLoading || isBiometricLoading) return;
              handleSubmit(onSubmit)();
            }}
            style={styles.button}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.buttonLoading}>
                <ActivityIndicator color={COLORS.surface} size="small" />
                <Text style={styles.buttonLabel}>{t('auth.signIn')}</Text>
              </View>
            ) : (
              <Text style={styles.buttonLabel}>{t('auth.signIn')}</Text>
            )}
          </TouchableOpacity>

          {/* Optional Biometric Login Button - Only shows if user enabled it */}
          {biometricAvailable && biometricEnabled && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={isLoading || isGoogleLoading || isBiometricLoading}
            >
              <MaterialCommunityIcons
                name={
                  Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'
                }
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.biometricButtonText}>
                {isBiometricLoading
                  ? 'Authenticating...'
                  : Platform.OS === 'ios'
                    ? 'Login with Face ID / Touch ID'
                    : 'Login with Fingerprint'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <Divider style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={onGoogleSignIn}
            disabled={!request || isLoading || isGoogleLoading}
          >
            <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.dontHaveAccount')} </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>{t('auth.signUp')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
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
    marginTop: -4,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginVertical: SPACING.md,
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: SPACING.md,
  },
  biometricButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  divider: {
    flex: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
