import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Text, Checkbox } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth, useGuestOnly } from '../hooks/useAuth';
import { registerSchema, RegisterFormData } from '../schemas/authSchemas';
import { COLORS, SPACING } from '../../../lib/constants';

export default function RegisterScreen() {
  useGuestOnly();
  const { t } = useTranslation();
  const { register, isLoading, error } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (!acceptTerms || !acceptPrivacy) {
      Alert.alert(
        'Consent Required',
        'Please accept both the Terms & Conditions and Privacy Policy to continue'
      );
      return;
    }

    // Add consent timestamp to registration data
    const registrationData = {
      ...data,
      consentedAt: new Date().toISOString(),
      acceptedTerms: true,
      acceptedPrivacy: true,
    };

    const success = await register(registrationData as any);

    if (success) {
      router.push('/(auth)/verify-email');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>
            {t('auth.createAccount')}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t('auth.signUpToGetStarted')}
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
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.firstName')}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.firstName}
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
          {errors.firstName && (
            <Text style={styles.fieldError}>{errors.firstName.message}</Text>
          )}

          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.lastName')}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.lastName}
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
          {errors.lastName && (
            <Text style={styles.fieldError}>{errors.lastName.message}</Text>
          )}

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
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.phoneOptional')}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                error={!!errors.phone}
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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.confirmPassword')}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                error={!!errors.confirmPassword}
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
            )}
          />
          {errors.confirmPassword && (
            <Text style={styles.fieldError}>
              {errors.confirmPassword.message}
            </Text>
          )}

          {/* Terms & Conditions Consent */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
            activeOpacity={0.7}
          >
            <Checkbox
              status={acceptTerms ? 'checked' : 'unchecked'}
              onPress={() => setAcceptTerms(!acceptTerms)}
              color={COLORS.primary}
              uncheckedColor={COLORS.textSecondary}
            />
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Link href="/(auth)/terms" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Terms & Conditions</Text>
                  </TouchableOpacity>
                </Link>
              </Text>
            </View>
          </TouchableOpacity>

          {/* Privacy Policy Consent */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAcceptPrivacy(!acceptPrivacy)}
            activeOpacity={0.7}
          >
            <Checkbox
              status={acceptPrivacy ? 'checked' : 'unchecked'}
              onPress={() => setAcceptPrivacy(!acceptPrivacy)}
              color={COLORS.primary}
              uncheckedColor={COLORS.textSecondary}
            />
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Link href="/(auth)/privacy-policy" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Privacy Policy</Text>
                  </TouchableOpacity>
                </Link>
              </Text>
            </View>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {t('auth.signUp')}
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t('auth.alreadyHaveAccount')}{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>{t('auth.signIn')}</Text>
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: SPACING.sm,
    paddingRight: SPACING.md,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginTop: 2,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    marginTop: SPACING.md,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
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
