import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { casesApi } from '../../lib/api/cases.api';
import { Case, StatusHistory } from '../../lib/types';
import { ThemeAwareHeader } from '../../components/ui/ThemeAwareHeader';
import { LoadingSpinner, Button, Card, StatusBadge } from '../../components/ui';
import { useTabBarContext } from '../../lib/context/TabBarContext';
import { useTabBarPadding } from '../../lib/hooks/useTabBarPadding';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';
import {
  COLORS,
  SPACING,
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  SERVICE_TYPE_LABELS,
} from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { format } from 'date-fns';
import { toast } from '../../lib/services/toast';
import { useCasesStore } from '../../stores/cases/casesStore';

export default function CaseDetailsScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  // const { hideTabBar, showTabBar } = useTabBarContext();
  const tabBarPadding = useTabBarPadding();
  const scrollProps = useTabBarScroll();
  const themeColors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateCaseById } = useCasesStore();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCaseDetails = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [caseResponse, historyResponse] = await Promise.all([
        casesApi.getCaseById(id),
        casesApi.getCaseHistory(id),
      ]);

      if (caseResponse.success && caseResponse.data) {
        setCaseData(caseResponse.data);
        // Update the store to keep it in sync
        updateCaseById(id, caseResponse.data);
      }

      if (historyResponse.success && historyResponse.data) {
        // Deduplicate history by ID only
        const uniqueHistory = Array.from(
          new Map(historyResponse.data.map(item => [item.id, item])).values()
        );
        // Sort by timestamp ascending (oldest first) for timeline display
        uniqueHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setHistory(uniqueHistory);
      }
    } catch (error) {
      console.error('Error fetching case details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, updateCaseById]);

  // Fetch on mount
  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  // Refresh when screen comes into focus (e.g., from notification navigation)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we have an ID and the component is mounted
      if (id) {
        fetchCaseDetails();
      }
    }, [id, fetchCaseDetails])
  );


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

  const handleRedirectToUpload = () => {
    router.push('/(tabs)/documents?tab=documents');
    // router.push(`/document/upload?caseId=${caseData.id}`);
  };

  return (
      <View style={styles.container}>
        {/* Modern Gradient Header */}
        <ThemeAwareHeader
          variant="gradient"
        gradientColors={[themeColors.primary, themeColors.secondary, themeColors.accent]}
          title="Case Details"
          subtitle={caseData?.referenceNumber || 'Loading...'}
          showBackButton
          rightActions={
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => router.push(`/message/${caseData?.id}`)}
            >
              <MaterialCommunityIcons
                name="message-text"
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          }
        />
        
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: SPACING.xl + tabBarPadding }
        ]}
        onScroll={scrollProps.onScroll}
        scrollEventThrottle={scrollProps.scrollEventThrottle}
      >
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
                  <Text style={styles.reference} numberOfLines={1}>{caseData.referenceNumber}</Text>
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

            {caseData.assignedAgent ? (
              <View style={styles.advisorSection}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="account"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.infoText}>
                    <Text style={styles.advisorLabel}>Advisor: </Text>
                    <Text style={styles.advisorName}>
                      {caseData.assignedAgent.firstName}{' '}
                      {caseData.assignedAgent.lastName}
                    </Text>
                  </Text>
                </View>
                <View style={styles.chatAvailableBadge}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={COLORS.success}
                  />
                  <Text style={styles.chatAvailableText}>
                    {t('cases.chatAvailable')}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noAdvisorSection}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="account-clock"
                    size={18}
                    color={COLORS.warning}
                  />
                  <Text style={styles.pendingText}>
                    {t('cases.awaitingAssignment')}
                  </Text>
                </View>
                <Text style={styles.helperText}>
                  {t('cases.assignmentHelper')}
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
        {caseData.assignedAgent ? (
          <>
            <Button
              title={t('cases.messageAdvisor')}
              icon="message"
              onPress={() => router.push(`/message/${caseData.id}`)}
              fullWidth
              style={styles.actionButton}
            />
            <Text style={styles.chatHint}>
              💬 {t('cases.chatHint')}
            </Text>
          </>
        ) : (
          <View style={styles.disabledChatSection}>
            <MaterialCommunityIcons
              name="message-off"
              size={48}
              color={COLORS.textSecondary}
            />
            <Text style={styles.disabledChatTitle}>
              {t('cases.chatNotAvailable')}
            </Text>
            <Text style={styles.disabledChatDescription}>
              {t('cases.chatNotAvailableDesc')}
            </Text>
          </View>
        )}

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.uploadButton, { backgroundColor: COLORS.primary, padding: SPACING.sm + 4 }]}
            onPress={handleRedirectToUpload}
          >
            <MaterialCommunityIcons name="upload" size={20} color="white" />
            <Text style={styles.uploadButtonText}>
              {t('documents.uploadDocument')}
            </Text>
          </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: SPACING.xl,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
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
    // No padding needed - Card component already provides it
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
    marginRight: SPACING.sm,
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
  advisorSection: {
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  advisorLabel: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  advisorName: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  chatAvailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 4,
  },
  chatAvailableText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  noAdvisorSection: {
    backgroundColor: COLORS.warning + '08',
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  pendingText: {
    fontSize: 14,
    color: COLORS.warning,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: SPACING.md,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
  chatHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  disabledChatSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  disabledChatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  disabledChatDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.sm,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: "white",
  },
});
