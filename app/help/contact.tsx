import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    Platform,
} from 'react-native';
import { TextInput, Text, Chip } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRequireAuth, useAuth } from '../../features/auth/hooks/useAuth';
import { emailService, ContactFormData } from '../../lib/services/email';
import { KeyboardAvoidingScrollView } from '../../components/ui';
import { ThemeAwareHeader } from '../../components/ui/ThemeAwareHeader';
import { SPACING, BUSINESS_INFO, formatFullContact } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { toast } from '../../lib/services/toast';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';

const MAX_MESSAGE_LENGTH = 1000;

const getQuickTopics = (t: any) => [
    { label: t('help.topics.caseStatus'), icon: 'briefcase-clock' },
    { label: t('help.topics.documentIssue'), icon: 'file-alert' },
    { label: t('help.topics.payment'), icon: 'credit-card' },
    { label: t('help.topics.technicalSupport'), icon: 'laptop' },
    { label: t('help.topics.other'), icon: 'help-circle' },
];

export default function ContactSupportScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const colors = useThemeColors();
    const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [messageLength, setMessageLength] = useState(0);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
      setValue,
      watch,
  } = useForm<ContactFormData>({
      defaultValues: {
          name: user ? `${user.firstName} ${user.lastName}` : '',
          email: user?.email || '',
          phone: user?.phone || '',
          subject: '',
          message: '',
      },
  });

  const insets = useSafeAreaInsets();
    const scrollProps = useTabBarScroll();
    const messageValue = watch('message');

    useEffect(() => {
        setMessageLength(messageValue?.length || 0);
    }, [messageValue]);

    const handleTopicSelect = (topic: string) => {
        setSelectedTopic(topic);
        setValue('subject', topic);
    };

  const onSubmit = async (data: ContactFormData) => {
      // Dismiss keyboard
      Keyboard.dismiss();

    setIsSubmitting(true);

      try {
          console.log('Submitting contact form with data:', JSON.stringify(data, null, 2));
          const success = await emailService.sendContactForm(data);

          if (success) {
              setShowSuccess(true);

              // Show success toast
              toast.success({
                  title: t('common.success'),
                  message: t('help.messageSuccessfullySent'),
              });

              // Navigate back after a delay
              setTimeout(() => router.back(), 1500);
          } else {
              toast.error({
                  title: t('common.error'),
                  message: t('help.sendMessageFailed'),
              });
          }
      } catch (error) {
          toast.error({
              title: t('common.error'),
              message: t('help.sendMessageError'),
          });
      } finally {
          setIsSubmitting(false);
      }
  };

    if (showSuccess) {
        return (
            <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
                <Animated.View
                    entering={FadeIn.duration(600)}
                    style={styles.successContent}
                >
                    <View style={styles.successIconContainer}>
                        <MaterialCommunityIcons
                            name="check-circle"
                            size={80}
                            color={colors.success}
                        />
                    </View>
                    <Text style={[styles.successTitle, { color: colors.success }]}>{t('help.messageSent')}</Text>
                    <Text style={[styles.successText, { color: colors.textSecondary }]}>
                        {t('help.messageSuccessDescription')}
                    </Text>
                    <TouchableOpacity
                        style={[styles.successButton, { backgroundColor: '#0066CC' }]}
                        onPress={() => router.back()}
                    >
                        <Text style={[styles.successButtonText, { color: '#FFFFFF' }]}>{t('common.close')}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Gradient Header */}
      <ThemeAwareHeader
        variant="gradient"
              gradientColors={[colors.primary, colors.secondary, colors.accent]}
        title="Contact Support"
        subtitle="We're here to help"
        showBackButton
      />
      
      <KeyboardAvoidingScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          ...styles.scrollContent,
          paddingBottom: insets.bottom + SPACING.lg + 100,
        }}
              {...scrollProps}
      >

          {/* Quick Topic Selection */}
          <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={styles.quickTopicsContainer}
          >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('help.quickTopics')}</Text>
              <View style={styles.topicsGrid}>
                  {getQuickTopics(t).map((topic, index) => (
                      <Chip
                          key={index}
                          selected={selectedTopic === topic.label}
                          onPress={() => handleTopicSelect(topic.label)}
                          icon={topic.icon}
                          style={[
                              styles.topicChip,
                              { borderColor: colors.border, backgroundColor: colors.surface },
                              selectedTopic === topic.label && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                          ]}
                          textStyle={[
                              styles.topicChipText,
                              { color: colors.text },
                              selectedTopic === topic.label && { color: colors.primary },
                          ]}
                          mode="outlined"
                      >
                          {topic.label}
                      </Chip>
                  ))}
              </View>
          </Animated.View>

          <View style={styles.form}>
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                  <Controller
                      control={control}
                      name="name"
                      rules={{ required: t('errors.required') }}
                      render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                              label={t('help.yourName')}
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.name}
                              style={styles.input}
                              outlineStyle={styles.inputOutline}
                              textColor={colors.text}
                              placeholderTextColor={colors.textSecondary}
                              left={<TextInput.Icon icon="account" color={colors.primary} />}
                              theme={{
                                  colors: {
                                      onSurfaceVariant: colors.textSecondary,
                                      onSurface: colors.text,
                                  },
                              }}
                              returnKeyType="next"
                          />
                      )}
                  />
                  {errors.name && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>{errors.name.message}</Text>
                  )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(250).duration(400)}>
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
                              autoCapitalize="none"
                              error={!!errors.email}
                              style={styles.input}
                              outlineStyle={styles.inputOutline}
                              textColor={colors.text}
                              placeholderTextColor={colors.textSecondary}
                              left={<TextInput.Icon icon="email" color={colors.primary} />}
                              theme={{
                                  colors: {
                                      onSurfaceVariant: colors.textSecondary,
                                      onSurface: colors.text,
                                  },
                              }}
                              returnKeyType="next"
                          />
                      )}
                  />
                  {errors.email && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>{errors.email.message}</Text>
                  )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
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
                              textColor={colors.text}
                              placeholderTextColor={colors.textSecondary}
                              left={<TextInput.Icon icon="phone" color={colors.primary} />}
                              theme={{
                                  colors: {
                                      onSurfaceVariant: colors.textSecondary,
                                      onSurface: colors.text,
                                  },
                              }}
                              returnKeyType="next"
                          />
                      )}
                  />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(350).duration(400)}>
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
                              outlineStyle={styles.inputOutline}
                              textColor={colors.text}
                              placeholderTextColor={colors.textSecondary}
                              left={<TextInput.Icon icon="text-box" color={colors.primary} />}
                              theme={{
                                  colors: {
                                      onSurfaceVariant: colors.textSecondary,
                                      onSurface: colors.text,
                                  },
                              }}
                              returnKeyType="next"
                          />
                      )}
                  />
                  {errors.subject && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>{errors.subject.message}</Text>
                  )}
              </Animated.View>

              {/* Enhanced Message Input with Character Counter */}
              <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('help.yourMessage')}</Text>
                  <Controller
                      control={control}
                      name="message"
                      rules={{
                          required: t('errors.required'),
                          minLength: {
                              value: 10,
                              message: t('help.messageMinLength', {
                                  min: 10,
                              }),
                          },
                          maxLength: {
                              value: MAX_MESSAGE_LENGTH,
                              message: t('help.messageMaxLength', {
                                  max: MAX_MESSAGE_LENGTH,
                              }),
                          },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                          <View>
                              <TextInput
                                  label=""
                                  mode="outlined"
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  multiline
                                  numberOfLines={Platform.OS === 'ios' ? undefined : 8}
                                  maxLength={MAX_MESSAGE_LENGTH}
                                  error={!!errors.message}
                                  style={[styles.input, styles.messageInput]}
                                  outlineStyle={styles.inputOutline}
                                  textColor={colors.text}
                                  placeholderTextColor={colors.textSecondary}
                                  placeholder={t('help.messagePlaceholder')}
                                  theme={{
                                      colors: {
                                          onSurfaceVariant: colors.textSecondary,
                                          onSurface: colors.text,
                                      },
                                  }}
                                  textAlignVertical="top"
                                  returnKeyType="default"
                                  blurOnSubmit={false}
                              />
                              <View style={styles.messageMetaContainer}>
                                  <View style={styles.messageHelper}>
                                      <MaterialCommunityIcons
                                          name="information"
                                          size={14}
                                          color={colors.textSecondary}
                                      />
                                      <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                          {t('help.messageHelper')}
                                      </Text>
                                  </View>
                                  <Text
                                      style={[
                                          styles.characterCount,
                                          { color: colors.textSecondary },
                                          messageLength > MAX_MESSAGE_LENGTH * 0.9 &&
                                          { color: colors.warning, fontWeight: '600' },
                                      ]}
                                  >
                                      {messageLength}/{MAX_MESSAGE_LENGTH}
                                  </Text>
                              </View>
                          </View>
                      )}
                  />
                  {errors.message && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>{errors.message.message}</Text>
                  )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(450).duration(400)}>
                  <TouchableOpacity
                      onPress={() => {
                          if (isSubmitting) return;
                          handleSubmit(onSubmit)();
                      }}
                          style={[styles.button, { backgroundColor: '#0066CC' }, isSubmitting && styles.buttonDisabled]}
                      activeOpacity={0.8}
                      disabled={isSubmitting}
                  >
                      {isSubmitting ? (
                          <View style={styles.buttonLoading}>
                                  <ActivityIndicator color="#FFFFFF" size="small" />
                                  <Text style={[styles.buttonLabel, { color: '#FFFFFF' }]}>{t('help.sending')}</Text>
                          </View>
                      ) : (
                          <View style={styles.buttonContent}>
                              <MaterialCommunityIcons
                                  name="send"
                                  size={20}
                                          color="#FFFFFF"
                              />
                                      <Text style={[styles.buttonLabel, { color: '#FFFFFF' }]}>{t('help.sendMessage')}</Text>
                          </View>
                      )}
                  </TouchableOpacity>
              </Animated.View>

              {/* Response Time Info */}
              <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <MaterialCommunityIcons
                          name="clock-outline"
                          size={20}
                              color={colors.primary}
                      />
                          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                          {t('help.averageResponseTime')}{' '}
                              <Text style={[styles.infoBold, { color: colors.primary }]}>{t('help.responseTime')}</Text>
                      </Text>
                  </View>
              </Animated.View>

              {/* Contact Information */}
              <Animated.View entering={FadeInDown.delay(550).duration(400)}>
                      <View style={[styles.contactInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.contactInfoHeader}>
                          <MaterialCommunityIcons
                              name="information"
                              size={20}
                                  color={colors.primary}
                          />
                              <Text style={[styles.contactInfoTitle, { color: colors.text }]}>
                              {t('help.contactInfo')}
                          </Text>
                      </View>

                      <View style={styles.contactInfoContent}>
                          <View style={styles.contactInfoItem}>
                              <MaterialCommunityIcons
                                  name="email"
                                  size={16}
                                      color={colors.textSecondary}
                              />
                                  <Text style={[styles.contactInfoText, { color: colors.textSecondary }]}>
                                  {formatFullContact().email}
                              </Text>
                          </View>

                          <View style={styles.contactInfoItem}>
                              <MaterialCommunityIcons
                                  name="phone"
                                  size={16}
                                      color={colors.textSecondary}
                              />
                                  <Text style={[styles.contactInfoText, { color: colors.textSecondary }]}>
                                  {formatFullContact().phone}
                              </Text>
                          </View>

                          <View style={styles.contactInfoItem}>
                              <MaterialCommunityIcons
                                  name="map-marker"
                                  size={16}
                                      color={colors.textSecondary}
                              />
                                  <Text style={[styles.contactInfoText, { color: colors.textSecondary }]}>
                                  {formatFullContact().address}
                              </Text>
                          </View>

                          <View style={styles.contactInfoItem}>
                              <MaterialCommunityIcons
                                  name="clock-outline"
                                  size={16}
                                      color={colors.textSecondary}
                              />
                                  <Text style={[styles.contactInfoText, { color: colors.textSecondary }]}>
                                  {formatFullContact().supportHours}
                              </Text>
                          </View>
                      </View>
                  </View>
              </Animated.View>
      </View>
      </KeyboardAvoidingScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

    buttonContainer: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    closeButton: {
        marginTop: SPACING.md,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Will be set dynamically
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
        paddingVertical: SPACING.lg,
    },
    headerIcon: {
        marginBottom: SPACING.md,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        paddingHorizontal: SPACING.md,
        lineHeight: 22,
    },
    quickTopicsContainer: {
        marginBottom: SPACING.xl,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: SPACING.md,
    },
    topicsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    topicChip: {
        marginRight: 0,
    },
    topicChipText: {
        fontSize: 13,
    },
    form: {
        marginTop: SPACING.md,
  },
  input: {
        marginBottom: SPACING.sm,
    },
    inputOutline: {
        borderRadius: 12,
        borderWidth: 1.5,
    },
    messageInput: {
        minHeight: 150,
        maxHeight: 250,
        paddingTop: SPACING.md,
    },
    messageMetaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    messageHelper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    helperText: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    characterCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    fieldError: {
        fontSize: 12,
        marginBottom: SPACING.sm,
        marginTop: -4,
    },
    button: {
        marginTop: SPACING.xl,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },

    buttonLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: 12,
        marginTop: SPACING.lg,
        gap: SPACING.sm,
        borderWidth: 1,
    },
    infoText: {
        fontSize: 13,
        flex: 1,
    },
    infoBold: {
        fontWeight: '600',
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    successContent: {
        alignItems: 'center',
        maxWidth: 400,
    },
    successIconContainer: {
        marginBottom: SPACING.xl,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    successText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 24,
    },
    successButton: {
        paddingHorizontal: SPACING.xl * 2,
        paddingVertical: SPACING.md,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
  },
    successButtonText: {
        fontSize: 16,
        fontWeight: '600',
  },
    contactInfoCard: {
        padding: SPACING.md,
        borderRadius: 12,
        marginTop: SPACING.lg,
        borderWidth: 1,
    },
    contactInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    contactInfoTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    contactInfoContent: {
        gap: SPACING.sm,
    },
    contactInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    contactInfoText: {
        fontSize: 13,
        flex: 1,
    },
});
