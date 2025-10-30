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
import { useDebounce } from '../lib/hooks';
import { SPACING } from '../lib/constants';
import { useThemeColors } from '../lib/theme/ThemeContext';
import { format } from 'date-fns';

export default function TemplatesScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | undefined>();

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
    return templates.filter((template) => {
      const matchesSearch = template.name
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      return matchesSearch;
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
    router.push(`/template/${template.id}`);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          />
        </View>
      </View>

      {/* Service Type Filters */}
      <View style={styles.filters}>
        <Chip
          selected={!selectedServiceType}
          onPress={() => setSelectedServiceType(undefined)}
          style={styles.filterChip}
        >
          {t('templates.allServices')}
        </Chip>
        {Object.values(ServiceType).map((serviceType) => (
          <Chip
            key={serviceType}
            selected={selectedServiceType === serviceType}
            onPress={() => setSelectedServiceType(serviceType)}
            style={styles.filterChip}
          >
            {serviceType}
          </Chip>
        ))}
      </View>

      {/* Category Filters */}
      <View style={styles.filters}>
        <Chip
          selected={!selectedCategory}
          onPress={() => setSelectedCategory(undefined)}
          style={styles.filterChip}
        >
          {t('templates.allCategories')}
        </Chip>
        {Object.values(TemplateCategory).map((category) => (
          <Chip
            key={category}
            selected={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
            style={styles.filterChip}
          >
            {category}
          </Chip>
        ))}
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
    </View>
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
});

