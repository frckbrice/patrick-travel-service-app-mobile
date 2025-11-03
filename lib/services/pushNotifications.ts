/**
 * Push Notifications Service
 * Handles Expo push notifications with FCM integration
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';
import { router } from 'expo-router';
import { initializeFCM, isFCMConfigured, getFCMStatus } from './fcm';
import { casesApi } from '../api/cases.api';
import { DeviceEventEmitter } from 'react-native';

// Lazy import to avoid circular dependency
const getCasesStore = () => {
  return require('../../stores/cases/casesStore').useCasesStore;
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Log notification received for debugging
    logger.info('📬 Notification received in handler', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
      identifier: notification.request.identifier,
    });

    // Determine channel based on notification type
    const data = notification.request.content.data as NotificationData;
    const channelId = data?.type ? getChannelIdForType(data.type) : 'default';

    return {
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowAlert: true, // ✅ Changed from shouldShowBanner - works better for Android
      shouldShowBanner: true, // Keep for iOS compatibility
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export interface NotificationData {
  type?: string;
  caseId?: string;
  documentId?: string;
  messageId?: string;
  url?: string;
  [key: string]: any;
}

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
}

/**
 * Register for push notifications and get Expo push token
 * Integrates with FCM for Android and APNs for iOS
 */
export const registerForPushNotifications =
  async (): Promise<PushNotificationToken | null> => {
    try {
      // Check FCM configuration status
      const fcmStatus = getFCMStatus();
      logger.info('FCM Status:', fcmStatus);

      // Check if running on physical device
      if (!Device.isDevice) {
        logger.info('Push notifications require physical device');
        return null;
      }

      // Validate FCM configuration
      if (!isFCMConfigured()) {
        logger.warn('FCM not fully configured', fcmStatus);
        // Continue anyway - may work if credentials are set up in EAS
      }

      logger.info('Starting push notification registration...');

      // Check existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        logger.info('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Notification permission denied');
        return null;
      }

      logger.info('Notification permission granted');

      // Get Expo push token (which uses FCM on Android)
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        logger.warn('EAS Project ID not found in app config');
        return null;
      }

      logger.info('Getting Expo push token (FCM-enabled)...', { projectId });

      // Get Expo push token
      // IMPORTANT: Expo may log "Network request failed" warnings when it can't sync with its servers,
      // but the token is usually still generated successfully. This warning is non-critical.
      // The warning appears because Expo tries to register the token with Expo's servers,
      // but our app will register it with our backend instead, which works fine.
      let tokenData;
      try {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        // If we reach here, token was generated successfully
        // Any "Network request failed" warnings from Expo can be ignored
        // The token is valid and can be sent to our backend
      } catch (expoError: any) {
        const errorMessage = expoError?.message || '';
        const errorCode = expoError?.code || '';

        // Network errors from Expo's server sync attempt
        // Note: This error usually means Expo couldn't sync with its servers,
        // but in many cases the token is still generated. However, if getExpoPushTokenAsync
        // throws, we won't have a token to use.
        if (
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('Network') ||
          errorCode === 'ERR_NETWORK' ||
          errorCode === 'NETWORK_ERROR'
        ) {
          logger.warn('⚠️ Expo token generation failed - network issue', {
            message: 'Cannot generate push token - network error with Expo servers',
            note: 'This may be due to: network restrictions, Expo server issues, or connectivity',
            suggestion: 'Check internet connection. Token registration will be retried on next app start or login.',
            impact: 'Push notifications will not work until token is generated',
            troubleshooting: 'See docs/PUSH_TOKEN_NETWORK_ERROR.md for more details',
          });
          // Return null - token generation failed
          return null;
        }

        // For other errors, log and return null
        logger.error('⚠️ Push token generation failed', {
          error: errorMessage,
          code: errorCode,
        });
        return null;
      }

      logger.info('✅ Push notification token obtained successfully (FCM ready)', {
        token: tokenData.data.substring(0, 50) + '...',
        platform: Platform.OS,
        fcmConfigured: isFCMConfigured(),
      });

      // Configure Android notification channels AFTER getting token (avoids Firebase error)
      if (Platform.OS === 'android') {
        try {
          logger.info('Setting up Android notification channels...');
          
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0066CC',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
          });

          await Notifications.setNotificationChannelAsync('case-updates', {
            name: 'Case Updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0066CC',
            sound: 'default',
          });

          await Notifications.setNotificationChannelAsync('messages', {
            name: 'Messages',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0066CC',
            sound: 'default',
          });

          await Notifications.setNotificationChannelAsync('documents', {
            name: 'Document Updates',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0066CC',
            sound: 'default',
          });

          logger.info('Android notification channels created');
        } catch (channelError) {
          logger.warn('Could not create notification channels (non-critical)');
        }
      }

      logger.info('✅ Push notification setup complete');

      return {
        token: tokenData.data,
        platform: Platform.OS as 'ios' | 'android' | 'web',
        deviceId: Constants.deviceId || Constants.sessionId,
      };
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const errorCode = error?.code || '';
      
      // Network errors from Expo's server sync are non-critical
      // The token generation usually succeeds, but Expo fails to update its servers
      if (
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network') ||
        errorCode === 'ERR_NETWORK' ||
        errorCode === 'NETWORK_ERROR'
      ) {
        logger.warn('⚠️ Expo server sync failed - token may still be valid', {
          status: 'Server sync failed but token generation may have succeeded',
          reason: 'Device cannot reach Expo servers for token registration',
          impact: 'Token may still work for notifications, but Expo server sync failed',
          note: 'This is common in development. Token will still work if generated successfully.',
          suggestion: 'Check internet connection or ignore if token is obtained successfully',
          error: errorMessage.substring(0, 100), // Limit error message length
        });
        // Continue - token might still be available, let the calling code handle it
        // In most cases, getExpoPushTokenAsync will still return a token even if server sync fails
        return null;
      }

      // Firebase initialization errors are non-critical
      // This happens when FCM credentials aren't configured via EAS
      if (
        errorMessage.includes('FirebaseApp is not initialized') ||
        errorMessage.includes('FirebaseApp.initializeApp') ||
        errorMessage.includes('firebase') ||
        errorMessage.includes('FCM') ||
        errorCode === 'messaging/failed-to-get-fcm-token' ||
        errorCode === 'E_REGISTRATION_FAILED' ||
        errorMessage.includes('fcm-credentials')
      ) {
        logger.warn('⚠️ Push notifications require EAS credentials setup', {
          status: 'Registration skipped',
          reason: 'FCM credentials must be configured via EAS',
          impact: 'App works normally without push notifications',
          fix: 'Run: eas credentials (Android → Push Notifications)',
          guide: 'https://docs.expo.dev/push-notifications/fcm-credentials/',
          note: 'This is expected in development. Build with EAS to enable push notifications.',
        });
        return null;
      }
      
      logger.error('⚠️ Push notification registration failed', {
        error: errorMessage,
        code: errorCode,
        status: 'Non-blocking - app continues normally',
      });
      return null;
    }
  };

