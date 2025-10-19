import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { emailService, ContactFormData } from '../../lib/services/email';
import { COLORS, SPACING } from '../../lib/constants';

export default function ContactSupportScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ContactFormData>();

    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true);

        const success = await emailService.sendContactForm(data);

        if (success) {
            Alert.alert(t('common.success'), t('help.messageSent'), [
                {
                    text: t('common.ok'),
                    onPress: () => router.back(),
                },
            ]);
        } else {
            Alert.alert(t('common.error'), t('errors.somethingWrong'));
        }

        setIsSubmitting(false);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="bodyLarge" style={styles.description}>
                    {t('help.contactDesc')}
                </Text>

                <Controller
                    control={control}
                    name="name"
                    rules={{ required: t('errors.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('help.name')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.name}
                            style={styles.input}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="email"
                    rules={{
                        required: t('errors.required'),
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: t('errors.invalidEmail'),
                        },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('auth.email')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="email-address"
                            error={!!errors.email}
                            style={styles.input}
                        />
                    )}
                />

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

                <Controller
                    control={control}
                    name="subject"
                    rules={{ required: t('errors.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('help.subject')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.subject}
                            style={styles.input}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="message"
                    rules={{ required: t('errors.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('help.message')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            multiline
                            numberOfLines={6}
                            error={!!errors.message}
                            style={styles.input}
                        />
                    )}
                />

                <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.button}
                >
                    {t('help.sendMessage')}
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
        marginBottom: SPACING.lg,
        color: COLORS.textSecondary,
    },
    input: {
        marginBottom: SPACING.md,
    },
    button: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.sm,
    },
});

