/**
 * Custom Alert API Wrapper
 * Drop-in replacement for React Native's Alert.alert
 */

import { AlertButton, CustomAlertOptions } from '../../components/ui/CustomAlert';

// Global alert state management
type AlertState = {
  visible: boolean;
  options: CustomAlertOptions | null;
};

let alertState: AlertState = {
  visible: false,
  options: null,
};

let setAlertState: ((state: AlertState) => void) | null = null;

export const initCustomAlert = (stateSetter: (state: AlertState) => void) => {
  setAlertState = stateSetter;
};

export const getCustomAlertState = () => alertState;

export const showCustomAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[],
  options?: Omit<CustomAlertOptions, 'title' | 'message' | 'buttons'>
): Promise<number> => {
  return new Promise<number>((resolve) => {
    const alertOptions: CustomAlertOptions = {
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
      ...options,
    };

    alertState = {
      visible: true,
      options: alertOptions,
    };

    // Store the callback for when buttons are pressed
    alertState.options = {
      ...alertOptions,
      buttons: (alertOptions.buttons || []).map((btn, index) => ({
        ...btn,
        onPress: () => {
          resolve(index);
          hideCustomAlert();
          if (btn.onPress) {
            btn.onPress();
          }
        },
      })),
    };

    if (setAlertState) {
      setAlertState(alertState);
    }
  });
};

export const hideCustomAlert = () => {
  alertState = {
    visible: false,
    options: null,
  };

  if (setAlertState) {
    setAlertState(alertState);
  }
};

// Main Alert API (similar to React Native's Alert)
export const CustomAlert = {
  alert: showCustomAlert,
};
