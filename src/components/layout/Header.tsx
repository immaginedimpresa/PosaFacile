import { Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Menu, X, ArrowUpRight, LogOut, MessageSquare } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { useUserStore } from '@/store/userStore'
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
        <header
            role="banner"
            className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-white/95 backdrop-blur-md transition-colors"
        >
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-stone-900 focus:px-5 focus:py-3 focus:text-white"
            >
                Vai al contenuto
            </a>
            <div className="container mx-auto max-w-7xl px-4">
                <div className="flex h-19 items-center justify-between">
                    <Link
                        to="/"
                        aria-label="PosaFacile, pagina iniziale"
                        className="group shrink-0"
                        onClick={closeMenu}
                    >
                        <Logo size="md" />
                    </Link>

                    {/* Navigazione centrale desktop */}
                    <nav
                        aria-label="Navigazione principale"
                        className="hidden items-center gap-6 text-xs font-medium text-stone-600 lg:flex"
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

                    {/* Azioni utente a destra (ICONE: Chat Cantiere, Notifiche, Profilo, Esci) */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Chat di Cantiere con pallino pulsante (per utenti loggati) */}
                        {user && (
                            <Link
                                to={userRole === 'professional' ? '/pro/jobs' : '/dashboard?tab=messages'}
                                aria-label="Chat di Cantiere"
                                title="Chat di Cantiere (Canale diretto)"
                                className="relative rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
                            >
                                <MessageSquare size={19} />
                                <span className="absolute top-1 right-1 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                            </Link>
                        )}

                        {/* Campanella Notifiche */}
                        {user && <NotificationBell variant="light" />}

                        {/* Se utente loggato: SOLO ICONA PROFILO & ESCI */}
                        {user ? (
                            <div className="flex items-center gap-1 sm:gap-1.5">
                                <Link
                                    to={accountPath}
                                    aria-label="Area personale"
                                    title="Area personale"
                                    className="rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
                                >
                                    <User size={19} />
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    aria-label="Esci dall'account"
                                    title="Esci"
                                    className="cursor-pointer rounded-full p-2 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                >
                                    <LogOut size={19} />
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

                        {/* Pulsante Menu Mobile */}
                        <button
                            ref={menuToggle}
                            aria-label={isMenuOpen ? 'Chiudi menu' : 'Apri menu'}
                            aria-expanded={isMenuOpen}
                            aria-controls="mobile-navigation"
                            className="cursor-pointer rounded-lg p-2 hover:bg-stone-100 lg:hidden"
                            onClick={() =>
                                setMenuLocation(isMenuOpen ? null : menuKey)
                            }
                        >
                            {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Menu Mobile a tendina */}
            {isMenuOpen && (
                <div
                    id="mobile-navigation"
                    className="max-h-[calc(100dvh-76px)] overflow-y-auto border-t border-stone-200 bg-white p-5 lg:hidden"
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
                                    to={userRole === 'professional' ? '/pro/jobs' : '/dashboard?tab=messages'}
                                    onClick={closeMenu}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-orange-200/90 bg-orange-50/70 px-4 py-3 font-bold text-orange-950 shadow-2xs"
                                >
                                    <MessageSquare size={17} className="text-orange-600" />
                                    <span>Chat di Cantiere</span>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                    </span>
                                </Link>
                                <Link
                                    to={accountPath}
                                    onClick={closeMenu}
                                    className="rounded-xl border border-stone-200 px-4 py-3"
                                >
                                    Area personale
                                </Link>
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
