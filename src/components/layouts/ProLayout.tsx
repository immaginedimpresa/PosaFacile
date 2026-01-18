import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Hammer, UserCircle, Calendar, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function ProLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()
    const { signOut } = useAuth()

    const navigation = [
        { name: 'Dashboard', href: '/pro', icon: LayoutDashboard },
        { name: 'I miei Lavori', href: '/pro/jobs', icon: Hammer },
        { name: 'Calendario', href: '/pro/calendar', icon: Calendar },
        { name: 'Profilo', href: '/pro/profile', icon: UserCircle },
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar Desktop */}
            <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                    <span className="text-lg font-bold text-gray-900">PosaFacile Pro</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive
                                    ? 'bg-orange-50 text-orange-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 px-4 py-3 text-red-600 rounded-xl font-medium hover:bg-red-50 w-full transition-colors"
                    >
                        <LogOut size={20} />
                        Esci
                    </button>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 px-4 flex items-center justify-between">
                <div className="font-bold text-gray-900">PosaFacile Pro</div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-30 bg-black/50 md:hidden pt-16" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="bg-white p-4 space-y-2 h-full w-3/4" onClick={e => e.stopPropagation()}>
                        {navigation.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-4 rounded-xl font-medium text-lg ${isActive
                                        ? 'bg-orange-50 text-orange-600'
                                        : 'text-gray-600'
                                        }`}
                                >
                                    <Icon size={24} />
                                    {item.name}
                                </Link>
                            )
                        })}
                        <div className="border-t pt-2 mt-4">
                            <button
                                onClick={signOut}
                                className="flex items-center gap-3 px-4 py-4 text-red-600 font-medium w-full"
                            >
                                <LogOut size={24} />
                                Esci
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-8 w-full">
                <Outlet />
            </main>
        </div>
    )
}
