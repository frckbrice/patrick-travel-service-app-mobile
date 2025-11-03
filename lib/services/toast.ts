import Toast from 'react-native-toast-message';
import i18n from '../i18n';

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
 * 
 * Translation Support:
 * - Pass translation keys like 'common.success' or 'profile.profileUpdated'
 * - Or pass plain strings for direct text display
 */

interface ToastOptions {
    title: string | { key: string; params?: any };
    message?: string | { key: string; params?: any };
    duration?: number;
    position?: 'top' | 'bottom';
}

/**
 * Translates a value if it's a translation key object, otherwise returns as-is
 */
const translate = (value: string | { key: string; params?: any }): string => {
    if (typeof value === 'string') {
        // Check if it's a translation key (contains dots)
        if (value.includes('.') && value.split('.').length >= 2) {
            // Try to translate it
            const translated = i18n.t(value, { defaultValue: value });
            return translated !== value ? translated : value;
        }
        return value;
    }
    return i18n.t(value.key, value.params || {});
};

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
            text1: translate(config.title),
            text2: config.message ? translate(config.message) : undefined,
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
            text1: translate(config.title),
            text2: config.message ? translate(config.message) : undefined,
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
            text1: translate(config.title),
            text2: config.message ? translate(config.message) : undefined,
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
            text1: translate(config.title),
            text2: config.message ? translate(config.message) : undefined,
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

