import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { forgotPasswordSchema, ForgotPasswordFormData } from '../schemas/authSchemas';
import { authApi } from '../../../lib/api/auth.api';
import { COLORS, SPACING } from '../../../lib/constants';

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
        setIsLoading(true);
        setError(null);

        const response = await authApi.forgotPassword(data.email);

        if (response.success) {
            setSuccess(true);
        } else {
            setError(response.error || 'Failed to send reset email');
        }

        setIsLoading(false);
    };

    if (success) {
        return (
            <View style={styles.container}>
                <View style={styles.successContainer}>
                    <Text variant="headlineMedium" style={styles.successTitle}>
                        {t('auth.checkEmail')}
                    </Text>
                    <Text variant="bodyLarge" style={styles.successText}>
                        {t('auth.resetEmailSent')}
                    </Text>
                    <Link href="/(auth)/login" asChild>
                        <Button mode="contained" style={styles.button}>
                            {t('auth.backToLogin')}
                        </Button>
                    </Link>
                </View>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineLarge" style={styles.title}>
                    {t('auth.forgotPassword')}
                </Text>
                <Text variant="bodyLarge" style={styles.subtitle}>
                    {t('auth.resetEmailSent')}
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
                        />
                    )}
                />
                {errors.email && (
                    <Text style={styles.fieldError}>{errors.email.message}</Text>
                )}

                <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.button}
                >
                    {t('auth.resetPassword')}
                </Button>

                <View style={styles.footer}>
                    <Text>{t('auth.alreadyHaveAccount')} </Text>
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
    },
    fieldError: {
        color: COLORS.error,
        fontSize: 12,
        marginBottom: SPACING.sm,
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        padding: SPACING.md,
        borderRadius: 8,
        marginBottom: SPACING.md,
    },
    errorText: {
        color: COLORS.error,
        textAlign: 'center',
    },
    link: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    button: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.lg,
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

