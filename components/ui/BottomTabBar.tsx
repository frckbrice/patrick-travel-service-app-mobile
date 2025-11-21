import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export const BottomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const getActiveTab = () => {
    // Handle index route variations
    if (pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '/(tabs)/index') {
      return 'index';
    }
    // Find matching tab
    return tabs.find(tab => pathname === tab.route)?.name;
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tab: TabItem) => {
    if (activeTab !== tab.name) {
      router.push(tab.route as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.tabBar}>
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
    </View>
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

