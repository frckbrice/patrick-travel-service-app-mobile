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
import { useLocalSearchParams } from 'expo-router';
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
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const cases = useCasesStore((state) => state.cases);
  const { requiresActiveCase, activeCases } = useCaseRequirementGuard();
  const [selectedCaseId, setSelectedCaseId] = useState(caseId || '');
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

  // Auto-select case when cases are loaded (prioritize URL parameter)
  useEffect(() => {
    if (caseOptions.length > 0 && !selectedCaseId) {
      // If caseId is provided in URL, use it; otherwise use first available case
      const targetCaseId = caseId || caseOptions[0].value;
      setSelectedCaseId(targetCaseId);
    }
  }, [caseOptions, caseId]);

  // Memoize document picker function for performance
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setFileUri(asset.uri);
        setFileName(asset.name);
        setFileSize(asset.size || 0);
        setMimeType(asset.mimeType || '');
      }
    } catch (error) {
      logger.error('Document picker error:', error);
      toast.error({
        title: t('common.error'),
        message: t('errors.failedToPickDocument'),
      });
    }
  }, [t]);

  // Memoize image picker function for performance
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setFileUri(asset.uri);
        setFileName(asset.fileName || `image_${Date.now()}.jpg`);
        setFileSize(asset.fileSize || 0);
        setMimeType(asset.type || 'image/jpeg');
      }
    } catch (error) {
      logger.error('Image picker error:', error);
      toast.error({
        title: t('common.error'),
        message: t('errors.failedToPickImage'),
      });
    }
  }, [t]);

  // Memoize camera function for performance
  const takePhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setFileUri(asset.uri);
        setFileName(asset.fileName || `photo_${Date.now()}.jpg`);
        setFileSize(asset.fileSize || 0);
        setMimeType(asset.type || 'image/jpeg');
      }
    } catch (error) {
      logger.error('Camera error:', error);
      toast.error({
        title: t('common.error'),
        message: t('errors.failedToTakePhoto'),
      });
    }
  }, [t]);

  // Memoize upload function for performance
  const uploadDocument = useCallback(async () => {
    if (!fileUri || !selectedCaseId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload file to UploadThing
      const uploadResult = await uploadThingService.uploadFile(
        fileUri,
        fileName,
        mimeType,
        (progress) => setUploadProgress(progress)
      );

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Create document record
      const documentData = {
        caseId: selectedCaseId,
        documentType,
        originalName: fileName,
        fileSize,
        mimeType,
        uploadUrl: uploadResult.data.url,
        uploadKey: uploadResult.data.key,
      };

      const response = await documentsApi.createDocument(documentData);

      if (response.success) {
        toast.success({
          title: t('documents.uploadSuccess'),
          message: t('documents.uploadSuccessMessage'),
        });
        router.back();
      } else {
        throw new Error(response.error || t('errors.uploadFailed'));
      }
    } catch (error: any) {
      logger.error('Upload error:', error);
      toast.error({
        title: t('documents.uploadFailed'),
        message: error.message || t('errors.uploadFailed'),
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [fileUri, selectedCaseId, fileName, mimeType, documentType, fileSize, t, router]);

  // Memoize validation for upload button
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
                <Card style={styles.card}>
                  <PaperText style={styles.sectionTitle}>
                    {t('documents.selectCase')}
                  </PaperText>
                  <View style={styles.casePickerContainer}>
                    {caseOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.caseOption,
                          selectedCaseId === option.value && styles.caseOptionSelected,
                        ]}
                        onPress={() => setSelectedCaseId(option.value)}
                      >
                        <MaterialCommunityIcons
                          name="folder"
                          size={20}
                          color={selectedCaseId === option.value ? COLORS.primary : COLORS.textSecondary}
                        />
                        <PaperText
                          style={[
                            styles.caseOptionText,
                            selectedCaseId === option.value && styles.caseOptionTextSelected,
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
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <Card style={styles.card}>
                  <PaperText style={styles.sectionTitle}>
                    {t('documents.documentType')}
                  </PaperText>
                  <SegmentedButtons
                    value={documentType}
                    onValueChange={(value) => setDocumentType(value as DocumentType)}
                    buttons={[
                      {
                        value: DocumentType.PASSPORT,
                        label: DOCUMENT_TYPE_LABELS[DocumentType.PASSPORT],
                        icon: 'passport',
                      },
                      {
                        value: DocumentType.ID_CARD,
                        label: DOCUMENT_TYPE_LABELS[DocumentType.ID_CARD],
                        icon: 'card-account-details',
                      },
                      {
                        value: DocumentType.DIPLOMA,
                        label: DOCUMENT_TYPE_LABELS[DocumentType.DIPLOMA],
                        icon: 'school',
                      },
                      {
                        value: DocumentType.OTHER,
                        label: DOCUMENT_TYPE_LABELS[DocumentType.OTHER],
                        icon: 'file-document',
                      },
                    ]}
                    style={styles.segmentedButtons}
                  />
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Card style={styles.card}>
                  <PaperText style={styles.sectionTitle}>
                    {t('documents.selectFile')}
                  </PaperText>
                  
                  {fileName ? (
                    <View style={styles.filePreview}>
                      <View style={styles.fileInfo}>
                        <MaterialCommunityIcons
                          name={mimeType.includes('pdf') ? 'file-pdf-box' : 'file-image'}
                          size={32}
                          color={COLORS.primary}
                        />
                        <View style={styles.fileDetails}>
                          <PaperText style={styles.fileName} numberOfLines={1}>
                            {fileName}
                          </PaperText>
                          <PaperText style={styles.fileSize}>
                            {(fileSize / 1024).toFixed(1)} KB
                          </PaperText>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={() => {
                          setFileUri('');
                          setFileName('');
                          setFileSize(0);
                          setMimeType('');
                        }}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={20}
                          color={COLORS.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.filePickerContainer}>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={pickDocument}
                      >
                        <MaterialCommunityIcons
                          name="file-document"
                          size={24}
                          color={COLORS.primary}
                        />
                        <PaperText style={styles.pickerButtonText}>
                          {t('documents.chooseFile')}
                        </PaperText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={pickImage}
                      >
                        <MaterialCommunityIcons
                          name="image"
                          size={24}
                          color={COLORS.primary}
                        />
                        <PaperText style={styles.pickerButtonText}>
                          {t('documents.chooseImage')}
                        </PaperText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={takePhoto}
                      >
                        <MaterialCommunityIcons
                          name="camera"
                          size={24}
                          color={COLORS.primary}
                        />
                        <PaperText style={styles.pickerButtonText}>
                          {t('documents.takePhoto')}
                        </PaperText>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </Animated.View>

              {isUploading && (
                <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                  <Card style={styles.card}>
                    <View style={styles.uploadProgress}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <PaperText style={styles.uploadText}>
                        {t('documents.uploading')}... {Math.round(uploadProgress)}%
                      </PaperText>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${uploadProgress}%` },
                        ]}
                      />
                    </View>
                  </Card>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    !isUploadEnabled && styles.uploadButtonDisabled,
                  ]}
                  onPress={uploadDocument}
                  disabled={!isUploadEnabled}
                >
                  {isUploading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <MaterialCommunityIcons
                      name="cloud-upload"
                      size={20}
                      color="white"
                    />
                  )}
                  <PaperText style={styles.uploadButtonText}>
                    {isUploading
                      ? t('documents.uploading')
                      : t('documents.uploadDocument')}
                  </PaperText>
                </TouchableOpacity>
              </Animated.View>

              <PaperText style={styles.helperText}>
                {t('documents.uploadHelper')}
              </PaperText>
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
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  documentTypeOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  documentTypeIcon: {
    marginBottom: SPACING.xs,
  },
  documentTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  filePickerContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  pickerButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  fileSize: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  removeFileButton: {
    padding: SPACING.xs,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  uploadButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  uploadText: {
    fontSize: 14,
    color: COLORS.text,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  card: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
});
