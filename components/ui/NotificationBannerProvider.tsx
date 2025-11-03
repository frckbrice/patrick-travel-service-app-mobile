/**
 * Notification Banner Provider
 * Manages notification banner state globally
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import NotificationBanner, { NotificationBannerData } from '../../docs/NotificationBanner';

interface NotificationBannerContextType {
  showNotification: (notification: NotificationBannerData) => void;
  hideNotification: () => void;
  setAutoDismissDelay: (delay: number) => void;
}

const NotificationBannerContext = createContext<NotificationBannerContextType | null>(null);

export const useNotificationBanner = () => {
  const context = useContext(NotificationBannerContext);
  if (!context) {
    throw new Error('useNotificationBanner must be used within NotificationBannerProvider');
  }
  return context;
};

interface NotificationBannerProviderProps {
  children: ReactNode;
  defaultAutoDismissDelay?: number; // Default: 5000ms (5 seconds)
}

export const NotificationBannerProvider: React.FC<NotificationBannerProviderProps> = ({
  children,
  defaultAutoDismissDelay = 5000,
}) => {
  const [notification, setNotification] = useState<NotificationBannerData | null>(null);
  const [autoDismissDelay, setAutoDismissDelay] = useState<number>(defaultAutoDismissDelay);

  const showNotification = useCallback((notificationData: NotificationBannerData) => {
    // Generate unique ID if not provided
    const notificationWithId: NotificationBannerData = {
      ...notificationData,
      id: notificationData.id || `notification-${Date.now()}-${Math.random()}`,
    };
    setNotification(notificationWithId);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const handleSetAutoDismissDelay = useCallback((delay: number) => {
    setAutoDismissDelay(Math.max(1000, delay)); // Minimum 1 second
  }, []);

  // Listen for notification events from pushNotifications service
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'showNotificationBanner',
      (notificationData: NotificationBannerData) => {
        showNotification(notificationData);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [showNotification]);

  return (
    <NotificationBannerContext.Provider
      value={{
        showNotification,
        hideNotification,
        setAutoDismissDelay: handleSetAutoDismissDelay,
      }}
    >
      {children}
      <NotificationBanner
        notification={notification}
        onDismiss={hideNotification}
        autoDismissDelay={autoDismissDelay}
      />
    </NotificationBannerContext.Provider>
  );
};

