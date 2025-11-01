import { useCallback, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useTabBarContext } from '../context/TabBarContext';

interface UseTabBarScrollOptions {
  threshold?: number; // Minimum scroll delta to trigger direction change
  bottomThreshold?: number; // Distance from bottom to show tab bar (default: 150px for easier touch detection)
}

/**
 * Hook that integrates scroll detection with tab bar visibility.
 * Returns scroll event handlers to attach to ScrollView or FlatList.
 * 
 * Facebook-like Behavior:
 * - Hides tab bar when scrolling down (to give more screen space)
 * - Shows tab bar when scrolling up (to show navigation options)
 * - Always shows tab bar when near/at bottom (for easy access)
 */
export const useTabBarScroll = (options: UseTabBarScrollOptions = {}) => {
  const { showTabBar, hideTabBar, isTabBarVisible } = useTabBarContext();
  const {
    threshold = 10,
    bottomThreshold = 150, // Increased for easier bottom touch detection
  } = options;

  const lastScrollY = useRef(0);
  const lastScrollDirection = useRef<'up' | 'down' | null>(null);
  const scrollAccumulator = useRef(0); // Accumulate small scrolls to prevent flickering

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollHeight = event.nativeEvent.contentSize.height;
      const viewportHeight = event.nativeEvent.layoutMeasurement.height;
      const distanceFromBottom = scrollHeight - (currentScrollY + viewportHeight);

      // Check if at/near bottom (always show tab bar at bottom for easy access)
      const isNearBottom = distanceFromBottom <= bottomThreshold;

      // Calculate scroll delta (positive = scrolling down, negative = scrolling up)
      const scrollDelta = currentScrollY - lastScrollY.current;
      scrollAccumulator.current += scrollDelta;

      // Priority 1: If at/near bottom, always show tab bar (Facebook behavior)
      if (isNearBottom) {
        if (!isTabBarVisible) {
          showTabBar();
        }
        // Reset direction tracking when at bottom
        lastScrollDirection.current = null;
        scrollAccumulator.current = 0;
      }
      // Priority 2: Handle scroll direction when not at bottom (Facebook-like)
      else {
        // Only change direction when accumulated scroll exceeds threshold
        // This prevents rapid toggling/flickering
        if (Math.abs(scrollAccumulator.current) > threshold) {
          if (scrollAccumulator.current > 0) {
            // Scrolling down - HIDE tab bar (Facebook behavior)
            if (lastScrollDirection.current !== 'down') {
              // Direction changed to down - hide tab bar
              lastScrollDirection.current = 'down';
              if (isTabBarVisible) {
                hideTabBar();
              }
            }
            // Reset accumulator (whether direction changed or continuing down)
            scrollAccumulator.current = 0;
          } else if (scrollAccumulator.current < 0) {
            // Scrolling up - SHOW tab bar (Facebook behavior)
            if (lastScrollDirection.current !== 'up') {
              // Direction changed to up - show tab bar
              lastScrollDirection.current = 'up';
              if (!isTabBarVisible) {
                showTabBar();
              }
            }
            // Reset accumulator (whether direction changed or continuing up)
            scrollAccumulator.current = 0;
          }
        }
      }

      // Update last scroll position
      lastScrollY.current = currentScrollY;
    },
    [threshold, bottomThreshold, showTabBar, hideTabBar, isTabBarVisible]
  );

  return {
    onScroll: handleScroll,
    scrollEventThrottle: 16, // Throttle scroll events for better performance
  };
};

