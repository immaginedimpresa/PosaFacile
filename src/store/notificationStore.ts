import { create } from 'zustand'
import { toast } from 'sonner'
import type { NotificationItem, NotificationTargetRole } from '@/types/notifications'
import {
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    subscribeToNotifications,
} from '@/services/notificationService'

interface NotificationStore {
    notifications: NotificationItem[]
    unreadCount: number
    loading: boolean
    activeRole: NotificationTargetRole | null
    currentUserId: string | null
    unsubscribeRealtime: (() => void) | null

    loadNotifications: (userId?: string | null, role?: NotificationTargetRole) => Promise<void>
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
    deleteNotification: (id: string) => Promise<void>
    initRealtimeSubscription: (userId?: string | null, role?: NotificationTargetRole) => void
    clearSubscription: () => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    activeRole: null,
    currentUserId: null,
    unsubscribeRealtime: null,

    loadNotifications: async (userId, role) => {
        set({ loading: true, activeRole: role || null, currentUserId: userId || null })
        try {
            const { notifications, unreadCount } = await fetchNotifications({
                userId,
                role,
                limit: 50,
            })
            set({ notifications, unreadCount, loading: false })
        } catch (err) {
            console.error('Errore caricamento store notifiche:', err)
            set({ loading: false })
        }
    },

    markAsRead: async (id: string) => {
        const { notifications, unreadCount } = get()
        const target = notifications.find((n) => n.id === id)
        if (!target || target.read) return

        // Aggiornamento ottimistico
        set({
            notifications: notifications.map((n) =>
                n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n
            ),
            unreadCount: Math.max(0, unreadCount - 1),
        })

        await markNotificationAsRead(id)
    },

    markAllAsRead: async () => {
        const { notifications, activeRole } = get()
        if (notifications.length === 0) return

        // Aggiornamento ottimistico
        set({
            notifications: notifications.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })),
            unreadCount: 0,
        })

        await markAllNotificationsAsRead(activeRole || undefined)
    },

    deleteNotification: async (id: string) => {
        const { notifications, unreadCount } = get()
        const target = notifications.find((n) => n.id === id)
        const wasUnread = target && !target.read

        set({
            notifications: notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
        })

        await deleteNotification(id)
    },

    initRealtimeSubscription: (userId, role) => {
        if (userId !== undefined) set({ currentUserId: userId })
        if (role !== undefined) set({ activeRole: role })

        const existingUnsub = get().unsubscribeRealtime
        if (existingUnsub) {
            existingUnsub()
        }

        const unsub = subscribeToNotifications({
            onInsert: (newNotif) => {
                const { currentUserId, activeRole, notifications, unreadCount } = get()

                // Verifica pertinenza
                const isForMe =
                    (newNotif.user_id && newNotif.user_id === currentUserId) ||
                    (activeRole === 'admin' && (newNotif.target_role === 'admin' || newNotif.target_role === 'all')) ||
                    newNotif.target_role === 'all'

                if (!isForMe) return

                // Aggiorna stato
                set({
                    notifications: [newNotif, ...notifications.filter((n) => n.id !== newNotif.id)],
                    unreadCount: unreadCount + (newNotif.read ? 0 : 1),
                })

                // Feedback Sonner Toast Realtime in-app
                toast(newNotif.title, {
                    description: newNotif.message,
                    action: newNotif.link
                        ? {
                              label: 'Visualizza',
                              onClick: () => {
                                  window.location.href = newNotif.link!
                              },
                          }
                        : undefined,
                    duration: 5000,
                })
            },
            onUpdate: (updatedNotif) => {
                const { notifications } = get()
                const updatedList = notifications.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
                const newUnread = updatedList.filter((n) => !n.read).length
                set({ notifications: updatedList, unreadCount: newUnread })
            },
            onDelete: (deletedId) => {
                const { notifications } = get()
                const updatedList = notifications.filter((n) => n.id !== deletedId)
                const newUnread = updatedList.filter((n) => !n.read).length
                set({ notifications: updatedList, unreadCount: newUnread })
            },
        })

        set({ unsubscribeRealtime: unsub })
    },

    clearSubscription: () => {
        const unsub = get().unsubscribeRealtime
        if (unsub) {
            unsub()
            set({ unsubscribeRealtime: null })
        }
    },
}))
