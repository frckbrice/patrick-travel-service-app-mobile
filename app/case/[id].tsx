import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { casesApi } from '../../lib/api/cases.api';
import { Case, StatusHistory } from '../../lib/types';
import { Card, StatusBadge, Button, LoadingSpinner } from '../../components/ui';
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
    return <LoadingSpinner fullScreen text={t('common.loading')} />;
  }

  if (!caseData) {
    return (
      <View style={styles.error}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={64}
          color={COLORS.error}
        />
        <Text style={styles.errorText}>{t('common.noResults')}</Text>
        <Button
          title={t('common.goBack')}
          onPress={() => router.back()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInUp.duration(400)}>
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <View style={styles.referenceContainer}>
                <MaterialCommunityIcons
                  name="briefcase"
                  size={24}
                  color={COLORS.primary}
                  style={styles.headerIcon}
                />
                <Text style={styles.reference}>{caseData.referenceNumber}</Text>
              </View>
              <StatusBadge status={caseData.status} />
            </View>

            <View style={styles.serviceTypeContainer}>
              <MaterialCommunityIcons
                name="airplane"
                size={20}
                color={COLORS.text}
              />
              <Text style={styles.serviceType}>
                {SERVICE_TYPE_LABELS[caseData.serviceType]}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="calendar"
                size={18}
                color={COLORS.textSecondary}
              />
              <Text style={styles.infoText}>
                Submitted{' '}
                {format(new Date(caseData.submissionDate), 'MMM dd, yyyy')}
              </Text>
            </View>

            {caseData.assignedAgent && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="account"
                  size={18}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.infoText}>
                  Advisor: {caseData.assignedAgent.firstName}{' '}
                  {caseData.assignedAgent.lastName}
                </Text>
              </View>
            )}

            {caseData.estimatedCompletion && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.infoText}>
                  Est. completion:{' '}
                  {format(
                    new Date(caseData.estimatedCompletion),
                    'MMM dd, yyyy'
                  )}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={styles.actions}
      >
        <Button
          title={t('cases.messageAdvisor')}
          icon="message"
          onPress={() => router.push(`/message/${caseData.id}`)}
          fullWidth
          style={styles.actionButton}
        />
        <Button
          title={t('documents.uploadDocument')}
          icon="upload"
          variant="secondary"
          onPress={() => router.push('/document/upload')}
          fullWidth
          style={styles.actionButton}
        />
      </Animated.View>

      {history.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.sectionTitle}>
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
                    {index < history.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.historyContent}>
                    <StatusBadge status={item.status} />
                    <Text style={styles.historyDate}>
                      {format(new Date(item.timestamp), 'MMM dd, yyyy h:mm a')}
                    </Text>
                    {item.notes && (
                      <Text style={styles.historyNotes}>{item.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorButton: {
    marginTop: SPACING.md,
  },
  card: {
    margin: SPACING.md,
  },
  cardContent: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: SPACING.sm,
  },
  reference: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoText: {
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actions: {
    paddingHorizontal: SPACING.md,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  timeline: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    borderWidth: 3,
    borderColor: COLORS.background,
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
  historyDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  historyNotes: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});
