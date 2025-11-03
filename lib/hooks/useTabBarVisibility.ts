import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseTabBarVisibilityReturn {
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  toggleTabBar: () => void;
}

export const useTabBarVisibility = (): UseTabBarVisibilityReturn => {
  // On demand: tab bar hidden by default, shows only on scroll up or at bottom
  const [isTabBarVisible, setIsTabBarVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Use ref to track pending updates and prevent rapid toggling
  const pendingUpdateRef = useRef<'show' | 'hide' | null>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize showTabBar to ensure stable reference
  const showTabBar = useCallback(() => {
    // Debounce rapid calls
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    pendingUpdateRef.current = 'show';
    updateTimeoutRef.current = setTimeout(() => {
      // Only update state if visibility actually changes to prevent unnecessary re-renders
      setIsTabBarVisible((prev) => {
        if (prev) {
          pendingUpdateRef.current = null;
          return prev; // Already visible, no state update needed
        }
        lastInteractionRef.current = Date.now();
        clearHideTimeout();
        pendingUpdateRef.current = null;
        return true;
      });
    }, 50); // Small debounce to batch rapid calls
  }, [clearHideTimeout]);

  // Memoize hideTabBar to ensure stable reference
  const hideTabBar = useCallback(() => {
    // Debounce rapid calls
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    pendingUpdateRef.current = 'hide';
    updateTimeoutRef.current = setTimeout(() => {
      clearHideTimeout();
      // Only update state if visibility actually changes to prevent unnecessary re-renders
      setIsTabBarVisible((prev) => {
        if (!prev) {
          pendingUpdateRef.current = null;
          return prev; // Already hidden, no state update needed
        }
        pendingUpdateRef.current = null;
        return false;
      });
    }, 50); // Small debounce to batch rapid calls
  }, [clearHideTimeout]);

  // Memoize toggleTabBar to ensure stable reference
  const toggleTabBar = useCallback(() => {
    setIsTabBarVisible((prev) => {
      if (prev) {
        clearHideTimeout();
        return false;
      } else {
        lastInteractionRef.current = Date.now();
        clearHideTimeout();
        return true;
      }
    });
  }, [clearHideTimeout]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Only hide when going to background - don't auto-show when coming to foreground
      // Tab bar visibility should be controlled by scroll behavior, not app state
      if (nextAppState === 'background') {
        hideTabBar();
      }
      // Removed auto-show on 'active' to prevent unwanted tab bar reappearance
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [hideTabBar]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearHideTimeout();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [clearHideTimeout]);

  return {
    isTabBarVisible,
    showTabBar,
    hideTabBar,
    toggleTabBar,
  };
};
