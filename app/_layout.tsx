import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../stores/auth/authStore';
import { ThemeProvider, useTheme } from '../lib/theme/ThemeContext';
import {
  setupNotificationListeners,
  getLastNotificationResponse,
  handleNotificationNavigation,
} from '../lib/services/pushNotifications';
import { useCaseUpdates } from '../lib/hooks/useCaseUpdates';
import { logger } from '../lib/utils/logger';
import { COLORS } from '../lib/constants';
import '../lib/i18n';

const queryClient = new QueryClient();

function AppContent() {
  const refreshAuth = useAuthStore((state) => state.refreshAuth);
  const registerPushToken = useAuthStore((state) => state.registerPushToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { theme, isDark } = useTheme();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Enable fallback case update monitoring (acts as backup if push notifications fail)
  useCaseUpdates();

  useEffect(() => {
    // Check auth status on app load
    refreshAuth();
  }, []);

  useEffect(() => {
    // Setup push notification listeners
    const cleanup = setupNotificationListeners();

    // Check if app was opened from a notification (cold start)
    getLastNotificationResponse().then((data) => {
      if (data) {
        logger.info('App opened from notification', data);
        handleNotificationNavigation(data);
      }
    });

    return cleanup;
  }, []);

  useEffect(() => {
    // Register push token when user is authenticated
    if (isAuthenticated) {
      registerPushToken();
    }
  }, [isAuthenticated]);

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // refreshAuth is stable, don't include in deps

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          style={isDark ? 'light' : 'dark'}
          backgroundColor={
            Platform.OS === 'android' ? COLORS.primary : undefined
          }
        />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: COLORS.background,
            },
            headerStyle: {
              backgroundColor: COLORS.surface,
            },
            headerTintColor: COLORS.text,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerShadowVisible: true,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="case/[id]"
            options={{
              headerShown: true,
              title: 'Case Details',
              presentation: 'card',
              headerLargeTitle: false,
              headerTransparent: false,
              headerBlurEffect: 'light',
            }}
          />
          <Stack.Screen
            name="case/new"
            options={{
              headerShown: true,
              title: 'New Case',
              presentation: 'modal',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="document/upload"
            options={{
              headerShown: true,
              title: 'Upload Document',
              presentation: 'modal',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="document/[id]"
            options={{
              headerShown: true,
              title: 'Document Details',
              presentation: 'card',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="message/[id]"
            options={{
              headerShown: true,
              title: 'Chat',
              presentation: 'card',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="help/faq"
            options={{
              headerShown: true,
              title: 'FAQs',
              presentation: 'card',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="help/contact"
            options={{
              headerShown: true,
              title: 'Contact Support',
              presentation: 'modal',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="profile/edit"
            options={{
              headerShown: true,
              title: 'Edit Profile',
              presentation: 'card',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="profile/change-password"
            options={{
              headerShown: true,
              title: 'Change Password',
              presentation: 'card',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="profile/notifications"
            options={{
              headerShown: true,
              title: 'Notification Preferences',
              presentation: 'card',
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="profile/settings"
            options={{
              headerShown: true,
              title: 'Settings',
              presentation: 'card',
              headerLargeTitle: false,
            }}
          />
        </Stack>
        <Toast />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
