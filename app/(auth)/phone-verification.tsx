import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    TouchableOpacity,
} from 'react-native';
import {
    TextInput,
    Text,
    ActivityIndicator,
    Button,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod';
import { COLORS, SPACING } from '../../lib/constants';
import { toast } from '../../lib/services/toast';

const phoneVerificationSchema = z.object({
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

type PhoneVerificationFormData = z.infer<typeof phoneVerificationSchema>;

interface PhoneVerificationScreenProps {
    phoneNumber?: string;
    onVerificationComplete?: (phoneNumber: string) => void;
}

export default function PhoneVerificationScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{ phoneNumber?: string }>();

    const [isLoading, setIsLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [otpError, setOtpError] = useState<string | null>(null);

    const otpInputRef = useRef<TextInput>(null);

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<PhoneVerificationFormData>({
        resolver: zodResolver(phoneVerificationSchema),
        defaultValues: {
            phoneNumber: params.phoneNumber || '',
        },
    });

    const phoneNumber = watch('phoneNumber');

    // Countdown timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (countdown > 0) {
            interval = setInterval(() => {
                setCountdown(countdown - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [countdown]);

    const sendOTP = async (phone: string) => {
        setIsLoading(true);
        setOtpError(null);

        try {
            // Simulate API call to send OTP
            // In a real implementation, this would call your backend API
            await new Promise(resolve => setTimeout(resolve, 2000));

            setOtpSent(true);
            setCountdown(60); // 60 seconds countdown

            toast.success({
                title: t('auth.otpSent'),
                message: t('auth.otpSentMessage', { phone }),
            });

            // Focus on OTP input
            setTimeout(() => {
                otpInputRef.current?.focus();
            }, 500);

        } catch (error: any) {
            toast.error({
                title: t('common.error'),
                message: error.message || t('auth.failedToSendOTP'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOTP = async (data: PhoneVerificationFormData) => {
        setIsLoading(true);
        setOtpError(null);

        try {
            // Simulate API call to verify OTP
            // In a real implementation, this would call your backend API
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Simulate verification success
            const isValid = data.otp === '123456'; // For demo purposes

            if (isValid) {
                toast.success({
                    title: t('auth.phoneVerified'),
                    message: t('auth.phoneVerifiedMessage'),
                });

                // Navigate back or to next screen
                router.back();
            } else {
                setOtpError(t('auth.invalidOTP'));
            }

        } catch (error: any) {
            toast.error({
                title: t('common.error'),
                message: error.message || t('auth.failedToVerifyOTP'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resendOTP = async () => {
        if (countdown > 0) return;
        await sendOTP(phoneNumber);
    };

    const onSubmit = async (data: PhoneVerificationFormData) => {
        if (!otpSent) {
            await sendOTP(data.phoneNumber);
        } else {
            await verifyOTP(data);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <MaterialCommunityIcons
                        name="cellphone-message"
                        size={64}
                        color={COLORS.primary}
                    />
                    <Text variant="headlineMedium" style={styles.title}>
                        {otpSent ? t('auth.verifyPhone') : t('auth.enterPhone')}
                    </Text>
                    <Text variant="bodyLarge" style={styles.subtitle}>
                        {otpSent
                            ? t('auth.enterOTPCode', { phone: phoneNumber })
                            : t('auth.phoneVerificationDescription')
                        }
                    </Text>
                </View>

                <View style={styles.form}>
                    {!otpSent ? (
                        <Controller
                            control={control}
                            name="phoneNumber"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    label={t('auth.phoneNumber')}
                                    mode="outlined"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    keyboardType="phone-pad"
                                    error={!!errors.phoneNumber}
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
                    ) : (
                        <Controller
                            control={control}
                            name="otp"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    ref={otpInputRef}
                                    label={t('auth.enterOTP')}
                                    mode="outlined"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    keyboardType="number-pad"
                                    error={!!errors.otp || !!otpError}
                                    style={styles.input}
                                    outlineStyle={styles.inputOutline}
                                    textColor={COLORS.text}
                                    placeholderTextColor={COLORS.textSecondary}
                                    maxLength={6}
                                    theme={{
                                        colors: {
                                            onSurfaceVariant: COLORS.textSecondary,
                                            onSurface: COLORS.text,
                                        },
                                    }}
                                />
                            )}
                        />
                    )}

                    {(errors.phoneNumber || errors.otp || otpError) && (
                        <Text style={styles.fieldError}>
                            {errors.phoneNumber?.message || errors.otp?.message || otpError}
                        </Text>
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            if (isLoading) return;
                            handleSubmit(onSubmit)();
                        }}
                        style={styles.button}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <View style={styles.buttonLoading}>
                                <ActivityIndicator color={COLORS.surface} size="small" />
                                <Text style={styles.buttonLabel}>
                                    {otpSent ? t('auth.verifying') : t('auth.sendingOTP')}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.buttonLabel}>
                                {otpSent ? t('auth.verifyOTP') : t('auth.sendOTP')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {otpSent && (
                        <View style={styles.resendContainer}>
                            <Text style={styles.resendText}>
                                {t('auth.didntReceiveOTP')}
                            </Text>
                            <TouchableOpacity
                                onPress={resendOTP}
                                disabled={countdown > 0}
                                style={styles.resendButton}
                            >
                                <Text style={[
                                    styles.resendButtonText,
                                    countdown > 0 && styles.resendButtonDisabled
                                ]}>
                                    {countdown > 0
                                        ? t('auth.resendIn', { seconds: countdown })
                                        : t('auth.resendOTP')
                                    }
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>
                            {t('common.back')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        padding: SPACING.lg,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        fontWeight: 'bold',
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
        color: COLORS.primary,
        textAlign: 'center',
    },
    subtitle: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
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
    resendContainer: {
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    resendText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: SPACING.sm,
    },
    resendButton: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    resendButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    resendButtonDisabled: {
        color: COLORS.textSecondary,
    },
    backButton: {
        alignItems: 'center',
        marginTop: SPACING.xl,
    },
    backButtonText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
});

