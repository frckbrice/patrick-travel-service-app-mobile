import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseTabBarVisibilityReturn {
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  toggleTabBar: () => void;
}

export const useTabBarVisibility = (): UseTabBarVisibilityReturn => {
  const [isTabBarVisible, setIsTabBarVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    
    // Auto-hide after 3 seconds of inactivity
    hideTimeoutRef.current = setTimeout(() => {
      setIsTabBarVisible(false);
    }, 3000);
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
