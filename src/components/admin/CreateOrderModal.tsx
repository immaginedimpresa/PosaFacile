import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, User, MapPin, Package, UserCheck, Save, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface CreateOrderModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateOrderModal({
    isOpen,
    onClose,
    onSuccess
}: CreateOrderModalProps) {
    const [customers, setCustomers] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [pros, setPros] = useState<any[]>([])

    // Form states
    const [customerId, setCustomerId] = useState('')
    const [productId, setProductId] = useState('')
    const [floorSqm, setFloorSqm] = useState<number>(30)
    const [wallSqm, setWallSqm] = useState<number>(0)
    const [layingType, setLayingType] = useState('standard')
    const [proId, setProId] = useState('')
    const [scheduledDate, setScheduledDate] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [cap, setCap] = useState('')
    const [provincia, setProvincia] = useState('')
    const [adminNotes, setAdminNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        let isMounted = true

        const loadOptions = async () => {
            try {
                // 1. Fetch Customers
                const { data: customersData } = await supabase
                    .from('users')
                    .select('id, email, first_name, last_name')
                    .eq('role', 'customer')
                    .order('first_name', { ascending: true })

                // 2. Fetch Products
                const { data: productsData } = await supabase
                    .from('products')
                    .select('id, name, price_per_sqm')
                    .order('name', { ascending: true })

                // 3. Fetch Pros
                const { data: prosData } = await supabase
                    .from('professional_profiles')
                    .select('id, company_name, full_name')
                    .eq('verified', true)
                    .order('company_name', { ascending: true })

                if (isMounted) {
                    setCustomers(customersData || [])
                    setProducts(productsData || [])
                    setPros(prosData || [])
                    if (productsData?.[0]) setProductId(productsData[0].id)
                }
            } catch (err) {
                console.error('Error loading options:', err)
            }
        }

        loadOptions()

        return () => {
            isMounted = false
        }
    }, [isOpen])

    if (!isOpen) return null

    // Calcolo totali
    const selectedProduct = products.find(p => p.id === productId)
    const productPrice = Number(selectedProduct?.price_per_sqm) || 35
    const totalSqm = Number(floorSqm || 0) + Number(wallSqm || 0)
    const materialTotal = totalSqm * productPrice
    const layingRate = layingType === 'herringbone' ? 32 : 25
    const layingTotal = totalSqm * layingRate
    const orderTotal = materialTotal + layingTotal

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerId) {
            toast.error('Seleziona un cliente')
            return
        }
        if (!address.trim() || !city.trim()) {
            toast.error('Indirizzo e Comune sono obbligatori')
            return
        }

        setSaving(true)
        try {
            const orderId = crypto.randomUUID()
            const orderNumber = `PF-${Math.floor(100000 + Math.random() * 900000)}`

            // 1. Inserisci ordine
            const { error: orderError } = await supabase
                .from('orders')
                .insert({
                    id: orderId,
                    order_number: orderNumber,
                    customer_id: customerId,
                    professional_id: proId || null,
                    status: 'confirmed',
                    payment_status: 'paid',
                    scheduled_date: scheduledDate || null,
                    material_total: materialTotal,
                    laying_total: layingTotal,
                    services_total: 0,
                    total: orderTotal,
                    installation_address: `${address.trim()}, ${cap.trim()} ${city.trim()} (${provincia.trim().toUpperCase()})`,
                    shipping_address: {
                        address: address.trim(),
                        city: city.trim(),
                        cap: cap.trim(),
                        provincia: provincia.trim().toUpperCase()
                    },
                    admin_notes: adminNotes || 'Ordine creato manualmente dall\'amministratore',
                    created_at: new Date().toISOString()
                })

            if (orderError) throw orderError

            // 2. Inserisci riga articolo se selezionato
            if (productId) {
                await supabase
                    .from('order_items')
                    .insert({
                        order_id: orderId,
                        product_id: productId,
                        quantity_sqm: totalSqm,
                        unit_price: productPrice,
                        total_price: materialTotal
                    })
            }

            // 3. Inserisci job se professionista assegnato
            if (proId) {
                await supabase
                    .from('jobs')
                    .insert({
                        order_id: orderId,
                        professional_id: proId,
                        scheduled_date: scheduledDate || null,
                        status: 'assigned',
                        notes: 'Assegnato al momento della creazione ordine'
                    })
            }

            toast.success(`Ordine #${orderNumber} creato con successo!`)
            onSuccess()
            onClose()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Errore durante la creazione dell\'ordine')
        } finally {
            setSaving(false)
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-stone-100"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                <ShoppingBag size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-stone-900">Crea Nuovo Ordine</h2>
                                <p className="text-xs text-stone-500">Inserimento manuale per cliente e cantiere</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        {/* Cliente */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1.5">
                                <User size={13} className="text-stone-400" />
                                <span>Cliente *</span>
                            </label>
                            <select
                                required
                                value={customerId}
                                onChange={e => setCustomerId(e.target.value)}
                                className="w-full text-xs sm:text-sm px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                <option value="">-- Seleziona Cliente --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email} ({c.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Indirizzo Cantiere */}
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <MapPin size={13} className="text-stone-400" />
                                <span>Indirizzo di Posa *</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Via e Numero Civico (es. Via Roma 12)"
                                className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    required
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    placeholder="Comune"
                                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                    type="text"
                                    required
                                    value={cap}
                                    onChange={e => setCap(e.target.value)}
                                    placeholder="CAP"
                                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                    type="text"
                                    required
                                    maxLength={2}
                                    value={provincia}
                                    onChange={e => setProvincia(e.target.value.toUpperCase())}
                                    placeholder="Prov (MI)"
                                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                                />
                            </div>
                        </div>

                        {/* Prodotto & Metrature */}
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <Package size={13} className="text-stone-400" />
                                <span>Prodotto & Superfici</span>
                            </label>

                            <select
                                value={productId}
                                onChange={e => setProductId(e.target.value)}
                                className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — € {p.price_per_sqm} / mq
                                    </option>
                                ))}
                            </select>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">Mq Pavimento</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={floorSqm}
                                        onChange={e => setFloorSqm(Number(e.target.value))}
                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">Mq Parete</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={wallSqm}
                                        onChange={e => setWallSqm(Number(e.target.value))}
                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">Tipo Posa</label>
                                    <select
                                        value={layingType}
                                        onChange={e => setLayingType(e.target.value)}
                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                                    >
                                        <option value="standard">Standard Dritta (€25/mq)</option>
                                        <option value="herringbone">Spina di Pesce (€32/mq)</option>
                                        <option value="diagonal">Diagonale (€28/mq)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">Data Posa</label>
                                    <input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={e => setScheduledDate(e.target.value)}
                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assegnazione Professionista */}
                        <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                <UserCheck size={13} className="text-stone-400" />
                                <span>Assegna Professionista Posatore</span>
                            </label>
                            <select
                                value={proId}
                                onChange={e => setProId(e.target.value)}
                                className="w-full text-xs sm:text-sm px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                <option value="">-- Assegna in un secondo momento --</option>
                                {pros.map(pro => (
                                    <option key={pro.id} value={pro.id}>
                                        {pro.company_name || pro.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Note Interne Staff */}
                        <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                <FileText size={13} className="text-stone-400" />
                                <span>Note Interne Ordine</span>
                            </label>
                            <textarea
                                rows={2}
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                placeholder="Eventuali annotazioni per posatore o amministrazione..."
                                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                        </div>

                        {/* Riepilogo Totale Calcolato */}
                        <div className="p-3 bg-orange-50/80 rounded-2xl border border-orange-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-700">Totale Ordine Stimato:</span>
                            <span className="text-base font-bold text-orange-600">
                                € {orderTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                <Save size={15} />
                                <span>{saving ? 'Creazione...' : 'Crea Ordine'}</span>
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
