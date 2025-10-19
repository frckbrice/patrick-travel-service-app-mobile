import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/auth/authStore';
import { ThemeProvider, useTheme } from '../lib/theme/ThemeContext';
import { setupNotificationListeners, getLastNotificationResponse, handleNotificationNavigation } from '../lib/services/pushNotifications';
import { logger } from '../lib/utils/logger';
import '../lib/i18n';

const queryClient = new QueryClient();

function AppContent() {
  const refreshAuth = useAuthStore((state) => state.refreshAuth);
  const registerPushToken = useAuthStore((state) => state.registerPushToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { theme, isDark } = useTheme();

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

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
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
          }}
        />
        <Stack.Screen
          name="case/new"
          options={{
            headerShown: true,
            title: 'New Case',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="document/upload"
          options={{
            headerShown: true,
            title: 'Upload Document',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="document/[id]"
          options={{
            headerShown: true,
            title: 'Document Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="message/[id]"
          options={{
            headerShown: true,
            title: 'Chat',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="help/faq"
          options={{
            headerShown: true,
            title: 'FAQs',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="help/contact"
          options={{
            headerShown: true,
            title: 'Contact Support',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{
            headerShown: true,
            title: 'Edit Profile',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profile/change-password"
          options={{
            headerShown: true,
            title: 'Change Password',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profile/notifications"
          options={{
            headerShown: true,
            title: 'Notification Preferences',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profile/settings"
          options={{
            headerShown: true,
            title: 'Settings',
            presentation: 'card',
          }}
        />
      </Stack>
    </PaperProvider>
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

