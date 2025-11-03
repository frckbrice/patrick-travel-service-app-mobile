/**
 * Global Alert Utility
 * Provides a simple API similar to React Native's Alert.alert
 * This is a wrapper around the CustomAlert context
 */

import { AlertButton } from '../../components/ui/CustomAlert';

// This will be set by the AlertProvider
let showAlertFn: (
  title: string,
  message: string,
  buttons?: AlertButton[],
  options?: any
) => Promise<number> | null = null;

export const initAlert = (
  fn: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    options?: any
  ) => Promise<number>
) => {
  showAlertFn = fn;
};

// Main Alert API (compatible with React Native's Alert.alert)
export const Alert = {
  alert: (
    title: string,
    message: string,
    buttons?: AlertButton[]
  ): Promise<number> | undefined => {
    if (showAlertFn) {
      return showAlertFn(title, message, buttons);
    }
    console.warn('Alert not initialized. Make sure AlertProvider is set up.');
    return Promise.resolve(0);
  },
};
