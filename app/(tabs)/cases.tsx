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
import { useCasesStore } from '../../stores/cases/casesStore';
import { Case, CaseStatus, ServiceType, Priority } from '../../lib/types';
import {
  Card,
  StatusBadge,
  EmptyState,
} from '../../components/ui';
import { ModernHeader } from '../../components/ui/ModernHeader';
import { TouchDetector } from '../../components/ui/TouchDetector';
import {
  SPACING,
  CASE_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { format } from 'date-fns';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';

type SortOption = 'date-desc' | 'date-asc' | 'status' | 'priority';

export default function CasesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { cases, isLoading, fetchCases } = useCasesStore();
  const colors = useThemeColors();
  const scrollProps = useTabBarScroll();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | undefined>();
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [serviceTypeMenuVisible, setServiceTypeMenuVisible] = useState(false);

  // Memoize fetchCases to prevent unnecessary re-renders
  const handleFetchCases = useCallback(
    (status?: CaseStatus, refresh = true) => {
      fetchCases(status, refresh);
    },
    [fetchCases]
  );

  // Only fetch when selectedStatus actually changes
  useEffect(() => {
    handleFetchCases(selectedStatus, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]); // Only depend on selectedStatus to prevent unnecessary fetches

  // Memoized filtered and sorted cases for performance
  const filteredAndSortedCases = useMemo(() => {
    let filtered = cases.filter((c) => {
      const matchesSearch = c.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesServiceType = !selectedServiceType || c.serviceType === selectedServiceType;
      return matchesSearch && matchesServiceType;
    });

    // Sort cases
    switch (sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime());
        break;
      case 'status':
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'priority':
        const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
    }

    return filtered;
  }, [cases, searchQuery, selectedServiceType, sortBy]);

  // Get priority color
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'URGENT': return '#DC2626';
      case 'HIGH': return '#F59E0B';
      case 'NORMAL': return '#3B82F6';
      case 'LOW': return '#6B7280';
      default: return colors.textSecondary;
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'URGENT': return 'alert-octagon';
      case 'HIGH': return 'alert';
      case 'NORMAL': return 'information';
      case 'LOW': return 'minus-circle';
      default: return 'information';
    }
  };

  // Memoized render function for performance
  const renderCaseItem = useCallback(
    ({ item, index }: { item: Case; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 200)).springify()}>
        <Card onPress={() => router.push(`/case/${item.id}`)} style={styles.card}>
          <View style={styles.cardContent}>
            {/* Header with reference and status */}
            <View style={styles.cardHeader}>
              <View style={styles.referenceContainer}>
                <MaterialCommunityIcons
                  name="briefcase-outline"
                  size={20}
                  color={colors.primary}
                  style={styles.icon}
                />
                <PaperText style={[styles.reference, { color: colors.text }]}>{item.referenceNumber}</PaperText>
              </View>
              <StatusBadge status={item.status} />
            </View>

            {/* Priority and Service Type Row */}
            <View style={styles.metaRow}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
                <MaterialCommunityIcons
                  name={getPriorityIcon(item.priority)}
                  size={12}
                  color={getPriorityColor(item.priority)}
                />
                <PaperText style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                  {item.priority}
                </PaperText>
              </View>
              <View style={styles.serviceTypeChip}>
                <MaterialCommunityIcons
                  name="airplane"
                  size={12}
                  color={colors.textSecondary}
                  style={styles.serviceIcon}
                />
                <PaperText style={[styles.serviceTypeText, { color: colors.textSecondary }]}>
                  {SERVICE_TYPE_LABELS[item.serviceType]}
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
                <PaperText style={[styles.infoText, { color: colors.textSecondary }]}>
                  {format(new Date(item.submissionDate), 'MMM dd, yyyy')}
                </PaperText>
              </View>

              {item.assignedAgent && (
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons
                    name="account"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <PaperText style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.assignedAgent.firstName} {item.assignedAgent.lastName}
                  </PaperText>
                </View>
              )}
            </View>

            {/* OPTIMISTIC: Show pending indicator */}
            {item.isPending && (
              <View style={[styles.pendingBadge, { backgroundColor: colors.primary + '10' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <PaperText style={[styles.pendingText, { color: colors.primary }]}>Submitting...</PaperText>
              </View>
            )}
          </View>
        </Card>
      </Animated.View>
    ),
    [router, colors]
  );


  return (
    <TouchDetector>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Gradient Header */}
      <ModernHeader
        variant="gradient"
        gradientColors={[colors.primary, colors.secondary, colors.accent]}
        title="Cases"
        subtitle="Manage your legal cases"
        showBackButton
        showSearch
        searchPlaceholder={t('cases.searchByReference')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showAddButton
        addButtonIcon="plus"
        onAddPress={() => router.push('/case/new')}
        showFilterButton
        onFilterPress={() => setStatusMenuVisible(true)}
      >
        {/* Filter Bar with Menus */}
        <View style={[styles.filtersBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {/* Status Filter */}
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[
                    styles.filterButton, 
                    { backgroundColor: colors.background, borderColor: colors.border },
                    selectedStatus && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                  ]}
                  onPress={() => setStatusMenuVisible(!statusMenuVisible)}
                >
                  <MaterialCommunityIcons
                    name="filter-variant"
                    size={16}
                    color={selectedStatus ? colors.primary : colors.textSecondary}
                    style={{ marginRight: SPACING.xs }}
                  />
                  <PaperText style={[styles.filterButtonText, selectedStatus && styles.filterButtonTextActive]}>
                    {selectedStatus ? CASE_STATUS_LABELS[selectedStatus] : 'Status'}
                  </PaperText>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={16}
                    color={selectedStatus ? colors.primary : colors.textSecondary}
                    style={{ marginLeft: SPACING.xs }}
                  />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setSelectedStatus(undefined);
                  setStatusMenuVisible(false);
                }}
                title="All Statuses"
                leadingIcon={!selectedStatus ? "check" : undefined}
              />
              <Divider />
              {Object.values(CaseStatus).map((status) => (
                <Menu.Item
                  key={status}
                  onPress={() => {
                    setSelectedStatus(status);
                    setStatusMenuVisible(false);
                  }}
                  title={CASE_STATUS_LABELS[status]}
                  leadingIcon={selectedStatus === status ? "check" : undefined}
                />
              ))}
            </Menu>

            {/* Service Type Filter */}
            <Menu
              visible={serviceTypeMenuVisible}
              onDismiss={() => setServiceTypeMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[
                    styles.filterButton, 
                    { backgroundColor: colors.background, borderColor: colors.border },
                    selectedServiceType && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                  ]}
                  onPress={() => setServiceTypeMenuVisible(!serviceTypeMenuVisible)}
                >
                  <MaterialCommunityIcons
                    name="briefcase"
                    size={16}
                    color={selectedServiceType ? colors.primary : colors.textSecondary}
                    style={{ marginRight: SPACING.xs }}
                  />
                  <PaperText style={[styles.filterButtonText, selectedServiceType && styles.filterButtonTextActive]}>
                    {selectedServiceType ? SERVICE_TYPE_LABELS[selectedServiceType] : 'Service'}
                  </PaperText>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={16}
                    color={selectedServiceType ? colors.primary : colors.textSecondary}
                    style={{ marginLeft: SPACING.xs }}
                  />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setSelectedServiceType(undefined);
                  setServiceTypeMenuVisible(false);
                }}
                title="All Services"
                leadingIcon={!selectedServiceType ? "check" : undefined}
              />
              <Divider />
              {Object.values(ServiceType).map((type) => (
                <Menu.Item
                  key={type}
                  onPress={() => {
                    setSelectedServiceType(type);
                    setServiceTypeMenuVisible(false);
                  }}
                  title={SERVICE_TYPE_LABELS[type]}
                  leadingIcon={selectedServiceType === type ? "check" : undefined}
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
                    {sortBy === 'status' && 'Status'}
                    {sortBy === 'priority' && 'Priority'}
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
                  setSortBy('priority');
                  setSortMenuVisible(false);
                }}
                title="By Priority"
                leadingIcon={sortBy === 'priority' ? "check" : undefined}
              />
              <Menu.Item
                onPress={() => {
                  setSortBy('status');
                  setSortMenuVisible(false);
                }}
                title="By Status"
                leadingIcon={sortBy === 'status' ? "check" : undefined}
              />
            </Menu>

            {/* Clear Filters */}
            {(selectedStatus || selectedServiceType) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSelectedStatus(undefined);
                  setSelectedServiceType(undefined);
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
            {filteredAndSortedCases.length} {filteredAndSortedCases.length === 1 ? 'case' : 'cases'} found
          </PaperText>
        </View>
      </ModernHeader>

      {/* Cases List */}
      <FlatList
        data={filteredAndSortedCases}
        renderItem={renderCaseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }
        ]}
        onScroll={scrollProps.onScroll}
        scrollEventThrottle={scrollProps.scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => handleFetchCases(selectedStatus, true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title={t('cases.noCasesFound')}
            description={t('cases.noCasesDescription')}
            actionText={t('cases.submitNewCase')}
            onAction={() => router.push('/case/new')}
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
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  reference: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: SPACING.sm,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  serviceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceIcon: {
    marginRight: 4,
  },
  serviceTypeText: {
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
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
});
