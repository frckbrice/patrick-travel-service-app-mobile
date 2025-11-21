
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { ThemeAwareHeader } from '../../components/ui/ThemeAwareHeader';
import { userApi } from '../../lib/api/user.api';
import { messagesApi } from '../../lib/api/messages.api';
import { casesApi } from '../../lib/api/cases.api';
import { notificationsApi } from '../../lib/api/notifications.api';
import { useAuthStore } from '../../stores/auth/authStore';
import { DashboardStats } from '../../lib/types';
import { SPACING, COLORS as STATIC_COLORS } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { chatService } from '../../lib/services/chat';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';
import { useTabBarContext } from '../../lib/context/TabBarContext';
import { BottomTabBar } from '../../components/ui/BottomTabBar';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

export default function HomeScreen() {
  useRequireAuth(); // Protect this route - redirect to login if not authenticated
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const COLORS = useThemeColors();
  const scrollProps = useTabBarScroll();
  const { showTabBar } = useTabBarContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    pendingDocuments: 0,
    unreadMessages: 0,
  });
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const isFetchingStatsRef = useRef(false);
  const isFetchingUnreadCountsRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    if (isFetchingStatsRef.current) return; // Prevent concurrent calls
    
    isFetchingStatsRef.current = true;
    setIsLoading(true);
    try {
      const response = await userApi.getDashboardStats();
      if (response.success && response.data) {
        // Handle both simple and detailed dashboard stats response
        const data = response.data;
        // Extract values from nested structure or flat structure
        const statsData = {
          totalCases: typeof data === 'object' && data !== null
            ? (data as any).cases?.total ?? (data as any).totalCases ?? 0
            : 0,
          activeCases: typeof data === 'object' && data !== null
            ? (data as any).cases?.active ?? (data as any).activeCases ?? 0
            : 0,
          pendingDocuments: typeof data === 'object' && data !== null
            ? (data as any).documents?.pending ?? (data as any).documents?.total ?? (data as any).pendingDocuments ?? 0
            : 0,
          unreadMessages: typeof data === 'object' && data !== null
            ? (data as any).notifications?.unread ?? (data as any).unreadMessages ?? 0
            : 0,
        };

        setStats(statsData);
        console.log('📊 Dashboard stats loaded:', statsData);
      } else if (!response.success) {
        console.warn('⚠️ Dashboard stats API returned error:', response.error);
        // Keep default values (all zeros)
      }
    } catch (error) {
      console.error('❌ Failed to fetch dashboard stats:', error);
      // Keep default values (all zeros) on error
    } finally {
      setIsLoading(false);
      isFetchingStatsRef.current = false;
    }
  }, []);

  const fetchAllUnreadCounts = useCallback(async () => {
    if (!user?.id || isFetchingUnreadCountsRef.current) {
      console.log('⏸️ Skipping fetchAllUnreadCounts: no user or already fetching');
      return; // Prevent concurrent calls
    }

    isFetchingUnreadCountsRef.current = true;
    console.log('🔄 Fetching all unread counts...');
    try {
      // Fetch unread counts for backend notifications
      // This gives us the total unread notifications from the backend
      const backendNotificationsCount = await notificationsApi.getUnreadCount();

      console.log('📬 Unread notifications count:', backendNotificationsCount);

      // Set the total unread count (backend notifications only)
      // This matches what the notifications screen shows
      setTotalUnreadCount(backendNotificationsCount);
    } catch (error) {
      console.error('❌ Failed to fetch unread counts:', error);
      // Fallback to 0 if error occurs
      setTotalUnreadCount(0);
    } finally {
      isFetchingUnreadCountsRef.current = false;
    }
  }, [user?.id]);

  // Show tab bar when screen comes into focus (like documents page)
  useFocusEffect(
    useCallback(() => {
      // Show tab bar immediately when home page is focused
      showTabBar();
    }, [showTabBar])
  );

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Fetch all unread counts when user changes
  useEffect(() => {
    if (user?.id) {
      fetchAllUnreadCounts();
    }
  }, [user?.id, fetchAllUnreadCounts]);

  // Refresh counts when screen comes into focus (e.g., returning from email/message/notifications page)
  // This ensures counts update immediately after reading messages
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      
      // Simply refresh unread counts (emails + chat messages only)
      // This is called when user returns from reading emails/messages
      fetchAllUnreadCounts();
      
      // Also refresh dashboard stats (for other stats like cases, documents)
      fetchDashboardStats();
    }, [user?.id, fetchAllUnreadCounts, fetchDashboardStats])
  );

  // Subscribe to notification/email read events to update counts instantly
  useEffect(() => {
    const scheduleRefresh = () => {
      console.log('📬 Event received: Schedule refresh for unread counts');
      if (refreshTimerRef.current) return; // debounce bursts
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        console.log('📬 Executing scheduled refresh for unread counts');
        fetchAllUnreadCounts();
      }, 250);
    };

    const sub1 = DeviceEventEmitter.addListener('notifications:read', scheduleRefresh);
    const sub2 = DeviceEventEmitter.addListener('notifications:markAllRead', scheduleRefresh);
    const sub3 = DeviceEventEmitter.addListener('email:read', scheduleRefresh);

    return () => {
      sub1.remove();
      sub2.remove();
      sub3.remove();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchAllUnreadCounts]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetings.morning') || 'Good Morning';
    if (hour < 18) return t('dashboard.greetings.afternoon') || 'Good Afternoon';
    return t('dashboard.greetings.evening') || 'Good Evening';
  };

  // Handle upload navigation - navigate to documents page which has quick upload modal
  const handleUploadPress = useCallback(() => {
    router.push('/(tabs)/documents?tab=documents');
  }, [router]);

  // Dynamic theme-aware styles
  const dynamicStyles = useMemo(() => ({
    container: {
      ...styles.container,
      backgroundColor: COLORS.background,
    },
    statCard: {
      ...styles.statCard,
      backgroundColor: COLORS.surface,
    },
    statValue: {
      ...styles.statValue,
      color: COLORS.text,
    },
    statTitle: {
      ...styles.statTitle,
      color: COLORS.textSecondary,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: COLORS.text,
    },
    actionGroup: {
      ...styles.actionGroup,
      backgroundColor: COLORS.surface,
    },
    actionGroupTitle: {
      ...styles.actionGroupTitle,
      color: COLORS.text,
    },
    actionButton: {
      ...styles.actionButton,
      borderBottomColor: COLORS.border,
    },
    actionButtonText: {
      ...styles.actionButtonText,
      color: COLORS.text,
    },
  }), [COLORS]);

  return (
    <TouchDetector>
      <View style={[dynamicStyles.container, { backgroundColor: COLORS.background, paddingBottom: SPACING.lg }]}>
        {/* Gradient Header like Profile Page */}
        <ThemeAwareHeader
          variant="gradient"
          gradientColors={[COLORS.primary, COLORS.secondary, COLORS.accent]}
          title={getGreeting()}
          subtitle={t('dashboard.welcomeBack', { name: user?.firstName || '' }) || `Welcome back, ${user?.firstName || ''}`}
          showNotificationButton
          notificationCount={totalUnreadCount}
          onNotificationPress={() => router.push('/(tabs)/notifications')}
          showProfileButton
          onProfilePress={() => router.push('/profile')}
          rightActions={
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => router.push('/profile/settings')}
            >
              <MaterialCommunityIcons
                name="cog"
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollProps.onScroll}
          scrollEventThrottle={scrollProps.scrollEventThrottle}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                fetchDashboardStats().then(() => {
                  fetchAllUnreadCounts();
                });
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Stats Overview Cards - Modern Design */}
          <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
              <Animated.View entering={FadeInDown.delay(100).springify()} style={{ flex: 1 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/cases')}
                  style={dynamicStyles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary }]}>
                        <MaterialCommunityIcons
                          name="briefcase"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={dynamicStyles.statValue}>
                        {stats.totalCases}
                      </Text>
                      <Text style={dynamicStyles.statTitle}>
                        {t('dashboard.stats.totalCases') || 'Total Cases'}
                      </Text>
                      <Text style={[styles.statMeta, { color: COLORS.textSecondary }]}>
                        {t('dashboard.stats.activeLabel', { count: stats.activeCases }) || `Active: ${stats.activeCases}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(150).springify()} style={{ flex: 1 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/cases')}
                  style={dynamicStyles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: COLORS.success }]}>
                        <MaterialCommunityIcons
                          name="briefcase-check"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={dynamicStyles.statValue}>
                        {stats.activeCases}
                      </Text>
                      <Text style={dynamicStyles.statTitle}>
                        {t('dashboard.stats.activeCases') || 'Active'}
                      </Text>
                      <Text style={[styles.statMeta, { color: COLORS.textSecondary }]}>
                        {t('dashboard.stats.totalLabel', { count: stats.totalCases }) || `Total: ${stats.totalCases}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.statsGrid}>
              <Animated.View entering={FadeInDown.delay(200).springify()} style={{ flex: 1 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/documents')}
                  style={dynamicStyles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning }]}>
                        <MaterialCommunityIcons
                          name="file-document-multiple"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={dynamicStyles.statValue}>
                        {stats.pendingDocuments}
                      </Text>
                      <Text style={dynamicStyles.statTitle}>
                        {t('dashboard.stats.documents') || 'Documents'}
                      </Text>
                      <Text style={[styles.statMeta, { color: COLORS.textSecondary }]}>
                        {t('dashboard.stats.pendingLabel', { count: stats.pendingDocuments }) || 'Pending review'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(250).springify()} style={{ flex: 1 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/notifications')}
                  style={dynamicStyles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: COLORS.info }]}>
                        <MaterialCommunityIcons
                          name="bell"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={dynamicStyles.statValue}>
                        {totalUnreadCount}
                      </Text>
                      <Text style={dynamicStyles.statTitle}>
                        {t('dashboard.stats.notifications') || 'Notifications'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Quick Actions Section - Grouped */}
          <View style={styles.actionsSection}>
            <Text style={dynamicStyles.sectionTitle}>
              {t('dashboard.actions.title') || 'Quick Actions'}
            </Text>

            {/* Case Management Group */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <View style={dynamicStyles.actionGroup}>
                <Text style={dynamicStyles.actionGroupTitle}>
                  {t('dashboard.actions.caseManagement') || 'Case Management'}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => router.push('/case/new')}
                  style={dynamicStyles.actionButton}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionButtonContent}>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionIconContainer}
                    >
                      <MaterialCommunityIcons
                        name="plus-circle-outline"
                        size={22}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <Text style={dynamicStyles.actionButtonText}>
                      {t('dashboard.actions.newCase') || 'Submit New Case'}
                    </Text>
                    <View style={[styles.actionChevron, { backgroundColor: COLORS.background }]}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleUploadPress}
                  style={[dynamicStyles.actionButton, styles.actionButtonLast]}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionButtonContent}>
                    <LinearGradient
                      colors={[COLORS.accent, COLORS.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionIconContainer}
                    >
                      <MaterialCommunityIcons
                        name="cloud-upload-outline"
                        size={22}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <Text style={dynamicStyles.actionButtonText}>
                      {t('dashboard.actions.uploadDocument') || 'Upload Document'}
                    </Text>
                    <View style={[styles.actionChevron, { backgroundColor: COLORS.background }]}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Support & Resources Group */}
            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <View style={dynamicStyles.actionGroup}>
                <Text style={dynamicStyles.actionGroupTitle}>
                  {t('dashboard.actions.supportResources') || 'Support & Resources'}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => router.push('/help/contact')}
                  style={dynamicStyles.actionButton}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionButtonContent}>
                    <LinearGradient
                      colors={[COLORS.secondary, COLORS.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionIconContainer}
                    >
                      <MaterialCommunityIcons
                        name="headset"
                        size={22}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <Text style={dynamicStyles.actionButtonText}>
                      {t('dashboard.actions.contactSupport') || 'Contact Support'}
                    </Text>
                    <View style={[styles.actionChevron, { backgroundColor: COLORS.background }]}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/help/faq')}
                  style={dynamicStyles.actionButton}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionButtonContent}>
                    <LinearGradient
                      colors={[COLORS.success, COLORS.success]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionIconContainer}
                    >
                      <MaterialCommunityIcons
                        name="help-circle-outline"
                        size={22}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <Text style={dynamicStyles.actionButtonText}>
                      {t('dashboard.actions.viewFAQs') || 'View FAQs'}
                    </Text>
                    <View style={[styles.actionChevron, { backgroundColor: COLORS.background }]}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/documents?tab=templates')}
                  style={[dynamicStyles.actionButton, styles.actionButtonLast]}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionButtonContent}>
                    <LinearGradient
                      colors={[COLORS.warning, COLORS.warning]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionIconContainer}
                    >
                      <MaterialCommunityIcons
                        name="file-download-outline"
                        size={22}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <Text style={dynamicStyles.actionButtonText}>
                      {t('dashboard.actions.downloadTemplates') || 'Download Templates'}
                    </Text>
                    <View style={[styles.actionChevron, { backgroundColor: COLORS.background }]}>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
        <BottomTabBar />
      </View>
    </TouchDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  // Header Styles
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Stats Section - Modern Card Design
  statsSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    shadowColor: '#5B8BA8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardContent: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardBody: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.5,
    color: '#1A2B3C',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7C8C',
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  statMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
  },
  // Actions Section - Grouped Design
  actionsSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: SPACING.lg,
    color: '#1A2B3C',
    letterSpacing: -0.5,
  },
  actionGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionGroupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B3C',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F5',
  },
  actionButtonLast: {
    borderBottomWidth: 0,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2B3C',
    letterSpacing: -0.2,
  },
  actionChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
