import { Link, Outlet, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Hammer,
    UserCircle,
    Calendar,
    LogOut,
    Store,
    ArrowUpRight,
    HardHat,
    Bell
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function ProLayout() {
    const location = useLocation()
    const { user, signOut } = useAuth()

    const navigation = [
        { name: 'Dashboard', href: '/pro', icon: LayoutDashboard, exact: true },
        { name: 'I miei Lavori', href: '/pro/jobs', icon: Hammer },
        { name: 'Calendario', href: '/pro/calendar', icon: Calendar },
        { name: 'Notifiche', href: '/pro/notifications', icon: Bell },
        { name: 'Profilo & Zone', href: '/pro/profile', icon: UserCircle },
    ]

    const isActive = (path: string, exact?: boolean) => {
        if (exact) {
            return location.pathname === path
        }
        return location.pathname.startsWith(path)
    }

    return (
        <div className="flex min-h-screen bg-stone-50/70 text-stone-900">
            {/* Sidebar Desktop */}
            <aside className="w-64 bg-stone-900 text-stone-200 flex-shrink-0 hidden lg:flex flex-col border-r border-stone-800 shadow-xl z-20 sticky top-0 h-screen">
                {/* Brand Header */}
                <div className="p-5 border-b border-stone-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/20">
                            P
                        </div>
                        <div>
                            <span className="font-extrabold text-white text-base tracking-tight block">
                                PosaFacile
                            </span>
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block -mt-0.5">
                                Portale Posatori
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationBell variant="dark" align="left" />
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Posatore online" />
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
                    <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Menu Posatore
                    </div>
                    {navigation.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href, item.exact)
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                                    active
                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                        : 'text-stone-400 hover:text-white hover:bg-stone-800/70'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-stone-400'}`} />
                                <span>{item.name}</span>
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
                            <Store className="w-4 h-4 text-orange-400" />
                            <span>Vedi Piattaforma</span>
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                    </Link>

                    <div className="flex items-center justify-between px-2 pt-2 border-t border-stone-800/60">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400 shrink-0">
                                <HardHat className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-xs font-semibold text-stone-200 truncate">
                                    {user?.email?.split('@')[0] || 'Posatore'}
                                </div>
                                <div className="text-[10px] text-emerald-400 font-semibold truncate">
                                    Account Attivo
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => signOut()}
                            className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 rounded-lg transition-colors cursor-pointer"
                            title="Disconnetti"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-800 z-50 shadow-2xl px-2 py-1">
                <nav className="flex items-center justify-around py-1">
                    {navigation.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href, item.exact)
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                                    active
                                        ? 'text-orange-400 font-bold bg-orange-500/15'
                                        : 'text-stone-400 hover:text-stone-200'
                                }`}
                            >
                                <Icon className={`w-4 h-4 mb-0.5 ${active ? 'text-orange-400' : 'text-stone-400'}`} />
                                <span className="truncate">{item.name.replace(' & Zone', '')}</span>
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
