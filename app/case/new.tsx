import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Text, SegmentedButtons, TextInput, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../stores/auth/authStore';
import { useCasesStore } from '../../stores/cases/casesStore';
import { casesApi } from '../../lib/api/cases.api';
import { destinationsApi, Destination } from '../../lib/api/destinations.api';
import { ServiceType, CaseStatus, Priority } from '../../lib/types';
import { KeyboardAvoidingScrollView } from '../../components/ui';
import { CalendarDatePicker } from '../../components/ui/CalendarDatePicker';
import { SPACING, SERVICE_TYPE_LABELS, COLORS } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { toast } from '../../lib/services/toast';
import { secureStorage } from '../../lib/storage/secureStorage';
import { useDebounce } from '../../lib/hooks/useDebounce';

interface CaseFormData {
  serviceType: ServiceType;
  details: string;
    destinationId?: string;
    travelDate?: Date;
}

export default function NewCaseScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const user = useAuthStore((state) => state.user);
  const { addOptimisticCase, updateCaseById, removeOptimisticCase } = useCasesStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loadingDestinations, setLoadingDestinations] = useState(true);
    const [destinationMenuVisible, setDestinationMenuVisible] = useState(false);
    const [isDraftSaving, setIsDraftSaving] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const [formProgress, setFormProgress] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
      setValue,
      getValues,
  } = useForm<CaseFormData>({
    defaultValues: {
      serviceType: ServiceType.TOURIST_VISA,
    },
  });

  const serviceType = watch('serviceType');
    const selectedDestinationId = watch('destinationId');
    const selectedDate = watch('travelDate');
    const details = watch('details');
  const insets = useSafeAreaInsets();

    // Calculate form progress
    const calculateProgress = useCallback(() => {
        let progress = 0;
        const values = getValues();

        if (values.serviceType) progress += 25;
        if (values.destinationId) progress += 25;
        if (values.travelDate) progress += 25;
        if (values.details && values.details.trim().length > 10) progress += 25;

        setFormProgress(progress);
        return progress;
    }, [getValues]);

    // Debounced form data for auto-save
    const debouncedFormData = useDebounce({
        serviceType,
        destinationId: selectedDestinationId,
        travelDate: selectedDate,
        details,
    }, 2000);

    // Auto-save draft functionality
    const saveDraft = useCallback(async (formData: Partial<CaseFormData>) => {
        if (!user || !formData.serviceType) return;

        setIsDraftSaving(true);
        try {
            const draftData = {
                ...formData,
                userId: user.id,
                lastSaved: new Date().toISOString(),
            };

            await secureStorage.set('case_draft', draftData);
            setDraftSaved(true);

            // Show brief confirmation
            setTimeout(() => setDraftSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save draft:', error);
        } finally {
            setIsDraftSaving(false);
        }
    }, [user]);

    // Load draft on mount
    const loadDraft = useCallback(async () => {
        try {
            const draft = await secureStorage.get<CaseFormData & { userId: string; lastSaved: string }>('case_draft');
            if (draft && draft.userId === user?.id) {
                setValue('serviceType', draft.serviceType);
                setValue('destinationId', draft.destinationId);
                setValue('travelDate', draft.travelDate ? new Date(draft.travelDate) : undefined);
                setValue('details', draft.details || '');

                toast.success({
                    title: t('cases.draftRestored'),
                    message: t('cases.draftRestoredMessage'),
                });
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
        }
    }, [user, setValue, t]);

    // Auto-save when form data changes
    useEffect(() => {
        if (debouncedFormData.serviceType) {
            saveDraft(debouncedFormData);
        }
    }, [debouncedFormData, saveDraft]);

    // Update progress when form changes
    useEffect(() => {
        calculateProgress();
    }, [serviceType, selectedDestinationId, selectedDate, details, calculateProgress]);

    // Fetch destinations and load draft on mount
    useEffect(() => {
        fetchDestinations();
        loadDraft();
    }, [loadDraft]);

    const fetchDestinations = async () => {
        try {
            setLoadingDestinations(true);
            const data = await destinationsApi.getDestinations();
            setDestinations(data);
        } catch (error) {
            toast.error({
                title: t('common.error'),
                message: t('errors.failedToLoadDestinations'),
            });
        } finally {
            setLoadingDestinations(false);
        }
    };

    const getSelectedDestination = () => {
        return destinations.find((d) => d.id === selectedDestinationId);
    };


  const onSubmit = async (data: CaseFormData) => {
      if (!user) return;

      // PERFORMANCE: Generate temp ID
      const tempId = `temp-${Date.now()}`;
      const selectedDest = getSelectedDestination();

      // 1. PERFORMANCE: Create optimistic case - O(1)
      const optimisticCase = {
          id: tempId,
          referenceNumber: `TEMP-${Date.now().toString().slice(-6)}`,
          clientId: user.id,
          serviceType: data.serviceType,
          status: 'SUBMITTED' as CaseStatus,
          priority: 'MEDIUM' as Priority,
          submissionDate: new Date(),
          lastUpdated: new Date(),
          estimatedCompletion: null,
          isPending: true, // Visual indicator
          client: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
          },
      };

      // 2. PERFORMANCE: Add to store immediately (< 10ms)
      addOptimisticCase(optimisticCase);

      // 3. Navigate immediately - no wait!
      router.replace('/(tabs)/cases');

      // 4. Show instant feedback with toast
      toast.success({
          title: t('cases.submitted'),
          message: t('cases.processingInBackground'),
      });

    try {
        // 5. Send to server in background
      const response = await casesApi.createCase({
        serviceType: data.serviceType,
          destinationId: data.destinationId,
        formData: {
          details: data.details,
            travelDate: data.travelDate?.toISOString(),
        },
      });

        if (response.success && response.data) {
            // 6. PERFORMANCE: Replace optimistic with real (O(1))
            updateCaseById(tempId, {
                ...response.data,
                isPending: false,
            });

            // Clear draft after successful submission
            await secureStorage.delete('case_draft');
      } else {
        throw new Error(response.error || t('errors.somethingWrong'));
      }
    } catch (error: any) {
        // 7. PERFORMANCE: Remove failed case (O(n) single pass)
        removeOptimisticCase(tempId);

        // 8. Show error with toast
        toast.error({
            title: t('cases.submissionFailed'),
            message: error.message || t('errors.somethingWrong'),
        });
    }
  };

    return (
        <KeyboardAvoidingScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        ...styles.scrollContent,
        paddingBottom: insets.bottom + SPACING.lg,
      }}
    >
            <View style={styles.header}>
                <Text variant="headlineMedium" style={[styles.title, { color: colors.primary }]}>
          {t('dashboard.submitNewCase')}
        </Text>
                <Text variant="bodyLarge" style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('cases.selectServiceType')}
        </Text>

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${formProgress}%`, backgroundColor: colors.primary }
                            ]}
                        />
                    </View>
                    <Text variant="bodySmall" style={[styles.progressText, { color: colors.textSecondary }]}>
                        {formProgress}% {t('cases.complete')}
                    </Text>
                </View>

                {/* Draft Status */}
                {(isDraftSaving || draftSaved) && (
                    <View style={styles.draftStatus}>
                        {isDraftSaving ? (
                            <>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text variant="bodySmall" style={[styles.draftText, { color: colors.textSecondary }]}>
                                    {t('cases.savingDraft')}
                                </Text>
                            </>
                        ) : (
                            <>
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={16}
                                    color={colors.success}
                                />
                                <Text variant="bodySmall" style={[styles.draftText, { color: colors.textSecondary }]}>
                                    {t('cases.draftSaved')}
                                </Text>
                            </>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.form}>
        <Text variant="titleMedium" style={[styles.label, { color: colors.text }]}>
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
                                    {
                                        value: ServiceType.PERMANENT_RESIDENCY,
                    label: 'Residency',
                  },
                ]}
                style={styles.segmentButtons}
              />
                        </View>
                    )}
                />

                {/* Modern Destination Dropdown */}
                <Text variant="titleMedium" style={[styles.label, { color: colors.text }]}>
                    {t('cases.destination')} *
                </Text>
                <Controller
                    control={control}
                    name="destinationId"
          rules={{ required: t('errors.required') }}
                    render={({ field: { onChange, value } }) => (
                        <View>
                            <Menu
                                visible={destinationMenuVisible}
                                onDismiss={() => setDestinationMenuVisible(false)}
                                anchor={
                                    <TouchableOpacity
                                        onPress={() => setDestinationMenuVisible(true)}
                                        style={[
                                            styles.dropdownButton,
                                            { backgroundColor: colors.surface, borderColor: colors.border },
                                            !!errors.destinationId && { borderColor: colors.error },
                                        ]}
                                    >
                                        <View style={styles.dropdownContent}>
                                            {loadingDestinations ? (
                                                <>
                                                    <ActivityIndicator size="small" color={colors.primary} />
                                                    <Text style={[styles.dropdownText, { color: colors.textSecondary }]}>Loading...</Text>
                                                </>
                                            ) : getSelectedDestination() ? (
                                                <>
                                                    <Text style={styles.flagEmoji}>
                                                        {getSelectedDestination()?.flagEmoji}
                                                    </Text>
                                                    <Text style={[styles.dropdownTextSelected, { color: colors.text }]}>
                                                        {getSelectedDestination()?.name}
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <MaterialCommunityIcons
                                                        name="earth"
                                                        size={20}
                                                        color={colors.textSecondary}
                                                    />
                                                    <Text style={[styles.dropdownPlaceholder, { color: colors.textSecondary }]}>
                                                        Select destination
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                        <MaterialCommunityIcons
                                            name={destinationMenuVisible ? 'chevron-up' : 'chevron-down'}
                                            size={24}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                }
                                contentStyle={styles.menuContent}
                            >
                                {destinations.map((destination) => (
                                    <Menu.Item
                                        key={destination.id}
                                        onPress={() => {
                                            onChange(destination.id);
                                            setDestinationMenuVisible(false);
                                        }}
                                        title={destination.name}
                                        leadingIcon={() => (
                                            <Text style={styles.menuItemFlag}>{destination.flagEmoji}</Text>
                                        )}
                                        titleStyle={[
                                            styles.menuItemTitle,
                                            value === destination.id && styles.menuItemTitleSelected,
                                        ]}
                                        style={[
                                            styles.menuItem,
                                            value === destination.id && styles.menuItemSelected,
                                        ]}
                                    />
                                ))}
                            </Menu>
                        </View>
                    )}
                />
                {errors.destinationId && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.destinationId.message}</Text>
        )}

                {/* Beautiful Calendar Date Picker */}
                <Text variant="titleMedium" style={[styles.label, { color: colors.text }]}>
                    {t('cases.expectedTravelDate')}
                </Text>
        <Controller
          control={control}
          name="travelDate"
                    render={({ field: { onChange, value } }) => (
                        <CalendarDatePicker
              value={value}
                            onChange={onChange}
                            minimumDate={new Date()}
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
                  outlineStyle={styles.inputOutline}
                  textColor={colors.text}
                  placeholderTextColor={colors.textSecondary}
                  placeholder={t('cases.provideDetails')}
                  theme={{
                      colors: {
                          onSurfaceVariant: colors.textSecondary,
                          onSurface: colors.text,
                      },
                  }}
                        />
                    )}
                />
                {errors.details && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.details.message}</Text>
                )}

                <TouchableOpacity
                    onPress={() => {
                        if (isSubmitting) return;
                        handleSubmit(onSubmit)();
                    }}
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <View style={styles.buttonLoading}>
                            <ActivityIndicator color={colors.surface} size="small" />
                            <Text style={[styles.buttonLabel, { color: colors.surface }]}>{t('cases.submitCase')}</Text>
                        </View>
                    ) : (
                        <Text style={[styles.buttonLabel, { color: colors.surface }]}>{t('cases.submitCase')}</Text>
                    )}
                </TouchableOpacity>

                <Text variant="bodySmall" style={styles.note}>
                    {t('cases.noteAfterSubmit')}
                </Text>
            </View>
        </KeyboardAvoidingScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent', // Will be set dynamically
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
  },
    subtitle: {
        textAlign: 'center',
    },
    form: {
        marginTop: SPACING.lg,
    },
    label: {
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
        fontSize: 16,
        fontWeight: '600',
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
    inputOutline: {
        borderRadius: 12,
        borderWidth: 1.5,
    },
    fieldError: {
    fontSize: 12,
    marginBottom: SPACING.sm,
        marginTop: -4,
  },
    button: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
        borderRadius: 12,
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
    },
    buttonLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
  },
    note: {
    textAlign: 'center',
    fontStyle: 'italic',
        fontSize: 12,
    },
    // Modern Dropdown Styles
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md + 2,
        marginBottom: SPACING.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    dropdownButtonError: {
        borderColor: COLORS.error,
    },
    dropdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flex: 1,
    },
    dropdownText: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    dropdownTextSelected: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
    },
    dropdownPlaceholder: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    flagEmoji: {
        fontSize: 24,
    },
    menuContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    menuItem: {
        paddingVertical: SPACING.sm,
    },
    menuItemSelected: {
        backgroundColor: COLORS.primary + '10',
    },
    menuItemTitle: {
        fontSize: 15,
        color: COLORS.text,
    },
    menuItemTitleSelected: {
        fontWeight: '600',
        color: COLORS.primary,
    },
    menuItemFlag: {
        fontSize: 22,
    },
    // Progress Indicator Styles
    progressContainer: {
        marginTop: SPACING.md,
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: SPACING.xs,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    progressText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    // Draft Status Styles
    draftStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        alignSelf: 'center',
    },
    draftText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
});
