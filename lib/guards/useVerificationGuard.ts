import { useAuthStore } from '../../stores/auth/authStore';

export const useVerificationGuard = () => {
    const user = useAuthStore((s) => s.user);
    const isVerified = user?.isVerified || false;

    return {
        isVerified,
        user,
    };
};
