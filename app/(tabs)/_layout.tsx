import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/constants';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  // Calculate safe bottom padding to avoid device navigation buttons
  const bottomPadding = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 20);
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: true,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerShadowVisible: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.95)',
          borderTopColor: 'rgba(0, 0, 0, 0.1)',
          borderTopWidth: 0.5,
          elevation: 8,
          height: Platform.OS === 'ios' ? 90 + bottomPadding : 75 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          paddingHorizontal: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarBackground: () => 
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={85}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: 'Cases',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="briefcase"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
