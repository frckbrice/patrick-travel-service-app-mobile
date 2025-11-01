// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   StyleSheet,
//   ScrollView,
//   RefreshControl,
//   Text,
//   TouchableOpacity,
//   Dimensions,
//   Platform,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useRouter } from 'expo-router';
// import { useTranslation } from 'react-i18next';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
// import { ModernHeader } from '../../components/ui/ModernHeader';
// import { TouchDetector } from '../../components/ui/TouchDetector';
// import { userApi } from '../../lib/api/user.api';
// import { useAuthStore } from '../../stores/auth/authStore';
// import { DashboardStats } from '../../lib/types';
// import { SPACING, COLORS as STATIC_COLORS } from '../../lib/constants';
// import { useThemeColors } from '../../lib/theme/ThemeContext';

// const { width } = Dimensions.get('window');
// const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

// export default function HomeScreen() {
//   const { t } = useTranslation();
//   const router = useRouter();
//   const user = useAuthStore((state) => state.user);
//   const COLORS = useThemeColors();
//   const [stats, setStats] = useState<DashboardStats>({
//     totalCases: 0,
//     activeCases: 0,
//     pendingDocuments: 0,
//     unreadMessages: 0,
//   });
//   const [isLoading, setIsLoading] = useState(false);

//   const fetchDashboardStats = async () => {
//     setIsLoading(true);
//     const response = await userApi.getDashboardStats();
//     if (response.success && response.data) {
//       // Handle both simple and detailed dashboard stats response
//       const data = response.data;
//       setStats({
//         totalCases: (data as any).cases?.total || data.totalCases || 0,
//         activeCases: (data as any).cases?.active || data.activeCases || 0,
//         pendingDocuments:
//           (data as any).documents?.pending || data.pendingDocuments || 0,
//         unreadMessages:
//           (data as any).notifications?.unread || data.unreadMessages || 0,
//       });
//     }
//     setIsLoading(false);
//   };

//   useEffect(() => {
//     fetchDashboardStats();
//   }, []);

//   const getGreeting = () => {
//     const hour = new Date().getHours();
//     if (hour < 12) return t('dashboard.goodMorning') || 'Good Morning';
//     if (hour < 18) return t('dashboard.goodAfternoon') || 'Good Afternoon';
//     return t('dashboard.goodEvening') || 'Good Evening';
//   };



//   return (
//     <TouchDetector>
//       <View style={styles.container}>
//         {/* Gradient Header like Profile Page */}
//         <ModernHeader
//           variant="gradient"
//           gradientColors={[COLORS.primary, '#7A9BB8', '#94B5A0']}
//           title={getGreeting()}
//           subtitle={`Welcome back, ${user?.firstName}`}
//           showNotificationButton
//           notificationCount={stats.unreadMessages}
//           onNotificationPress={() => router.push('/(tabs)/notifications')}
//           showProfileButton
//           onProfilePress={() => router.push('/profile')}
//           rightActions={
//             <TouchableOpacity
//               style={styles.headerAction}
//               onPress={() => router.push('/profile/settings')}
//             >
//               <MaterialCommunityIcons
//                 name="cog"
//                 size={24}
//                 color="#FFF"
//               />
//             </TouchableOpacity>
//           }
//         />

//         <ScrollView
//           style={{ flex: 1 }}
//           contentContainerStyle={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//           refreshControl={
//             <RefreshControl
//               refreshing={isLoading}
//               onRefresh={fetchDashboardStats}
//               tintColor={COLORS.primary}
//               colors={[COLORS.primary]}
//             />
//           }
//         >
//           {/* Stats Overview Cards - Clean Design */}
//           <View style={styles.statsSection}>
//             <View style={styles.statsGrid}>
//               <Animated.View entering={FadeInDown.delay(100).springify()}>
//                 <TouchableOpacity 
//                   onPress={() => router.push('/(tabs)/cases')}
//                   style={styles.statCard}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statCardContent}>
//                     <View style={styles.statCardHeader}>
//                       <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
//                         <MaterialCommunityIcons
//                           name="briefcase"
//                           size={24}
//                           color={COLORS.primary}
//                         />
//                       </View>
//                       <MaterialCommunityIcons
//                         name="chevron-right"
//                         size={20}
//                         color={COLORS.textSecondary}
//                       />
//                     </View>
//                     <View style={styles.statCardBody}>
//                       <Text style={[styles.statValue, { color: COLORS.text }]}>
//                         {stats.totalCases}
//                       </Text>
//                       <Text style={[styles.statTitle, { color: COLORS.textSecondary }]}>
//                         {t('dashboard.totalCases') || 'Total Cases'}
//                       </Text>
//                     </View>
//                   </View>
//                 </TouchableOpacity>
//               </Animated.View>

