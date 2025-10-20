import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native';
import { Searchbar, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useCasesStore } from '../../stores/cases/casesStore';
import { Case, CaseStatus } from '../../lib/types';
import {
  Card,
  StatusBadge,
  EmptyState,
  Button,
  Input,
} from '../../components/ui';
import {
  COLORS,
  SPACING,
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  SERVICE_TYPE_LABELS,
} from '../../lib/constants';
import { format } from 'date-fns';

export default function CasesScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { cases, isLoading, fetchCases } = useCasesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<
    CaseStatus | undefined
  >();

  useEffect(() => {
    fetchCases(selectedStatus, true);
  }, [selectedStatus]);

  const filteredCases = cases.filter((c) =>
    c.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCaseItem = ({ item, index }: { item: Case; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Card onPress={() => router.push(`/case/${item.id}`)} style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.referenceContainer}>
              <MaterialCommunityIcons
                name="briefcase-outline"
                size={20}
                color={COLORS.primary}
                style={styles.icon}
              />
              <Text style={styles.reference}>{item.referenceNumber}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.serviceTypeContainer}>
            <MaterialCommunityIcons
              name="airplane"
              size={16}
              color={COLORS.textSecondary}
              style={styles.serviceIcon}
            />
            <Text style={styles.serviceType}>
              {SERVICE_TYPE_LABELS[item.serviceType]}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.date}>
              {format(new Date(item.submissionDate), 'MMM dd, yyyy')}
            </Text>
          </View>

          {item.assignedAgent && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="account"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.agent}>
                {item.assignedAgent.firstName} {item.assignedAgent.lastName}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={t('cases.searchByReference')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/case/new')}
        >
          <MaterialCommunityIcons
            name="plus"
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <Chip
          selected={!selectedStatus}
          onPress={() => setSelectedStatus(undefined)}
          style={styles.filterChip}
        >
          {t('cases.all')}
        </Chip>
        {Object.values(CaseStatus).map((status) => (
          <Chip
            key={status}
            selected={selectedStatus === status}
            onPress={() => setSelectedStatus(status)}
            style={styles.filterChip}
          >
            {CASE_STATUS_LABELS[status]}
          </Chip>
        ))}
      </View>

      <FlatList
        data={filteredCases}
        renderItem={renderCaseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchCases(selectedStatus, true)}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  addButton: {
    marginLeft: SPACING.sm,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  card: {
    marginBottom: SPACING.md,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: COLORS.text,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  serviceIcon: {
    marginRight: SPACING.xs,
  },
  serviceType: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  date: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  agent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
});
