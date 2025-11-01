import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseTabBarVisibilityReturn {
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  toggleTabBar: () => void;
}

export const useTabBarVisibility = (): UseTabBarVisibilityReturn => {
  // Facebook-like: tab bar visible by default, hides/shows based on scroll
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const showTabBar = () => {
    setIsTabBarVisible(true);
    lastInteractionRef.current = Date.now();
    clearHideTimeout();
    
    // Don't auto-hide when shown via scroll - let scroll direction control it
    // Only auto-hide after 3 seconds for manual interactions
  };

  const hideTabBar = () => {
    clearHideTimeout();
    setIsTabBarVisible(false);
  };

  const toggleTabBar = () => {
    if (isTabBarVisible) {
      hideTabBar();
    } else {
      showTabBar();
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Show tab bar briefly when app becomes active
        showTabBar();
      } else if (nextAppState === 'background') {
        // Hide tab bar when app goes to background
        hideTabBar();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, []);

  return {
    isTabBarVisible,
    showTabBar,
    hideTabBar,
    toggleTabBar,
  };
};
