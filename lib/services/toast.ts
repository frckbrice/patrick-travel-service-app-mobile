import Toast from 'react-native-toast-message';

/**
 * Toast Service - Provides consistent, non-blocking feedback to users
 * 
 * Use this instead of Alert for:
 * - Success messages (profile updated, form submitted)
 * - Non-critical errors (failed to load, network issues)
 * - Info messages (feature coming soon, test notifications)
 * 
 * Keep using Alert for:
 * - Confirmations (delete account, remove item)
 * - Permissions (camera access, notifications)
 * - Critical blocking errors requiring user decision
 */

interface ToastOptions {
    title: string;
    message?: string;
    duration?: number;
    position?: 'top' | 'bottom';
}

export const toast = {
    /**
     * Show success toast (green checkmark)
     * Use for: successful operations, confirmations
     */
    success: (options: ToastOptions | string) => {
        const config = typeof options === 'string'
            ? { title: options }
            : options;

        Toast.show({
            type: 'success',
            text1: config.title,
            text2: config.message,
            visibilityTime: config.duration || 3000,
            position: config.position || 'top',
            autoHide: true,
        });
    },

    /**
     * Show error toast (red X)
     * Use for: non-critical errors, failed operations
     */
    error: (options: ToastOptions | string) => {
        const config = typeof options === 'string'
            ? { title: options }
            : options;

        Toast.show({
            type: 'error',
            text1: config.title,
            text2: config.message,
            visibilityTime: config.duration || 4000,
            position: config.position || 'top',
            autoHide: true,
        });
    },

    /**
     * Show info toast (blue info icon)
     * Use for: informational messages, tips
     */
    info: (options: ToastOptions | string) => {
        const config = typeof options === 'string'
            ? { title: options }
            : options;

        Toast.show({
            type: 'info',
            text1: config.title,
            text2: config.message,
            visibilityTime: config.duration || 3000,
            position: config.position || 'top',
            autoHide: true,
        });
    },

    /**
     * Show warning toast (orange warning icon)
     * Use for: warnings, cautions
     */
    warning: (options: ToastOptions | string) => {
        const config = typeof options === 'string'
            ? { title: options }
            : options;

        Toast.show({
            type: 'error', // react-native-toast-message doesn't have 'warning' type by default
            text1: config.title,
            text2: config.message,
            visibilityTime: config.duration || 3500,
            position: config.position || 'top',
            autoHide: true,
        });
    },

    /**
     * Hide the currently displayed toast
     */
    hide: () => {
        Toast.hide();
    },
};

// Export the raw Toast component for advanced usage
export { Toast };

