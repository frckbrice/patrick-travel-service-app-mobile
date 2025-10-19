import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Chip, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useCasesStore } from '../../stores/cases/casesStore';
import { Case, CaseStatus } from '../../lib/types';
import { COLORS, SPACING, CASE_STATUS_LABELS, CASE_STATUS_COLORS, SERVICE_TYPE_LABELS } from '../../lib/constants';
import { format } from 'date-fns';

export default function CasesScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const { cases, isLoading, fetchCases } = useCasesStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<CaseStatus | undefined>();

    useEffect(() => {
        fetchCases(selectedStatus, true);
    }, [selectedStatus]);

    const filteredCases = cases.filter((c) =>
        c.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderCaseItem = ({ item }: { item: Case }) => (
        <TouchableOpacity onPress={() => router.push(`/case/${item.id}`)}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <Text variant="titleMedium" style={styles.reference}>
                            {item.referenceNumber}
                        </Text>
                        <Chip
                            style={[styles.statusChip, { backgroundColor: CASE_STATUS_COLORS[item.status] + '20' }]}
                            textStyle={{ color: CASE_STATUS_COLORS[item.status] }}
                        >
                            {CASE_STATUS_LABELS[item.status]}
                        </Chip>
                    </View>
                    <Text variant="bodyMedium" style={styles.serviceType}>
                        {SERVICE_TYPE_LABELS[item.serviceType]}
                    </Text>
                    <Text variant="bodySmall" style={styles.date}>
                        Submitted: {format(new Date(item.submissionDate), 'MMM dd, yyyy')}
                    </Text>
                    {item.assignedAgent && (
                        <Text variant="bodySmall" style={styles.agent}>
                            Advisor: {item.assignedAgent.firstName} {item.assignedAgent.lastName}
                        </Text>
                    )}
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder={t('cases.searchByReference')}
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
            />

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
                    <View style={styles.empty}>
                        <Text variant="bodyLarge">{t('cases.noCasesFound')}</Text>
                    </View>
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
    searchbar: {
        margin: SPACING.md,
        elevation: 0,
        backgroundColor: COLORS.surface,
    },
    filters: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    reference: {
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statusChip: {
        height: 28,
    },
    serviceType: {
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    date: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    agent: {
        color: COLORS.textSecondary,
    },
    empty: {
        alignItems: 'center',
        padding: SPACING.xl,
    },
});

