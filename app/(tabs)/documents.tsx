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
} from 'react-native';
import { Text as PaperText, Chip, Menu, Button, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { documentsApi } from '../../lib/api/documents.api';
import { Document, DocumentType } from '../../lib/types';
import { Card, StatusBadge, EmptyState } from '../../components/ui';
import { ModernHeader } from '../../components/ui/ModernHeader';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { useCaseRequirementGuard } from '../../lib/guards/useCaseRequirementGuard';
import { SPACING, DOCUMENT_TYPE_LABELS, COLORS } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { useDebounce } from '../../lib/hooks';
import { format } from 'date-fns';

type SortOption = 'date-desc' | 'date-asc' | 'type' | 'size';

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const { requiresActiveCase } = useCaseRequirementGuard();
  
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const response = await documentsApi.getAllDocuments();
    if (response.success && response.data) {
      setDocuments(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Handle upload navigation with case requirement
  const handleUploadPress = useCallback(() => {
    if (requiresActiveCase('upload documents')) {
      router.push('/document/upload');
    }
  }, [requiresActiveCase, router]);

  // Memoized filtered and sorted documents for performance
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
  const getFileTypeIcon = (documentType: DocumentType) => {
    switch (documentType) {
      case 'PASSPORT': return 'passport';
      case 'ID_CARD': return 'card-account-details';
      case 'DIPLOMA': return 'school';
      case 'OTHER': return 'file-document';
      default: return 'file-document';
    }
  };

  // Memoized render function for performance
  const renderDocumentItem = useCallback(
    ({ item, index }: { item: Document; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 200)).springify()}>
        <Card
          onPress={() => router.push(`/document/${item.id}`)}
          style={styles.card}
        >
          <View style={styles.cardContent}>
            {/* Header with document name and status */}
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

            {/* Document Type and File Size Row */}
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

            {/* Info Row */}
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

  // Memoize key extractor for FlatList performance
  const keyExtractor = useCallback((item: Document) => item.id, []);

  return (
    <TouchDetector>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Gradient Header */}
      <ModernHeader
        variant="gradient"
        gradientColors={[colors.primary, '#7A9BB8', '#94B5A0']}
        title="Documents"
        subtitle="Upload and manage your files"
        showBackButton
        showSearch
        searchPlaceholder={t('documents.searchDocuments')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showAddButton
        addButtonIcon="plus"
        onAddPress={handleUploadPress}
        showFilterButton
        onFilterPress={() => setTypeMenuVisible(true)}
      >
        {/* Filter Bar with Menus */}
        <View style={[styles.filtersBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {/* Document Type Filter */}
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

            {/* Sort Menu */}
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

            {/* Clear Filters */}
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

        {/* Results Count */}
        <View style={[styles.resultsBar, { backgroundColor: colors.surface }]}>
          <PaperText style={[styles.resultsText, { color: colors.textSecondary }]}>
            {filteredAndSortedDocuments.length} {filteredAndSortedDocuments.length === 1 ? 'document' : 'documents'} found
          </PaperText>
        </View>
      </ModernHeader>

      {/* Documents List */}
      <FlatList
        data={filteredAndSortedDocuments}
        renderItem={renderDocumentItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
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
        // Performance optimizations for large lists
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
    </View>
    </TouchDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Will be set dynamically
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
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  searchContainer: {
    flex: 1,
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
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
  list: {
    padding: SPACING.md,
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
});
