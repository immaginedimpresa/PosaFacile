import { Link, Outlet, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Briefcase,
    Percent,
    Users,
    Settings,
    ArrowUpRight,
    Shield,
    Bell
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useNotificationStore } from '@/store/notificationStore'
import { useAdminNavCounters } from '@/hooks/useNavCounters'
import { LogoIcon } from '@/components/ui/Logo'

const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/orders', icon: ShoppingCart, label: 'Ordini' },
    { path: '/admin/products', icon: Package, label: 'Prodotti' },
    { path: '/admin/professionals', icon: Briefcase, label: 'Professionisti' },
    { path: '/admin/markup', icon: Percent, label: 'Markup' },
    { path: '/admin/customers', icon: Users, label: 'Clienti' },
    { path: '/admin/notifications', icon: Bell, label: 'Notifiche' },
    { path: '/admin/settings', icon: Settings, label: 'Impostazioni' },
]

export function AdminLayout() {
    const location = useLocation()
    // Il contatore delle non lette e' gia' tenuto aggiornato dallo store, che
    // la campanella alimenta: la voce di menu si limita a rifletterlo.
    const unreadCount = useNotificationStore((state) => state.unreadCount)
    const counters = useAdminNavCounters()

    /** Quante cose aspettano una decisione su quella voce di menu. */
    const badgeFor = (path: string): number => {
        switch (path) {
            case '/admin/orders': return counters.ordini
            case '/admin/professionals': return counters.professionisti
            case '/admin/customers': return counters.clienti
            case '/admin/notifications': return unreadCount
            default: return 0
        }
    }

    const isActive = (path: string, exact?: boolean) => {
        if (exact) {
            return location.pathname === path
        }
        return location.pathname.startsWith(path)
    }

    return (
        <div className="flex min-h-screen bg-stone-50/70 text-stone-900">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-stone-900 text-stone-200 flex-shrink-0 hidden lg:flex flex-col border-r border-stone-800 shadow-xl z-20 sticky top-0 h-screen">
                {/* Brand Header */}
                <div className="p-5 border-b border-stone-800/80 flex items-center justify-between">
                    <Link to="/admin" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform shrink-0">
                            <LogoIcon size={20} />
                        </div>
                        <div>
                            <span className="font-extrabold text-white text-base tracking-tight block font-display">
                                Posa<span className="text-orange-500">Facile</span>
                            </span>
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block -mt-0.5">
                                Admin Portal
                            </span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        <NotificationBell variant="dark" align="left" />
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistema online" />
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
                    <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Menu Principale
                    </div>
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.path, item.exact)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                                    active
                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                        : 'text-stone-400 hover:text-white hover:bg-stone-800/70'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-stone-400'}`} />
                                <span>{item.label}</span>
                                {badgeFor(item.path) > 0 && (
                                    <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
                                        active ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
                                    }`}>
                                        {badgeFor(item.path) > 99 ? '99+' : badgeFor(item.path)}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-stone-800/80 bg-stone-950/40 space-y-3">
                    <Link
                        to="/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-white hover:bg-stone-800/50 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <LogoIcon size={16} className="text-orange-400 shrink-0" />
                            <span>Vedi Piattaforma</span>
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                    </Link>

                    <div className="flex items-center gap-3 px-2 pt-2 border-t border-stone-800/60">
                        <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400">
                            <Shield className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-xs font-semibold text-stone-200 truncate">Super Admin</div>
                            <div className="text-[10px] text-stone-500 truncate">Accesso Riservato</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation Bar (Scrollable to access all 7 items) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-800 z-50 shadow-2xl px-2 py-1">
                <nav className="flex items-center justify-between overflow-x-auto gap-1 py-1 no-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.path, item.exact)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors shrink-0 ${
                                    active
                                        ? 'text-orange-400 font-bold bg-orange-500/15'
                                        : 'text-stone-400 hover:text-stone-200'
                                }`}
                            >
                                <span className="relative">
                                    <Icon className={`w-4 h-4 mb-0.5 ${active ? 'text-orange-400' : 'text-stone-400'}`} />
                                    {badgeFor(item.path) > 0 && (
                                        <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                            {badgeFor(item.path) > 9 ? '9+' : badgeFor(item.path)}
                                        </span>
                                    )}
                                </span>
                                <span className="truncate max-w-[58px]">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
                <Outlet />
            </main>
        </div>
    )
}
