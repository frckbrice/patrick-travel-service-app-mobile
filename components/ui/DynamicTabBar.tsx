import React, { useState, useEffect, useRef } from 'react';
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

export const DynamicTabBar: React.FC<DynamicTabBarProps> = ({
  visible,
  onVisibilityChange,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 300 });
      
      // Clear any existing timeout - visibility is now controlled by scroll direction
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    } else {
      hideTabBar();
    }
  }, [visible]);

  const hideTabBar = () => {
    translateY.value = withTiming(100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(setIsVisible)(false);
    });
    runOnJS(onVisibilityChange)(false);
  };

  const showTabBar = () => {
    setIsVisible(true);
    translateY.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
    opacity.value = withTiming(1, { duration: 300 });
    onVisibilityChange(true);
    
    // Clear existing timeout - visibility is now controlled by scroll direction
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTabPress = (tab: TabItem) => {
    router.push(tab.route as any);
    showTabBar(); // Show tab bar when user interacts
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!isVisible && !visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route || 
            (tab.route === '/(tabs)/' && pathname === '/(tabs)');
          
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
