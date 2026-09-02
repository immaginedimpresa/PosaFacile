import { Link, Outlet, useLocation } from 'react-router-dom'
import { Package, LayoutDashboard, ShoppingCart, Users, Settings, Briefcase, Percent } from 'lucide-react'

const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/products', icon: Package, label: 'Prodotti' },
    { path: '/admin/orders', icon: ShoppingCart, label: 'Ordini' },
    { path: '/admin/professionals', icon: Briefcase, label: 'Professionisti' },
    { path: '/admin/markup', icon: Percent, label: 'Markup' },
    { path: '/admin/customers', icon: Users, label: 'Clienti' },
    { path: '/admin/settings', icon: Settings, label: 'Impostazioni' },
]

export function AdminLayout() {
    const location = useLocation()

    const isActive = (path: string, exact?: boolean) => {
        if (exact) {
            return location.pathname === path
        }
        return location.pathname.startsWith(path)
    }

    return (
        <div className="flex min-h-[calc(100vh-80px)]">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white flex-shrink-0 hidden lg:block">
                <div className="p-4">
                    <h2 className="text-lg font-bold text-orange-400">Admin Panel</h2>
                </div>
                <nav className="mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.path, item.exact)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${active
                                        ? 'bg-orange-500/20 text-orange-400 border-r-2 border-orange-400'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Mobile Nav */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
                <nav className="flex justify-around">
                    {navItems.slice(0, 5).map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.path, item.exact)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center gap-1 py-3 px-2 text-xs ${active ? 'text-orange-400' : 'text-gray-400'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <main className="flex-1 bg-gray-100 overflow-y-auto pb-20 lg:pb-0">
                <Outlet />
            </main>
        </div>
    )
}