/**
 * Handle notification received while app is in foreground
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Handle notification tapped by user
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Navigate based on notification data
 * Also refreshes case data when case-related notifications are received
 */
export const handleNotificationNavigation = async (data: NotificationData) => {
  try {
    logger.info('Handling notification navigation', { data });

    switch (data.type) {
      case 'CASE_STATUS_UPDATE':
      case 'CASE_ASSIGNED':
        if (data.caseId) {
          // Refresh case data before navigating to ensure latest status is shown
          try {
            const caseResponse = await casesApi.getCaseById(data.caseId);
            if (caseResponse.success && caseResponse.data) {
              logger.info('Case data refreshed from notification', {
                caseId: data.caseId,
                status: caseResponse.data.status,
              });
              // The case detail screen will pick up the updated data when it mounts/focuses
            }
          } catch (error) {
            logger.warn('Failed to refresh case data from notification', error);
            // Still navigate even if refresh fails
          }
          router.push(`/case/${data.caseId}`);
        }
        break;

      case 'NEW_MESSAGE':
        if (data.caseId) {
          router.push(`/message/${data.caseId}`);
        } else {
          router.push('/(tabs)/notifications');
        }
        break;

      case 'NEW_EMAIL':
        if (data.messageId) {
          router.push(`/email/${data.messageId}`);
        } else if (data.caseId) {
          router.push(`/case/${data.caseId}`);
        } else {
          router.push('/(tabs)/notifications');
        }
        break;

      case 'DOCUMENT_UPLOADED':
      case 'DOCUMENT_VERIFIED':
      case 'DOCUMENT_REJECTED':
        if (data.documentId) {
          router.push(`/document/${data.documentId}`);
        } else if (data.caseId) {
          router.push(`/case/${data.caseId}`);
        } else {
          router.push('/(tabs)/documents');
        }
        break;

      case 'SYSTEM_ANNOUNCEMENT':
        // Navigate to notifications screen
        router.push('/(tabs)/profile');
        break;

      default:
        // Default to home screen
        router.push('/(tabs)');
    }
  } catch (error) {
    logger.error('Error handling notification navigation', error);
  }
};

/**
 * Schedule a local notification
 */
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: NotificationData,
  trigger?: Notifications.NotificationTriggerInput
) => {
  try {
    const channelId = data?.type ? getChannelIdForType(data.type) : 'default';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: trigger || null, // null = show immediately
    });

    logger.info('Local notification scheduled', { title, body });
  } catch (error) {
    logger.error('Error scheduling local notification', error);
  }
};

/**
 * Get notification channel ID based on type
 */
