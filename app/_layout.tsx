import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, InteractionManager, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
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
import {
  setupNotificationListeners,
  getLastNotificationResponse,
  handleNotificationNavigation,
} from '../lib/services/pushNotifications';
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

  // Memoize visibility change handler to prevent re-renders
  const handleVisibilityChange = useCallback((visible: boolean) => {
    if (visible) {
      showTabBar();
    } else {
      hideTabBar();
    }
  }, [showTabBar, hideTabBar]);

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
  }, [refreshAuth]);

  useEffect(() => {
    // Defer notification listeners setup to avoid blocking UI thread at launch
    let cleanup: (() => void) | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      cleanup = setupNotificationListeners();
      getLastNotificationResponse().then((data) => {
        if (data) {
          logger.info('App opened from notification', data);
          handleNotificationNavigation(data);
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
        <DynamicTabBar 
          visible={isTabBarVisible} 
          onVisibilityChange={handleVisibilityChange} 
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AlertProvider>
          <TabBarProvider>
            <AppContent />
          </TabBarProvider>
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
  successToast: {
    height: 72,
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#FFFFFF',
    minWidth: '90%',
    maxWidth: '95%',
  },
  errorToast: {
    height: 72,
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#FFFFFF',
    minWidth: '90%',
    maxWidth: '95%',
  },
  infoToast: {
    height: 72,
    borderLeftWidth: 5,
    borderLeftColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#FFFFFF',
    minWidth: '90%',
    maxWidth: '95%',
  },
  toastContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  toastTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  toastMessage: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 20,
  },
});
