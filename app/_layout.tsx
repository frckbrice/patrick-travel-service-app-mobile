import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, InteractionManager, View, ActivityIndicator, Text, StyleSheet, Linking } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast, { BaseToast } from 'react-native-toast-message';
import { useAuthStore } from '../stores/auth/authStore';
import { ThemeProvider, useTheme } from '../lib/theme/ThemeContext';
import { TabBarProvider } from '../lib/context/TabBarContext';
import { DynamicTabBar } from '../components/ui/DynamicTabBar';
import { useTabBarContext } from '../lib/context/TabBarContext';
import { NotificationBannerProvider } from '../components/ui/NotificationBannerProvider';
import {
  setupNotificationListeners,
  getLastNotificationResponse,
  handleNotificationNavigation,
} from '../lib/services/pushNotifications';
import { initializeFCM, getFCMStatus } from '../lib/services/fcm';
import { useCaseUpdates } from '../lib/hooks/useCaseUpdates';
import { logger } from '../lib/utils/logger';
import { SPACING, FONT_SIZES } from '../lib/constants';
import '../lib/i18n';
import { AlertProvider, useCustomAlert } from '../components/ui/CustomAlert';
import { initAlert } from '../lib/utils/alert';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const refreshAuth = useAuthStore((state) => state.refreshAuth);
  const registerPushToken = useAuthStore((state) => state.registerPushToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { theme, isDark } = useTheme();
  const { isTabBarVisible, showTabBar, hideTabBar } = useTabBarContext();
  const { showAlert } = useCustomAlert();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Check route groups - be precise about pathname matching
  // Note: home page pathname is '/(tabs)' or '/(tabs)/' or '/(tabs)/index', NOT '/'
  // Tab bar should ONLY appear on (tabs) routes, never on auth/onboarding/get-started
  const isTabsRoute = pathname?.startsWith('/(tabs)');
  const isAuthRoute = pathname?.startsWith('/(auth)') ||
    pathname === '/onboarding' ||
    pathname === '/get-started' ||
    (pathname === '/' && !isTabsRoute);

  // Control tab bar visibility based on route
  // CRITICAL: Tab bar should ONLY show on (tabs) routes, hide everywhere else
  useEffect(() => {
    if (isTabsRoute) {
      // ONLY show tab bar on tabs routes (home and other tab screens)
      // Use a small delay to ensure it runs after other effects
      const timer = setTimeout(() => {
        showTabBar();
      }, 10); // Minimal delay to ensure it runs after mount
      return () => clearTimeout(timer);
    } else {
      // Hide tab bar on ALL other routes (auth, onboarding, get-started, modals, etc.)
      // This ensures tab bar never appears on non-tab routes
      hideTabBar();
    }
  }, [isTabsRoute, showTabBar, hideTabBar]);

  // Memoize visibility change handler to prevent re-renders
  const handleVisibilityChange = useCallback((visible: boolean) => {
    // CRITICAL: Only allow tab bar visibility changes on tabs routes
    // Never show tab bar on auth, onboarding, get-started, or any non-tab routes
    if (!isTabsRoute) {
      hideTabBar();
      return;
    }
    // Only handle visibility changes on tabs routes
    if (visible) {
      showTabBar();
    } else {
      hideTabBar();
    }
  }, [showTabBar, hideTabBar, isTabsRoute]);

  // Initialize global Alert API
  useEffect(() => {
    initAlert(showAlert);
  }, [showAlert]);

  // Enable fallback case update monitoring (acts as backup if push notifications fail)
  useCaseUpdates();

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 App initialization started');

        // Handle initial URL (cold start) for password reset deep links
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && isMounted) {
          try {
            const url = new URL(initialUrl);
            const oobCode = url.searchParams.get('oobCode');
            const mode = url.searchParams.get('mode');
            if (oobCode && mode === 'resetPassword') {
              logger.info('Password reset deep link detected on cold start', {
                oobCode: oobCode.substring(0, 10) + '...',
              });
              router.replace({
                pathname: '/(auth)/reset-password' as any,
                params: { oobCode, mode },
              });
            }
          } catch (e) {
            // URL parsing failed, try alternative format (deep link without protocol)
            try {
              const match = initialUrl.match(/[?&]oobCode=([^&]+)/);
              const modeMatch = initialUrl.match(/[?&]mode=([^&]+)/);
              if (match && modeMatch && modeMatch[1] === 'resetPassword') {
                // Decode URL-encoded oobCode (safe even if not encoded)
                const decodedOobCode = decodeURIComponent(match[1]);
                logger.info('Password reset deep link detected on cold start (fallback)', {
                  oobCode: decodedOobCode.substring(0, 10) + '...',
                });
                router.replace({
                  pathname: '/(auth)/reset-password' as any,
                  params: { oobCode: decodedOobCode, mode: modeMatch[1] },
                });
              }
            } catch (fallbackError) {
              // Not a valid URL or not a reset password link, continue normally
              logger.debug('Initial URL is not a password reset link', e);
            }
          }
        }

        // Set app ready immediately to prevent blank page
        if (isMounted) {
          setIsAppReady(true);
        }

        // Try auth refresh in background (non-blocking)
        refreshAuth().catch((error) => {
          console.warn('⚠️ Auth refresh failed (non-blocking):', error);
          logger.warn('Auth refresh failed during init', error);
        });

        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        logger.error('App initialization failed', error);
        if (isMounted) {
          setInitError('Failed to initialize app. Please restart.');
        }
      }
    };

    // Initialize immediately
    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [refreshAuth, router]);

  // Handle deep links when app is already open (runtime)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      try {
        const url = new URL(event.url);
        const oobCode = url.searchParams.get('oobCode');
        const mode = url.searchParams.get('mode');
        if (oobCode && mode === 'resetPassword') {
          logger.info('Password reset deep link detected (app open)', {
            oobCode: oobCode.substring(0, 10) + '...',
          });
          router.replace({
            pathname: '/(auth)/reset-password' as any,
            params: { oobCode, mode },
          });
        }
      } catch (e) {
        // URL parsing failed, try alternative format (deep link without protocol)
        try {
          const match = event.url.match(/[?&]oobCode=([^&]+)/);
          const modeMatch = event.url.match(/[?&]mode=([^&]+)/);
          if (match && modeMatch && modeMatch[1] === 'resetPassword') {
            // Decode URL-encoded oobCode (safe even if not encoded)
            const decodedOobCode = decodeURIComponent(match[1]);
            logger.info('Password reset deep link detected (app open, fallback)', {
              oobCode: decodedOobCode.substring(0, 10) + '...',
            });
            router.replace({
              pathname: '/(auth)/reset-password' as any,
              params: { oobCode: decodedOobCode, mode: modeMatch[1] },
            });
          }
        } catch (fallbackError) {
          // Not a valid URL or not a reset password link
          logger.debug('Deep link is not a password reset link', e);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    // Defer notification listeners setup to avoid blocking UI thread at launch
    let cleanup: (() => void) | undefined;
    const task = InteractionManager.runAfterInteractions(async () => {
      // Initialize FCM first (non-blocking, graceful failure)
      try {
        const fcmStatus = getFCMStatus();
        logger.info('FCM Configuration Status:', fcmStatus);
        
        const fcmInit = await initializeFCM();
        if (fcmInit.configured && fcmInit.token) {
          logger.info('✅ FCM initialized successfully', {
            tokenPreview: fcmInit.token.substring(0, 30) + '...',
          });
        } else if (fcmInit.requiresEASBuild) {
          logger.info('ℹ️ FCM: EAS build required for push notifications', {
            note: 'This is expected in development. Build with EAS to enable FCM.',
            hint: 'Run: eas credentials (Android → Push Notifications)',
          });
        } else if (fcmInit.configured && !fcmInit.token) {
          logger.warn('⚠️ FCM configured but token not obtained');
        } else {
          logger.warn('⚠️ FCM not configured - push notifications may not work');
        }
      } catch (error) {
        // FCM initialization errors are non-blocking
        logger.warn('FCM initialization skipped (non-blocking)', {
          error: error instanceof Error ? error.message : String(error),
          note: 'Push notifications require EAS build and credentials',
        });
      }

      // Setup notification listeners
      cleanup = setupNotificationListeners();
      
      // Check for cold start notification
      getLastNotificationResponse().then(async (data) => {
        if (data) {
          logger.info('App opened from notification', data);
          await handleNotificationNavigation(data);
        }
      });
    });
    return () => {
      task.cancel();
      if (cleanup)
        cleanup();
    };
  }, []);

  useEffect(() => {
    // Register push token when user is authenticated (deferred)
    if (isAuthenticated) {
      const task = InteractionManager.runAfterInteractions(() => {
        registerPushToken();
      });
      return () => task.cancel();
    }
    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // App has come to the foreground from background
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          logger.info('App has come to foreground, refreshing auth');

          // Refresh auth session when app resumes
          if (isAuthenticated) {
            refreshAuth();
          }
        }

        appState.current = nextAppState;
        logger.info('AppState changed to:', nextAppState);
      }
    );
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);


  // Show loading screen while app initializes
  if (!isAppReady) {
    return (
      <SafeAreaProvider>
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Loading...
          </Text>
          {initError && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {initError}
            </Text>
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          style={isDark ? 'light' : 'dark'}
          backgroundColor={
            Platform.OS === 'android' ? theme.colors.primary : undefined
          }
        />
        <Stack
          screenOptions={{
            headerShown: false, // Disable ALL global headers - we use custom headers
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
            // Remove all header-related options since we're not using them
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="get-started" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="case/[id]"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="case/new"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="document/upload"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="document/[id]"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="message/[id]"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="email/[id]"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="help/faq"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="help/contact"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="profile/edit"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="profile/change-password"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="profile/notifications"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="profile/settings"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="templates"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="template/[id]"
            options={{
              presentation: 'card',
            }}
          />
        </Stack>
        <Toast
          position="bottom"
          topOffset={60}
          bottomOffset={100}
          config={{
            success: ({ text1, text2 }) => (
              <BaseToast
                text1={text1}
                text2={text2}
                style={styles.successToast}
                contentContainerStyle={styles.toastContent}
                text1Style={styles.toastTitle}
                text2Style={styles.toastMessage}
              />
            ),
            error: ({ text1, text2 }) => (
              <BaseToast
                text1={text1}
                text2={text2}
                style={styles.errorToast}
                contentContainerStyle={styles.toastContent}
                text1Style={styles.toastTitle}
                text2Style={styles.toastMessage}
              />
            ),
            info: ({ text1, text2 }) => (
              <BaseToast
                text1={text1}
                text2={text2}
                style={styles.infoToast}
                contentContainerStyle={styles.toastContent}
                text1Style={styles.toastTitle}
                text2Style={styles.toastMessage}
              />
            ),
          }}
        />
        {/* CRITICAL: Only render tab bar on tabs routes - never on auth, onboarding, get-started, or any other routes */}
        {isTabsRoute && (
          <DynamicTabBar
            visible={isTabBarVisible}
            onVisibilityChange={handleVisibilityChange}
          />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AlertProvider>
          <NotificationBannerProvider defaultAutoDismissDelay={5000}>
            <TabBarProvider>
              <AppContent />
            </TabBarProvider>
          </NotificationBannerProvider>
        </AlertProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  // Toast Styles - Modern Mobile Standards (2025 Mobile Market Standards)
  // Enhanced visual appeal with better spacing, shadows, and modern design
  successToast: {
    minHeight: 80,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    backgroundColor: '#FFFFFF',
    minWidth: '90%',
    maxWidth: '95%',
    marginHorizontal: SPACING.md,
  },
  errorToast: {
    minHeight: 80,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    backgroundColor: '#FFFFFF',
    minWidth: '90%',
    maxWidth: '95%',
    marginHorizontal: SPACING.md,
  },
  infoToast: {
    minHeight: 80,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    backgroundColor: '#FFFFFF',
    minWidth: '90%',
    maxWidth: '95%',
    marginHorizontal: SPACING.md,
  },
  toastContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  toastMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});
