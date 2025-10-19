import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { userApi, ChangePasswordRequest } from '../../lib/api/user.api';
import { COLORS, SPACING } from '../../lib/constants';

interface PasswordFormData extends ChangePasswordRequest {
    confirmNewPassword: string;
}

export default function ChangePasswordScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
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

    const onSubmit = async (data: PasswordFormData) => {
        if (data.newPassword !== data.confirmNewPassword) {
            Alert.alert(t('common.error'), t('errors.passwordsDontMatch'));
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await userApi.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });

            if (response.success) {
                Alert.alert(t('common.success'), t('profile.passwordChanged'), [
                    { text: t('common.ok'), onPress: () => router.back() },
                ]);
            } else {
                throw new Error(response.error || t('errors.somethingWrong'));
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('errors.somethingWrong'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="bodyLarge" style={styles.description}>
                    {t('profile.updatePassword')}
                </Text>

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
                            right={
                                <TextInput.Icon
                                    icon={showCurrentPassword ? 'eye-off' : 'eye'}
                                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                />
                            }
                        />
                    )}
                />
                {errors.currentPassword && (
                    <Text style={styles.errorText}>{errors.currentPassword.message}</Text>
                )}

                <Controller
                    control={control}
                    name="newPassword"
                    rules={{
                        required: t('errors.required'),
                        minLength: { value: 8, message: t('errors.passwordMin', { count: 8 }) },
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
                            right={
                                <TextInput.Icon
                                    icon={showNewPassword ? 'eye-off' : 'eye'}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                />
                            }
                        />
                    )}
                />
                {errors.newPassword && (
                    <Text style={styles.errorText}>{errors.newPassword.message}</Text>
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
                            right={
                                <TextInput.Icon
                                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                />
                            }
                        />
                    )}
                />
                {errors.confirmNewPassword && (
                    <Text style={styles.errorText}>{errors.confirmNewPassword.message}</Text>
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

                <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.button}
                >
                    {t('profile.changePassword')}
                </Button>
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
        padding: SPACING.lg,
    },
    description: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
    },
    input: {
        marginBottom: SPACING.sm,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginBottom: SPACING.sm,
    },
    requirements: {
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: 8,
        marginBottom: SPACING.lg,
    },
    requirementsTitle: {
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
        color: COLORS.text,
    },
    requirement: {
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    button: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.sm,
    },
});

