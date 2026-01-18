import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Menu, X, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUserStore } from '@/store/userStore'
import { useCartStore } from '@/store/cartStore'

export function Header() {
    const { user, signOut } = useUserStore()
    const { items } = useCartStore()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const navigate = useNavigate()

    const handleSignOut = async () => {
        await signOut()
        navigate('/')
    }

    const cartCount = items.length

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold group-hover:bg-primary transition-colors">
                        P
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight">PosaFacile</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <Link to="/configuratore" className="text-gray-600 hover:text-black transition-colors">Richiedi Preventivo</Link>
                    <button className="text-gray-600 hover:text-black transition-colors">Chi Siamo</button>
                    <button className="text-gray-600 hover:text-black transition-colors">Contatti</button>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className="absolute top-0 right-0 w-4 h-4 bg-black text-white text-[10px] flex items-center justify-center rounded-full">
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    {user ? (
                        <div className="hidden md:flex items-center gap-4">
                            <Link to={user.role === 'admin' ? '/admin' : user.role === 'professional' ? '/pro' : '/dashboard'}>
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <User size={16} /> Area Riservata
                                </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={handleSignOut}>
                                Esci
                            </Button>
                        </div>
                    ) : (
                        <div className="hidden md:flex gap-2">
                            <Link to="/login">
                                <Button variant="ghost" size="sm">Accedi</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                                    Registrati <ArrowRight size={14} className="ml-1" />
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t bg-white p-4 space-y-4 animate-accordion-down">
                    <nav className="flex flex-col gap-4">
                        <Link to="/configuratore" className="text-lg font-medium" onClick={() => setIsMenuOpen(false)}>Richiedi Preventivo</Link>
                        <button className="text-lg font-medium text-left">Chi Siamo</button>
                        <button className="text-lg font-medium text-left">Contatti</button>
                    </nav>
                    <div className="border-t pt-4 flex flex-col gap-3">
                        {user ? (
                            <>
                                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                                    <Button className="w-full justify-start">Area Riservata</Button>
                                </Link>
                                <Button variant="outline" className="w-full justify-start" onClick={handleSignOut}>Esci</Button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                                    <Button variant="outline" className="w-full">Accedi</Button>
                                </Link>
                                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                                    <Button className="w-full bg-black text-white">Registrati</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
