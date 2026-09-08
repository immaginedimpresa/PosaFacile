import { useState, useEffect, useMemo } from 'react'
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
    Search,
    RefreshCw,
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
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'orders' | 'jobs' | 'messages' | 'system'>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
    const [preferences, setPreferences] = useState<NotificationPreference[]>([])
    const [loadingPrefs, setLoadingPrefs] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [savingPrefKey, setSavingPrefKey] = useState<string | null>(null)

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        loadNotifications,
    } = useNotificationStore()

    const loadData = async (isManual = false) => {
        if (isManual) setRefreshing(true)
        await loadNotifications(null, 'admin')
        await loadPreferences()
        if (isManual) {
            setRefreshing(false)
            toast.success('Notifiche aggiornate!')
        }
    }

    useEffect(() => {
        loadData()
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
            toast.success('Preferenza salvata con successo!')
        } else {
            toast.error('Errore nel salvataggio della preferenza')
        }
        setSavingPrefKey(null)
    }

    // Filtraggio Notifiche
    const filteredNotifications = useMemo(() => {
        return notifications.filter((item) => {
            if (statusFilter === 'unread' && item.read) return false
            if (statusFilter === 'read' && !item.read) return false

            if (categoryFilter === 'orders' && item.type !== 'order_created' && item.type !== 'low_stock') return false
            if (categoryFilter === 'jobs' && item.type !== 'job_assigned' && item.type !== 'status_changed') return false
            if (categoryFilter === 'messages' && item.type !== 'message_received') return false
            if (categoryFilter === 'system' && item.type !== 'pro_registered' && item.type !== 'system_alert') return false

            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase().trim()
                const matchTitle = (item.title || '').toLowerCase().includes(q)
                const matchMsg = (item.message || '').toLowerCase().includes(q)
                if (!matchTitle && !matchMsg) return false
            }

            return true
        })
    }, [notifications, statusFilter, categoryFilter, searchTerm])

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = notifications.length
        const unread = notifications.filter((n) => !n.read).length
        const ordersAndJobs = notifications.filter((n) =>
            ['order_created', 'job_assigned', 'status_changed'].includes(n.type)
        ).length
        const emailChannels = NOTIFICATION_EVENT_DEFINITIONS.filter((def) => {
            if (!def.roles.includes('admin')) return false
            const pref = preferences.find((p) => p.event_type === def.key)
            return pref ? pref.email_enabled : true
        }).length

        return { total, unread, ordersAndJobs, emailChannels }
    }, [notifications, preferences])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header Uniforme */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Bell className="w-8 h-8 text-orange-500" />
                        <span>Centro Notifiche</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Monitora gli avvisi operativi del sistema e configura i canali di ricezione su piattaforma ed email.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={() => markAllAsRead()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20"
                        >
                            <CheckCheck size={16} />
                            <span>Segna tutte lette ({unreadCount})</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Ricarica notifiche"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Totale Notifiche */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Bell size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Totale Notifiche</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{metrics.total}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Avvisi registrati nel sistema</p>
                    </div>
                </div>

                {/* 2. Non Lette */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Da Leggere</p>
                        <p className="text-2xl font-bold text-amber-600 mt-0.5">{metrics.unread}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Richiedono attenzione</p>
                    </div>
                </div>

                {/* 3. Ordini & Cantieri */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Ordini & Cantieri</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{metrics.ordersAndJobs}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Attività operative registrate</p>
                    </div>
                </div>

                {/* 4. Canali Email Attivi */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Mail size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Email Attive</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-0.5">{metrics.emailChannels} Canali</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Avvisi con inoltro posta</p>
                    </div>
                </div>
            </div>

            {/* Segmented Control Bar (Pill Tabs) */}
            <div className="flex bg-stone-100 p-1.5 rounded-2xl w-fit mb-6">
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
                    {/* Filters Toolbar */}
                    <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Cerca notifiche per titolo, testo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                            />
                        </div>

                        {/* Dropdown Filtri */}
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value as any)}
                                className="text-xs bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                <option value="all">Tutte le categorie</option>
                                <option value="orders">Ordini & Magazzino</option>
                                <option value="jobs">Cantieri & Posatori</option>
                                <option value="messages">Messaggi Chat</option>
                                <option value="system">Sistema & Registrazioni</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="text-xs bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                <option value="all">Tutti gli stati</option>
                                <option value="unread">Solo da leggere</option>
                                <option value="read">Solo già lette</option>
                            </select>
                        </div>
                    </div>

                    {/* Unified Master Table Card */}
                    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                        {filteredNotifications.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 text-stone-400">
                                    <Bell className="w-8 h-8 opacity-40" />
                                </div>
                                <h3 className="text-base font-bold text-stone-800">Nessuna notifica trovata</h3>
                                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                                    {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                                        ? 'Nessun risultato corrisponde ai criteri di ricerca.'
                                        : 'Tutti gli aggiornamenti operativi generati dal sistema appariranno qui.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-stone-50/80 text-stone-500 uppercase text-[11px] font-bold tracking-wider border-b border-stone-200/80">
                                            <th className="px-6 py-4">Evento & Titolo</th>
                                            <th className="px-6 py-4">Messaggio</th>
                                            <th className="px-6 py-4">Canale</th>
                                            <th className="px-6 py-4">Data & Ora</th>
                                            <th className="px-6 py-4 text-right">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 text-xs">
                                        {filteredNotifications.map((notif) => (
                                            <tr
                                                key={notif.id}
                                                className={`hover:bg-stone-50/60 transition-colors ${
                                                    !notif.read ? 'bg-orange-50/20 font-medium' : ''
                                                }`}
                                            >
                                                {/* Evento & Titolo */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                                notif.read
                                                                    ? 'bg-stone-100'
                                                                    : 'bg-white shadow-xs border border-orange-200'
                                                            }`}
                                                        >
                                                            {getCategoryIcon(notif.type)}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-stone-900 block">
                                                                {notif.title}
                                                            </span>
                                                            {!notif.read ? (
                                                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                                                                    Nuova
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-stone-400">
                                                                    Letta
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Messaggio */}
                                                <td className="px-6 py-4">
                                                    <p className="text-stone-600 line-clamp-2 max-w-md leading-relaxed">
                                                        {notif.message}
                                                    </p>
                                                </td>

                                                {/* Canale */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {notif.channel === 'both' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                            <Laptop className="w-3 h-3" /> + <Mail className="w-3 h-3" />
                                                            <span>Piattaforma & Email</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600">
                                                            <Laptop className="w-3 h-3" />
                                                            <span>Piattaforma</span>
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Data & Ora */}
                                                <td className="px-6 py-4 whitespace-nowrap text-stone-500 text-[11px]">
                                                    {new Date(notif.created_at).toLocaleDateString('it-IT', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </td>

                                                {/* Azioni */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {notif.link && (
                                                            <a
                                                                href={notif.link}
                                                                onClick={() => {
                                                                    if (!notif.read) markAsRead(notif.id)
                                                                }}
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
                                                            >
                                                                <span>Dettagli</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}

                                                        {!notif.read && (
                                                            <button
                                                                type="button"
                                                                onClick={() => markAsRead(notif.id)}
                                                                className="p-1.5 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Segna come letta"
                                                            >
                                                                <CheckCheck className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => deleteNotification(notif.id)}
                                                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Elimina notifica"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: PREFERENZE CANALI */}
            {activeTab === 'preferences' && (
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                <SlidersHorizontal className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-stone-900">
                                    Configurazione Canali di Ricezione (Staff Admin)
                                </h3>
                                <p className="text-xs text-stone-500">
                                    Attiva o disattiva le notifiche in-app su piattaforma ed email per ciascun evento operativo
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
                                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
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

                                    {/* Switch Canali */}
                                    <div className="flex items-center gap-6 shrink-0">
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
