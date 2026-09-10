import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Menu, X, ArrowUpRight, Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { useUserStore } from '@/store/userStore'
import { useCartStore } from '@/store/cartStore'
import { NotificationBell } from '@/components/notifications/NotificationBell'

const navigation = [
    { to: '/catalog', label: 'Materiali' },
    { to: '/come-funziona', label: 'Come funziona' },
    { to: '/#ispirazioni', label: 'Ispirazioni' },
    { to: '/#stima', label: 'Calcola il budget' },
    { to: '/professionisti', label: 'Sei un professionista?' },
]

export function Header() {
    const { user, profile, signOut } = useUserStore()
    const { items } = useCartStore()
    const location = useLocation()
    const [menuLocation, setMenuLocation] = useState<string | null>(null)
    const menuKey = location.key
    const isMenuOpen = menuLocation === menuKey
    const menuToggle = useRef<HTMLButtonElement>(null)
    const navigate = useNavigate()
    const userRole = profile?.role || user?.user_metadata?.role || 'customer'
    const accountPath =
        userRole === 'admin'
            ? '/admin'
            : userRole === 'professional'
              ? '/pro'
              : '/dashboard'
    const closeMenu = () => setMenuLocation(null)

    useEffect(() => {
        if (!isMenuOpen) return
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuLocation(null)
                menuToggle.current?.focus()
            }
        }
        window.addEventListener('keydown', onEscape)
        return () => window.removeEventListener('keydown', onEscape)
    }, [isMenuOpen])

    const handleSignOut = async () => {
        await signOut()
        closeMenu()
        navigate('/')
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-stone-200/70 bg-white/95 backdrop-blur-xl">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-stone-900 focus:px-5 focus:py-3 focus:text-white"
            >
                Vai al contenuto
            </a>
            <div className="pf-header-container flex h-[76px] items-center justify-between gap-5">
                <Link
                    to="/"
                    aria-label="PosaFacile, pagina iniziale"
                    className="group shrink-0"
                    onClick={closeMenu}
                >
                    <Logo size="md" />
                </Link>
                <nav
                    aria-label="Navigazione principale"
                    className={`hidden items-center gap-6 text-xs font-medium text-stone-600 ${user ? '2xl:flex' : 'lg:flex'}`}
                >
                    {navigation.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="transition-colors hover:text-orange-600"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex items-center gap-2 sm:gap-4">
                    {user && <NotificationBell variant="light" />}
                    <Link
                        to="/cart"
                        aria-label={`Carrello${items.length ? `, ${items.length} articoli` : ''}`}
                        className="relative rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100"
                    >
                        <ShoppingCart size={18} />
                        {items.length > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-stone-900">
                                {items.length}
                            </span>
                        )}
                    </Link>
                    {user ? (
                        <div className="hidden items-center gap-4 md:flex">
                            {userRole === 'customer' && (
                                <Link
                                    to="/dashboard?tab=quotes"
                                    className="hidden items-center gap-1.5 text-xs text-stone-600 xl:flex"
                                >
                                    <Clock size={15} /> I miei preventivi
                                </Link>
                            )}
                            <Link
                                to={accountPath}
                                className="flex items-center gap-2 text-xs font-medium"
                            >
                                <User size={16} /> Area personale
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="cursor-pointer rounded-lg border border-stone-200 px-3 py-2 text-xs"
                            >
                                Esci
                            </button>
                        </div>
                    ) : (
                        <div className="hidden items-center gap-5 md:flex">
                            <Link
                                to={
                                    location.pathname === '/configuratore'
                                        ? '/login?redirect=%2Fconfiguratore'
                                        : '/login'
                                }
                                className="text-xs font-medium text-stone-600 hover:text-orange-600"
                            >
                                Accedi
                            </Link>
                            <Link
                                to="/configuratore"
                                className="flex items-center gap-4 rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-stone-900 transition-colors hover:bg-orange-400"
                            >
                                Calcola il preventivo <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    )}
                    <button
                        ref={menuToggle}
                        aria-label={isMenuOpen ? 'Chiudi menu' : 'Apri menu'}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-navigation"
                        className={`cursor-pointer rounded-lg p-2 hover:bg-stone-100 ${user ? '2xl:hidden' : 'lg:hidden'}`}
                        onClick={() =>
                            setMenuLocation(isMenuOpen ? null : menuKey)
                        }
                    >
                        {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
                    </button>
                </div>
            </div>
            {isMenuOpen && (
                <div
                    id="mobile-navigation"
                    className={`max-h-[calc(100dvh-76px)] overflow-y-auto border-t border-stone-200 bg-white p-5 ${user ? '2xl:hidden' : 'lg:hidden'}`}
                >
                    <nav
                        aria-label="Navigazione mobile"
                        className="flex flex-col gap-1"
                    >
                        {navigation.map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={closeMenu}
                                className="flex items-center justify-between rounded-lg px-3 py-3 text-sm text-stone-700 hover:bg-stone-50"
                            >
                                {item.label}
                                <ArrowUpRight size={16} />
                            </Link>
                        ))}
                        <Link
                            to="/#domande"
                            onClick={closeMenu}
                            className="rounded-lg px-3 py-3 text-sm text-stone-700 hover:bg-stone-50"
                        >
                            Domande frequenti
                        </Link>
                    </nav>
                    <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-5 text-center text-sm font-medium">
                        <Link
                            to="/configuratore"
                            onClick={closeMenu}
                            className="rounded-xl bg-orange-500 px-4 py-3 text-stone-900"
                        >
                            Calcola il tuo preventivo
                        </Link>
                        {user ? (
                            <>
                                <Link
                                    to={accountPath}
                                    onClick={closeMenu}
                                    className="rounded-xl border border-stone-200 px-4 py-3"
                                >
                                    Area personale
                                </Link>
                                {userRole === 'customer' && (
                                    <Link
                                        to="/dashboard?tab=quotes"
                                        onClick={closeMenu}
                                        className="py-2"
                                    >
                                        I miei preventivi
                                    </Link>
                                )}
                                <button
                                    onClick={handleSignOut}
                                    className="cursor-pointer py-2 text-stone-500"
                                >
                                    Esci
                                </button>
                            </>
                        ) : (
                            <Link
                                to={
                                    location.pathname === '/configuratore'
                                        ? '/login?redirect=%2Fconfiguratore'
                                        : '/login'
                                }
                                onClick={closeMenu}
                                className="rounded-xl border border-stone-200 px-4 py-3"
                            >
                                Accedi alla tua area
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
