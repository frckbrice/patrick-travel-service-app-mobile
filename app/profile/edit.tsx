import React, { useState } from 'react';
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
import { useRequireAuth, useAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { userApi, UpdateProfileRequest } from '../../lib/api/user.api';
import { KeyboardAvoidingScrollView } from '../../components/ui';
import { COLORS, SPACING } from '../../lib/constants';
import { logger } from '../../lib/utils/logger';
import { toast } from '../../lib/services/toast';

export default function EditProfileScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { updateUserOptimistic, revertUserUpdate } = useAuthStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileRequest>({
    defaultValues: {
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone || '',
    },
  });

  const insets = useSafeAreaInsets();

  const onSubmit = async (data: UpdateProfileRequest) => {
    // 1. PERFORMANCE: Update UI immediately (< 5ms)
    updateUserOptimistic(data);

    // 2. Navigate back immediately - no wait!
    router.back();

    // 3. Show instant feedback with toast (non-blocking)
    toast.success({
      title: t('profile.profileUpdated'),
      message: t('profile.changesWillSync'),
    });

    try {
      // 4. Send to server in background
      const response = await userApi.updateProfile(data);

      if (response.success && response.data) {
        // 5. Confirm with real data from server
        const userData = (response.data as any).user || response.data;
        await updateUser(userData);

        logger.info('Profile updated successfully', { userId: user?.id });
      } else {
        throw new Error(response.error || t('errors.somethingWrong'));
      }
    } catch (error: any) {
      // 6. PERFORMANCE: Rollback on failure (< 5ms)
      revertUserUpdate();

      // 7. Show error with toast
      toast.error({
        title: t('common.error'),
        message: error.message || t('errors.somethingWrong'),
      });

      logger.error('Profile update failed', error);
    }
  };

  return (
    <KeyboardAvoidingScrollView
      style={styles.container}
      contentContainerStyle={{
        ...styles.scrollContent,
        paddingBottom: insets.bottom + SPACING.lg,
      }}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('profile.editProfile')}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {t('profile.updateInfo')}
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="firstName"
          rules={{
            required: t('errors.required'),
            minLength: {
              value: 2,
              message: t('errors.minLength', { min: 2 }),
            },
          }}
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
          rules={{
            required: t('errors.required'),
            minLength: {
              value: 2,
              message: t('errors.minLength', { min: 2 }),
            },
          }}
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
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t('auth.phoneOptional')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
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

        <TextInput
          label={t('auth.email')}
          mode="outlined"
          value={user?.email}
          disabled
          style={styles.input}
          outlineStyle={styles.inputOutline}
          textColor={COLORS.textSecondary}
          right={<TextInput.Icon icon="lock" color={COLORS.textSecondary} />}
        />
        <Text variant="bodySmall" style={styles.note}>
          {t('profile.emailCannotChange')}
        </Text>

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
              <ActivityIndicator color={COLORS.surface} size="small" />
              <Text style={styles.buttonLabel}>{t('common.saveChanges')}</Text>
            </View>
          ) : (
            <Text style={styles.buttonLabel}>{t('common.saveChanges')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingScrollView>
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
  note: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: SPACING.lg,
    marginTop: -4,
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
});
