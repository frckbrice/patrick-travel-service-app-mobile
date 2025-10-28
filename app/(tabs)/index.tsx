import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { userApi } from '../../lib/api/user.api';
import { useAuthStore } from '../../stores/auth/authStore';
import { DashboardStats } from '../../lib/types';
import { SPACING, COLORS as STATIC_COLORS } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const COLORS = useThemeColors();
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
      // Handle both simple and detailed dashboard stats response
      const data = response.data;
      setStats({
        totalCases: (data as any).cases?.total || data.totalCases || 0,
        activeCases: (data as any).cases?.active || data.activeCases || 0,
        pendingDocuments:
          (data as any).documents?.pending || data.pendingDocuments || 0,
        unreadMessages:
          (data as any).notifications?.unread || data.unreadMessages || 0,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning') || 'Good Morning';
    if (hour < 18) return t('dashboard.goodAfternoon') || 'Good Afternoon';
    return t('dashboard.goodEvening') || 'Good Evening';
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    onPress,
    delay = 0,
  }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    onPress: () => void;
    delay?: number;
  }) => (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.statCardWrapper}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.statCardTouchable}
      >
        <View
          style={[
            styles.statCard,
            { backgroundColor: COLORS.surface, borderColor: COLORS.border },
          ]}
        >
          <View style={styles.statCardTop}>
            <View
              style={[styles.statIconCircle, { backgroundColor: color + '20' }]}
            >
              <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color={color}
              />
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={COLORS.textTertiary}
            />
          </View>
          <View style={styles.statCardBottom}>
            <Text style={[styles.statValue, { color: COLORS.text }]}>
              {value}
            </Text>
            <Text style={[styles.statTitle, { color: COLORS.textSecondary }]}>
              {title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const QuickActionButton = ({
    title,
    icon,
    onPress,
    color,
    delay = 0,
  }: {
    title: string;
    icon: string;
    onPress: () => void;
    color: string;
    delay?: number;
  }) => (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      style={styles.actionButtonWrapper}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.actionButton, { backgroundColor: color }]}>
          <View style={styles.actionButtonContent}>
            <View style={styles.actionIconContainer}>
              <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color={color}
              />
            </View>
            <Text style={styles.actionButtonText}>{title}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="rgba(255,255,255,0.7)"
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchDashboardStats}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Hero Header with Gradient */}
        <LinearGradient
          colors={[COLORS.primary, '#7A9BB8', '#94B5A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeader}
        >
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.headerContent}
          >
            <View style={styles.headerTop}>
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.userName}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => router.push('/profile/notifications')}
              >
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={24}
                  color="#FFF"
                />
                {stats.unreadMessages > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {stats.unreadMessages > 9 ? '9+' : stats.unreadMessages}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
          {t('dashboard.overview')}
        </Text>

        <View style={styles.statsGrid}>
          <StatCard
            title={t('dashboard.totalCases') || 'Total Cases'}
            value={stats.totalCases}
            icon="briefcase"
            color={COLORS.primary}
            onPress={() => router.push('/(tabs)/cases')}
            delay={150}
          />
          <StatCard
            title={t('dashboard.activeCases') || 'Active'}
            value={stats.activeCases}
            icon="briefcase-check"
            color={COLORS.success}
            onPress={() => router.push('/(tabs)/cases')}
            delay={200}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title={t('dashboard.documents') || 'Documents'}
            value={stats.pendingDocuments}
            icon="file-document-multiple"
            color={COLORS.warning}
            onPress={() => router.push('/(tabs)/documents')}
            delay={250}
          />
          <StatCard
            title={t('dashboard.messages') || 'Messages'}
            value={stats.unreadMessages}
            icon="message-text"
            color={COLORS.secondary}
            onPress={() => router.push('/(tabs)/messages')}
            delay={300}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
          {t('dashboard.quickActions')}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: COLORS.textSecondary }]}>
          {t('dashboard.whatYouWantToDo')}
        </Text>

        <QuickActionButton
          title={t('dashboard.newCase') || 'Submit New Case'}
          icon="plus-circle"
          onPress={() => router.push('/case/new')}
          color={COLORS.primary}
          delay={400}
        />
        <QuickActionButton
          title={t('dashboard.uploadDocument') || 'Upload Document'}
          icon="cloud-upload"
          onPress={() => router.push('/document/upload')}
          color={COLORS.secondary}
          delay={450}
        />
        <QuickActionButton
          title={t('dashboard.contactSupport') || 'Contact Support'}
          icon="headset"
          onPress={() => router.push('/help/contact')}
          color={COLORS.accent}
          delay={500}
        />
        <QuickActionButton
          title={t('dashboard.viewFAQs') || 'View FAQs'}
          icon="help-circle"
          onPress={() => router.push('/help/faq')}
          color={COLORS.info}
          delay={550}
        />
        <QuickActionButton
          title={t('dashboard.downloadTemplates') || 'Download Templates'}
          icon="file-download-outline"
          onPress={() => router.push('/templates')}
          color="#8B7BC8"
          delay={600}
        />
      </View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STATIC_COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 50,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerContent: {
    gap: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCardTouchable: {
    flex: 1,
  },
  statCard: {
    borderRadius: 20,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 0.5,
    minHeight: 140,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardBottom: {
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actionsSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  actionButtonWrapper: {
    marginBottom: SPACING.md,
  },
  actionButton: {
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
