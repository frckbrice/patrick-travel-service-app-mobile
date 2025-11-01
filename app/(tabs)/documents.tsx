import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Text,
  Modal,
} from 'react-native';
import { Text as PaperText, Chip, Menu, Button, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { documentsApi } from '../../lib/api/documents.api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToAPI } from '../../lib/services/fileUpload';
import { templatesApi } from '../../lib/api/templates.api';
import { casesApi } from '../../lib/api/cases.api';
import { Document, DocumentType, DocumentTemplate, ServiceType, TemplateCategory } from '../../lib/types';
import { Card, StatusBadge, EmptyState } from '../../components/ui';
import { ModernHeader } from '../../components/ui/ModernHeader';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { useCaseRequirementGuard } from '../../lib/guards/useCaseRequirementGuard';
import { SPACING, DOCUMENT_TYPE_LABELS, COLORS } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { useDebounce } from '../../lib/hooks';
import { format } from 'date-fns';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { toast } from '../../lib/services/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';

type SortOption = 'date-desc' | 'date-asc' | 'type' | 'size';
type TabType = 'documents' | 'templates';

export default function DocumentsScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const { requiresActiveCase, hasActiveCases } = useCaseRequirementGuard();
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const scrollProps = useTabBarScroll();

  // Active tab state - check URL params first, default to documents
  const [activeTab, setActiveTab] = useState<TabType>((params.tab as TabType) || 'documents');

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | undefined>();
  const [isCasePickerVisible, setIsCasePickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'templates' | 'upload' | null>(null);
  const [availableCases, setAvailableCases] = useState<Array<{ id: string; referenceNumber?: string; serviceType?: string }>>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [templatePendingCase, setTemplatePendingCase] = useState<DocumentTemplate | null>(null);
  const [showNoCaseModal, setShowNoCaseModal] = useState(false);
  // Quick upload modal state
  const [showQuickUploadModal, setShowQuickUploadModal] = useState(false);
  const [pickedFileUri, setPickedFileUri] = useState('');
  const [pickedFileName, setPickedFileName] = useState('');
  const [pickedFileSize, setPickedFileSize] = useState(0);
  const [pickedMimeType, setPickedMimeType] = useState('');
  const [pickedDocumentType, setPickedDocumentType] = useState<DocumentType>(DocumentType.OTHER);
  const [isQuickUploading, setIsQuickUploading] = useState(false);
  const [quickUploadProgress, setQuickUploadProgress] = useState(0);

  // Update active tab when URL params change
  useEffect(() => {
    if (params.tab === 'templates' || params.tab === 'documents') {
      setActiveTab(params.tab as TabType);
    }
  }, [params.tab]);

  // Fetch documents
  const fetchDocuments = async () => {
    setIsLoadingDocuments(true);
    const response = await documentsApi.getAllDocuments();
    if (response.success && response.data) {
      setDocuments(response.data);
    }
    setIsLoadingDocuments(false);
  };

  // Fetch templates
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await templatesApi.listTemplates({
        serviceType: selectedServiceType,
        category: selectedCategory,
      });

      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    } else {
      fetchTemplates();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [selectedServiceType, selectedCategory]);

  // Debounce search queries
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedTemplateSearchQuery = useDebounce(templateSearchQuery, 300);

  // Handle upload navigation with case requirement
  const handleUploadPress = useCallback(async () => {
    // Open quick upload modal to pick a file without navigating
    setPickedFileUri('');
    setPickedFileName('');
    setPickedFileSize(0);
    setPickedMimeType('');
    setPickedDocumentType(DocumentType.OTHER);
    setShowQuickUploadModal(true);
  }, []);

  const quickPickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const a = result.assets[0];
        setPickedFileUri(a.uri);
        setPickedFileName(a.name);
        setPickedFileSize(a.size || 0);
        setPickedMimeType(a.mimeType || 'application/octet-stream');
      }
    } catch (e) {
      console.error('Quick pick document error', e);
    }
  }, []);

  const quickPickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const a = result.assets[0];
        setPickedFileUri(a.uri);
        setPickedFileName(a.fileName || `image_${Date.now()}.jpg`);
        setPickedFileSize(a.fileSize || 0);
        setPickedMimeType(a.type || 'image/jpeg');
        setPickedDocumentType(DocumentType.OTHER);
      }
    } catch (e) {
      console.error('Quick pick image error', e);
    }
  }, []);

  const quickTakePhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const a = result.assets[0];
        setPickedFileUri(a.uri);
        setPickedFileName(a.fileName || `photo_${Date.now()}.jpg`);
        setPickedFileSize(a.fileSize || 0);
        setPickedMimeType(a.type || 'image/jpeg');
        setPickedDocumentType(DocumentType.OTHER);
      }
    } catch (e) {
      console.error('Quick take photo error', e);
    }
  }, []);

  const proceedAfterFilePicked = useCallback(async () => {
    if (!pickedFileUri) return;
    try {
      setIsLoadingCases(true);
      setPickerMode('upload');
      const response = await casesApi.getCases(undefined, 1, 50);
      const items = (response.success && response.data ? response.data : []).map((c: any) => ({
        id: c.id,
        referenceNumber: c.referenceNumber,
        serviceType: c.serviceType,
      }));
      if (items.length === 0) {
        // No cases: ask user to create or cancel
        setShowNoCaseModal(true);
        return;
      }
      // Auto-select when only one active case, otherwise show picker
      if (items.length === 1) {
        await quickPerformUpload(items[0].id);
        return;
      }
      setAvailableCases(items);
      setIsCasePickerVisible(true);
    } catch (e) {
      console.error('Failed to load cases for quick upload', e);
    } finally {
      setIsLoadingCases(false);
    }
  }, [pickedFileUri]);

  const quickPerformUpload = useCallback(async (caseId: string) => {
    if (!pickedFileUri || !pickedFileName) return;
    setIsQuickUploading(true);
    setQuickUploadProgress(0);
    try {
      // Upload file to API
      const uploadResult = await uploadFileToAPI(
        pickedFileUri,
        pickedFileName,
        pickedMimeType
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed - no URL returned');
      }

      // Save document metadata
      const payload = {
        caseId,
        documentType: pickedDocumentType,
        fileName: pickedFileName,
        filePath: uploadResult.url,
        fileSize: pickedFileSize,
        mimeType: pickedMimeType,
      };
      const resp = await documentsApi.uploadDocument(payload);

      if (resp.success) {
        setShowQuickUploadModal(false);
        setPickedFileUri('');
        setPickedFileName('');
        setPickedFileSize(0);
        setPickedMimeType('');
        setQuickUploadProgress(0);
        toast.success({
          title: t('documents.uploadSuccess') || 'Success',
          message: t('documents.uploadSuccessMessage') || 'Document uploaded successfully',
        });
        fetchDocuments();
      } else {
        throw new Error(resp.error || 'Create document failed');
      }
    } catch (e: any) {
      console.error('Quick upload error', e);
      const message = typeof e?.message === 'string' ? e.message : 'Upload failed';
      toast.error({
        title: t('common.error') || 'Error',
        message: message.includes('404')
          ? (t('errors.uploadServiceNotReachable') || 'Upload service not reachable (404). Please try again.')
          : message,
      });
    } finally {
      setIsQuickUploading(false);
      setQuickUploadProgress(0);
    }
  }, [pickedFileUri, pickedFileName, pickedMimeType, pickedFileSize, pickedDocumentType, fetchDocuments, t]);

  // Memoized filtered and sorted documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter((doc) => {
      const matchesSearch = doc.originalName
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase());
      const matchesType = !selectedType || doc.documentType === selectedType;
      return matchesSearch && matchesType;
    });

    // Sort documents
    switch (sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime());
        break;
      case 'type':
        filtered.sort((a, b) => a.documentType.localeCompare(b.documentType));
        break;
      case 'size':
        filtered.sort((a, b) => b.fileSize - a.fileSize);
        break;
    }

    return filtered;
  }, [documents, debouncedSearchQuery, selectedType, sortBy]);

  // Memoized filtered templates
  const filteredTemplates = useMemo(() => {
    const q = (debouncedTemplateSearchQuery || '').trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => {
      const haystacks = [
        template.name,
        template.description || '',
        template.fileName,
        String(template.category),
        String(template.serviceType),
      ].map((s) => s.toLowerCase());
      return haystacks.some((h) => h.includes(q));
    });
  }, [templates, debouncedTemplateSearchQuery]);

  // Template handlers
  const handleDownload = async (template: DocumentTemplate) => {
    try {
      const localUri = await templatesApi.downloadTemplate(template.id);

      // Share the downloaded template
      const { shareAsync, isAvailableAsync } = await import('expo-sharing');
      const canShare = await isAvailableAsync();

      if (canShare) {
        await shareAsync(localUri, {
          mimeType: template.mimeType,
          dialogTitle: 'Share Template',
        });
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleDownloadAndFill = (template: DocumentTemplate) => {
    setTemplatePendingCase(template);
    setPickerMode('templates');
    openCasePicker(template);
  };

  const openCasePicker = async (template: DocumentTemplate) => {
    try {
      setIsLoadingCases(true);
      const response = await casesApi.getCases(undefined, 1, 50);
      const items = (response.success && response.data ? response.data : []).map((c: any) => ({
        id: c.id,
        referenceNumber: c.referenceNumber,
        serviceType: c.serviceType,
      }));
      if (items.length === 0) {
        // No cases - allow download without case or navigate to template detail
        router.push(`/template/${template.id}`);
        setTemplatePendingCase(null);
        return;
      }
      setAvailableCases(items);
      setIsCasePickerVisible(true);
    } catch (e) {
      console.error('Failed to load cases', e);
      // On error, navigate to template detail page
      router.push(`/template/${template.id}`);
      setTemplatePendingCase(null);
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handlePickCase = (caseId: string) => {
    const template = templatePendingCase;
    setIsCasePickerVisible(false);
    setTemplatePendingCase(null);
    if (pickerMode === 'upload') {
      // Perform quick inline upload with selected case
      quickPerformUpload(caseId);
      return;
    }
    if (!template) return;
    router.push(`/template/${template.id}?caseId=${caseId}`);
  };

  // Get file type color
  const getFileTypeColor = (documentType: DocumentType) => {
    switch (documentType) {
      case 'PASSPORT': return '#3B82F6';
      case 'ID_CARD': return '#10B981';
      case 'DIPLOMA': return '#F59E0B';
      case 'OTHER': return '#6B7280';
      default: return colors.textSecondary;
    }
  };

  // Get file type icon
  const getFileTypeIcon = useCallback((documentType: DocumentType) => {
    switch (documentType) {
      case 'PASSPORT': return 'passport';
      case 'ID_CARD': return 'card-account-details';
      case 'DIPLOMA': return 'school';
      case 'OTHER': return 'file-document';
      default: return 'file-document';
    }
  }, []);

  // Get template file icon
  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.includes('pdf')) return 'file-pdf-box';
    if (mimeType.includes('word')) return 'file-word';
    if (mimeType.includes('excel')) return 'file-excel';
    return 'file-document';
  }, []);

  const getCategoryIcon = useCallback((category: TemplateCategory) => {
    switch (category) {
      case TemplateCategory.FORM:
        return 'file-document-edit';
      case TemplateCategory.GUIDE:
        return 'book-open-variant';
      case TemplateCategory.SAMPLE:
        return 'file-eye';
      case TemplateCategory.CHECKLIST:
        return 'check-circle';
      default:
        return 'file';
    }
  }, []);

  // Render document item
  const renderDocumentItem = useCallback(
    ({ item, index }: { item: Document; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 200)).springify()}>
        <Card
          onPress={() => router.push(`/document/${item.id}`)}
          style={{ ...styles.card, backgroundColor: colors.card }}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.documentContainer}>
                <MaterialCommunityIcons
                  name={getFileTypeIcon(item.documentType)}
                  size={20}
                  color={getFileTypeColor(item.documentType)}
                  style={styles.icon}
                />
                <PaperText style={styles.documentName} numberOfLines={1}>
                  {item.originalName}
                </PaperText>
              </View>
              <StatusBadge status={item.status} />
            </View>

            <View style={styles.metaRow}>
              <View style={[styles.typeBadge, { backgroundColor: getFileTypeColor(item.documentType) + '15' }]}>
                <MaterialCommunityIcons
                  name={getFileTypeIcon(item.documentType)}
                  size={12}
                  color={getFileTypeColor(item.documentType)}
                />
                <PaperText style={[styles.typeText, { color: getFileTypeColor(item.documentType) }]}>
                  {DOCUMENT_TYPE_LABELS[item.documentType]}
                </PaperText>
              </View>
              <View style={styles.sizeChip}>
                <MaterialCommunityIcons
                  name="file"
                  size={12}
                  color={colors.textSecondary}
                  style={styles.sizeIcon}
                />
                <PaperText style={styles.sizeText}>
                  {(item.fileSize / 1024).toFixed(1)} KB
                </PaperText>
              </View>
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={14}
                  color={colors.textSecondary}
                />
                <PaperText style={styles.infoText}>
                  {format(new Date(item.uploadDate), 'MMM dd, yyyy')}
                </PaperText>
              </View>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="clock"
                  size={14}
                  color={colors.textSecondary}
                />
                <PaperText style={styles.infoText}>
                  {format(new Date(item.uploadDate), 'HH:mm')}
                </PaperText>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>
    ),
    [router, getFileTypeColor, getFileTypeIcon, colors]
  );

  // Render template item
  const renderTemplateItem = useCallback(
    ({ item, index }: { item: DocumentTemplate; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Card style={{ ...styles.card, backgroundColor: colors.card }}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons
                  name={getFileIcon(item.mimeType)}
                  size={32}
                  color={colors.primary}
                />
              </View>
              <View style={styles.fileDetails}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.description && (
                  <Text style={[styles.fileDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
              {item.isRequired && (
                <View style={[styles.requiredBadge, { backgroundColor: colors.error + '20' }]}>
                  <Text style={[styles.requiredText, { color: colors.error }]}>
                    {t('templates.required')}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name={getCategoryIcon(item.category)}
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {item.category}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="download"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {(item.fileSize / 1024).toFixed(2)} KB
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="tag"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {item.downloadCount} {t('templates.downloads')}
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: colors.secondary }]}
                onPress={() => handleDownload(item)}
              >
                <MaterialCommunityIcons name="share" size={20} color="white" />
                <Text style={styles.downloadButtonText}>{t('templates.share')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: '#0066CC' }]}
                onPress={() => handleDownloadAndFill(item)}
              >
                <MaterialCommunityIcons name="file-edit" size={20} color="white" />
                <Text style={styles.downloadButtonText}>{t('templates.downloadAndFill')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </Animated.View>
    ),
    [colors, getFileIcon, getCategoryIcon, t, handleDownload, handleDownloadAndFill]
  );

  const keyExtractor = useCallback((item: Document | DocumentTemplate) => item.id, []);
  const templateKeyExtractor = useCallback((item: DocumentTemplate) => item.id, []);

  // Get search placeholder based on active tab
  const getSearchPlaceholder = () => {
    return activeTab === 'documents'
      ? t('documents.searchDocuments')
      : t('templates.searchTemplates');
  };

  // Get search value based on active tab
  const getSearchValue = () => {
    return activeTab === 'documents' ? searchQuery : templateSearchQuery;
  };

  // Handle search change based on active tab
  const handleSearchChange = (value: string) => {
    if (activeTab === 'documents') {
      setSearchQuery(value);
    } else {
      setTemplateSearchQuery(value);
    }
  };

  return (
    // <TouchDetector>
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom + SPACING.lg }]}>
      <ModernHeader
        variant="gradient"
        gradientColors={[colors.primary, colors.secondary, colors.accent]}
        title={activeTab === 'documents' ? t('documents.title') || 'Documents' : t('templates.title') || 'Templates'}
        subtitle={activeTab === 'documents' ? (t('documents.subtitle') || 'Upload and manage your files') : (t('templates.subtitle') || 'Download and fill required documents')}
        showBackButton
        showSearch={false}
        showAddButton={activeTab === 'documents'}
        addButtonIcon="plus"
        onAddPress={handleUploadPress}
        showFilterButton={activeTab === 'documents'}
        onFilterPress={() => setTypeMenuVisible(true)}
      >
        {/* Segmented Control */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === 'documents' && [styles.segmentActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('documents')}
          >
            <MaterialCommunityIcons
              name="file-document-multiple"
              size={18}
              color={activeTab === 'documents' ? 'white' : colors.textSecondary}
            />
            <Text style={[
              styles.segmentText,
              { color: activeTab === 'documents' ? 'white' : colors.textSecondary }
            ]}>
              {t('documents.title') || 'Documents'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === 'templates' && [styles.segmentActive, { backgroundColor: '#0066CC' }],
            ]}
            onPress={() => setActiveTab('templates')}
          >
            <MaterialCommunityIcons
              name="file-download-outline"
              size={18}
              color={activeTab === 'templates' ? 'white' : colors.textSecondary}
            />
            <Text style={[
              styles.segmentText,
              { color: activeTab === 'templates' ? 'white' : colors.textSecondary }
            ]}>
              {t('templates.title') || 'Templates'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* In-page Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={getSearchPlaceholder()}
            value={getSearchValue()}
            onChangeText={handleSearchChange}
            style={[styles.searchInput, { color: colors.text }]}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Documents Tab Filters */}
        {activeTab === 'documents' && (
          <>
            <View style={[styles.filtersBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContent}
              >
                <Menu
                  visible={typeMenuVisible}
                  onDismiss={() => setTypeMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        selectedType && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                      ]}
                      onPress={() => setTypeMenuVisible(!typeMenuVisible)}
                    >
                      <MaterialCommunityIcons
                        name="file-document"
                        size={16}
                        color={selectedType ? colors.primary : colors.textSecondary}
                        style={{ marginRight: SPACING.xs }}
                      />
                      <PaperText style={[styles.filterButtonText, selectedType && styles.filterButtonTextActive]}>
                        {selectedType ? DOCUMENT_TYPE_LABELS[selectedType] : 'Type'}
                      </PaperText>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={16}
                        color={selectedType ? colors.primary : colors.textSecondary}
                        style={{ marginLeft: SPACING.xs }}
                      />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setSelectedType(undefined);
                      setTypeMenuVisible(false);
                    }}
                    title="All Types"
                    leadingIcon={!selectedType ? "check" : undefined}
                  />
                  <Divider />
                  {(['PASSPORT', 'ID_CARD', 'DIPLOMA', 'OTHER'] as DocumentType[]).map((type) => (
                    <Menu.Item
                      key={type}
                      onPress={() => {
                        setSelectedType(type);
                        setTypeMenuVisible(false);
                      }}
                      title={DOCUMENT_TYPE_LABELS[type]}
                      leadingIcon={selectedType === type ? "check" : undefined}
                    />
                  ))}
                </Menu>

                <Menu
                  visible={sortMenuVisible}
                  onDismiss={() => setSortMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={[styles.filterButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => setSortMenuVisible(!sortMenuVisible)}
                    >
                      <MaterialCommunityIcons
                        name="sort"
                        size={16}
                        color={colors.textSecondary}
                        style={{ marginRight: SPACING.xs }}
                      />
                      <PaperText style={styles.filterButtonText}>
                        {sortBy === 'date-desc' && 'Newest'}
                        {sortBy === 'date-asc' && 'Oldest'}
                        {sortBy === 'type' && 'Type'}
                        {sortBy === 'size' && 'Size'}
                      </PaperText>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={16}
                        color={colors.textSecondary}
                        style={{ marginLeft: SPACING.xs }}
                      />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setSortBy('date-desc');
                      setSortMenuVisible(false);
                    }}
                    title="Newest First"
                    leadingIcon={sortBy === 'date-desc' ? "check" : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setSortBy('date-asc');
                      setSortMenuVisible(false);
                    }}
                    title="Oldest First"
                    leadingIcon={sortBy === 'date-asc' ? "check" : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setSortBy('type');
                      setSortMenuVisible(false);
                    }}
                    title="By Type"
                    leadingIcon={sortBy === 'type' ? "check" : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setSortBy('size');
                      setSortMenuVisible(false);
                    }}
                    title="By Size"
                    leadingIcon={sortBy === 'size' ? "check" : undefined}
                  />
                </Menu>

                {selectedType && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSelectedType(undefined);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={16}
                      color={colors.error}
                    />
                    <PaperText style={styles.clearButtonText}>Clear</PaperText>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            <View style={[styles.resultsBar, { backgroundColor: colors.surface }]}>
              <PaperText style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredAndSortedDocuments.length} {filteredAndSortedDocuments.length === 1 ? 'document' : 'documents'} found
              </PaperText>
            </View>
          </>
        )}

        {/* Templates Tab Filters */}
        {activeTab === 'templates' && (
          <View style={styles.filtersSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('templates.filter.serviceType') || 'Service Type'}
            </Text>
            <FlatList
              data={[undefined as any, ...Object.values(ServiceType)]}
              keyExtractor={(v, idx) => (v || 'all') + '-' + idx}
              renderItem={({ item }) => (
                <Chip
                  selected={selectedServiceType === item || (!item && !selectedServiceType)}
                  onPress={() => setSelectedServiceType(item)}
                  style={styles.filterChip}
                >
                  {item || (t('templates.allServices') || 'All Services')}
                </Chip>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            />

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: SPACING.sm }]}>
              {t('templates.filter.category') || 'Category'}
            </Text>
            <FlatList
              data={[undefined as any, ...Object.values(TemplateCategory)]}
              keyExtractor={(v, idx) => (v || 'all') + '-' + idx}
              renderItem={({ item }) => (
                <Chip
                  selected={selectedCategory === item || (!item && !selectedCategory)}
                  onPress={() => setSelectedCategory(item)}
                  style={styles.filterChip}
                >
                  {item || (t('templates.allCategories') || 'All Categories')}
                </Chip>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            />
          </View>
        )}
      </ModernHeader>

      {/* Documents List */}
      {activeTab === 'documents' && (
        <FlatList
          data={filteredAndSortedDocuments}
          renderItem={renderDocumentItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }
          ]}
          onScroll={scrollProps.onScroll}
          scrollEventThrottle={scrollProps.scrollEventThrottle}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingDocuments}
              onRefresh={fetchDocuments}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title={t('documents.noDocuments')}
              description={t('documents.noDocumentsDescription')}
              actionText={t('documents.uploadDocument')}
              onAction={handleUploadPress}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 180,
            offset: 180 * index,
            index,
          })}
        />
      )}

      {/* Templates List */}
      {activeTab === 'templates' && (
        isLoadingTemplates ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTemplates}
            renderItem={renderTemplateItem}
            keyExtractor={templateKeyExtractor}
            contentContainerStyle={styles.list}
            onScroll={scrollProps.onScroll}
            scrollEventThrottle={scrollProps.scrollEventThrottle}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingTemplates}
                onRefresh={fetchTemplates}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="file-document-outline"
                title={t('templates.noTemplates')}
                description={t('templates.noTemplatesDescription')}
              />
            }
          />
        )
      )}

      {/* Case Picker Modal (Bottom Modal) */}
      <Modal
        visible={isCasePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCasePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, paddingBottom: SPACING.lg + (typeof insets !== 'undefined' ? insets.bottom : 0) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('cases.selectCase') || 'Select Case'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsCasePickerVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {isLoadingCases ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={availableCases}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.caseRow}
                    activeOpacity={0.7}
                    onPress={() => handlePickCase(item.id)}
                  >
                    <View style={styles.caseRowLeft}>
                      <MaterialCommunityIcons name="briefcase" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.caseRowBody}>
                      <Text style={[styles.caseRowTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.referenceNumber || item.id}
                      </Text>
                      {!!item.serviceType && (
                        <Text style={[styles.caseRowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.serviceType}
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                style={{ maxHeight: 320 }}
              />
            )}
            {pickerMode === 'templates' && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    const template = templatePendingCase;
                    setIsCasePickerVisible(false);
                    setTemplatePendingCase(null);
                    if (template) {
                      router.push(`/template/${template.id}`);
                    }
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>
                    {t('templates.download') || 'Download without case'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Quick Upload Modal */}
      <Modal
        visible={showQuickUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickUploadModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, paddingBottom: SPACING.lg + (typeof insets !== 'undefined' ? insets.bottom : 0) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('documents.uploadDocument') || 'Upload Document'}
              </Text>
              <TouchableOpacity onPress={() => setShowQuickUploadModal(false)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Pickers */}
            <View style={{ gap: SPACING.sm }}>
              <TouchableOpacity style={[styles.pickerActionBtn, { borderColor: colors.border }]} onPress={quickPickDocument}>
                <MaterialCommunityIcons name="file-document" size={20} color={colors.primary} />
                <Text style={[styles.pickerActionText, { color: colors.text }]}>{t('documents.chooseFile') || 'Choose File'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickerActionBtn, { borderColor: colors.border }]} onPress={quickPickImage}>
                <MaterialCommunityIcons name="image" size={20} color={colors.primary} />
                <Text style={[styles.pickerActionText, { color: colors.text }]}>{t('documents.chooseImage') || 'Choose Image'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickerActionBtn, { borderColor: colors.border }]} onPress={quickTakePhoto}>
                <MaterialCommunityIcons name="camera" size={20} color={colors.primary} />
                <Text style={[styles.pickerActionText, { color: colors.text }]}>{t('documents.takePhoto') || 'Take Photo'}</Text>
              </TouchableOpacity>
            </View>

            {/* Selected file preview */}
            {!!pickedFileName && (
              <View style={[styles.quickPreview, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons
                  name={pickedMimeType.includes('pdf') ? 'file-pdf-box' : pickedMimeType.startsWith('image/') ? 'file-image' : 'file'}
                  size={28}
                  color={colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quickPreviewName, { color: colors.text }]} numberOfLines={1}>{pickedFileName}</Text>
                  <Text style={[styles.quickPreviewMeta, { color: colors.textSecondary }]}>{(pickedFileSize / 1024).toFixed(1)} KB</Text>
                </View>
                <TouchableOpacity onPress={() => { setPickedFileUri(''); setPickedFileName(''); setPickedFileSize(0); setPickedMimeType(''); }}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Document type quick selector */}
            <View style={{ marginTop: SPACING.md, flexDirection: 'row', gap: SPACING.sm }}>
              {[DocumentType.PASSPORT, DocumentType.ID_CARD, DocumentType.DIPLOMA, DocumentType.OTHER].map((dt) => (
                <TouchableOpacity
                  key={dt}
                  style={[
                    styles.quickTypeBtn,
                    { borderColor: colors.border, backgroundColor: pickedDocumentType === dt ? colors.primary + '15' : colors.surface },
                  ]}
                  onPress={() => setPickedDocumentType(dt)}
                >
                  <Text style={{ color: pickedDocumentType === dt ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                    {DOCUMENT_TYPE_LABELS[dt]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Continue button */}
            <TouchableOpacity
              style={[styles.quickContinueBtn, { backgroundColor: pickedFileName ? colors.primary : colors.border }]}
              disabled={!pickedFileName || isQuickUploading}
              onPress={proceedAfterFilePicked}
            >
              {isQuickUploading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <MaterialCommunityIcons name="arrow-right" size={18} color={pickedFileName ? 'white' : colors.text} />
              )}
              <Text style={[styles.quickContinueText, { color: 'white' }]}>
                {pickedFileName ? (t('common.continue') || 'Continue') : (t('documents.selectFileFirst') || 'Please select a case and file')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* No Active Case Modal */}
      <Modal
        visible={showNoCaseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoCaseModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.noCaseModalCard, { backgroundColor: colors.surface, paddingBottom: SPACING.lg + (typeof insets !== 'undefined' ? insets.bottom : 0) }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.noCaseIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                <MaterialCommunityIcons
                  name="briefcase-off"
                  size={32}
                  color={COLORS.primary}
                />
              </View>
              <TouchableOpacity
                onPress={() => setShowNoCaseModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.noCaseModalTitle, { color: colors.text }]}>
              {t('common.noActiveCase') || 'No Active Case'}
            </Text>

            <Text style={[styles.noCaseModalDescription, { color: colors.textSecondary }]}>
              {t('common.noActiveCaseDesc') || 'You must have an active case to upload documents. Would you like to create one now?'}
            </Text>

            <View style={styles.noCaseModalActions}>
              <TouchableOpacity
                style={[styles.noCaseModalButton, { borderColor: colors.border }]}
                onPress={() => setShowNoCaseModal(false)}
              >
                <Text style={[styles.noCaseModalButtonText, { color: colors.text }]}>
                  {t('common.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noCaseModalButtonPrimary, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowNoCaseModal(false);
                  router.push('/case/new');
                }}
              >
                <MaterialCommunityIcons name="plus-circle" size={18} color="white" />
                <Text style={styles.noCaseModalButtonPrimaryText}>
                  {t('cases.createCase') || 'Create Case'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    gap: SPACING.xs,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filtersBar: {
    borderBottomWidth: 1,
  },
  filtersContent: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md + SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: SPACING.sm,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#3B82F6',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  resultsBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  card: {
    marginBottom: SPACING.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderRadius: 16,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: SPACING.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  sizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sizeIcon: {
    marginRight: 4,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginTop: SPACING.xs,
  },
  infoText: {
    fontSize: 13,
    marginLeft: 4,
  },
  // Template-specific styles
  filtersSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  filtersRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  filterChip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileDescription: {
    fontSize: 13,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginBottom: SPACING.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalLoadingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  caseRowLeft: {
    marginRight: SPACING.md,
  },
  caseRowBody: {
    flex: 1,
  },
  caseRowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  caseRowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 1,
    opacity: 0.6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Quick upload styles
  pickerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pickerActionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  quickPreview: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: SPACING.md,
  },
  quickPreviewName: {
    fontSize: 15,
    fontWeight: '600',
  },
  quickPreviewMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  quickTypeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  quickContinueBtn: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  quickContinueText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // No Case Modal styles
  noCaseModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '60%',
  },
  noCaseIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCaseModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  noCaseModalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  noCaseModalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  noCaseModalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCaseModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  noCaseModalButtonPrimary: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  noCaseModalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});
