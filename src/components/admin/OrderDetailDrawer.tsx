import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Calendar,
    MapPin,
    Save,
    Trash2,
    MessageSquare,
    CheckCircle2,
    Clock,
    UserCheck,
    FileText,
    AlertCircle,
    ListChecks,
    Truck,
    Package,
    Building2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ORDER_STATUSES, type OrderStatus, orderStatusLabel, orderStatusColor } from '@/lib/orderStatus'
import { JobChat } from '@/components/chat/JobChat'
import { OrderTimelineManager } from '@/components/admin/OrderTimelineManager'
import { syncMilestonesWithStatus } from '@/services/orderTimelineService'
import { DurationCard } from '@/components/orders/DurationCard'
import { durationForOrder } from '@/lib/orderDuration'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface OrderDetailDrawerProps {
    orderId: string | null
    isOpen: boolean
    onClose: () => void
    onUpdated: () => void
    onDelete: (orderId: string) => void
}

export function OrderDetailDrawer({
    orderId,
    isOpen,
    onClose,
    onUpdated,
    onDelete
}: OrderDetailDrawerProps) {
    const { user } = useAuth()
    const [order, setOrder] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<OrderStatus>('confirmed')
    const [scheduledDate, setScheduledDate] = useState('')
    const [adminNotes, setAdminNotes] = useState('')
    const [selectedProId, setSelectedProId] = useState<string>('')
    const [pros, setPros] = useState<any[]>([])
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'chat'>('details')

    useEffect(() => {
        if (!orderId || !isOpen) {
            setOrder(null)
            return
        }

        let isMounted = true
        setLoading(true)

        const fetchOrderData = async () => {
            try {
                // Fetch Order with customer, jobs, and items
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('*, customer:users!orders_customer_id_fkey(*), jobs(*, professional:professional_profiles(*)), order_items(*, product:products(*)), order_services(*)')
                    .eq('id', orderId)
                    .single()

                if (orderError) throw orderError

                // Fetch verified pros for assignment
                const { data: prosData } = await supabase
                    .from('professional_profiles')
                    .select('id, company_name, full_name, rating')
                    .eq('verified', true)
                    .order('company_name', { ascending: true })

                if (isMounted) {
                    setOrder(orderData)
                    setStatus((orderData.status as OrderStatus) || 'confirmed')
                    setScheduledDate(orderData.scheduled_date ? orderData.scheduled_date.slice(0, 10) : '')
                    setAdminNotes(orderData.admin_notes || '')
                    setSelectedProId(orderData.jobs?.[0]?.professional_id || orderData.professional_id || '')
                    setPros(prosData || [])
                }
            } catch (err: any) {
                console.error(err)
                toast.error('Impossibile caricare i dettagli dell\'ordine')
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchOrderData()

        return () => {
            isMounted = false
        }
    }, [orderId, isOpen])

    const handleSaveChanges = async () => {
        if (!orderId) return
        setSaving(true)

        try {
            // 1. Aggiorna tabella orders
            const { error: orderUpdateError } = await supabase
                .from('orders')
                .update({
                    status,
                    scheduled_date: scheduledDate || null,
                    admin_notes: adminNotes || null,
                    professional_id: selectedProId || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)

            if (orderUpdateError) throw orderUpdateError

            // 2. Aggiorna o crea job per il professionista
            if (selectedProId) {
                const existingJob = order.jobs?.[0]
                if (existingJob) {
                    await supabase
                        .from('jobs')
                        .update({
                            professional_id: selectedProId,
                            scheduled_date: scheduledDate || null,
                            status: status === 'completed' ? 'completed' : 'assigned'
                        })
                        .eq('id', existingJob.id)
                } else {
                    await supabase
                        .from('jobs')
                        .insert({
                            order_id: orderId,
                            professional_id: selectedProId,
                            scheduled_date: scheduledDate || null,
                            status: 'assigned',
                            notes: 'Assegnato dall\'amministratore'
                        })
                }
            }

            // 3. Allinea la timeline al nuovo stato, senza toccare le tappe
            //    che l'admin ha già gestito a mano.
            await syncMilestonesWithStatus(orderId, status, user?.id)

            toast.success('Ordine aggiornato con successo!')
            onUpdated()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Errore durante l\'aggiornamento dell\'ordine')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const customerName = order?.customer
        ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ') || order.customer.email
        : 'Cliente non specificato'

    const fullName = customerName

    const currentStatusColor = orderStatusColor(status)
    const currentStatusText = orderStatusLabel(status)
    const jobId = order?.jobs?.[0]?.id

    const deliveryAccess =
        (typeof order?.installation_address === 'object' && order?.installation_address !== null
            ? order.installation_address.delivery_access
            : null) ||
        (order?.items?.[0]?.delivery_access ?? null)

    const deliveryCost =
        (typeof order?.installation_address === 'object' && order?.installation_address !== null
            ? order.installation_address.delivery_cost
            : null) ||
        (order?.items?.[0]?.delivery_cost ?? 0)

    const logisticsNotes =
        deliveryAccess?.logisticsNotes ||
        order?.notes ||
        null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-hidden">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs cursor-pointer"
                />

                {/* Panel */}
                <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 bg-stone-900 text-white flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-lg text-orange-400">
                                        #{order?.order_number || order?.id?.slice(0, 8)}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${currentStatusColor}`}>
                                        {currentStatusText}
                                    </span>
                                </div>
                                <p className="text-stone-300 text-xs mt-1">
                                    Cliente: <strong className="text-white">{fullName}</strong>
                                    {order?.customer?.email && ` (${order.customer.email})`}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => order && onDelete(order.id)}
                                    className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer"
                                    title="Elimina o annulla ordine"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Top Highlights Strip */}
                        <div className="grid grid-cols-3 border-b border-stone-200 bg-stone-50/80 px-6 py-3 text-center divide-x divide-stone-200">
                            <div>
                                <p className="text-[11px] font-semibold uppercase text-stone-500">Totale Ordine</p>
                                <p className="text-base font-bold text-orange-600 mt-0.5">
                                    € {(Number(order?.total) || Number(order?.total_amount) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase text-stone-500">Data Creazione</p>
                                <p className="text-xs font-semibold text-stone-800 mt-1">
                                    {order?.created_at ? new Date(order.created_at).toLocaleDateString('it-IT') : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase text-stone-500">Pagamento</p>
                                <p className="text-xs font-semibold text-emerald-700 capitalize mt-1">
                                    {order?.payment_status || 'In attesa'}
                                </p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-stone-200 px-6 gap-6 bg-white">
                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === 'details'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                <FileText size={15} />
                                <span>Dettagli & Modifica</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('timeline')}
                                className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === 'timeline'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                <ListChecks size={15} />
                                <span>Timeline & Durata</span>
                            </button>
                            {jobId && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('chat')}
                                    className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === 'chat'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <MessageSquare size={15} />
                                    <span>Chat Cantiere</span>
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loading ? (
                                <div className="py-20 text-center text-stone-400">
                                    <Clock size={32} className="mx-auto animate-spin mb-3 text-orange-500" />
                                    <p className="text-sm font-medium">Caricamento ordine in corso...</p>
                                </div>
                            ) : order ? (
                                activeTab === 'timeline' ? (
                                    <div className="space-y-6">
                                        <OrderTimelineManager
                                            orderId={order.id}
                                            order={order}
                                            actorId={user?.id}
                                            onUpdated={onUpdated}
                                        />
                                        <DurationCard
                                            estimate={durationForOrder(order)}
                                            confirmedWorkDays={order.confirmed_work_days}
                                            confirmedCalendarDays={order.confirmed_calendar_days}
                                            proNote={order.duration_pro_note}
                                            showPhases
                                        />
                                    </div>
                                ) : activeTab === 'details' ? (
                                    <div className="space-y-6">
                                        {/* Gestione Stato & Avanzamento */}
                                        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                                <CheckCircle2 size={14} className="text-orange-500" />
                                                <span>Avanzamento & Stato Ordine</span>
                                            </h3>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-stone-700 mb-1">
                                                        Stato Attuale
                                                    </label>
                                                    <select
                                                        value={status}
                                                        onChange={e => setStatus(e.target.value as OrderStatus)}
                                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-300 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                                                    >
                                                        {ORDER_STATUSES.map(s => (
                                                            <option key={s} value={s}>
                                                                {orderStatusLabel(s)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                                        <Calendar size={13} className="text-stone-400" />
                                                        <span>Data Posa Prevista</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={scheduledDate}
                                                        onChange={e => setScheduledDate(e.target.value)}
                                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Assegnazione Professionista */}
                                            <div>
                                                <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                                    <UserCheck size={13} className="text-stone-400" />
                                                    <span>Professionista Posatore Assegnato</span>
                                                </label>
                                                <select
                                                    value={selectedProId}
                                                    onChange={e => setSelectedProId(e.target.value)}
                                                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                                                >
                                                    <option value="">-- Nessun professionista assegnato --</option>
                                                    {pros.map(pro => (
                                                        <option key={pro.id} value={pro.id}>
                                                            {pro.company_name || pro.full_name || pro.id.slice(0, 8)} {pro.rating ? `(★ ${pro.rating})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Indirizzo Cantiere */}
                                        <div className="bg-white rounded-2xl p-5 border border-stone-200">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
                                                <MapPin size={14} className="text-stone-400" />
                                                <span>Indirizzo di Posa / Cantiere</span>
                                            </h3>
                                            <p className="text-sm font-semibold text-stone-900">
                                                {typeof order.installation_address === 'string'
                                                    ? order.installation_address
                                                    : order.shipping_address?.address || order.installation_address?.address || order.installation_address?.street || 'Non specificato'}
                                            </p>
                                            <p className="text-xs text-stone-500 mt-0.5">
                                                {order.shipping_address?.city || order.installation_address?.city} {order.shipping_address?.cap || order.installation_address?.postal_code || order.installation_address?.cap}
                                            </p>
                                        </div>

                                        {/* Logistica di Consegna & Accesso Cantiere */}
                                        <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                                            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                                    <Truck size={14} className="text-orange-500" />
                                                    <span>Logistica di Consegna & Accesso Cantiere</span>
                                                </h3>
                                                {Number(deliveryCost) > 0 ? (
                                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
                                                        Supplemento: +€ {Number(deliveryCost).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                                                        Scarico base a terra
                                                    </span>
                                                )}
                                            </div>

                                            {deliveryAccess ? (
                                                <div className="space-y-3">
                                                    {deliveryAccess.destination === 'box' ? (
                                                        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                                <Package size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                                                                        Scarico nel Box / Garage
                                                                    </span>
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                                                                        Piano Terra
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-emerald-800 mt-0.5">
                                                                    I materiali pesanti vengono scaricati a livello strada nel garage/box. Nessun facchinaggio ai piani superiori.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0">
                                                                <Building2 size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                                                                        Consegna al Piano ({deliveryAccess.floorType === 'ground' ? 'Piano Terra' : `${deliveryAccess.floorNumber}° Piano`})
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-blue-800 mt-0.5">
                                                                    I colli devono essere trasportati all&apos;interno dell&apos;abitazione / cantiere al piano indicato.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Dettagli Dotazioni & Sosta */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                        {/* Montacarichi */}
                                                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                                                            <span className="text-[10px] uppercase font-bold text-stone-400">Dotazione Montacarichi</span>
                                                            <div className="flex items-center gap-1.5 font-semibold">
                                                                {deliveryAccess.destination === 'box' ? (
                                                                    <span className="text-stone-600">Non richiesto (scarico a terra)</span>
                                                                ) : deliveryAccess.floorType === 'ground' ? (
                                                                    <span className="text-stone-600">Non necessario (piano terra)</span>
                                                                ) : deliveryAccess.hasFreightElevator ? (
                                                                    <span className="text-emerald-700 flex items-center gap-1">
                                                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                                                        Montacarichi abilitato presente
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-amber-800 flex items-center gap-1">
                                                                        <AlertCircle size={13} className="text-amber-600" />
                                                                        A piedi via scale (senza ascensore)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Sosta Furgone */}
                                                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                                                            <span className="text-[10px] uppercase font-bold text-stone-400">Sosta & Scarico Furgone</span>
                                                            <div className="flex items-center gap-1.5 font-semibold">
                                                                {deliveryAccess.hasUnloadingZone !== false ? (
                                                                    <span className="text-emerald-700 flex items-center gap-1">
                                                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                                                        Sosta adiacente (≤ 50m)
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-amber-800 flex items-center gap-1">
                                                                        <AlertCircle size={13} className="text-amber-600" />
                                                                        Sosta distante (&gt; 50m) / ZTL
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Note autista se presenti */}
                                                    {logisticsNotes && (
                                                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs">
                                                            <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Note Trasportatore / Autista</span>
                                                            <p className="text-stone-800 italic font-medium">
                                                                &ldquo;{logisticsNotes}&rdquo;
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-stone-400 py-1">
                                                    Nessun dato logistico avanzato specificato per questo ordine (ordine precedente o scarico standard).
                                                </div>
                                            )}
                                        </div>

                                        {/* Articoli & Servizi */}
                                        <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                                Riepilogo Fornitura & Posa
                                            </h3>

                                            {order.order_items && order.order_items.length > 0 ? (
                                                <div className="space-y-2">
                                                    {order.order_items.map((item: any) => (
                                                        <div key={item.id} className="p-3 bg-stone-50 rounded-xl flex items-center justify-between text-xs">
                                                            <div>
                                                                <p className="font-bold text-stone-900">{item.product?.name || 'Articolo a catalogo'}</p>
                                                                <p className="text-stone-500 text-[11px]">Quantità: {item.quantity} mq • € {item.unit_price} / mq</p>
                                                            </div>
                                                            <span className="font-bold text-stone-900">
                                                                € {(Number(item.total_price) || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-stone-500 space-y-1">
                                                    <div className="flex justify-between py-1">
                                                        <span>Fornitura Materiali:</span>
                                                        <span className="font-semibold text-stone-900">€ {(Number(order.material_total) || 0).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-1">
                                                        <span>Manodopera e Posa:</span>
                                                        <span className="font-semibold text-stone-900">€ {(Number(order.laying_total) || 0).toFixed(2)}</span>
                                                    </div>
                                                    {order.services_total > 0 && (
                                                        <div className="flex justify-between py-1">
                                                            <span>Servizi Accessori:</span>
                                                            <span className="font-semibold text-stone-900">€ {(Number(order.services_total) || 0).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Note Amministrative */}
                                        <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                                    <AlertCircle size={14} className="text-amber-600" />
                                                    <span>Note Interne Admin</span>
                                                </h3>
                                                <span className="text-[10px] text-amber-700">Visibili solo allo staff</span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                value={adminNotes}
                                                onChange={e => setAdminNotes(e.target.value)}
                                                placeholder="Note sull'ordine, accordi speciali, solleciti..."
                                                className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 resize-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* Chat Tab */
                                    <div className="h-[500px]">
                                        {jobId && user ? (
                                            <JobChat jobId={jobId} currentUserId={user.id} />
                                        ) : (
                                            <p className="text-xs text-stone-400 italic">Nessun job attivo per questo ordine.</p>
                                        )}
                                    </div>
                                )
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-all cursor-pointer"
                            >
                                Chiudi
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveChanges}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                <Save size={14} />
                                <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    )
}
