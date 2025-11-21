/**
 * Get Started Utilities
 * Manages get-started screen state persistence
 *
 * The get-started screen is shown only once on first app launch.
 * State is stored in AsyncStorage and persists across app sessions.
 * Will reset only when the app is uninstalled and reinstalled.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

/**
 * Check if user has seen the get-started screen
 * @returns true if get-started was completed, false otherwise
 */
export const hasSeenGetStarted = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.GET_STARTED_COMPLETED);
        return value === 'true';
    } catch (error) {
        console.error('Error checking get-started status:', error);
        return false;
    }
};

/**
 * Mark get-started as completed
 * This will prevent the get-started screen from showing again
 */
export const completeGetStarted = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.GET_STARTED_COMPLETED, 'true');
    } catch (error) {
        console.error('Error saving get-started completion:', error);
    }
};

/**
 * Reset get-started status (for testing purposes)
 * WARNING: This will cause get-started to show again on next app start
 */
export const resetGetStarted = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.GET_STARTED_COMPLETED);
    } catch (error) {
        console.error('Error resetting get-started:', error);
    }
};

