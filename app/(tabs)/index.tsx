import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import DashboardCard from '../../components/DashboardCard';
import { Button } from '../../components/ui';
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              {t('dashboard.welcomeUser', { name: user?.firstName })}
            </Text>
            <Text style={styles.subtext}>
              {t('dashboard.overview')}
            </Text>
          </View>
          <MaterialCommunityIcons 
            name="bell-outline" 
            size={28} 
            color={COLORS.text}
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>
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
        <Text style={styles.sectionTitle}>
          {t('dashboard.quickActions')}
        </Text>
        <Button
          title={t('dashboard.submitNewCase')}
          icon="plus"
          onPress={() => router.push('/case/new')}
          fullWidth
          style={styles.actionButton}
        />
        <Button
          title={t('dashboard.uploadDocument')}
          icon="upload"
          variant="secondary"
          onPress={() => router.push('/document/upload')}
          fullWidth
          style={styles.actionButton}
        />
        <Button
          title={t('dashboard.viewFAQs')}
          icon="help-circle"
          variant="outline"
          onPress={() => router.push('/help/faq')}
          fullWidth
          style={styles.actionButton}
        />
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
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
});
