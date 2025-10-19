import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, SegmentedButtons, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { casesApi } from '../../lib/api/cases.api';
import { ServiceType } from '../../lib/types';
import { COLORS, SPACING, SERVICE_TYPE_LABELS } from '../../lib/constants';

interface CaseFormData {
    serviceType: ServiceType;
    details: string;
    destination?: string;
    travelDate?: string;
}

export default function NewCaseScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<CaseFormData>({
        defaultValues: {
            serviceType: ServiceType.TOURIST_VISA,
        },
    });

    const serviceType = watch('serviceType');

    const onSubmit = async (data: CaseFormData) => {
        setIsSubmitting(true);

        try {
            const response = await casesApi.createCase({
                serviceType: data.serviceType,
                formData: {
                    details: data.details,
                    destination: data.destination,
                    travelDate: data.travelDate,
                },
            });

            if (response.success) {
                Alert.alert(t('common.success'), t('cases.caseSubmitted'), [
                    {
                        text: t('common.ok'),
                        onPress: () => router.replace('/(tabs)/cases'),
                    },
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
                <Text variant="headlineSmall" style={styles.header}>
                    {t('dashboard.submitNewCase')}
                </Text>
                <Text variant="bodyMedium" style={styles.subheader}>
                    {t('cases.selectServiceType')}
                </Text>

                <Text variant="titleMedium" style={styles.label}>
                    {t('cases.serviceType')}
                </Text>
                <Controller
                    control={control}
                    name="serviceType"
                    render={({ field: { onChange, value } }) => (
                        <View style={styles.segmentContainer}>
                            <SegmentedButtons
                                value={value}
                                onValueChange={onChange}
                                buttons={[
                                    { value: ServiceType.TOURIST_VISA, label: 'Tourist' },
                                    { value: ServiceType.WORK_PERMIT, label: 'Work' },
                                    { value: ServiceType.STUDENT_VISA, label: 'Student' },
                                ]}
                            />
                            <SegmentedButtons
                                value={value}
                                onValueChange={onChange}
                                buttons={[
                                    { value: ServiceType.BUSINESS_VISA, label: 'Business' },
                                    { value: ServiceType.FAMILY_REUNIFICATION, label: 'Family' },
                                    { value: ServiceType.PERMANENT_RESIDENCY, label: 'Residency' },
                                ]}
                                style={styles.segmentButtons}
                            />
                        </View>
                    )}
                />

                <Controller
                    control={control}
                    name="destination"
                    rules={{ required: t('errors.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('cases.destination')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.destination}
                            style={styles.input}
                        />
                    )}
                />
                {errors.destination && (
                    <Text style={styles.errorText}>{errors.destination.message}</Text>
                )}

                <Controller
                    control={control}
                    name="travelDate"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('cases.expectedTravelDate')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="YYYY-MM-DD"
                            style={styles.input}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="details"
                    rules={{ required: t('errors.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label={t('cases.additionalDetails')}
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            multiline
                            numberOfLines={6}
                            error={!!errors.details}
                            style={styles.input}
                            placeholder={t('cases.provideDetails')}
                        />
                    )}
                />
                {errors.details && (
                    <Text style={styles.errorText}>{errors.details.message}</Text>
                )}

                <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.submitButton}
                >
                    {t('cases.submitCase')}
                </Button>

                <Text variant="bodySmall" style={styles.note}>
                    {t('cases.noteAfterSubmit')}
                </Text>
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
    header: {
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    subheader: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.xl,
    },
    label: {
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
        color: COLORS.text,
    },
    segmentContainer: {
        marginBottom: SPACING.lg,
    },
    segmentButtons: {
        marginTop: SPACING.sm,
    },
    input: {
        marginBottom: SPACING.sm,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginBottom: SPACING.sm,
    },
    submitButton: {
        marginTop: SPACING.lg,
        marginBottom: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    note: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

