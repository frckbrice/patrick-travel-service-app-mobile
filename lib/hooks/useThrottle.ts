/**
 * useThrottle Hook
 * Performance optimization for frequent function calls
 */

import { useRef, useCallback } from 'react';

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        // Clear existing timeout
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }

        // Schedule for later
        timeoutRef.current = setTimeout(
          () => {
            callback(...args);
            lastRun.current = Date.now();
          },
          delay - (now - lastRun.current)
        );
      }
    },
    [callback, delay]
  );
}
