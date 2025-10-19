import { create } from 'zustand';
import { Notification } from '../../lib/types';
import { notificationsApi } from '../../lib/api/notifications.api';
import { logger } from '../../lib/utils/logger';

interface NotificationsState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearError: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    fetchNotifications: async () => {
        try {
            set({ isLoading: true, error: null });

            const response = await notificationsApi.getNotifications();

            if (!response.success) {
                set({ error: 'Failed to fetch notifications', isLoading: false });
                return;
            }

            set({
                notifications: response.data || [],
                isLoading: false,
            });

            logger.info('Notifications fetched successfully');
        } catch (error: any) {
            logger.error('Fetch notifications error', error);
            set({ error: error.message, isLoading: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const count = await notificationsApi.getUnreadCount();
            set({ unreadCount: count });
        } catch (error: any) {
            logger.error('Fetch unread count error', error);
        }
    },

    markAsRead: async (id: string) => {
        try {
            const response = await notificationsApi.markAsRead(id);

            if (response.success) {
                set((state) => ({
                    notifications: state.notifications.map((n) =>
                        n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
                    ),
                    unreadCount: Math.max(0, state.unreadCount - 1),
                }));
            }
        } catch (error: any) {
            logger.error('Mark as read error', error);
        }
    },

    markAllAsRead: async () => {
        try {
            const response = await notificationsApi.markAllAsRead();

            if (response.success) {
                set((state) => ({
                    notifications: state.notifications.map((n) => ({
                        ...n,
                        isRead: true,
                        readAt: new Date(),
                    })),
                    unreadCount: 0,
                }));
            }
        } catch (error: any) {
            logger.error('Mark all as read error', error);
        }
    },

    deleteNotification: async (id: string) => {
        try {
            const response = await notificationsApi.deleteNotification(id);

            if (response.success) {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }));
            }
        } catch (error: any) {
            logger.error('Delete notification error', error);
        }
    },

    clearError: () => set({ error: null }),
}));

