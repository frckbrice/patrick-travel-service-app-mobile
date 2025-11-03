import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarContext } from '../context/TabBarContext';

/**
 * Hook to get the bottom padding needed for content when tab bar is visible
 * @returns The bottom padding value to apply to ScrollView/FlatList contentContainerStyle
 */
export const useTabBarPadding = (): number => {
  const { isTabBarVisible, tabBarHeight } = useTabBarContext();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    if (!isTabBarVisible || tabBarHeight === 0) {
      return 0;
    }
    // Return the full tab bar height to ensure content is not hidden
    return tabBarHeight;
  }, [isTabBarVisible, tabBarHeight]);
};