//               <Animated.View entering={FadeInDown.delay(150).springify()}>
//                 <TouchableOpacity 
//                   onPress={() => router.push('/(tabs)/cases')}
//                   style={styles.statCard}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statCardContent}>
//                     <View style={styles.statCardHeader}>
//                       <View style={[styles.statIconContainer, { backgroundColor: COLORS.success + '15' }]}>
//                         <MaterialCommunityIcons
//                           name="briefcase-check"
//                           size={24}
//                           color={COLORS.success}
//                         />
//                       </View>
//                       <MaterialCommunityIcons
//                         name="chevron-right"
//                         size={20}
//                         color={COLORS.textSecondary}
//                       />
//                     </View>
//                     <View style={styles.statCardBody}>
//                       <Text style={[styles.statValue, { color: COLORS.text }]}>
//                         {stats.activeCases}
//                       </Text>
//                       <Text style={[styles.statTitle, { color: COLORS.textSecondary }]}>
//                         {t('dashboard.activeCases') || 'Active Cases'}
//                       </Text>
//                     </View>
//                   </View>
//                 </TouchableOpacity>
//               </Animated.View>
//             </View>

//             <View style={styles.statsGrid}>
//               <Animated.View entering={FadeInDown.delay(200).springify()}>
//                 <TouchableOpacity 
//                   onPress={() => router.push('/(tabs)/documents')}
//                   style={styles.statCard}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statCardContent}>
//                     <View style={styles.statCardHeader}>
//                       <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
//                         <MaterialCommunityIcons
//                           name="file-document-multiple"
//                           size={24}
//                           color={COLORS.warning}
//                         />
//                       </View>
//                       <MaterialCommunityIcons
//                         name="chevron-right"
//                         size={20}
//                         color={COLORS.textSecondary}
//                       />
//                     </View>
//                     <View style={styles.statCardBody}>
//                       <Text style={[styles.statValue, { color: COLORS.text }]}>
//                         {stats.pendingDocuments}
//                       </Text>
//                       <Text style={[styles.statTitle, { color: COLORS.textSecondary }]}>
//                         {t('dashboard.documents') || 'Documents'}
//                       </Text>
//                     </View>
//                   </View>
//                 </TouchableOpacity>
//               </Animated.View>

//               <Animated.View entering={FadeInDown.delay(250).springify()}>
//                 <TouchableOpacity 
//                   onPress={() => router.push('/(tabs)/messages')}
//                   style={styles.statCard}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statCardContent}>
//                     <View style={styles.statCardHeader}>
//                       <View style={[styles.statIconContainer, { backgroundColor: COLORS.secondary + '15' }]}>
//                         <MaterialCommunityIcons
//                           name="message-text"
//                           size={24}
//                           color={COLORS.secondary}
//                         />
//                       </View>
//                       <MaterialCommunityIcons
//                         name="chevron-right"
//                         size={20}
//                         color={COLORS.textSecondary}
//                       />
//                     </View>
//                     <View style={styles.statCardBody}>
//                       <Text style={[styles.statValue, { color: COLORS.text }]}>
//                         {stats.unreadMessages}
//                       </Text>
//                       <Text style={[styles.statTitle, { color: COLORS.textSecondary }]}>
//                         {t('dashboard.messages') || 'Messages'}
//                       </Text>
//                     </View>
//                   </View>
//                 </TouchableOpacity>
//               </Animated.View>
//             </View>
//           </View>

//           {/* Quick Actions Section */}
//           <View style={styles.actionsSection}>
//             <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
//               {t('dashboard.quickActions')}
//             </Text>

//             <Animated.View entering={FadeInUp.delay(300).springify()}>
//               <TouchableOpacity 
//                 onPress={() => router.push('/case/new')}
//                 style={styles.actionButton}
//                 activeOpacity={0.8}
//               >
//                 <View style={styles.actionButtonContent}>
//                   <View style={[styles.actionIconContainer, { backgroundColor: COLORS.primary }]}>
//                     <MaterialCommunityIcons
//                       name="plus-circle"
//                       size={24}
//                       color="#FFF"
//                     />
//                   </View>
//                   <Text style={[styles.actionButtonText, { color: COLORS.text }]}>
//                     {t('dashboard.newCase') || 'Submit New Case'}
//                   </Text>
//                   <MaterialCommunityIcons
//                     name="chevron-right"
//                     size={24}
//                     color={COLORS.textSecondary}
//                   />
//                 </View>
//               </TouchableOpacity>
//             </Animated.View>

