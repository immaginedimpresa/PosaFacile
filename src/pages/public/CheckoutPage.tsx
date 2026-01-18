import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ArrowRight, MapPin } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useBookingStore } from '@/store/bookingStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useSyncBookingOnAuth } from '@/hooks/useSyncBookingOnAuth'
import { ITALIAN_PROVINCES } from '@/lib/provinces'
import { AuthDialog } from '@/components/auth/AuthDialog'

export function CheckoutPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { items, removeItem, getTotal } = useCartStore()
    const { setInstallationAddress, setCartItems, setTotalAmount } = useBookingStore()

    // Automatically sync booking data when user logs in
    useSyncBookingOnAuth()

    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [cap, setCAP] = useState('')
    const [province, setProvince] = useState('')
    const [showAuthDialog, setShowAuthDialog] = useState(false)

    // Show auth dialog if user is not logged in
    useEffect(() => {
        if (!user && items.length > 0) {
            setShowAuthDialog(true)
        }
    }, [user, items])

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-32 text-center">
                <h1 className="text-3xl font-bold mb-4">Il tuo carrello è vuoto</h1>
                <p className="text-gray-500 mb-8">Aggiungi dei prodotti dal catalogo per procedere.</p>
                <Button onClick={() => navigate('/catalog')}>Vai al Catalogo</Button>
            </div>
        )
    }

    const total = getTotal() * 1.22 // Include IVA

    const handleProceedToBooking = () => {
        // Validazione indirizzo
        if (!address || !city || !cap || !province) {
            alert('Compila tutti i campi dell\'indirizzo di intervento')
            return
        }

        // Verifica autenticazione
        if (!user) {
            setShowAuthDialog(true)
            return
        }

        // Salva dati nel bookingStore
        setInstallationAddress({ address, city, cap, province })
        setCartItems(items)
        setTotalAmount(total)

        // Redirect a selezione professionista
        navigate('/booking/professionals')
    }

    const handleAuthSuccess = () => {
        setShowAuthDialog(false)
        // After successful auth, the component will re-render with user data
        // User can then proceed with the booking
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Il tuo Carrello</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-6">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg bg-white relative">
                            <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg">{item.productName}</h3>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Posa: <span className="capitalize text-black">{item.layingPattern}</span>
                                    {item.includeInstallation && <span className="ml-2 text-green-600 font-medium">+ Posa Inclusa</span>}
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <div className="text-sm">
                                        <span className="font-medium">{item.sqm} mq</span> + {item.wastePercentage}% sfrido
                                        <div className="text-xs text-gray-400">Totale {item.totalSqm.toFixed(2)} mq</div>
                                    </div>
                                    <div className="font-bold text-lg">€ {item.totalPrice.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Installation Address Form */}
                    <div className="bg-white p-6 rounded-xl border-2 border-orange-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                <MapPin size={24} />
                            </div>
                            <h3 className="font-bold text-lg">Indirizzo di Intervento</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Dove vuoi che venga effettuata la posa?
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo *</label>
                                <Input
                                    placeholder="Via/Piazza, Numero civico"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CAP *</label>
                                    <Input
                                        placeholder="00000"
                                        value={cap}
                                        onChange={(e) => setCAP(e.target.value)}
                                        maxLength={5}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Provincia *</label>
                                    <select
                                        value={province}
                                        onChange={(e) => setProvince(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                    >
                                        <option value="">Seleziona</option>
                                        {ITALIAN_PROVINCES.map(prov => (
                                            <option key={prov.code} value={prov.code}>
                                                {prov.code} - {prov.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Città *</label>
                                <Input
                                    placeholder="Milano"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-6 rounded-lg border sticky top-24">
                        <h3 className="font-bold text-lg mb-4">Riepilogo Ordine</h3>

                        <div className="space-y-3 text-sm mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotale Articoli</span>
                                <span>€ {getTotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Spedizione</span>
                                <span className="text-green-600 font-medium">Gratuita</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">IVA (22%)</span>
                                <span>€ {(getTotal() * 0.22).toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-3 mt-3 flex justify-between text-lg font-bold">
                                <span>Totale</span>
                                <span>€ {total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Button
                                className="w-full h-12 text-lg"
                                onClick={handleProceedToBooking}
                            >
                                Scegli Professionista <ArrowRight size={18} className="ml-2" />
                            </Button>

                            <p className="text-xs text-center text-gray-500">
                                Completa i dati sopra per procedere alla selezione del professionista
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <AuthDialog
                open={showAuthDialog}
                onOpenChange={setShowAuthDialog}
                onSuccess={handleAuthSuccess}
            />
        </div>
    )
}
