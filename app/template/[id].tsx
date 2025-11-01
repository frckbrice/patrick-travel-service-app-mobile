import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Text as PaperText, Button, Card } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { templatesApi, UploadFilledTemplateRequest } from '../../lib/api/templates.api';
import { uploadFileToAPI } from '../../lib/services/fileUpload';
import { useCasesStore } from '../../stores/cases/casesStore';
import { useCaseRequirementGuard } from '../../lib/guards/useCaseRequirementGuard';
import { DocumentTemplate } from '../../lib/types';
import { ModernHeader } from '../../components/ui/ModernHeader';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { DocumentFiller } from '../../components/ui/DocumentFiller';
import {
  COLORS,
  SPACING,
  MAX_FILE_SIZE,
} from '../../lib/constants';
import { logger } from '../../lib/utils/logger';
import { toast } from '../../lib/services/toast';
import { Alert } from '../../lib/utils/alert';

export default function TemplateDownloadUploadScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { id, caseId: initialCaseId } = useLocalSearchParams<{ id: string; caseId?: string }>();
  const insets = useSafeAreaInsets();
  
  const cases = useCasesStore((state) => state.cases);
  const { requiresActiveCase, activeCases } = useCaseRequirementGuard();
  
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [filledFileUri, setFilledFileUri] = useState('');
  const [filledFileName, setFilledFileName] = useState('');
  const [filledFileSize, setFilledFileSize] = useState(0);
  const [filledMimeType, setFilledMimeType] = useState('');
  const [downloadedTemplateUri, setDownloadedTemplateUri] = useState('');
  const [showInAppFiller, setShowInAppFiller] = useState(false);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Memoize case options for performance
  const caseOptions = useMemo(
    () =>
      cases.map((c) => ({
        value: c.id,
        label: c.referenceNumber,
      })),
    [cases]
  );

  // Get selected case details
  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return null;
    return cases.find((c) => c.id === selectedCaseId);
  }, [cases, selectedCaseId]);

  // Check if we have a valid case (either from selection or preselected)
  const hasValidCase = useMemo(() => {
    return selectedCaseId && selectedCase !== null;
  }, [selectedCaseId, selectedCase]);

  // Check if we have a preselected case (from route params)
  const hasPreselectedCase = useMemo(() => {
    return !!initialCaseId && !!selectedCaseId;
  }, [initialCaseId, selectedCaseId]);

  // Guard: Only show if no case preselected and no active cases
  useEffect(() => {
    if (!initialCaseId) {
      requiresActiveCase('download and upload templates');
    }
  }, [initialCaseId]);

  // Apply preselected case from params, or auto-select first case when cases are loaded
  useEffect(() => {
    if (initialCaseId) {
      setSelectedCaseId(initialCaseId);
      return;
    }
    if (caseOptions.length > 0 && !selectedCaseId) {
      setSelectedCaseId(caseOptions[0].value);
    }
  }, [caseOptions, initialCaseId, selectedCaseId]);

  // Load template details
  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const response = await templatesApi.getTemplate(id);
      if (response.success && response.data) {
        setTemplate(response.data);
      } else {
        toast.error({
          title: t('common.error'),
          message: response.error || 'Template not found',
        });
        router.back();
      }
    } catch (error) {
      logger.error('Error loading template', error);
      toast.error({
        title: t('common.error'),
        message: 'Failed to load template',
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!template) return;

    setIsDownloading(true);
    try {
      logger.info('Downloading template', { templateId: template.id });
      
      const localUri = await templatesApi.downloadTemplate(template.id);
      setDownloadedTemplateUri(localUri);
      
      toast.success({
        title: t('common.success'),
        message: t('templates.downloadSuccess') || 'Template downloaded successfully',
      });

      // Show bottom modal with instructions
      setShowDownloadModal(true);
    } catch (error) {
      logger.error('Error downloading template', error);
      toast.error({
        title: t('common.error'),
        message: t('templates.downloadError') || 'Failed to download template',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInAppFill = async () => {
    if (!template) return;

    try {
      // Short-circuit for files that cannot be filled in-app (e.g., PDFs)
      if (template.mimeType && template.mimeType.toLowerCase().includes('pdf')) {
        Alert.alert(
          t('templates.inAppFillNotAvailable') || 'In-App Filling Not Available',
          t('templates.useExternalApp') || 'This template cannot be filled in-app. Please download and fill using an external app.',
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      // Try to get form fields for in-app filling
      const response = await templatesApi.getTemplateFormFields(template.id);
      
      if (response.success && response.data && response.data.fields) {
        setFormFields(response.data.fields);
        setShowInAppFiller(true);
      } else {
        // Inform-only: no extra actions (download likely already done)
        Alert.alert(
          t('templates.inAppFillNotAvailable') || 'In-App Filling Not Available',
          t('templates.useExternalApp') || 'This template cannot be filled in-app. Please download and fill using an external app.',
          [{ text: t('common.ok') || 'OK' }]
        );
      }
    } catch (error) {
      logger.warn('In-app fill not available (form fields fetch)', error);
      // Inform-only: do not trigger an extra download
      Alert.alert(
        t('templates.inAppFillNotAvailable') || 'In-App Filling Not Available',
        t('templates.useExternalApp') || 'This template cannot be filled in-app. Please download and fill using an external app.',
        [{ text: t('common.ok') || 'OK' }]
      );
    }
  };

  const handleSaveFilledData = async (filledData: Record<string, any>) => {
    if (!template || !selectedCaseId) {
      toast.error({
        title: t('common.error'),
        message: 'Please select a case first',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Create a simple text file with the filled data
      const fileName = `${template.name}_filled_${Date.now()}.txt`;
      const fileContent = JSON.stringify(filledData, null, 2);
      
      // Save to local file system
      const docDir = ((FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '') as string;
      const fileUri = docDir + fileName;
      await FileSystem.writeAsStringAsync(fileUri, fileContent);
      
      // Calculate file size from content (more reliable than FileInfo.size)
      // Use TextEncoder for accurate UTF-8 byte length in React Native
      const fileSize = typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(fileContent).length
        : new Uint8Array(fileContent.split('').map(c => c.charCodeAt(0))).length || fileContent.length;
      
      // Upload the filled data
      const uploadData: UploadFilledTemplateRequest = {
        templateId: template.id,
        caseId: selectedCaseId,
        fileName: fileName,
        filePath: fileUri,
        fileSize: fileSize,
        mimeType: 'text/plain',
        filledData: filledData,
      };

      const response = await templatesApi.uploadFilledTemplate(uploadData);

      if (response.success) {
        logger.info('Filled template uploaded successfully', {
          documentId: response.data?.id,
          fileName: fileName,
        });

        toast.success({
          title: t('common.success'),
          message: t('templates.uploadSuccess') || 'Filled template uploaded successfully',
        });

        // Navigate back to documents page
        router.push('/(tabs)/documents');
      } else {
        throw new Error(response.error || t('errors.uploadFailed'));
      }
    } catch (error: any) {
      logger.error('Filled template upload failed', error);
      toast.error({
        title: t('common.error'),
        message: error.message || t('errors.uploadFailed'),
      });
    } finally {
      setIsUploading(false);
      setShowInAppFiller(false);
    }
  };

  const handlePickFilledTemplate = useCallback(async () => {
    try {
      logger.info('Opening document picker for filled template');
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

        setFilledFileUri(file.uri);
        setFilledFileName(file.name);
        setFilledFileSize(file.size || 0);
        setFilledMimeType(file.mimeType || 'application/octet-stream');
        
        logger.info('Filled template selected', {
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

  const handleUploadFilledTemplate = useCallback(async () => {
    if (!template || !selectedCaseId || !filledFileUri || !filledFileName) {
      toast.error({
        title: t('common.error'),
        message: 'Please select a case and filled template',
      });
      return;
    }

    setIsUploading(true);
    try {
      logger.info('Starting filled template upload', {
        templateId: template.id,
        caseId: selectedCaseId,
        fileName: filledFileName,
      });

      // Upload file to API
      const uploadResult = await uploadFileToAPI(
        filledFileUri,
        filledFileName,
        filledMimeType
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || t('errors.uploadFailed') || 'Upload failed');
      }

      // Upload filled template metadata
      const uploadData: UploadFilledTemplateRequest = {
        templateId: template.id,
        caseId: selectedCaseId,
        fileName: filledFileName,
        filePath: uploadResult.url!,
        fileSize: filledFileSize,
        mimeType: filledMimeType,
      };

      const response = await templatesApi.uploadFilledTemplate(uploadData);

      if (response.success) {
        logger.info('Filled template uploaded successfully', {
          documentId: response.data?.id,
          fileName: filledFileName,
        });

        toast.success({
          title: t('common.success'),
          message: t('templates.uploadSuccess') || 'Filled template uploaded successfully',
        });

        // Navigate back to documents page
        router.push('/(tabs)/documents');
      } else {
        throw new Error(response.error || t('errors.uploadFailed'));
      }
    } catch (error: any) {
      logger.error('Filled template upload failed', error);
      toast.error({
        title: t('common.error'),
        message: error.message || t('errors.uploadFailed'),
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    template,
    selectedCaseId,
    filledFileUri,
    filledFileName,
    filledFileSize,
    filledMimeType,
    t,
    router,
  ]);

  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.includes('pdf')) return 'file-pdf-box';
    if (mimeType.includes('word')) return 'file-word';
    if (mimeType.includes('excel')) return 'file-excel';
    return 'file-document';
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading template...</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Template not found</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  return (
    // <TouchDetector>
      <View style={styles.container}>
        <ModernHeader
        variant="gradient"
        gradientColors={[COLORS.primary, '#7A9BB8', '#94B5A0']}
          title={template.name}
        subtitle={template.description || (t('templates.subtitle') || 'Download and fill required documents')}
        showBackButton
        />

        {showInAppFiller ? (
          <DocumentFiller
            templateId={template.id}
            templateName={template.name}
            fields={formFields}
            onSave={handleSaveFilledData}
            onCancel={() => setShowInAppFiller(false)}
          />
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: SPACING.xl * 2 + insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
          {/* Template Info */}
          <Animated.View entering={FadeInDown.delay(0).duration(400)}>
            <Card style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={[styles.templateIcon, { backgroundColor: COLORS.primary + '15' }]}>
                  <MaterialCommunityIcons
                    name={getFileIcon(template.mimeType)}
                    size={32}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.description && (
                    <Text style={styles.templateDescription}>{template.description}</Text>
                  )}
                  <View style={styles.templateMeta}>
                    <Text style={styles.templateMetaText}>
                      {(template.fileSize / 1024).toFixed(2)} KB
                    </Text>
                    <Text style={styles.templateMetaText}>
                      {template.downloadCount} downloads
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Download Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.sectionTitle}>
                {t('templates.completeTemplate') || 'Complete template'}
            </Text>
            
            {/* In-App Fill Option */}
            <Card style={styles.actionCard}>
              <View style={styles.actionContent}>
                <MaterialCommunityIcons
                  name="file-edit"
                  size={24}
                  color={COLORS.success}
                />
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>
                      {t('templates.fillNow') || 'Fill now'}
                  </Text>
                  <Text style={styles.actionDescription}>
                      {t('templates.fillNowDesc') || 'Complete the form directly in the app'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                  onPress={handleInAppFill}
                >
                  <MaterialCommunityIcons name="file-edit" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </Card>

            {/* External Download Option */}
            <Card style={styles.actionCard}>
              <View style={styles.actionContent}>
                <MaterialCommunityIcons
                  name="download"
                  size={24}
                  color={COLORS.primary}
                />
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>
                      {t('templates.downloadBlank') || 'Download blank'}
                  </Text>
                  <Text style={styles.actionDescription}>
                      {t('templates.downloadBlankDesc') || 'Save a blank copy to fill later'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                  onPress={handleDownloadTemplate}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <MaterialCommunityIcons name="download" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          {/* Upload Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.sectionTitle}>
                {t('templates.submitCompleted') || 'Submit completed file'}
              </Text>

              {hasPreselectedCase && (!hasValidCase || caseOptions.length === 0) ? (
                /* Case preselected but not yet found in cases list - show ready state */
                <>
                  <Card style={styles.readyCard}>
                    <View style={styles.readyCardContent}>
                      <View style={[styles.readyIcon, { backgroundColor: COLORS.success + '15' }]}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={32}
                          color={COLORS.success}
                        />
                      </View>
                      <View style={styles.readyText}>
                        <Text style={styles.readyTitle}>
                          {t('templates.caseReady') || 'Case Ready'}
                        </Text>
                        <Text style={styles.readyDescription}>
                          {selectedCase
                            ? t('templates.caseReadyDesc', { caseNumber: selectedCase.referenceNumber }) || `Case ${selectedCase.referenceNumber} is ready for document upload.`
                            : t('templates.casePreselected') || 'Your case is preselected. You can now upload your filled template.'}
                        </Text>
                      </View>
                    </View>
                  </Card>

                  {/* File Selection */}
                  <Card style={styles.selectionCard}>
                    <Text style={styles.selectionTitle}>
                      {t('templates.selectFilledFile') || 'Choose file'}
                    </Text>
                    <TouchableOpacity
                      style={styles.filePicker}
                      onPress={handlePickFilledTemplate}
                    >
                      <MaterialCommunityIcons
                        name="file-upload"
                        size={24}
                        color={COLORS.primary}
                      />
                      <Text style={styles.filePickerText}>
                        {filledFileName || (t('templates.selectFile') || 'Select File')}
                      </Text>
                    </TouchableOpacity>
                  </Card>

                  {/* Upload Button */}
                  <TouchableOpacity
                    style={[
                      styles.uploadButton,
                      (!filledFileName || !selectedCaseId || isUploading) && styles.uploadButtonDisabled,
                    ]}
                    onPress={handleUploadFilledTemplate}
                    disabled={!filledFileName || !selectedCaseId || isUploading}
                  >
                    {isUploading ? (
                      <View style={styles.buttonContent}>
                        <ActivityIndicator color="white" size="small" />
                        <Text style={styles.buttonText}>
                          {t('templates.uploading') || 'Uploading...'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <MaterialCommunityIcons name="upload" size={20} color="white" />
                        <Text style={styles.buttonText}>
                          {t('templates.uploadFilled') || 'Upload Filled Template'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              ) : !hasPreselectedCase && !hasValidCase && caseOptions.length === 0 ? (
              /* No cases available and no preselected case - show rich empty state */
              <Card style={styles.noCasesCard}>
                <View style={styles.noCasesContent}>
                      <View style={[styles.noCasesIconWrap, { backgroundColor: COLORS.primary + '12' }]}>
                        <MaterialCommunityIcons
                          name="briefcase-off"
                          size={36}
                          color={COLORS.primary}
                        />
                      </View>
                      <Text style={styles.noCasesTitle}>
                        {t('templates.createCaseFirst') || 'Create a case first'}
                      </Text>
                  <Text style={styles.noCasesText}>
                    {t('templates.noCasesAvailable') || 'No cases available. Please create a case first.'}
                  </Text>
                      <View style={styles.ctaRow}>
                        <TouchableOpacity
                          style={[styles.primaryCta, { backgroundColor: COLORS.primary }]}
                          onPress={() => router.push('/case/new')}
                        >
                          <MaterialCommunityIcons name="plus-circle" size={18} color="white" />
                          <Text style={styles.primaryCtaText}>{t('cases.createCase') || 'Create Case'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.secondaryCta, { borderColor: COLORS.primary }]}
                          onPress={handleDownloadTemplate}
                        >
                          <MaterialCommunityIcons name="download" size={18} color={COLORS.primary} />
                          <Text style={[styles.secondaryCtaText, { color: COLORS.primary }]}>
                            {t('templates.downloadWithoutCase') || 'Download without case'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                </View>
              </Card>
            ) : (
              <>
                {/* Case Selection */}
                <Card style={styles.selectionCard}>
                  <Text style={styles.selectionTitle}>
                    {t('templates.selectCase') || 'Select Case'}
                  </Text>
                  <View style={styles.caseOptions}>
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
                          name="briefcase"
                          size={20}
                          color={
                            selectedCaseId === option.value
                              ? COLORS.primary
                              : COLORS.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.caseOptionText,
                            selectedCaseId === option.value && styles.caseOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
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

                {/* File Selection */}
                <Card style={styles.selectionCard}>
                  <Text style={styles.selectionTitle}>
                          {t('templates.selectFilledFile') || 'Choose file'}
                  </Text>
                  <TouchableOpacity
                    style={styles.filePicker}
                    onPress={handlePickFilledTemplate}
                  >
                    <MaterialCommunityIcons
                      name="file-upload"
                      size={24}
                      color={COLORS.primary}
                    />
                    <Text style={styles.filePickerText}>
                      {filledFileName || (t('templates.selectFile') || 'Select File')}
                    </Text>
                  </TouchableOpacity>
                </Card>

                {/* Upload Button */}
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    (!filledFileName || !selectedCaseId || isUploading) && styles.uploadButtonDisabled,
                  ]}
                  onPress={handleUploadFilledTemplate}
                  disabled={!filledFileName || !selectedCaseId || isUploading}
                >
                  {isUploading ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={styles.buttonText}>
                        {t('templates.uploading') || 'Uploading...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <MaterialCommunityIcons name="upload" size={20} color="white" />
                      <Text style={styles.buttonText}>
                        {t('templates.uploadFilled') || 'Upload Filled Template'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
            {/* Footer safe-area spacer to ensure last card is fully visible */}
            <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
        )}

      {/* Download Complete Modal (Bottom Modal) */}
      <Modal
        visible={showDownloadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDownloadModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: COLORS.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: COLORS.success + '15' }]}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={32}
                  color={COLORS.success}
                />
              </View>
              <TouchableOpacity
                onPress={() => setShowDownloadModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalTitle, { color: COLORS.text }]}>
              {t('templates.downloadComplete') || 'Download Complete'}
            </Text>

            <Text style={[styles.modalDescription, { color: COLORS.textSecondary }]}>
              {t('templates.fillInstructions') || 'The template has been downloaded. Please fill it out using your preferred app and then upload it back.'}
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: COLORS.primary }]}
              onPress={() => setShowDownloadModal(false)}
            >
              <Text style={styles.modalButtonText}>
                {t('common.ok') || 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    // </TouchDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: 18,
    color: COLORS.error,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2, // Extra bottom padding to ensure last section is fully visible
  },
  templateCard: {
    marginBottom: SPACING.lg,
    borderRadius: 16,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  templateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  templateMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionCard: {
    borderRadius: 16,
    marginBottom: SPACING.lg,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  actionText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCasesCard: {
    borderRadius: 16,
    marginBottom: SPACING.lg,
  },
  noCasesContent: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noCasesIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  noCasesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  noCasesText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ctaRow: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  primaryCta: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryCtaText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryCta: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    backgroundColor: COLORS.surface,
  },
  secondaryCtaText: {
    fontWeight: '600',
    fontSize: 15,
  },
  readyCard: {
    borderRadius: 16,
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.success + '30',
    backgroundColor: COLORS.success + '08',
  },
  readyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  readyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  readyText: {
    flex: 1,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 4,
  },
  readyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  selectionCard: {
    borderRadius: 16,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  caseOptions: {
    gap: SPACING.sm,
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
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  filePickerText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  uploadButton: {
    marginTop: SPACING.lg,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
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
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
