import React, { createContext, useContext, ReactNode } from 'react';
import { useTabBarVisibility } from '../hooks/useTabBarVisibility';

interface TabBarContextType {
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  toggleTabBar: () => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

interface TabBarProviderProps {
  children: ReactNode;
}

export const TabBarProvider: React.FC<TabBarProviderProps> = ({ children }) => {
  const tabBarVisibility = useTabBarVisibility();

  return (
    <TabBarContext.Provider value={tabBarVisibility}>
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
