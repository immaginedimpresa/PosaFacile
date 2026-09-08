import { supabase } from '@/lib/supabase'
import type { NotificationItem, NotificationPreference, NotificationTargetRole } from '@/types/notifications'

/**
 * Recupera le notifiche pertinenti all'utente loggato o al suo ruolo.
 */
export async function fetchNotifications(options?: {
    userId?: string | null
    role?: NotificationTargetRole
    limit?: number
    unreadOnly?: boolean
}): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const { userId, role, limit = 50, unreadOnly = false } = options || {}

    let query = supabase
        .from('notifications' as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit)

    // Filtro pertinenza: se admin, può vedere anche quelle indirizzate ad 'admin' o 'all'
    if (role === 'admin') {
        if (userId) {
            query = query.or(`user_id.eq.${userId},target_role.eq.admin,target_role.eq.all`)
        } else {
            query = query.or('target_role.eq.admin,target_role.eq.all')
        }
    } else if (userId) {
        query = query.or(`user_id.eq.${userId},target_role.eq.all`)
    }

    if (unreadOnly) {
        query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) {
        console.error('Errore nel recupero notifiche:', error)
        return { notifications: [], unreadCount: 0 }
    }

    const notifications = (data || []) as unknown as NotificationItem[]

    // Calcolo non lette
    const unreadCount = notifications.filter(n => !n.read).length

    return { notifications, unreadCount }
}

/**
 * Contrassegna una notifica specifica come letta.
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id)

    if (error) {
        console.error('Errore marcatura notifica letta:', error)
        return false
    }
    return true
}

/**
 * Contrassegna tutte le notifiche dell'utente come lette (via RPC).
 */
export async function markAllNotificationsAsRead(role?: NotificationTargetRole): Promise<number> {
    const { data, error } = await supabase.rpc('mark_all_notifications_as_read' as any, {
        p_target_role: role || null,
    })

    if (error) {
        console.error('Errore marcatura massiva notifiche:', error)
        return 0
    }
    return (data as number) || 0
}

/**
 * Elimina una notifica.
 */
export async function deleteNotification(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Errore eliminazione notifica:', error)
        return false
    }
    return true
}

/**
 * Recupera le preferenze di notifica (Piattaforma vs Email).
 */
export async function fetchNotificationPreferences(
    userId?: string | null,
    role?: 'admin' | 'professional' | 'customer'
): Promise<NotificationPreference[]> {
    let query = supabase
        .from('notification_preferences' as any)
        .select('*')

    if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`)
    } else if (role) {
        query = query.eq('role', role)
    }

    const { data, error } = await query

    if (error) {
        console.error('Errore recupero preferenze notifiche:', error)
        return []
    }

    return (data || []) as unknown as NotificationPreference[]
}

/**
 * Salva o aggiorna una preferenza di notifica.
 */
export async function saveNotificationPreference(
    pref: Omit<NotificationPreference, 'id' | 'created_at' | 'updated_at'>
): Promise<boolean> {
    const payload: Record<string, any> = {
        user_id: pref.user_id || null,
        event_type: pref.event_type,
        role: pref.role,
        platform_enabled: pref.platform_enabled,
        email_enabled: pref.email_enabled,
        updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
        .from('notification_preferences' as any)
        .upsert(payload, { onConflict: 'user_id,event_type' })

    if (error) {
        console.error('Errore salvataggio preferenza notifica:', error)
        return false
    }
    return true
}

/**
 * Sottoscrive il client a nuovi eventi Realtime su public.notifications.
 */
export function subscribeToNotifications(
    callbacks: {
        onInsert?: (notification: NotificationItem) => void
        onUpdate?: (notification: NotificationItem) => void
        onDelete?: (id: string) => void
    }
) {
    const channel = supabase
        .channel('realtime_notifications')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
                if (callbacks.onInsert) {
                    callbacks.onInsert(payload.new as NotificationItem)
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'notifications' },
            (payload) => {
                if (callbacks.onUpdate) {
                    callbacks.onUpdate(payload.new as NotificationItem)
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'notifications' },
            (payload) => {
                if (callbacks.onDelete) {
                    callbacks.onDelete(payload.old.id)
                }
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}