//             <Animated.View entering={FadeInUp.delay(350).springify()}>
//               <TouchableOpacity 
//                 onPress={() => router.push('/document/upload')}
//                 style={styles.actionButton}
//                 activeOpacity={0.8}
//               >
//                 <View style={styles.actionButtonContent}>
//                   <View style={[styles.actionIconContainer, { backgroundColor: COLORS.secondary }]}>
//                     <MaterialCommunityIcons
//                       name="cloud-upload"
//                       size={24}
//                       color="#FFF"
//                     />
//                   </View>
//                   <Text style={[styles.actionButtonText, { color: COLORS.text }]}>
//                     {t('dashboard.uploadDocument') || 'Upload Document'}
//                   </Text>
//                   <MaterialCommunityIcons
//                     name="chevron-right"
//                     size={24}
//                     color={COLORS.textSecondary}
//                   />
//                 </View>
//               </TouchableOpacity>
//             </Animated.View>

//             <Animated.View entering={FadeInUp.delay(400).springify()}>
//               <TouchableOpacity 
//                 onPress={() => router.push('/help/contact')}
//                 style={styles.actionButton}
//                 activeOpacity={0.8}
//               >
//                 <View style={styles.actionButtonContent}>
//                   <View style={[styles.actionIconContainer, { backgroundColor: COLORS.accent }]}>
//                     <MaterialCommunityIcons
//                       name="headset"
//                       size={24}
//                       color="#FFF"
//                     />
//                   </View>
//                   <Text style={[styles.actionButtonText, { color: COLORS.text }]}>
//                     {t('dashboard.contactSupport') || 'Contact Support'}
//                   </Text>
//                   <MaterialCommunityIcons
//                     name="chevron-right"
//                     size={24}
//                     color={COLORS.textSecondary}
//                   />
//                 </View>
//               </TouchableOpacity>
//             </Animated.View>

//             <Animated.View entering={FadeInUp.delay(450).springify()}>
//               <TouchableOpacity 
//                 onPress={() => router.push('/help/faq')}
//                 style={styles.actionButton}
//                 activeOpacity={0.8}
//               >
//                 <View style={styles.actionButtonContent}>
//                   <View style={[styles.actionIconContainer, { backgroundColor: COLORS.info }]}>
//                     <MaterialCommunityIcons
//                       name="help-circle"
//                       size={24}
//                       color="#FFF"
//                     />
//                   </View>
//                   <Text style={[styles.actionButtonText, { color: COLORS.text }]}>
//                     {t('dashboard.viewFAQs') || 'View FAQs'}
//                   </Text>
//                   <MaterialCommunityIcons
//                     name="chevron-right"
//                     size={24}
//                     color={COLORS.textSecondary}
//                   />
//                 </View>
//               </TouchableOpacity>
//             </Animated.View>

