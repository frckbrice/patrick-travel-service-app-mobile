import { useRef, useCallback } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface UseScrollDirectionOptions {
  threshold?: number; // Minimum scroll delta to trigger direction change
  bottomThreshold?: number; // Distance from bottom to show tab bar
  onScrollDown?: () => void;
  onScrollUp?: () => void;
  onNearBottom?: () => void;
}

export const useScrollDirection = (options: UseScrollDirectionOptions = {}) => {
  const {
    threshold = 10,
    bottomThreshold = 100,
    onScrollDown,
    onScrollUp,
    onNearBottom,
  } = options;

  const lastScrollY = useRef(0);
  const lastScrollDirection = useRef<'up' | 'down' | null>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollHeight = event.nativeEvent.contentSize.height;
      const viewportHeight = event.nativeEvent.layoutMeasurement.height;
      const distanceFromBottom = scrollHeight - (currentScrollY + viewportHeight);

      // Check if near bottom
      if (distanceFromBottom < bottomThreshold && onNearBottom) {
        onNearBottom();
      }

      // Calculate scroll delta
      const scrollDelta = currentScrollY - lastScrollY.current;

      // Only trigger direction change if scroll delta exceeds threshold
      if (Math.abs(scrollDelta) > threshold) {
        if (scrollDelta > 0 && lastScrollDirection.current !== 'down') {
          // Scrolling down
          lastScrollDirection.current = 'down';
          if (onScrollDown) {
            onScrollDown();
          }
        } else if (scrollDelta < 0 && lastScrollDirection.current !== 'up') {
          // Scrolling up
          lastScrollDirection.current = 'up';
          if (onScrollUp) {
            onScrollUp();
          }
        }
      }

      // Update last scroll position
      lastScrollY.current = currentScrollY;
    },
    [threshold, bottomThreshold, onScrollDown, onScrollUp, onNearBottom]
  );

  return { handleScroll };
};

