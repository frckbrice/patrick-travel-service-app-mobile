import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { userApi, ChangePasswordRequest } from '../../lib/api/user.api';
import { KeyboardAvoidingScrollView } from '../../components/ui';
import { ModernHeader } from '../../components/ui/ModernHeader';
import { SPACING } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { toast } from '../../lib/services/toast';

interface PasswordFormData extends ChangePasswordRequest {
  confirmNewPassword: string;
}

export default function ChangePasswordScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword');
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: SPACING.lg,
    },
    header: {
      marginBottom: SPACING.xl,
      alignItems: 'center',
    },
    title: {
      fontWeight: 'bold',
      marginBottom: SPACING.sm,
      color: colors.primary,
    },
    subtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    form: {
      marginTop: SPACING.lg,
    },
    input: {
      marginBottom: SPACING.sm,
      backgroundColor: colors.surface,
    },
    inputOutline: {
      borderRadius: 12,
      borderWidth: 1.5,
    },
    fieldError: {
      color: colors.error,
      fontSize: 12,
      marginBottom: SPACING.sm,
      marginTop: -4,
    },
    requirements: {
      backgroundColor: colors.surface,
      padding: SPACING.md,
      borderRadius: 12,
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requirementsTitle: {
      fontWeight: 'bold',
      marginBottom: SPACING.xs,
      color: colors.text,
      fontSize: 13,
    },
    requirement: {
      color: colors.textSecondary,
      marginTop: SPACING.xs,
      fontSize: 12,
    },
    button: {
      marginTop: SPACING.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
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
      color: colors.surface,
    },
    buttonLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
  }), [colors]);

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmNewPassword) {
      toast.error({
        title: t('common.error'),
        message: t('errors.passwordsDontMatch'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await userApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.success) {
        toast.success({
          title: t('common.success'),
          message: t('profile.passwordChanged'),
        });
        // Navigate back after a short delay to let user see the toast
        setTimeout(() => router.back(), 1000);
      } else {
        throw new Error(response.error || t('errors.somethingWrong'));
      }
    } catch (error: any) {
      toast.error({
        title: t('common.error'),
        message: error.message || t('errors.somethingWrong'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ModernHeader
        variant="gradient"
        gradientColors={[colors.primary, colors.secondary, colors.accent]}
        title={t('profile.changePassword')}
        subtitle={t('profile.updatePassword')}
        showBackButton
      />
      <KeyboardAvoidingScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          ...styles.scrollContent,
          paddingBottom: insets.bottom + SPACING.lg,
        }}
      >

      <View style={styles.form}>
        <Controller
          control={control}
          name="currentPassword"
          rules={{ required: t('errors.required') }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('auth.currentPassword')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showCurrentPassword}
              error={!!errors.currentPassword}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
              theme={{
                colors: {
                  onSurfaceVariant: colors.textSecondary,
                  onSurface: colors.text,
                },
              }}
              right={
                <TextInput.Icon
                  icon={showCurrentPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  color={colors.textSecondary}
                />
              }
            />
          )}
        />
        {errors.currentPassword && (
          <Text style={styles.fieldError}>
            {errors.currentPassword.message}
          </Text>
        )}

        <Controller
          control={control}
          name="newPassword"
          rules={{
            required: t('errors.required'),
            minLength: {
              value: 8,
              message: t('errors.passwordMin', { count: 8 }),
            },
            pattern: {
              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: 'Password must contain uppercase, lowercase, and number',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('auth.newPassword')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showNewPassword}
              error={!!errors.newPassword}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
              theme={{
                colors: {
                  onSurfaceVariant: colors.textSecondary,
                  onSurface: colors.text,
                },
              }}
              right={
                <TextInput.Icon
                  icon={showNewPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  color={colors.textSecondary}
                />
              }
            />
          )}
        />
        {errors.newPassword && (
          <Text style={styles.fieldError}>{errors.newPassword.message}</Text>
        )}

        <Controller
          control={control}
          name="confirmNewPassword"
          rules={{
            required: t('errors.required'),
            validate: (value) =>
              value === newPassword || t('errors.passwordsDontMatch'),
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('auth.confirmPassword')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showConfirmPassword}
              error={!!errors.confirmNewPassword}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor={colors.text}
              placeholderTextColor={colors.textSecondary}
              theme={{
                colors: {
                  onSurfaceVariant: colors.textSecondary,
                  onSurface: colors.text,
                },
              }}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  color={colors.textSecondary}
                />
              }
            />
          )}
        />
        {errors.confirmNewPassword && (
          <Text style={styles.fieldError}>
            {errors.confirmNewPassword.message}
          </Text>
        )}

        <View style={styles.requirements}>
          <Text variant="bodySmall" style={styles.requirementsTitle}>
            {t('auth.passwordRequirements')}
          </Text>
          <Text variant="bodySmall" style={styles.requirement}>
            • {t('auth.passwordMin8')}
          </Text>
          <Text variant="bodySmall" style={styles.requirement}>
            • {t('auth.passwordUppercase')}
          </Text>
          <Text variant="bodySmall" style={styles.requirement}>
            • {t('auth.passwordLowercase')}
          </Text>
          <Text variant="bodySmall" style={styles.requirement}>
            • {t('auth.passwordNumber')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (isSubmitting) return;
            handleSubmit(onSubmit)();
          }}
          style={styles.button}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator color={colors.surface} size="small" />
              <Text style={styles.buttonLabel}>
                {t('profile.changePassword')}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonLabel}>
              {t('profile.changePassword')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingScrollView>
    </View>
  );
}
