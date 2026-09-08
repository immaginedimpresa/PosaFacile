import { useState, useEffect } from 'react'
import {
    Bell,
    CheckCheck,
    Package,
    HardHat,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    Mail,
    Laptop,
    Trash2,
    SlidersHorizontal,
    ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNotificationStore } from '@/store/notificationStore'
import { useUserStore } from '@/store/userStore'
import {
    fetchNotificationPreferences,
    saveNotificationPreference,
} from '@/services/notificationService'
import {
    NOTIFICATION_EVENT_DEFINITIONS,
    type NotificationPreference,
} from '@/types/notifications'

function getCategoryIcon(type: string) {
    switch (type) {
        case 'order_created':
            return <Package className="w-5 h-5 text-orange-600" />
        case 'pro_assigned':
            return <HardHat className="w-5 h-5 text-amber-600" />
        case 'message_received':
            return <MessageSquare className="w-5 h-5 text-blue-600" />
        case 'status_changed':
            return <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        case 'room_prep_reminder':
        case 'info_pending':
        default:
            return <AlertCircle className="w-5 h-5 text-rose-600" />
    }
}

export function CustomerNotificationsTab() {
    const [viewMode, setViewMode] = useState<'inbox' | 'preferences'>('inbox')
    const [preferences, setPreferences] = useState<NotificationPreference[]>([])
    const [loadingPrefs, setLoadingPrefs] = useState(false)
    const [savingKey, setSavingKey] = useState<string | null>(null)

    const { user } = useUserStore()
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        loadNotifications,
    } = useNotificationStore()

    useEffect(() => {
        if (user) {
            loadNotifications(user.id, 'customer')
            loadPrefs()
        }
    }, [user?.id])

    const loadPrefs = async () => {
        if (!user) return
        setLoadingPrefs(true)
        try {
            const prefs = await fetchNotificationPreferences(user.id, 'customer')
            setPreferences(prefs)
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingPrefs(false)
        }
    }

    const handleTogglePref = async (eventType: string, channel: 'platform' | 'email', current: boolean) => {
        if (!user) return
        setSavingKey(eventType)
        const existing = preferences.find((p) => p.event_type === eventType)
        const payload = {
            user_id: user.id,
            event_type: eventType,
            role: 'customer' as const,
            platform_enabled: channel === 'platform' ? !current : existing?.platform_enabled ?? true,
            email_enabled: channel === 'email' ? !current : existing?.email_enabled ?? true,
        }

        const ok = await saveNotificationPreference(payload)
        if (ok) {
            setPreferences((prev) => {
                const filtered = prev.filter((p) => p.event_type !== eventType)
                return [...filtered, payload]
            })
            toast.success('Preferenza aggiornata!')
        } else {
            toast.error('Errore durante il salvataggio')
        }
        setSavingKey(null)
    }

    return (
        <div className="space-y-6">
            {/* Toolbar Superiore */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs">
                <div>
                    <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-orange-500" />
                        <span>Centro Notifiche & Aggiornamenti Ordini</span>
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                        Tutti gli avvisi di spedizione, assegnazione posatore e avanzamento cantiere
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-stone-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setViewMode('inbox')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'inbox'
                                    ? 'bg-white text-stone-900 shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            }`}
                        >
                            Avvisi ({notifications.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('preferences')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                viewMode === 'preferences'
                                    ? 'bg-white text-stone-900 shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            }`}
                        >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Canali</span>
                        </button>
                    </div>

                    {unreadCount > 0 && viewMode === 'inbox' && (
                        <button
                            type="button"
                            onClick={() => markAllAsRead()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded-xl border border-orange-200 transition-colors cursor-pointer"
                        >
                            <CheckCheck size={14} />
                            <span>Segna tutte lette</span>
                        </button>
                    )}
                </div>
            </div>

            {/* VISTA INBOX */}
            {viewMode === 'inbox' && (
                <div className="space-y-3">
                    {notifications.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 text-stone-400">
                                <Bell className="w-8 h-8 opacity-40" />
                            </div>
                            <h3 className="text-base font-bold text-stone-800">Nessuna notifica presente</h3>
                            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                                Quando effettui un ordine o il posatore aggiorna il cantiere, riceverai qui tutti gli avvisi in tempo reale.
                            </p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                                    notif.read
                                        ? 'border-stone-200/80'
                                        : 'border-orange-200 bg-orange-50/20 ring-1 ring-orange-500/10'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                            notif.read ? 'bg-stone-100' : 'bg-white shadow-xs border border-orange-200'
                                        }`}
                                    >
                                        {getCategoryIcon(notif.type)}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h4 className="text-sm font-bold text-stone-900">{notif.title}</h4>
                                            {!notif.read && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                                                    Nuova
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                                            {notif.message}
                                        </p>
                                        <span className="text-[11px] text-stone-400 mt-2 block">
                                            {new Date(notif.created_at).toLocaleDateString('it-IT', {
                                                day: '2-digit',
                                                month: 'long',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                    {notif.link && (
                                        <a
                                            href={notif.link}
                                            onClick={() => {
                                                if (!notif.read) markAsRead(notif.id)
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
                                        >
                                            <span>Visualizza</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}

                                    {!notif.read && (
                                        <button
                                            type="button"
                                            onClick={() => markAsRead(notif.id)}
                                            className="p-2 text-stone-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
                                            title="Segna come letta"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => deleteNotification(notif.id)}
                                        className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Elimina notifica"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* VISTA PREFERENZE CANALI CLIENTE */}
            {viewMode === 'preferences' && (
                <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-stone-100">
                        <h3 className="text-sm font-bold text-stone-900">
                            Preferenze Notifiche (In-App ed Email)
                        </h3>
                        <p className="text-xs text-stone-500">
                            Scegli come desideri ricevere gli aggiornamenti relativi ai tuoi ordini di acquisto e posa
                        </p>
                    </div>

                    <div className="divide-y divide-stone-100">
                        {NOTIFICATION_EVENT_DEFINITIONS.filter((d) => d.roles.includes('customer')).map((eventDef) => {
                            const pref = preferences.find((p) => p.event_type === eventDef.key)
                            const isPlatform = pref ? pref.platform_enabled : true
                            const isEmail = pref ? pref.email_enabled : true
                            const isSaving = savingKey === eventDef.key

                            return (
                                <div
                                    key={eventDef.key}
                                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors"
                                >
                                    <div className="max-w-md">
                                        <span className="text-xs font-bold text-stone-900 block mb-0.5">
                                            {eventDef.label}
                                        </span>
                                        <p className="text-xs text-stone-500 leading-relaxed">
                                            {eventDef.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-5 shrink-0">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <div className="flex items-center gap-1 text-xs font-semibold text-stone-600">
                                                <Laptop className="w-3.5 h-3.5 text-stone-500" />
                                                <span>Piattaforma</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                disabled={isSaving || loadingPrefs}
                                                checked={isPlatform}
                                                onChange={() => handleTogglePref(eventDef.key, 'platform', isPlatform)}
                                                className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                                            />
                                        </label>

                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <div className="flex items-center gap-1 text-xs font-semibold text-stone-600">
                                                <Mail className="w-3.5 h-3.5 text-orange-500" />
                                                <span>Email</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                disabled={isSaving || loadingPrefs}
                                                checked={isEmail}
                                                onChange={() => handleTogglePref(eventDef.key, 'email', isEmail)}
                                                className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                                            />
                                        </label>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
