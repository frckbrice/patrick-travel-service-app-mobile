import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Chip } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../features/auth/hooks/useAuth';
import { templatesApi } from '../lib/api/templates.api';
import { DocumentTemplate, ServiceType, TemplateCategory } from '../lib/types';
import { Card, EmptyState } from '../components/ui';
import { ModernHeader } from '../components/ui/ModernHeader';
import { TouchDetector } from '../components/ui/TouchDetector';
import { useDebounce } from '../lib/hooks';
import { SPACING } from '../lib/constants';
import { useThemeColors } from '../lib/theme/ThemeContext';
import { format } from 'date-fns';
import { casesApi } from '../lib/api/cases.api';
import { useAuthStore } from '../stores/auth/authStore';
import { Alert } from '../lib/utils/alert';

export default function TemplatesScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | undefined>();
  const [isCasePickerVisible, setIsCasePickerVisible] = useState(false);
  const [availableCases, setAvailableCases] = useState<Array<{ id: string; referenceNumber?: string; serviceType?: string }>>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [templatePendingCase, setTemplatePendingCase] = useState<DocumentTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedServiceType, selectedCategory]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredTemplates = useMemo(() => {
    const q = (debouncedSearchQuery || '').trim().toLowerCase();
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
  }, [templates, debouncedSearchQuery]);

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
        Alert.alert(
          t('cases.myCases') || 'My Cases',
          t('documents.noCasesAvailable') || 'No cases available. Please create a case first.',
          [
            { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => setTemplatePendingCase(null) },
            { text: t('cases.newCase') || 'New Case', onPress: () => router.push('/case/new') },
            { text: t('templates.download') || 'Download', onPress: () => router.push(`/template/${template.id}`) },
          ]
        );
        return;
      }
      setAvailableCases(items);
      setIsCasePickerVisible(true);
    } catch (e) {
      console.error('Failed to load cases', e);
      router.push(`/template/${template.id}`);
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handlePickCase = (caseId: string) => {
    const template = templatePendingCase;
    setIsCasePickerVisible(false);
    setTemplatePendingCase(null);
    if (!template) return;
    router.push(`/template/${template.id}?caseId=${caseId}`);
  };

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

  const renderTemplateItem = useCallback(
    ({ item, index }: { item: DocumentTemplate; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Card style={styles.card}>
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
                style={[styles.downloadButton, { backgroundColor: colors.primary }]}
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

  const keyExtractor = useCallback((item: DocumentTemplate) => item.id, []);

  return (
    // <TouchDetector>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ModernHeader
        variant="gradient"
        gradientColors={[colors.primary, '#7A9BB8', '#94B5A0']}
        title={t('templates.title') || 'Templates'}
        subtitle={t('templates.subtitle') || 'Download and fill required documents'}
        showBackButton
      />

      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={t('templates.searchTemplates')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Filters Section - organized like cases page */}
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTemplates}
          renderItem={renderTemplateItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title={t('templates.noTemplates')}
              description={t('templates.noTemplatesDescription')}
            />
          }
        />
      )}

      {/* Case Picker Modal */}
      <Modal visible={isCasePickerVisible} transparent animationType="slide" onRequestClose={() => setIsCasePickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('cases.selectCase') || 'Select Case'}
            </Text>
            {isLoadingCases ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <FlatList
                data={availableCases}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.caseRow} activeOpacity={0.7} onPress={() => handlePickCase(item.id)}>
                    <View style={styles.caseRowLeft}>
                      <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.textSecondary} />
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
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setIsCasePickerVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
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
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    height: 52,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexWrap: 'wrap',
  },
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
  list: {
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  card: {
    marginBottom: SPACING.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
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
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: 12,
    marginLeft: SPACING.xs,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
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
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
  },
  modalBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

