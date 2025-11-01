import React, { createContext, useContext, ReactNode, useMemo, useState, useCallback } from 'react';
import { useTabBarVisibility } from '../hooks/useTabBarVisibility';

interface TabBarContextType {
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  toggleTabBar: () => void;
  tabBarHeight: number;
  setTabBarHeight: (height: number) => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

interface TabBarProviderProps {
  children: ReactNode;
}

export const TabBarProvider: React.FC<TabBarProviderProps> = ({ children }) => {
  const tabBarVisibility = useTabBarVisibility();
  const [tabBarHeight, setTabBarHeight] = useState(0);

  // Memoize setTabBarHeight to ensure stable reference
  const handleSetTabBarHeight = useCallback((height: number) => {
    setTabBarHeight(height);
  }, []);

  // Memoize context value - functions are stable (useCallback), only visibility state changes
  // This prevents unnecessary re-renders of all context consumers
  const contextValue = useMemo(() => ({
    ...tabBarVisibility,
    tabBarHeight,
    setTabBarHeight: handleSetTabBarHeight,
  }), [
    tabBarVisibility.isTabBarVisible,
    tabBarHeight,
    handleSetTabBarHeight,
    // Functions are already memoized with useCallback and won't change
    // but we reference them to ensure proper memoization
  ]);

  return (
    <TabBarContext.Provider value={contextValue}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBarContext = (): TabBarContextType => {
  const context = useContext(TabBarContext);
  if (!context) {
    throw new Error('useTabBarContext must be used within a TabBarProvider');
  }
  return context;
};