//             <Animated.View entering={FadeInUp.delay(500).springify()}>
//               <TouchableOpacity 
//                 onPress={() => router.push('/templates')}
//                 style={styles.actionButton}
//                 activeOpacity={0.8}
//               >
//                 <View style={styles.actionButtonContent}>
//                   <View style={[styles.actionIconContainer, { backgroundColor: COLORS.warning }]}>
//                     <MaterialCommunityIcons
//                       name="file-download-outline"
//                       size={24}
//                       color="#FFF"
//                     />
//                   </View>
//                   <Text style={[styles.actionButtonText, { color: COLORS.text }]}>
//                     {t('dashboard.downloadTemplates') || 'Download Templates'}
//                   </Text>
//                   <MaterialCommunityIcons
//                     name="chevron-right"
//                     size={24}
//                     color={COLORS.textSecondary}
//                   />
//                 </View>
//               </TouchableOpacity>
//             </Animated.View>
//           </View>
//         </ScrollView>
//       </View>
//     </TouchDetector>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: STATIC_COLORS.background,
//   },
//   scrollContent: {
//     flexGrow: 1,
//     paddingTop: SPACING.lg,
//     paddingBottom: Platform.OS === 'ios' ? 100 : 80,
//   },
//   // Header Styles
//   headerAction: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(255,255,255,0.2)',
//   },
//   // Stats Section - Clean Design
//   statsSection: {
//     paddingHorizontal: SPACING.lg,
//     paddingTop: SPACING.lg,
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     gap: SPACING.md,
//     marginBottom: SPACING.lg,
//   },
//   statCard: {
//     flex: 1,
//     borderRadius: 12,
//     padding: SPACING.lg,
//     backgroundColor: 'transparent',
//     borderWidth: 1,
//     borderColor: STATIC_COLORS.border,
//   },
//   statCardContent: {
//     flex: 1,
//   },
//   statCardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: SPACING.md,
//   },
//   statIconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   statCardBody: {
//     flex: 1,
//   },
//   statValue: {
//     fontSize: 28,
//     fontWeight: '700',
//     marginBottom: 4,
//     letterSpacing: -0.5,
//   },
//   statTitle: {
//     fontSize: 14,
//     fontWeight: '500',
//     opacity: 0.8,
//   },
//   // Actions Section - Clean Design
//   actionsSection: {
//     paddingHorizontal: SPACING.lg,
//     paddingTop: SPACING.lg,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginBottom: SPACING.lg,
//     color: STATIC_COLORS.text,
//   },
//   actionButton: {
//     borderRadius: 12,
//     padding: SPACING.lg,
//     backgroundColor: 'transparent',
//     borderWidth: 1,
//     borderColor: STATIC_COLORS.border,
//     marginBottom: SPACING.md,
//   },
//   actionButtonContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   actionIconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: SPACING.md,
//   },
//   actionButtonText: {
//     flex: 1,
//     fontSize: 16,
//     fontWeight: '500',
//   },
// });





import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { ModernHeader } from '../../components/ui/ModernHeader';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { userApi } from '../../lib/api/user.api';
import { messagesApi } from '../../lib/api/messages.api';
import { casesApi } from '../../lib/api/cases.api';
import { useAuthStore } from '../../stores/auth/authStore';
import { DashboardStats } from '../../lib/types';
import { SPACING, COLORS as STATIC_COLORS } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { chatService } from '../../lib/services/chat';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

