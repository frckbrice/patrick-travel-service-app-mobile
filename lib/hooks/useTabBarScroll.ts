import { useCallback, useRef, useEffect } from 'react';
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
    threshold = 30, // Increased threshold significantly to prevent bouncing
    bottomThreshold = 100, // Increased to show tab bar earlier when approaching bottom
  } = options;

  const lastScrollY = useRef(0);
  const lastScrollDirection = useRef<'up' | 'down' | null>(null);
  const scrollAccumulator = useRef(0); // Accumulate small scrolls to prevent flickering
  // Use ref to track visibility without causing re-renders in scroll handler
  const isTabBarVisibleRef = useRef(isTabBarVisible);
  
  // Cooldown period to prevent rapid visibility changes
  const lastVisibilityChangeRef = useRef<number>(0);
  const VISIBILITY_COOLDOWN = 300; // ms - minimum time between visibility changes
  
  // Pending action ref to debounce state changes
  const pendingActionRef = useRef<'show' | 'hide' | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync ref with actual state when it changes (from external sources)
  useEffect(() => {
    isTabBarVisibleRef.current = isTabBarVisible;
  }, [isTabBarVisible]);

  // Stable references to functions - these shouldn't change but we'll use refs to be safe
  const showTabBarRef = useRef(showTabBar);
  const hideTabBarRef = useRef(hideTabBar);

  useEffect(() => {
    showTabBarRef.current = showTabBar;
    hideTabBarRef.current = hideTabBar;
  }, [showTabBar, hideTabBar]);

  // Clear pending actions on unmount
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  const executeVisibilityChange = useCallback((action: 'show' | 'hide') => {
    const now = Date.now();
    
    // Check cooldown period
    if (now - lastVisibilityChangeRef.current < VISIBILITY_COOLDOWN) {
      // Still in cooldown, schedule action if different from current pending
      if (pendingActionRef.current !== action) {
        pendingActionRef.current = action;
        // Clear existing timeout
        if (actionTimeoutRef.current) {
          clearTimeout(actionTimeoutRef.current);
        }
        // Schedule action after cooldown using a closure-safe approach
        const remainingCooldown = VISIBILITY_COOLDOWN - (now - lastVisibilityChangeRef.current);
        actionTimeoutRef.current = setTimeout(() => {
          const executeAction = () => {
            const actionNow = Date.now();
            // Final check before executing
            if (actionNow - lastVisibilityChangeRef.current >= VISIBILITY_COOLDOWN) {
              pendingActionRef.current = null;
              if (action === 'show' && !isTabBarVisibleRef.current) {
                isTabBarVisibleRef.current = true;
                lastVisibilityChangeRef.current = actionNow;
                showTabBarRef.current();
              } else if (action === 'hide' && isTabBarVisibleRef.current) {
                isTabBarVisibleRef.current = false;
                lastVisibilityChangeRef.current = actionNow;
                hideTabBarRef.current();
              }
            }
          };
          executeAction();
        }, remainingCooldown);
      }
      return;
    }

    // Clear any pending actions
    pendingActionRef.current = null;
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }

    // Execute the action
    if (action === 'show' && !isTabBarVisibleRef.current) {
      isTabBarVisibleRef.current = true;
      lastVisibilityChangeRef.current = now;
      showTabBarRef.current();
    } else if (action === 'hide' && isTabBarVisibleRef.current) {
      isTabBarVisibleRef.current = false;
      lastVisibilityChangeRef.current = now;
      hideTabBarRef.current();
    }
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollHeight = event.nativeEvent.contentSize.height;
      const viewportHeight = event.nativeEvent.layoutMeasurement.height;
      const distanceFromBottom = scrollHeight - (currentScrollY + viewportHeight);

      // Check if at/near top (always show tab bar at top for easy access)
      const isNearTop = currentScrollY <= 50; // Show tab bar when within 50px of top
      // Check if at/near bottom (always show tab bar at bottom for easy access)
      const isNearBottom = distanceFromBottom <= bottomThreshold;

      // Calculate scroll delta (positive = scrolling down, negative = scrolling up)
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // Ignore very small movements that could be bounce/elastic scrolling
      if (Math.abs(scrollDelta) < 1) {
        return;
      }
      
      scrollAccumulator.current += scrollDelta;

      // Priority 1: If at/near top OR bottom, always show tab bar
      if (isNearTop || isNearBottom) {
        if (!isTabBarVisibleRef.current) {
          executeVisibilityChange('show');
        }
        // Reset direction tracking when at top/bottom
        lastScrollDirection.current = null;
        scrollAccumulator.current = 0;
      }
        // Priority 2: Handle scroll direction when not at top/bottom (Facebook-like)
      else {
        // Only change direction when accumulated scroll exceeds threshold
        // This prevents rapid toggling/flickering
        if (Math.abs(scrollAccumulator.current) > threshold) {
          if (scrollAccumulator.current > 0) {
            // Scrolling down - HIDE tab bar (Facebook behavior)
            if (lastScrollDirection.current !== 'down') {
              // Direction changed to down - hide tab bar
              lastScrollDirection.current = 'down';
              executeVisibilityChange('hide');
            }
            // Reset accumulator (whether direction changed or continuing down)
            scrollAccumulator.current = 0;
          } else if (scrollAccumulator.current < 0) {
            // Scrolling up - SHOW tab bar (Facebook behavior)
            if (lastScrollDirection.current !== 'up') {
              // Direction changed to up - show tab bar
              lastScrollDirection.current = 'up';
              executeVisibilityChange('show');
            }
            // Reset accumulator (whether direction changed or continuing up)
            scrollAccumulator.current = 0;
          }
        }
      }

      // Update last scroll position
      lastScrollY.current = currentScrollY;
    },
    [threshold, bottomThreshold, executeVisibilityChange]
  );

  return {
    onScroll: handleScroll,
    scrollEventThrottle: 100, // Increased throttle to reduce frequency and prevent bouncing
  };
};

