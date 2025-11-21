import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Text,
} from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { uploadFileToAPI } from '../../lib/services/fileUpload';
import { documentsApi } from '../../lib/api/documents.api';
import { useCasesStore } from '../../stores/cases/casesStore';
import { useCaseRequirementGuard } from '../../lib/guards/useCaseRequirementGuard';
import { DocumentType } from '../../lib/types';
import { Card } from '../../components/ui';
import { ThemeAwareHeader } from '../../components/ui/ThemeAwareHeader';
import { SPACING, DOCUMENT_TYPE_LABELS } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { logger } from '../../lib/utils/logger';
import { toast } from '../../lib/services/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UploadDocumentScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const isLoadingCases = useCasesStore((state) => state.isLoading);
  const { hasActiveCases, activeCases } = useCaseRequirementGuard();
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>(
    DocumentType.PASSPORT
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const insets = useSafeAreaInsets();

  // Redirect to documents page if no active cases (only after cases are loaded)
  useEffect(() => {
    if (!isLoadingCases && !hasActiveCases) {
      router.replace('/(tabs)/documents');
    }
  }, [hasActiveCases, isLoadingCases, router]);

  // Memoize case options for performance - only include active cases
  const caseOptions = useMemo(
    () =>
      activeCases.map((c) => ({
        value: c.id,
        label: c.referenceNumber,
      })),
    [activeCases]
  );

  // Validate that URL caseId is active, and auto-select case when cases are loaded
  useEffect(() => {
    if (caseOptions.length === 0) return;

    // If caseId is provided in URL, validate it's in active cases
    if (caseId) {
      const isValidCase = caseOptions.some((opt) => opt.value === caseId);
      if (isValidCase) {
        setSelectedCaseId(caseId);
        return;
      }
      // Invalid caseId from URL - ignore it and use first available
    }

    // Auto-select first available case if none selected
    if (!selectedCaseId) {
      setSelectedCaseId(caseOptions[0].value);
    }
  }, [caseOptions, caseId, selectedCaseId]);

  // Validate selected case is still active
  const isSelectedCaseValid = useMemo(() => {
    return selectedCaseId && activeCases.some((c) => c.id === selectedCaseId);
  }, [selectedCaseId, activeCases]);

  // Handle document picker and upload
  const handlePickDocument = useCallback(async () => {
    if (!selectedCaseId || !isSelectedCaseValid) {
      toast.error({
        title: t('common.error'),
        message:
          t('documents.invalidCase') || 'Please select a valid active case',
      });
      // Reset selection if invalid
      if (caseOptions.length > 0) {
        setSelectedCaseId(caseOptions[0].value);
      }
      return;
    }

    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadFileName(file.name || 'document');

      // Simulate progress updates (fetch API doesn't support real upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          // Gradually increase progress, but cap at 90% until upload completes
          if (prev < 90) {
            return Math.min(prev + Math.random() * 15, 90);
          }
          return prev;
        });
      }, 300);

      try {
        // Upload file to API
        const uploadResult = await uploadFileToAPI(
          file.uri,
          file.name || 'document',
          file.mimeType || 'application/octet-stream'
        );

        clearInterval(progressInterval);
        setUploadProgress(95); // Show 95% when upload completes, then 100% after metadata save

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || t('errors.uploadFailed'));
        }

        // Save document metadata to database
        const documentData = {
          caseId: selectedCaseId,
          documentType,
          fileName: file.name || 'document',
          filePath: uploadResult.url,
          fileSize: file.size || 0,
          mimeType: file.mimeType || 'application/octet-stream',
        };

        const response = await documentsApi.uploadDocument(documentData);

        if (response.success) {
          setUploadProgress(100);

          // Small delay to show 100% completion
          await new Promise(resolve => setTimeout(resolve, 500));

          setIsUploading(false);

          toast.success({
            title: t('documents.uploadSuccess'),
            message: t('documents.uploadSuccessMessage'),
          });

          // Redirect to documents page with documents segment
          router.replace('/(tabs)/documents?tab=documents');
        } else {
          throw new Error(response.error || t('errors.uploadFailed'));
        }
      } catch (uploadError: any) {
        clearInterval(progressInterval);
        throw uploadError;
      }
    } catch (error: any) {
      logger.error('Failed to upload document', error);
      toast.error({
        title: t('documents.uploadFailed'),
        message: error.message || t('errors.uploadFailed'),
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
    }
  }, [
    selectedCaseId,
    isSelectedCaseValid,
    documentType,
    caseOptions,
    t,
    router,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemeAwareHeader
        variant="gradient"
        gradientColors={[colors.primary, colors.secondary, colors.accent]}
        title={t('documents.uploadDocument') || 'Upload Document'}
        subtitle={
          t('documents.selectCaseAndFile') ||
          'Select a case and choose a file to upload'
        }
        showBackButton
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {!hasActiveCases ? null : (
          <>
            <Animated.View entering={FadeInDown.delay(0).duration(400)}>
              <Card style={{ ...styles.card, backgroundColor: colors.card }}>
                <PaperText
                  style={[styles.sectionTitle, { color: colors.text }]}
                >
                  {t('documents.selectCase')}
                </PaperText>
                <View style={styles.casePickerContainer}>
                  {caseOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.caseOption,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        selectedCaseId === option.value && {
                          borderColor: colors.primary,
                          backgroundColor: colors.primary + '08',
                        },
                      ]}
                      onPress={() => setSelectedCaseId(option.value)}
                    >
                      <MaterialCommunityIcons
                        name="folder"
                        size={20}
                        color={
                          selectedCaseId === option.value
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <PaperText
                        style={[
                          styles.caseOptionText,
                          { color: colors.text },
                          selectedCaseId === option.value && [
                            styles.caseOptionTextSelected,
                            { color: colors.primary },
                          ],
                        ]}
                      >
                        {option.label}
                      </PaperText>
                      {selectedCaseId === option.value && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Card style={{ ...styles.card, backgroundColor: colors.card }}>
                <PaperText
                  style={[styles.sectionTitle, { color: colors.text }]}
                >
                  {t('documents.documentType')}
                </PaperText>
                <View style={styles.documentTypeContainer}>
                  {[
                    DocumentType.PASSPORT,
                    DocumentType.ID_CARD,
                    DocumentType.DIPLOMA,
                    DocumentType.OTHER,
                  ].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.documentTypeOption,
                        {
                          backgroundColor:
                            documentType === type
                              ? colors.primary + '15'
                              : colors.surface,
                          borderColor:
                            documentType === type
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                      onPress={() => setDocumentType(type)}
                    >
                      <MaterialCommunityIcons
                        name={
                          type === DocumentType.PASSPORT
                            ? 'passport'
                            : type === DocumentType.ID_CARD
                              ? 'card-account-details'
                              : type === DocumentType.DIPLOMA
                                ? 'school'
                                : 'file-document'
                        }
                        size={20}
                        color={
                          documentType === type
                            ? colors.primary
                            : colors.textSecondary
                        }
                        style={styles.documentTypeIcon}
                      />
                      <PaperText
                        style={[
                          styles.documentTypeLabel,
                          {
                            color:
                              documentType === type
                                ? colors.primary
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {DOCUMENT_TYPE_LABELS[type]}
                      </PaperText>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  {
                    backgroundColor:
                      isSelectedCaseValid && !isUploading
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={handlePickDocument}
                disabled={!isSelectedCaseValid || isUploading}
              >
                {isUploading ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <PaperText style={styles.uploadButtonText}>
                      {t('documents.uploading')}...
                    </PaperText>
                  </>
                ) : (
                    <>
                    <MaterialCommunityIcons
                        name="upload"
                        size={24}
                      color="white"
                      />
                      <PaperText style={styles.uploadButtonText}>
                        {t('documents.selectAndUpload') ||
                          'Select & Upload Document'}
                      </PaperText>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <PaperText
              style={[styles.helperText, { color: colors.textSecondary }]}
            >
              {t('documents.uploadHelper')}
            </PaperText>
          </>
        )}
      </ScrollView>

      {/* Upload Progress Modal - More visible loader */}
      <Modal
        visible={isUploading}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.uploadModalContent, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.uploadIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <MaterialCommunityIcons
                name="cloud-upload"
                size={48}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.uploadModalTitle, { color: colors.text }]}>
              {t('documents.uploading') || 'Uploading Document'}
            </Text>

            {uploadFileName && (
              <Text style={[styles.uploadFileName, { color: colors.textSecondary }]} numberOfLines={1}>
                {uploadFileName}
              </Text>
            )}

            {/* Progress Bar */}
            <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>

            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {Math.round(uploadProgress)}%
            </Text>

            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.uploadActivityIndicator}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  casePickerContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  caseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  caseOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  caseOptionTextSelected: {
    fontWeight: '600',
  },
  documentTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  documentTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  documentTypeIcon: {
    marginBottom: SPACING.xs,
  },
  documentTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  card: {
    marginBottom: SPACING.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderRadius: 16,
    padding: SPACING.md,
  },
  // Upload Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  uploadModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  uploadModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  uploadFileName: {
    fontSize: 14,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  uploadActivityIndicator: {
    marginTop: SPACING.sm,
  },
});
