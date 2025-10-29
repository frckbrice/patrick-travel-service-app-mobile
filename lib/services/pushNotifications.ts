/**
 * Push Notifications Service
 * Handles Expo push notifications with FCM integration
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';
import { router } from 'expo-router';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
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
 */
export const registerForPushNotifications =
  async (): Promise<PushNotificationToken | null> => {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        logger.info('Push notifications require physical device');
        return null;
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

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        logger.warn('EAS Project ID not found in app config');
        return null;
      }

      logger.info('Getting Expo push token...', { projectId });

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      logger.info('✅ Push notification token obtained successfully', {
        token: tokenData.data.substring(0, 50) + '...',
        platform: Platform.OS,
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
      
      // Firebase initialization errors are non-critical
      if (
        errorMessage.includes('FirebaseApp is not initialized') ||
        errorMessage.includes('firebase') ||
        errorMessage.includes('FCM') ||
        errorCode === 'messaging/failed-to-get-fcm-token'
      ) {
        logger.warn('⚠️ Push notifications need FCM setup', {
          status: 'Registration skipped',
          reason: 'Firebase/FCM not fully configured',
          impact: 'App works normally without push',
          fix: 'Build with EAS credentials to test',
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
 */
export const handleNotificationNavigation = (data: NotificationData) => {
  try {
    logger.info('Handling notification navigation', { data });

    switch (data.type) {
      case 'CASE_STATUS_UPDATE':
      case 'CASE_ASSIGNED':
        if (data.caseId) {
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
        router.push('/(tabs)/');
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

/**
 * Setup notification listeners
 * Call this in your root component
 */
export const setupNotificationListeners = () => {
  // Listen for notifications received while app is open
  const receivedSubscription = addNotificationReceivedListener(
    (notification) => {
      logger.info('Notification received', {
        title: notification.request.content.title,
        body: notification.request.content.body,
      });
    }
  );

  // Listen for user tapping on notifications
  const responseSubscription = addNotificationResponseListener((response) => {
    const data = response.notification.request.content.data as NotificationData;
    handleNotificationNavigation(data);
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
