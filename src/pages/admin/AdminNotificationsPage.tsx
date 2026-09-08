import { useState, useEffect } from 'react'
import {
    Bell,
    CheckCheck,
    Package,
    HardHat,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    Trash2,
    Mail,
    Laptop,
    SlidersHorizontal,
    ExternalLink,
    Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNotificationStore } from '@/store/notificationStore'
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
        case 'low_stock':
            return <Package className="w-5 h-5 text-orange-600" />
        case 'job_assigned':
        case 'pro_assigned':
            return <HardHat className="w-5 h-5 text-amber-600" />
        case 'message_received':
            return <MessageSquare className="w-5 h-5 text-blue-600" />
        case 'status_changed':
        case 'pro_approved':
            return <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        default:
            return <AlertCircle className="w-5 h-5 text-rose-600" />
    }
}

export function AdminNotificationsPage() {
    const [activeTab, setActiveTab] = useState<'inbox' | 'preferences'>('inbox')
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'orders' | 'jobs' | 'messages' | 'system'>('all')
    const [unreadOnly, setUnreadOnly] = useState(false)
    const [preferences, setPreferences] = useState<NotificationPreference[]>([])
    const [loadingPrefs, setLoadingPrefs] = useState(false)
    const [savingPrefKey, setSavingPrefKey] = useState<string | null>(null)

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        loadNotifications,
    } = useNotificationStore()

    // Caricamento preferenze
    useEffect(() => {
        loadNotifications(null, 'admin')
        loadPreferences()
    }, [])

    const loadPreferences = async () => {
        setLoadingPrefs(true)
        try {
            const prefs = await fetchNotificationPreferences(null, 'admin')
            setPreferences(prefs)
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingPrefs(false)
        }
    }

    const handleTogglePreference = async (
        eventType: string,
        channel: 'platform' | 'email',
        currentVal: boolean
    ) => {
        setSavingPrefKey(eventType)
        const existing = preferences.find((p) => p.event_type === eventType)
        const updatedPref = {
            user_id: null,
            event_type: eventType,
            role: 'admin' as const,
            platform_enabled: channel === 'platform' ? !currentVal : existing?.platform_enabled ?? true,
            email_enabled: channel === 'email' ? !currentVal : existing?.email_enabled ?? true,
        }

        const ok = await saveNotificationPreference(updatedPref)
        if (ok) {
            setPreferences((prev) => {
                const filtered = prev.filter((p) => p.event_type !== eventType)
                return [...filtered, updatedPref]
            })
            toast.success(`Preferenza per "${eventType}" aggiornata!`)
        } else {
            toast.error('Errore nel salvataggio della preferenza')
        }
        setSavingPrefKey(null)
    }

    // Filtro notifiche
    const filteredNotifications = notifications.filter((item) => {
        if (unreadOnly && item.read) return false
        if (categoryFilter === 'all') return true

        if (categoryFilter === 'orders' && (item.type === 'order_created' || item.type === 'low_stock')) return true
        if (categoryFilter === 'jobs' && (item.type === 'job_assigned' || item.type === 'status_changed')) return true
        if (categoryFilter === 'messages' && item.type === 'message_received') return true
        if (categoryFilter === 'system' && (item.type === 'pro_registered' || item.type === 'system_alert')) return true

        return false
    })

    // KPI Metrics
    const totalCount = notifications.length
    const ordersCount = notifications.filter(
        (n) => n.type === 'order_created' || n.type === 'job_assigned' || n.type === 'status_changed'
    ).length
    const emailEnabledCount = NOTIFICATION_EVENT_DEFINITIONS.filter((def) => {
        if (!def.roles.includes('admin')) return false
        const pref = preferences.find((p) => p.event_type === def.key)
        return pref ? pref.email_enabled : true
    }).length

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8 animate-fade-in">
            {/* Header di Pagina */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/70 shadow-xs">
                            <Bell className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                                Centro Notifiche & Canali
                            </h1>
                            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                                Gestisci l'archivio avvisi operativi e configura i canali di ricezione su piattaforma ed email
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={() => markAllAsRead()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs sm:text-sm font-bold rounded-xl border border-orange-200 transition-all cursor-pointer"
                        >
                            <CheckCheck size={16} />
                            <span>Segna tutte come lette ({unreadCount})</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 4-Card KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                            Totale Notifiche
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">{totalCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                            Da Leggere
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{unreadCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                            Ordini & Cantieri
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{ordersCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                            Email Attive
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                            {emailEnabledCount} Canali
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Segmented Control Bar (Pill Tabs) */}
            <div className="flex bg-stone-100 p-1.5 rounded-2xl w-fit">
                <button
                    type="button"
                    onClick={() => setActiveTab('inbox')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'inbox'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900'
                    }`}
                >
                    <Bell className="w-4 h-4" />
                    <span>Registro Notifiche ({notifications.length})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('preferences')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'preferences'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900'
                    }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Preferenze Canali (Piattaforma vs Email)</span>
                </button>
            </div>

            {/* TAB 1: INBOX NOTIFICHE */}
            {activeTab === 'inbox' && (
                <div className="space-y-6">
                    {/* Toolbar Filtri */}
                    <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5" /> Filtra:
                            </span>

                            {[
                                { id: 'all', label: 'Tutte' },
                                { id: 'orders', label: 'Ordini' },
                                { id: 'jobs', label: 'Cantieri' },
                                { id: 'messages', label: 'Messaggi' },
                                { id: 'system', label: 'Sistema' },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategoryFilter(cat.id as any)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        categoryFilter === cat.id
                                            ? 'bg-stone-900 text-white'
                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 select-none">
                            <input
                                type="checkbox"
                                checked={unreadOnly}
                                onChange={(e) => setUnreadOnly(e.target.checked)}
                                className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Solo non lette</span>
                        </label>
                    </div>

                    {/* Elenco Notifiche */}
                    <div className="space-y-3">
                        {filteredNotifications.length === 0 ? (
                            <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 text-stone-400">
                                    <Bell className="w-8 h-8 opacity-40" />
                                </div>
                                <h3 className="text-base font-bold text-stone-800">Nessuna notifica trovata</h3>
                                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                                    {unreadOnly
                                        ? 'Tutte le notifiche risultano lette.'
                                        : 'Non ci sono avvisi registrati per i filtri selezionati.'}
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map((notif) => (
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
                                                {notif.channel === 'both' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                                                        Piattaforma + Email
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-600 leading-relaxed max-w-3xl">
                                                {notif.message}
                                            </p>
                                            <span className="text-[11px] text-stone-400 mt-2 block">
                                                Ricevuta il {new Date(notif.created_at).toLocaleDateString('it-IT', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Azioni Scheda */}
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
                </div>
            )}

            {/* TAB 2: PREFERENZE CANALI (PIATTAFORMA VS EMAIL) */}
            {activeTab === 'preferences' && (
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                <SlidersHorizontal className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-stone-900">
                                    Matrice di Configurazione Canali di Ricezione
                                </h3>
                                <p className="text-xs text-stone-500">
                                    Attiva o disattiva le notifiche su piattaforma (in-app) ed email per ciascun tipo di evento
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-stone-100">
                        {NOTIFICATION_EVENT_DEFINITIONS.filter((def) => def.roles.includes('admin')).map((eventDef) => {
                            const pref = preferences.find((p) => p.event_type === eventDef.key)
                            const isPlatformActive = pref ? pref.platform_enabled : true
                            const isEmailActive = pref ? pref.email_enabled : true
                            const isSaving = savingPrefKey === eventDef.key

                            return (
                                <div
                                    key={eventDef.key}
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
                                >
                                    <div className="max-w-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-stone-900">{eventDef.label}</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600">
                                                {eventDef.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-500 leading-relaxed">
                                            {eventDef.description}
                                        </p>
                                    </div>

                                    {/* Toggle Switch Canali */}
                                    <div className="flex items-center gap-6 shrink-0">
                                        {/* Toggle Piattaforma */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                                                <Laptop className="w-4 h-4 text-stone-500" />
                                                <span>Piattaforma</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                disabled={isSaving || loadingPrefs}
                                                checked={isPlatformActive}
                                                onChange={() =>
                                                    handleTogglePreference(eventDef.key, 'platform', isPlatformActive)
                                                }
                                                className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-5 h-5 cursor-pointer disabled:opacity-50"
                                            />
                                        </label>

                                        {/* Toggle Email */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                                                <Mail className="w-4 h-4 text-orange-500" />
                                                <span>Email</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                disabled={isSaving || loadingPrefs}
                                                checked={isEmailActive}
                                                onChange={() =>
                                                    handleTogglePreference(eventDef.key, 'email', isEmailActive)
                                                }
                                                className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-5 h-5 cursor-pointer disabled:opacity-50"
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