const getChannelIdForType = (type: string): string => {
  if (type.includes('MESSAGE')) return 'messages';
  if (type.includes('EMAIL')) return 'messages'; // Use messages channel for emails
  if (type.includes('CASE')) return 'case-updates';
  if (type.includes('DOCUMENT')) return 'documents';
  return 'default';
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.info('All scheduled notifications cancelled');
  } catch (error) {
    logger.error('Error cancelling notifications', error);
  }
};

/**
 * Get notification badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    logger.error('Error getting badge count', error);
    return 0;
  }
};

/**
 * Set notification badge count
 */
export const setBadgeCount = async (count: number) => {
  try {
    await Notifications.setBadgeCountAsync(count);
    logger.info('Badge count set', { count });
  } catch (error) {
    logger.error('Error setting badge count', error);
  }
};

/**
 * Clear badge
 */
export const clearBadge = async () => {
  await setBadgeCount(0);
};

/**
 * Dismiss all notifications from notification center
 */
export const dismissAllNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync();
    logger.info('All notifications dismissed');
  } catch (error) {
    logger.error('Error dismissing notifications', error);
  }
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.error('Error checking notification permissions', error);
    return false;
  }
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.error('Error requesting notification permissions', error);
    return false;
  }
};

// Deduplication: Track processed notifications to avoid duplicates
const processedNotifications = new Set<string>();
const MAX_PROCESSED_SIZE = 100; // Prevent memory leak

/**
 * Map backend notification type to banner type
 */
const mapNotificationType = (type?: string): 'message' | 'email' | 'case' | 'document' | 'system' => {
  if (!type) return 'system';

  const upperType = type.toUpperCase();
  if (upperType.includes('MESSAGE')) return 'message';
  if (upperType.includes('EMAIL')) return 'email';
  if (upperType.includes('CASE')) return 'case';
  if (upperType.includes('DOCUMENT')) return 'document';

  return 'system';
};

/**
 * Setup notification listeners
 * Call this in your root component
 */
export const setupNotificationListeners = () => {
  // Listen for notifications received while app is open
  const receivedSubscription = addNotificationReceivedListener(
    async (notification) => {
      const data = notification.request.content.data as NotificationData;

      // Create unique key for deduplication using messageId or notificationId
      const dedupeKey = data.messageId || data.notificationId || notification.request.identifier;

      // Skip if already processed (within last few seconds)
      if (dedupeKey && processedNotifications.has(dedupeKey)) {
        logger.debug('Skipping duplicate notification', { dedupeKey });
        return;
      }

      // Add to processed set
      if (dedupeKey) {
        processedNotifications.add(dedupeKey);

        // Cleanup old entries to prevent memory leak
        if (processedNotifications.size > MAX_PROCESSED_SIZE) {
          const firstKey = processedNotifications.values().next().value;
          if (firstKey) {
            processedNotifications.delete(firstKey);
          }
        }

        // Auto-remove after 30 seconds (notifications can repeat after this)
        setTimeout(() => {
          processedNotifications.delete(dedupeKey);
        }, 30000);
      }

      logger.info('📬 Notification received in listener', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        type: data.type,
        caseId: data.caseId,
        messageId: data.messageId,
        identifier: notification.request.identifier,
      });

      // Show custom notification banner if app is in foreground
      const appState = AppState.currentState;
      if (appState === 'active') {
        // Emit event for NotificationBannerProvider to show the banner
        DeviceEventEmitter.emit('showNotificationBanner', {
          id: notification.request.identifier,
          title: notification.request.content.title || '',
          body: notification.request.content.body || '',
          type: mapNotificationType(data.type),
          data: {
            type: data.type,
            caseId: data.caseId,
            messageId: data.messageId,
            documentId: data.documentId,
            emailId: data.emailId,
            url: data.url,
          },
        });
      }

      // Refresh case data if it's a case-related notification
      if ((data.type === 'CASE_STATUS_UPDATE' || data.type === 'CASE_ASSIGNED') && data.caseId) {
        try {
          const caseResponse = await casesApi.getCaseById(data.caseId);
          if (caseResponse.success && caseResponse.data) {
            logger.info('Case data refreshed from foreground notification', {
              caseId: data.caseId,
              status: caseResponse.data.status,
            });
            // Update case data in store
            getCasesStore().getState().updateCaseById(data.caseId, caseResponse.data);
          }
        } catch (error) {
          logger.warn('Failed to refresh case data from foreground notification', error);
        }
      }
    }
  );

  // Listen for user tapping on notifications
  const responseSubscription = addNotificationResponseListener(async (response) => {
    const data = response.notification.request.content.data as NotificationData;
    await handleNotificationNavigation(data);
  });

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};

/**
 * Get last notification response (useful for cold starts)
 */
export const getLastNotificationResponse = async () => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content
        .data as NotificationData;
      return data;
    }
    return null;
  } catch (error) {
    logger.error('Error getting last notification response', error);
    return null;
  }
};
