import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SegmentedButtons, Text as PaperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { uploadThingService } from '../../lib/services/uploadthing';
import { documentsApi } from '../../lib/api/documents.api';
import { useCasesStore } from '../../stores/cases/casesStore';
import { useCaseRequirementGuard } from '../../lib/guards/useCaseRequirementGuard';
import { DocumentType } from '../../lib/types';
import { Card } from '../../components/ui';
import {
  COLORS,
  SPACING,
  MAX_FILE_SIZE,
  DOCUMENT_TYPE_LABELS,
} from '../../lib/constants';
import { logger } from '../../lib/utils/logger';
import { toast } from '../../lib/services/toast';

export default function UploadDocumentScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const cases = useCasesStore((state) => state.cases);
  const { requiresActiveCase, activeCases } = useCaseRequirementGuard();
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>(
    DocumentType.PASSPORT
  );
  const [fileUri, setFileUri] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [mimeType, setMimeType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Memoize case options for performance
  const caseOptions = useMemo(
    () =>
      cases.map((c) => ({
        value: c.id,
        label: c.referenceNumber,
      })),
    [cases]
  );

  // Guard: Check if user has active cases on mount
  useEffect(() => {
    requiresActiveCase('upload documents');
    return;
  }, []);

  // Auto-select first case when cases are loaded
  useEffect(() => {
    if (caseOptions.length > 0 && !selectedCaseId) {
      setSelectedCaseId(caseOptions[0].value);
    }
  }, [caseOptions]);

  // Memoize document picker function for performance
  const pickDocument = useCallback(async () => {
    try {
      logger.info('Opening document picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        if (file.size && file.size > MAX_FILE_SIZE) {
          toast.error({
            title: t('common.error'),
            message: t('documents.fileTooLarge'),
          });
          return;
        }

        setFileUri(file.uri);
        setFileName(file.name);
        setFileSize(file.size || 0);
        setMimeType(file.mimeType || 'application/octet-stream');
        logger.info('Document selected', {
          fileName: file.name,
          size: file.size,
        });
      }
    } catch (error) {
      logger.error('Document picker error', error);
      toast.error({
        title: t('common.error'),
        message: 'Failed to pick document',
      });
    }
  }, [t]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t('documents.permissionRequired'),
        t('documents.photoPermissionNeeded')
      );
      return;
    }

    try {
      logger.info('Opening image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setFileUri(file.uri);
        setFileName(`image_${Date.now()}.jpg`);
        setFileSize(file.fileSize || 0);
        setMimeType('image/jpeg');
        logger.info('Image selected', { size: file.fileSize });
      }
    } catch (error) {
      logger.error('Image picker error', error);
      toast.error({
        title: t('common.error'),
        message: 'Failed to pick image',
      });
    }
  }, [t]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t('documents.permissionRequired'),
        t('documents.cameraPermissionNeeded')
      );
      return;
    }

    try {
      logger.info('Opening camera');
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setFileUri(file.uri);
        setFileName(`photo_${Date.now()}.jpg`);
        setFileSize(file.fileSize || 0);
        setMimeType('image/jpeg');
        logger.info('Photo taken', { size: file.fileSize });
      }
    } catch (error) {
      logger.error('Camera error', error);
      toast.error({
        title: t('common.error'),
        message: 'Failed to take photo',
      });
    }
  }, [t]);

  const handleUpload = useCallback(async () => {
    if (!selectedCaseId || !fileUri || !fileName) {
      toast.error({
        title: t('common.error'),
        message: 'Please select a case and file',
      });
      return;
    }

    // PERFORMANCE: Generate temp ID
    const tempId = `temp-${Date.now()}`;
    let lastProgressUpdate = 0;

    logger.info('Starting optimistic document upload', {
      caseId: selectedCaseId,
      fileName,
      fileSize,
    });

    // 1. Navigate back immediately - no blocking!
    router.back();

    // 2. Show instant feedback with toast
    toast.info({
      title: t('documents.uploading'),
      message: fileName,
    });

    try {
    // 3. PERFORMANCE: Upload with 60 FPS throttled progress
      const uploadResult = await uploadThingService.uploadFile(
        fileUri,
        fileName,
        mimeType,
        {
          onProgress: (progress: number) => {
            const now = Date.now();

            // PERFORMANCE: Throttle to 60 FPS (16.6ms intervals)
            if (now - lastProgressUpdate < 16.6) return;

            lastProgressUpdate = now;
            setUploadProgress(Math.round(progress * 100));
            logger.debug('Upload progress', { progress: Math.round(progress * 100) });
          },
        }
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || t('errors.uploadFailed'));
      }

      // 4. Save document metadata to backend
      const response = await documentsApi.uploadDocument({
        caseId: selectedCaseId,
        documentType,
        fileName: uploadResult.name || fileName,
        filePath: uploadResult.url,
        fileSize,
        mimeType,
      });

      if (response.success) {
        // 5. Success - document uploaded
        logger.info('Document uploaded successfully', {
          documentId: response.data?.id,
          fileName,
          progress: 100,
        });

        // Show success feedback with toast
        toast.success({
          title: t('common.success'),
          message: t('documents.uploadSuccess'),
        });
      } else {
        throw new Error(response.error || t('errors.uploadFailed'));
      }
    } catch (error: any) {
      // 6. Error - show failure message with toast
      logger.error('Document upload failed', error);

      toast.error({
        title: t('common.error'),
        message: error.message || t('errors.uploadFailed'),
      });
    } finally {
      // 7. PERFORMANCE: Clean up state
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [
    selectedCaseId,
    fileUri,
    fileName,
    documentType,
    fileSize,
    mimeType,
    t,
    router,
  ]);

  // Memoize whether preview should be shown
  const isImageFile = useMemo(() => mimeType.includes('image'), [mimeType]);

  // Check if upload button should be enabled
  const isUploadEnabled = useMemo(() => {
    return !isUploading && !!fileName && !!selectedCaseId;
  }, [isUploading, fileName, selectedCaseId]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <PaperText variant="headlineMedium" style={styles.title}>
          {t('documents.uploadDocument') || 'Upload Document'}
        </PaperText>
        <PaperText variant="bodyLarge" style={styles.subtitle}>
          {t('documents.selectCaseAndFile') ||
            'Select a case and choose a file to upload'}
        </PaperText>
      </View>

      <View style={styles.content}>
        {caseOptions.length === 0 ? (
          <View style={styles.noCasesContainer}>
            <MaterialCommunityIcons
              name="folder-open"
              size={64}
              color={COLORS.textSecondary}
            />
            <PaperText style={styles.noCasesText}>
              {t('documents.noCasesAvailable') ||
                'No cases available. Please create a case first.'}
            </PaperText>
          </View>
        ) : (
          <>
              <Animated.View entering={FadeInDown.delay(0).duration(400)}>
                <PaperText style={styles.sectionTitle}>
                  {t('documents.selectCase')}
                </PaperText>
                {caseOptions.length > 0 ? (
                  caseOptions.length <= 3 ? (
                    <SegmentedButtons
                      value={selectedCaseId}
                      onValueChange={setSelectedCaseId}
                      buttons={caseOptions.map((option) => ({
                        ...option,
                        style: styles.segmentButton,
                        labelStyle: styles.segmentLabel,
                      }))}
                      style={styles.segmentedButtons}
                      theme={{
                        colors: {
                          secondaryContainer: COLORS.primary,
                          onSecondaryContainer: COLORS.surface,
                          outline: COLORS.border,
                        },
                      }}
                    />
                  ) : (
                    <View style={styles.casePickerContainer}>
                      {caseOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.caseOption,
                            selectedCaseId === option.value &&
                            styles.caseOptionSelected,
                          ]}
                          onPress={() => setSelectedCaseId(option.value)}
                        >
                          <MaterialCommunityIcons
                            name="briefcase"
                            size={20}
                            color={
                              selectedCaseId === option.value
                                ? COLORS.primary
                                : COLORS.textSecondary
                            }
                          />
                          <PaperText
                            style={[
                              styles.caseOptionText,
                              selectedCaseId === option.value &&
                              styles.caseOptionTextSelected,
                            ]}
                          >
                            {option.label}
                          </PaperText>
                          {selectedCaseId === option.value && (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={20}
                              color={COLORS.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                ) : (
                  <PaperText style={styles.helperText}>
                    {t('documents.createCaseFirst') || 'Create a case first'}
                  </PaperText>
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <PaperText
                  style={[styles.sectionTitle, { marginTop: SPACING.lg }]}
                >
                  {t('documents.documentType')}
                </PaperText>
                <View style={styles.documentTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.documentTypeOption,
                      documentType === DocumentType.PASSPORT &&
                      styles.documentTypeOptionSelected,
                    ]}
                    onPress={() => setDocumentType(DocumentType.PASSPORT)}
                  >
                    <View
                      style={[
                        styles.documentTypeIconContainer,
                        documentType === DocumentType.PASSPORT &&
                        styles.documentTypeIconContainerSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="passport"
                        size={28}
                        color={
                          documentType === DocumentType.PASSPORT
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                    </View>
                    <PaperText
                      style={[
                        styles.documentTypeLabel,
                        documentType === DocumentType.PASSPORT &&
                        styles.documentTypeLabelSelected,
                      ]}
                    >
                      Passport
                    </PaperText>
                    {documentType === DocumentType.PASSPORT && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.documentTypeOption,
                      documentType === DocumentType.ID_CARD &&
                      styles.documentTypeOptionSelected,
                    ]}
                    onPress={() => setDocumentType(DocumentType.ID_CARD)}
                  >
                    <View
                      style={[
                        styles.documentTypeIconContainer,
                        documentType === DocumentType.ID_CARD &&
                        styles.documentTypeIconContainerSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="card-account-details"
                        size={28}
                        color={
                          documentType === DocumentType.ID_CARD
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                    </View>
                    <PaperText
                      style={[
                        styles.documentTypeLabel,
                        documentType === DocumentType.ID_CARD &&
                        styles.documentTypeLabelSelected,
                      ]}
                    >
                      ID Card
                    </PaperText>
                    {documentType === DocumentType.ID_CARD && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.documentTypeOption,
                      documentType === DocumentType.OTHER &&
                      styles.documentTypeOptionSelected,
                    ]}
                    onPress={() => setDocumentType(DocumentType.OTHER)}
                  >
                    <View
                      style={[
                        styles.documentTypeIconContainer,
                        documentType === DocumentType.OTHER &&
                        styles.documentTypeIconContainerSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="file-document"
                        size={28}
                        color={
                          documentType === DocumentType.OTHER
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                    </View>
                    <PaperText
                      style={[
                        styles.documentTypeLabel,
                        documentType === DocumentType.OTHER &&
                        styles.documentTypeLabelSelected,
                      ]}
                    >
                      Other
                    </PaperText>
                    {documentType === DocumentType.OTHER && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <PaperText
                  style={[styles.sectionTitle, { marginTop: SPACING.lg }]}
                >
                  {t('documents.selectFile')}
                </PaperText>

                <View style={styles.uploadOptions}>
                  <TouchableOpacity
                    style={styles.uploadOption}
                    onPress={takePhoto}
                  >
                    <View
                      style={[
                        styles.uploadIconContainer,
                        { backgroundColor: COLORS.primary + '15' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="camera"
                        size={32}
                        color={COLORS.primary}
                      />
                    </View>
                    <PaperText style={styles.uploadOptionText}>
                      {t('documents.takePhoto') || 'Take Photo'}
                    </PaperText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadOption}
                    onPress={pickImage}
                  >
                    <View
                      style={[
                        styles.uploadIconContainer,
                        { backgroundColor: COLORS.success + '15' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="image"
                        size={32}
                        color={COLORS.success}
                      />
                    </View>
                    <PaperText style={styles.uploadOptionText}>
                      {t('documents.gallery') || 'Gallery'}
                    </PaperText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadOption}
                    onPress={pickDocument}
                  >
                    <View
                      style={[
                        styles.uploadIconContainer,
                        { backgroundColor: COLORS.warning + '15' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="file-document"
                        size={32}
                        color={COLORS.warning}
                      />
                    </View>
                    <PaperText style={styles.uploadOptionText}>
                      {t('documents.document') || 'Document'}
                    </PaperText>
                  </TouchableOpacity>
                </View>

                {fileName && (
                  <Card style={styles.previewCard}>
                    <View style={styles.previewContent}>
                      {isImageFile && fileUri ? (
                        <Image
                          source={{ uri: fileUri }}
                          style={styles.imagePreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.filePreview}>
                          <MaterialCommunityIcons
                            name={
                              mimeType.includes('pdf')
                                ? 'file-pdf-box'
                                : 'file-document'
                            }
                            size={64}
                            color={COLORS.primary}
                          />
                        </View>
                      )}
                      <View style={styles.fileInfoContainer}>
                        <Text style={styles.fileName} numberOfLines={2}>
                          {fileName}
                        </Text>
                        <Text style={styles.fileSize}>
                          {(fileSize / 1024).toFixed(2)} KB
                        </Text>
                        <Text style={styles.fileType}>
                          {DOCUMENT_TYPE_LABELS[documentType]}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setFileUri('');
                          setFileName('');
                        }}
                        style={styles.removeButton}
                      >
                        <MaterialCommunityIcons
                          name="close-circle"
                          size={24}
                          color={COLORS.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </Card>
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                {isUploading && uploadProgress > 0 && (
                  <View style={styles.progressContainer}>
                    <PaperText style={styles.progressText}>
                      {t('documents.uploading')} {uploadProgress}%
                    </PaperText>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${uploadProgress}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleUpload}
                  style={[
                    styles.uploadButton,
                    !isUploadEnabled && styles.uploadButtonDisabled,
                  ]}
                  activeOpacity={0.8}
                  disabled={!isUploadEnabled}
                >
                  {isUploading ? (
                    <View style={styles.buttonLoading}>
                      <ActivityIndicator color={COLORS.surface} size="small" />
                      <PaperText style={styles.buttonLabel}>
                        {t('documents.uploading')} {uploadProgress}%
                      </PaperText>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <MaterialCommunityIcons
                        name="upload"
                        size={20}
                        color={
                          isUploadEnabled ? COLORS.surface : COLORS.textSecondary
                        }
                        />
                      <PaperText
                        style={[
                          styles.buttonLabel,
                          !isUploadEnabled && styles.buttonLabelDisabled,
                        ]}
                      >
                        {t('documents.uploadDocument')}
                      </PaperText>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  content: {
    padding: SPACING.lg,
  },
  noCasesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  noCasesText: {
    marginTop: SPACING.lg,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  segmentedButtons: {
    marginBottom: SPACING.md,
  },
  segmentButton: {
    borderColor: COLORS.border,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  casePickerContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  caseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  caseOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  caseOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  caseOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  documentTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  documentTypeOption: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  documentTypeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  documentTypeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  documentTypeIconContainerSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  documentTypeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  documentTypeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  uploadOption: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  uploadOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  previewCard: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  previewContent: {
    padding: SPACING.md,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  filePreview: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  fileInfoContainer: {
    marginBottom: SPACING.sm,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  fileType: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  uploadButton: {
    marginTop: SPACING.lg,
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
  uploadButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
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
    color: COLORS.surface,
  },
  buttonLabelDisabled: {
    color: COLORS.textSecondary,
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