export default function HomeScreen() {
  useRequireAuth(); // Protect this route - redirect to login if not authenticated
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const COLORS = useThemeColors();
  const scrollProps = useTabBarScroll();
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
        setStats({
          totalCases: (data as any).cases?.total || data.totalCases || 0,
          activeCases: (data as any).cases?.active || data.activeCases || 0,
          pendingDocuments:
            (data as any).documents?.pending || data.pendingDocuments || 0,
          unreadMessages:
            (data as any).notifications?.unread || data.unreadMessages || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
      isFetchingStatsRef.current = false;
    }
  }, []);

  const fetchAllUnreadCounts = useCallback(async () => {
    if (!user?.id || isFetchingUnreadCountsRef.current) return; // Prevent concurrent calls

    isFetchingUnreadCountsRef.current = true;
    try {
      // Fetch only unread emails and chat messages (exclude system notifications)
      // Reduced limit from 100 to 50 to prevent rate limiting
      const [emailsCount, casesResponse] = await Promise.all([
        // Unread emails count
        messagesApi.getUnreadEmailsCount(),
        // Get user's cases to check chat messages - reduced limit to prevent rate limiting
        casesApi.getCases(undefined, 1, 50),
      ]);

      // Get case IDs for chat message counting
      const caseIds = casesResponse.success && casesResponse.data 
        ? casesResponse.data.map(case_ => case_.id)
        : [];

      // Get total unread chat messages across all cases
      const chatMessagesCount = caseIds.length > 0
        ? await chatService.getTotalUnreadCount(user.id, caseIds)
        : 0;

      // Only count unread emails + unread chat messages (exclude system notifications)
      const total = emailsCount + chatMessagesCount;
      
      setTotalUnreadCount(total);
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
      // Fallback to 0 if error occurs
      setTotalUnreadCount(0);
    } finally {
      isFetchingUnreadCountsRef.current = false;
    }
  }, [user?.id]);

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
      if (refreshTimerRef.current) return; // debounce bursts
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
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

  // Handle upload navigation - navigate directly without case requirement check
  const handleUploadPress = useCallback(() => {
    router.push('/document/upload');
  }, [router]);

  return (
    <TouchDetector>
      <View style={styles.container}>
        {/* Gradient Header like Profile Page */}
        <ModernHeader
          variant="gradient"
          gradientColors={[COLORS.primary, '#7A9BB8', '#94B5A0']}
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
                  style={styles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#5B8BA8' }]}>
                        <MaterialCommunityIcons
                          name="briefcase"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={styles.statValue}>
                        {stats.totalCases}
                      </Text>
                      <Text style={styles.statTitle}>
                        {t('dashboard.stats.totalCases') || 'Total Cases'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(150).springify()} style={{ flex: 1 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/cases')}
                  style={styles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#7ABD96' }]}>
                        <MaterialCommunityIcons
                          name="briefcase-check"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={styles.statValue}>
                        {stats.activeCases}
                      </Text>
                      <Text style={styles.statTitle}>
                        {t('dashboard.stats.activeCases') || 'Active'}
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
                  style={styles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#F4A460' }]}>
                        <MaterialCommunityIcons
                          name="file-document-multiple"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={styles.statValue}>
                        {stats.pendingDocuments}
                      </Text>
                      <Text style={styles.statTitle}>
                        {t('dashboard.stats.documents') || 'Documents'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(250).springify()} style={{ flex: 1 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/notifications')}
                  style={styles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#7A9BB8' }]}>
                        <MaterialCommunityIcons
                          name="bell"
                          size={26}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.statCardBody}>
                      <Text style={styles.statValue}>
                        {totalUnreadCount}
                      </Text>
                      <Text style={styles.statTitle}>
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
            <Text style={styles.sectionTitle}>
              {t('dashboard.actions.title') || 'Quick Actions'}
            </Text>

            {/* Case Management Group */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <View style={styles.actionGroup}>
                <Text style={styles.actionGroupTitle}>
                  {t('dashboard.actions.caseManagement') || 'Case Management'}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => router.push('/case/new')}
                  style={styles.actionButton}
                  activeOpacity={0.6}
                >
                  <View style={styles.actionButtonContent}>
                    <View style={[styles.actionIconContainer, { backgroundColor: '#5B8BA8' }]}>
                      <MaterialCommunityIcons
                        name="plus-circle-outline"
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.actionButtonText}>
                      {t('dashboard.actions.newCase') || 'Submit New Case'}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color="#C5CDD4"
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleUploadPress}
                  style={[styles.actionButton, styles.actionButtonLast]}
                  activeOpacity={0.6}
                >
                  <View style={styles.actionButtonContent}>
                    <View style={[styles.actionIconContainer, { backgroundColor: '#7A9BB8' }]}>
                      <MaterialCommunityIcons
                        name="cloud-upload-outline"
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.actionButtonText}>
                      {t('dashboard.actions.uploadDocument') || 'Upload Document'}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color="#C5CDD4"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Support & Resources Group */}
            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <View style={styles.actionGroup}>
                <Text style={styles.actionGroupTitle}>
                  {t('dashboard.actions.supportResources') || 'Support & Resources'}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => router.push('/help/contact')}
                  style={styles.actionButton}
                  activeOpacity={0.6}
                >
                  <View style={styles.actionButtonContent}>
                    <View style={[styles.actionIconContainer, { backgroundColor: '#94B5A0' }]}>
                      <MaterialCommunityIcons
                        name="headset"
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.actionButtonText}>
                      {t('dashboard.actions.contactSupport') || 'Contact Support'}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color="#C5CDD4"
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/help/faq')}
                  style={styles.actionButton}
                  activeOpacity={0.6}
                >
                  <View style={styles.actionButtonContent}>
                    <View style={[styles.actionIconContainer, { backgroundColor: '#7ABD96' }]}>
                      <MaterialCommunityIcons
                        name="help-circle-outline"
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.actionButtonText}>
                      {t('dashboard.actions.viewFAQs') || 'View FAQs'}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color="#C5CDD4"
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/documents?tab=templates')}
                  style={[styles.actionButton, styles.actionButtonLast]}
                  activeOpacity={0.6}
                >
                  <View style={styles.actionButtonContent}>
                    <View style={[styles.actionIconContainer, { backgroundColor: '#F4A460' }]}>
                      <MaterialCommunityIcons
                        name="file-download-outline"
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.actionButtonText}>
                      {t('dashboard.actions.downloadTemplates') || 'Download Templates'}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color="#C5CDD4"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
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
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: SPACING.lg,
    backgroundColor: '#FFFFFF',
    shadowColor: '#5B8BA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statCardContent: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardBody: {
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -1,
    color: '#1A2B3C',
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7C8C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderRadius: 20,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#5B8BA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    paddingVertical: SPACING.lg,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2B3C',
    letterSpacing: -0.2,
  },
});
