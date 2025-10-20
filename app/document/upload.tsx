import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
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
import { DocumentType } from '../../lib/types';
import { Card, Button } from '../../components/ui';
import {
  COLORS,
  SPACING,
  MAX_FILE_SIZE,
  DOCUMENT_TYPE_LABELS,
} from '../../lib/constants';
import { logger } from '../../lib/utils/logger';

export default function UploadDocumentScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const cases = useCasesStore((state) => state.cases);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>(
    DocumentType.OTHER
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
          Alert.alert(t('common.error'), t('documents.fileTooLarge'));
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
      Alert.alert(t('common.error'), 'Failed to pick document');
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
      Alert.alert(t('common.error'), 'Failed to pick image');
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
      Alert.alert(t('common.error'), 'Failed to take photo');
    }
  }, [t]);

  const handleUpload = useCallback(async () => {
    if (!selectedCaseId || !fileUri || !fileName) {
      Alert.alert(t('common.error'), 'Please select a case and file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      logger.info('Starting document upload', {
        caseId: selectedCaseId,
        fileName,
        fileSize,
      });

      // Upload to UploadThing with progress tracking
      const uploadResult = await uploadThingService.uploadFile(
        fileUri,
        fileName,
        mimeType,
        {
          onProgress: (progress: number) => {
            setUploadProgress(progress);
            logger.info('Upload progress', { progress });
          },
        }
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || t('errors.uploadFailed'));
      }

      // Save document metadata to backend
      const response = await documentsApi.uploadDocument({
        caseId: selectedCaseId,
        documentType,
        fileName: uploadResult.name || fileName,
        filePath: uploadResult.url,
        fileSize,
        mimeType,
      });

      if (response.success) {
        logger.info('Document uploaded successfully', {
          documentId: response.data?.id,
        });
        Alert.alert(t('common.success'), t('documents.uploadSuccess'), [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error(response.error || t('errors.uploadFailed'));
      }
    } catch (error: any) {
      logger.error('Document upload error', error);
      Alert.alert(t('common.error'), error.message || t('errors.uploadFailed'));
    } finally {
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <Text style={styles.sectionTitle}>{t('documents.selectCase')}</Text>
          <SegmentedButtons
            value={selectedCaseId}
            onValueChange={setSelectedCaseId}
            buttons={caseOptions.slice(0, 3)}
            style={styles.segmentedButtons}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
            {t('documents.documentType')}
          </Text>
          <SegmentedButtons
            value={documentType}
            onValueChange={(value) => setDocumentType(value as DocumentType)}
            buttons={[
              {
                value: DocumentType.PASSPORT,
                label: 'Passport',
                icon: 'passport',
              },
              {
                value: DocumentType.ID_CARD,
                label: 'ID',
                icon: 'card-account-details',
              },
              { value: DocumentType.OTHER, label: 'Other', icon: 'file' },
            ]}
            style={styles.segmentedButtons}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
            {t('documents.selectFile')}
          </Text>

          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.uploadOption} onPress={takePhoto}>
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
              <Text style={styles.uploadOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={pickImage}>
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
              <Text style={styles.uploadOptionText}>Gallery</Text>
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
              <Text style={styles.uploadOptionText}>Document</Text>
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
              <Text style={styles.progressText}>
                Uploading... {uploadProgress}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
            </View>
          )}

          <Button
            title={
              isUploading
                ? `${t('documents.uploading')} ${uploadProgress}%`
                : t('documents.uploadDocument')
            }
            onPress={handleUpload}
            loading={isUploading}
            disabled={isUploading || !fileName || !selectedCaseId}
            fullWidth
            icon="upload"
            style={styles.uploadButton}
          />
        </Animated.View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    color: COLORS.text,
  },
  segmentedButtons: {
    marginBottom: SPACING.md,
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
    marginTop: SPACING.md,
  },
});
