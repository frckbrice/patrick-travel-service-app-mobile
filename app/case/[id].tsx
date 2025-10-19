import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { casesApi } from '../../lib/api/cases.api';
import { Case, StatusHistory } from '../../lib/types';
import {
    COLORS,
    SPACING,
    CASE_STATUS_LABELS,
    CASE_STATUS_COLORS,
    SERVICE_TYPE_LABELS,
} from '../../lib/constants';
import { format } from 'date-fns';

export default function CaseDetailsScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [history, setHistory] = useState<StatusHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCaseDetails();
    }, [id]);

    const fetchCaseDetails = async () => {
        if (!id) return;

        setIsLoading(true);
        const [caseResponse, historyResponse] = await Promise.all([
            casesApi.getCaseById(id),
            casesApi.getCaseHistory(id),
        ]);

        if (caseResponse.success && caseResponse.data) {
            setCaseData(caseResponse.data);
        }

        if (historyResponse.success && historyResponse.data) {
            setHistory(historyResponse.data);
        }

        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!caseData) {
        return (
            <View style={styles.error}>
                <Text>{t('common.noResults')}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.header}>
                        <Text variant="headlineSmall" style={styles.reference}>
                            {caseData.referenceNumber}
                        </Text>
                        <Chip
                            style={[
                                styles.statusChip,
                                { backgroundColor: CASE_STATUS_COLORS[caseData.status] + '20' },
                            ]}
                            textStyle={{ color: CASE_STATUS_COLORS[caseData.status] }}
                        >
                            {CASE_STATUS_LABELS[caseData.status]}
                        </Chip>
                    </View>

                    <Text variant="titleMedium" style={styles.serviceType}>
                        {SERVICE_TYPE_LABELS[caseData.serviceType]}
                    </Text>

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="calendar" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>
                            {t('cases.submitted')} {format(new Date(caseData.submissionDate), 'MMM dd, yyyy')}
                        </Text>
                    </View>

                    {caseData.assignedAgent && (
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="account" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.infoText}>
                                {t('cases.advisor')}: {caseData.assignedAgent.firstName} {caseData.assignedAgent.lastName}
                            </Text>
                        </View>
                    )}

                    {caseData.estimatedCompletion && (
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={20}
                                color={COLORS.textSecondary}
                            />
                            <Text style={styles.infoText}>
                                {t('cases.estimatedCompletion')} {format(new Date(caseData.estimatedCompletion), 'MMM dd, yyyy')}
                            </Text>
                        </View>
                    )}
                </Card.Content>
            </Card>

            <View style={styles.actions}>
                <Button
                    mode="contained"
                    icon="message"
                    onPress={() => router.push(`/message/${caseData.id}`)}
                    style={styles.actionButton}
                >
                    {t('cases.messageAdvisor')}
                </Button>
                <Button
                    mode="outlined"
                    icon="upload"
                    onPress={() => router.push('/document/upload')}
                    style={styles.actionButton}
                >
                    {t('documents.uploadDocument')}
                </Button>
            </View>

            {history.length > 0 && (
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleLarge" style={styles.sectionTitle}>
                            {t('cases.statusHistory')}
                        </Text>
                        {history.map((item, index) => (
                            <View key={item.id} style={styles.historyItem}>
                                <View style={styles.timeline}>
                                    <View
                                        style={[
                                            styles.timelineDot,
                                            { backgroundColor: CASE_STATUS_COLORS[item.status] },
                                        ]}
                                    />
                                    {index < history.length - 1 && <View style={styles.timelineLine} />}
                                </View>
                                <View style={styles.historyContent}>
                                    <Chip
                                        style={[
                                            styles.historyStatusChip,
                                            { backgroundColor: CASE_STATUS_COLORS[item.status] + '20' },
                                        ]}
                                        textStyle={{ color: CASE_STATUS_COLORS[item.status] }}
                                    >
                                        {CASE_STATUS_LABELS[item.status]}
                                    </Chip>
                                    <Text variant="bodySmall" style={styles.historyDate}>
                                        {format(new Date(item.timestamp), 'MMM dd, yyyy h:mm a')}
                                    </Text>
                                    {item.notes && (
                                        <Text variant="bodyMedium" style={styles.historyNotes}>
                                            {item.notes}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </Card.Content>
                </Card>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    error: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        margin: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    reference: {
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statusChip: {
        height: 32,
    },
    serviceType: {
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    infoText: {
        marginLeft: SPACING.sm,
        color: COLORS.textSecondary,
    },
    actions: {
        padding: SPACING.md,
    },
    actionButton: {
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        color: COLORS.text,
    },
    historyItem: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
    },
    timeline: {
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 4,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.border,
        marginTop: 4,
    },
    historyContent: {
        flex: 1,
    },
    historyStatusChip: {
        alignSelf: 'flex-start',
        marginBottom: SPACING.xs,
    },
    historyDate: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    historyNotes: {
        color: COLORS.text,
    },
});

