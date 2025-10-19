import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import DashboardCard from '../../components/DashboardCard';
import { userApi } from '../../lib/api/user.api';
import { useAuthStore } from '../../stores/auth/authStore';
import { DashboardStats } from '../../lib/types';
import { COLORS, SPACING } from '../../lib/constants';

export default function HomeScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    pendingDocuments: 0,
    unreadMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    const response = await userApi.getDashboardStats();
    if (response.success && response.data) {
      setStats(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={fetchDashboardStats} />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.greeting}>
          {t('dashboard.welcomeUser', { name: user?.firstName })}
        </Text>
        <Text variant="bodyMedium" style={styles.subtext}>
          {t('dashboard.overview')}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <DashboardCard
          title={t('dashboard.totalCases')}
          value={stats.totalCases}
          icon="briefcase"
          color={COLORS.primary}
          onPress={() => router.push('/(tabs)/cases')}
        />
        <DashboardCard
          title={t('dashboard.activeCases')}
          value={stats.activeCases}
          icon="briefcase-check"
          color={COLORS.success}
          onPress={() => router.push('/(tabs)/cases')}
        />
      </View>

      <View style={styles.statsGrid}>
        <DashboardCard
          title={t('dashboard.pendingDocuments')}
          value={stats.pendingDocuments}
          icon="file-document"
          color={COLORS.warning}
          onPress={() => router.push('/(tabs)/documents')}
        />
        <DashboardCard
          title={t('dashboard.unreadMessages')}
          value={stats.unreadMessages}
          icon="message"
          color={COLORS.info}
          onPress={() => router.push('/(tabs)/messages')}
        />
      </View>

      <View style={styles.quickActions}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('dashboard.quickActions')}
        </Text>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => router.push('/case/new')}
          style={styles.actionButton}
        >
          {t('dashboard.submitNewCase')}
        </Button>
        <Button
          mode="outlined"
          icon="upload"
          onPress={() => router.push('/document/upload')}
          style={styles.actionButton}
        >
          {t('dashboard.uploadDocument')}
        </Button>
        <Button
          mode="outlined"
          icon="help-circle"
          onPress={() => router.push('/help/faq')}
          style={styles.actionButton}
        >
          {t('dashboard.viewFAQs')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  greeting: {
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtext: {
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: SPACING.sm,
  },
  quickActions: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
});
