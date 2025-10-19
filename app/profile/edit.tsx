import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRequireAuth, useAuth } from '../../features/auth/hooks/useAuth';
import { userApi, UpdateProfileRequest } from '../../lib/api/user.api';
import { COLORS, SPACING } from '../../lib/constants';

export default function EditProfileScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
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

    const onSubmit = async (data: UpdateProfileRequest) => {
        setIsSubmitting(true);

        try {
            const response = await userApi.updateProfile(data);

            if (response.success && response.data) {
                updateUser(response.data);
                Alert.alert(t('common.success'), t('profile.profileUpdated'), [
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
                    {t('profile.updateInfo')}
                </Text>

                <Controller
                    control={control}
                    name="firstName"
                    rules={{ required: t('errors.required'), minLength: 2 }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('auth.firstName')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.firstName}
                            style={styles.input}
                        />
                    )}
                />
                {errors.firstName && (
                    <Text style={styles.errorText}>{errors.firstName.message}</Text>
                )}

                <Controller
                    control={control}
                    name="lastName"
                    rules={{ required: t('errors.required'), minLength: 2 }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('auth.lastName')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.lastName}
                            style={styles.input}
                        />
                    )}
                />
                {errors.lastName && (
                    <Text style={styles.errorText}>{errors.lastName.message}</Text>
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
                        />
                    )}
                />

                <TextInput
                    label={t('auth.email')}
                    mode="outlined"
                    value={user?.email}
                    disabled
                    style={styles.input}
                    right={<TextInput.Icon icon="lock" />}
                />
                <Text variant="bodySmall" style={styles.note}>
                    {t('profile.emailCannotChange')}
                </Text>

                <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.button}
                >
                    {t('common.saveChanges')}
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
    note: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
    },
    button: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.sm,
    },
});

