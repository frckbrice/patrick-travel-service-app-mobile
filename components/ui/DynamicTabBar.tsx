import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Dimensions,
  PanGestureHandler,
  State,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { SPACING } from '../../lib/constants';
import { useTabBarContext } from '../../lib/context/TabBarContext';

interface TabItem {
  name: string;
  icon: string;
  label: string;
  route: string;
}

const tabs: TabItem[] = [
  {
    name: 'index',
    icon: 'home',
    label: 'Home',
    route: '/(tabs)/',
  },
  {
    name: 'cases',
    icon: 'briefcase',
    label: 'Cases',
    route: '/(tabs)/cases',
  },
  {
    name: 'documents',
    icon: 'file-document-multiple',
    label: 'Documents',
    route: '/(tabs)/documents',
  },
  {
    name: 'notifications',
    icon: 'bell',
    label: 'Notifications',
    route: '/(tabs)/notifications',
  },
  {
    name: 'profile',
    icon: 'account',
    label: 'Profile',
    route: '/(tabs)/profile',
  },
];

interface DynamicTabBarProps {
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

const DynamicTabBarComponent: React.FC<DynamicTabBarProps> = ({
  visible,
  onVisibilityChange,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { setTabBarHeight } = useTabBarContext();
  
  // Start hidden by default (on demand behavior)
  const translateY = useSharedValue(visible ? 0 : 100);
  const opacity = useSharedValue(visible ? 1 : 0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isVisible, setIsVisible] = useState(visible);
  const prevVisibleRef = useRef(visible);
  
  // Measure tab bar height when it becomes visible
  const containerRef = useRef<Animated.View>(null);

  // Memoized hide function - state is controlled by parent, don't call onVisibilityChange
  const hideTabBar = useCallback(() => {
    // Only animate if not already hidden
    if (isVisible) {
      translateY.value = withTiming(100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setIsVisible)(false);
        // Don't call onVisibilityChange - state is managed by parent via props
        // This prevents feedback loops and unnecessary re-renders
      });
    }
  }, [translateY, opacity, isVisible]);

  // Memoized show function - state is controlled by parent, don't call onVisibilityChange
  const showTabBar = useCallback(() => {
    // Only animate if not already visible
    if (!isVisible) {
      setIsVisible(true);
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 300 });
      // Don't call onVisibilityChange - state is managed by parent via props
      // This prevents feedback loops and unnecessary re-renders
      
      // Clear existing timeout - visibility is now controlled by scroll direction
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }
    
    // Height will be measured via onLayout callback
  }, [translateY, opacity, isVisible]);

  // Only update when visibility actually changes - prevent bouncing
  useEffect(() => {
    // Only update if there's an actual change and component is ready
    if (prevVisibleRef.current !== visible) {
      // Small delay to batch rapid changes and prevent bouncing
      const timeoutId = setTimeout(() => {
        // Double-check visibility hasn't changed again
        if (prevVisibleRef.current !== visible) {
          prevVisibleRef.current = visible;
          if (visible) {
            showTabBar();
          } else {
            hideTabBar();
          }
        }
      }, 50); // Small debounce to batch rapid changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [visible, showTabBar, hideTabBar]);

  // Memoized tab press handler
  const handleTabPress = useCallback((tab: TabItem) => {
    router.push(tab.route as any);
    // Show tab bar when user interacts - use onVisibilityChange for user-initiated actions only
    if (onVisibilityChange && !visible) {
      onVisibilityChange(true);
    }
  }, [router, onVisibilityChange, visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  }, []);

  // Memoize pointer events calculation
  const pointerEvents = useMemo(() => {
    return visible && isVisible ? 'auto' : 'none';
  }, [visible, isVisible]);

  // Memoize container style
  const containerStyle = useMemo(() => [
    styles.container,
    {
      paddingBottom: insets.bottom,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    },
    animatedStyle,
  ], [insets.bottom, colors.surface, colors.border, animatedStyle]);

  // Memoize active tab calculation
  const activeTab = useMemo(() => {
    return tabs.find(tab => 
      pathname === tab.route || 
      (tab.route === '/(tabs)/' && pathname === '/(tabs)')
    )?.name;
  }, [pathname]);

  // Handle layout measurement - must be defined before early return to maintain hook order
  const handleLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && isVisible) {
      setTabBarHeight(height);
    }
  }, [isVisible, setTabBarHeight]);

  if (!isVisible && !visible) {
    return null;
  }

  return (
    <Animated.View
      ref={containerRef}
      style={containerStyle}
      pointerEvents={pointerEvents}
      collapsable={false}
      onLayout={handleLayout}
    >
      <View style={styles.tabBar} pointerEvents="box-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.tabItem,
                isActive && {
                  backgroundColor: colors.primary + '15',
                },
              ]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={24}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const DynamicTabBar = memo(DynamicTabBarComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    // Ensure it doesn't block touches when hidden
    zIndex: 1000,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
