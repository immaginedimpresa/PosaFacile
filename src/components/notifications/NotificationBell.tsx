import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Bell,
    CheckCheck,
    Package,
    HardHat,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    X,
    ExternalLink,
    Clock,
    Trash2,
} from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import { useUserStore } from '@/store/userStore'
import type { NotificationItem } from '@/types/notifications'

function getNotificationIcon(type: string) {
    switch (type) {
        case 'order_created':
        case 'low_stock':
            return <Package className="w-4 h-4 text-orange-600" />
        case 'job_assigned':
        case 'pro_assigned':
            return <HardHat className="w-4 h-4 text-amber-600" />
        case 'message_received':
            return <MessageSquare className="w-4 h-4 text-blue-600" />
        case 'status_changed':
        case 'pro_approved':
            return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        case 'info_pending':
        case 'system_alert':
        default:
            return <AlertCircle className="w-4 h-4 text-rose-600" />
    }
}

function formatRelativeTime(dateString: string): string {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Adesso'
    if (diffMins < 60) return `${diffMins} min fa`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'ora' : 'ore'} fa`
    if (diffDays === 1) return 'Ieri'
    if (diffDays < 7) return `${diffDays} giorni fa`
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

interface NotificationBellProps {
    variant?: 'light' | 'dark'
    align?: 'left' | 'right'
    className?: string
}

export function NotificationBell({
    variant = 'dark',
    align = 'right',
    className = '',
}: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    const { user, profile } = useUserStore()
    const {
        notifications,
        unreadCount,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        initRealtimeSubscription,
        clearSubscription,
    } = useNotificationStore()

    const userRole = (profile?.role || (user as any)?.user_metadata?.role || 'customer') as
        | 'admin'
        | 'professional'
        | 'customer'

    // Determina link "Vedi tutte" in base al ruolo
    const allNotificationsLink =
        userRole === 'admin'
            ? '/admin/notifications'
            : userRole === 'professional'
            ? '/pro/notifications'
            : '/dashboard?tab=notifications'

    useEffect(() => {
        if (user) {
            loadNotifications(user.id, userRole)
            initRealtimeSubscription(user.id, userRole)
        } else {
            loadNotifications(null, userRole)
            initRealtimeSubscription(null, userRole)
        }

        return () => {
            clearSubscription()
        }
    }, [user?.id, userRole])

    // Chiudi dropdown al clic esterno
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleItemClick = async (item: NotificationItem) => {
        if (!item.read) {
            await markAsRead(item.id)
        }
        setIsOpen(false)
        if (item.link) {
            navigate(item.link)
        }
    }

    // Stili bottone in base a light/dark (light = header pubblico bianco; dark = sidebar scura admin/pro)
    const buttonStyles =
        variant === 'light'
            ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            : 'text-stone-400 hover:text-white hover:bg-stone-800/70'

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Bottone Campanella */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${buttonStyles}`}
                title="Notifiche"
                aria-label="Apri Centro Notifiche"
            >
                <Bell className="w-5 h-5" />

                {/* Badge Non Lette */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md shadow-orange-500/30 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div
                    className={`absolute ${
                        align === 'left' ? 'left-0 sm:-left-2' : 'right-0'
                    } mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-stone-200/90 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150`}
                >
                    {/* Header Popover */}
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-stone-900">Notifiche</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                                    {unreadCount} nuove
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => markAllAsRead()}
                                    className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    title="Segna tutte come lette"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>Lette</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Lista Notifiche */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
                                    <Bell className="w-6 h-6 opacity-40" />
                                </div>
                                <p className="text-xs font-bold text-stone-700">Nessuna notifica</p>
                                <p className="text-[11px] text-stone-400 mt-0.5">
                                    Tutti gli aggiornamenti di ordini e cantieri appariranno qui
                                </p>
                            </div>
                        ) : (
                            notifications.slice(0, 8).map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleItemClick(notif)}
                                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                                        notif.read ? 'bg-white hover:bg-stone-50/70' : 'bg-orange-50/30 hover:bg-orange-50/60'
                                    }`}
                                >
                                    {/* Icon Badge */}
                                    <div
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                            notif.read ? 'bg-stone-100' : 'bg-white shadow-xs border border-orange-200'
                                        }`}
                                    >
                                        {getNotificationIcon(notif.type)}
                                    </div>

                                    {/* Contenuto */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <p
                                                className={`text-xs truncate ${
                                                    notif.read ? 'font-medium text-stone-700' : 'font-bold text-stone-900'
                                                }`}
                                            >
                                                {notif.title}
                                            </p>
                                            <span className="text-[10px] text-stone-400 shrink-0 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatRelativeTime(notif.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>

                                        {/* Indicatori aggiuntivi */}
                                        <div className="mt-1.5 flex items-center justify-between">
                                            {notif.channel === 'both' && (
                                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                                                    In-App + Email
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1 ml-auto">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteNotification(notif.id)
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-rose-600 rounded transition-opacity"
                                                    title="Elimina notifica"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Popover con link a pagina completa */}
                    <div className="p-3 border-t border-stone-100 bg-stone-50/50 text-center">
                        <Link
                            to={allNotificationsLink}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                            <span>Gestisci tutte le notifiche</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
