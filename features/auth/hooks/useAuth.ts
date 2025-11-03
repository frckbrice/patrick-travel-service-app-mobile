import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../../stores/auth/authStore';
import { useRouter } from 'expo-router';
import { logger } from '../../../lib/utils/logger';

export const useAuth = () => {
  const authStore = useAuthStore();

  return {
    user: authStore.user,
    token: authStore.token,
    isLoading: authStore.isLoading,
    isAuthenticated: authStore.isAuthenticated,
    error: authStore.error,
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
    deleteAccount: authStore.deleteAccount,
    refreshAuth: authStore.refreshAuth,
    clearError: authStore.clearError,
    updateUser: authStore.updateUser,
  };
};

export const useRequireAuth = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check once after initial load
    if (hasChecked.current) {
      return;
    }

    if (!isLoading) {
      hasChecked.current = true;

      if (!isAuthenticated) {
        logger.info('User not authenticated, redirecting to login');
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
};

export const useGuestOnly = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      logger.info('User already authenticated, redirecting to home');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  return { isLoading };
};
