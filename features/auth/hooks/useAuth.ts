import { useEffect } from 'react';
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
    refreshAuth: authStore.refreshAuth,
    clearError: authStore.clearError,
    updateUser: authStore.updateUser,
  };
};

export const useRequireAuth = () => {
  const { isAuthenticated, isLoading, refreshAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      await refreshAuth();

      if (!isLoading && !isAuthenticated) {
        logger.info('User not authenticated, redirecting to login');
        router.replace('/(auth)/login');
      }
    };

    checkAuth();
  }, [isAuthenticated, isLoading]);

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
