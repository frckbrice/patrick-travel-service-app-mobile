import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/auth/authStore';
import { secureStorage } from '../lib/storage/secureStorage';
import { COLORS } from '../lib/constants';

export default function Index() {
  const { isAuthenticated, isLoading, refreshAuth } = useAuthStore();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await secureStorage.get<boolean>('hasSeenOnboarding');
      setHasSeenOnboarding(seen ?? false);
      await refreshAuth();
    };
    checkOnboarding();
  }, []);

  if (isLoading || hasSeenOnboarding === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
