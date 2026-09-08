import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
    ShoppingCart,
    Plus,
    Search,
    MapPin,
    Calendar,
    RefreshCw,
    Trash2,
    Eye,
    CheckCircle,
    Clock,
    UserCheck,
    AlertCircle,
    TrendingUp
} from 'lucide-react'
import { ORDER_STATUSES, orderStatusLabel, orderStatusColor } from '@/lib/orderStatus'
import { OrderDetailDrawer } from '@/components/admin/OrderDetailDrawer'
import { CreateOrderModal } from '@/components/admin/CreateOrderModal'
import { toast } from 'sonner'

export function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<'date_desc' | 'total_desc'>('date_desc')

    // Modali e Drawer
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, customer:users!orders_customer_id_fkey(*), jobs(*, professional:professional_profiles(*))')
                .order('created_at', { ascending: false })

            if (error) throw error
            setOrders(data || [])
        } catch (error: any) {
            console.error('Error fetching orders:', error)
            toast.error(error.message || 'Errore durante il caricamento degli ordini')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleDeleteOrder = async (orderId: string) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo ordine? L\'azione è irreversibile.')) {
            return
        }

        setDeletingId(orderId)
        try {
            // Elimina job collegati
            await supabase.from('jobs').delete().eq('order_id', orderId)
            await supabase.from('order_items').delete().eq('order_id', orderId)
            const { error } = await supabase.from('orders').delete().eq('id', orderId)
            if (error) throw error

            toast.success('Ordine eliminato con successo')
            setOrders(prev => prev.filter(o => o.id !== orderId))
            if (selectedOrderId === orderId) setSelectedOrderId(null)
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Errore durante l\'eliminazione dell\'ordine')
        } finally {
            setDeletingId(null)
        }
    }

    // Filtraggio ordini
    const filteredOrders = useMemo(() => {
        let result = [...orders]

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim()
            result = result.filter(o => {
                const num = (o.order_number || o.id || '').toLowerCase()
                const customerName = `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.toLowerCase()
                const customerEmail = (o.customer?.email || '').toLowerCase()
                const city = (o.shipping_address?.city || o.installation_address || '').toLowerCase()

                return num.includes(q) || customerName.includes(q) || customerEmail.includes(q) || city.includes(q)
            })
        }

        if (statusFilter !== 'all') {
            result = result.filter(o => o.status === statusFilter)
        }

        result.sort((a, b) => {
            if (sortBy === 'total_desc') {
                return (Number(b.total) || Number(b.total_amount) || 0) - (Number(a.total) || Number(a.total_amount) || 0)
            }
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        })

        return result
    }, [orders, searchTerm, statusFilter, sortBy])

    // Metriche KPI
    const metrics = useMemo(() => {
        const totalCount = orders.length
        const inProgress = orders.filter(o => ['assigned', 'material_shipped', 'in_progress'].includes(o.status)).length
        const toAssign = orders.filter(o => !o.jobs || o.jobs.length === 0).length
        const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || Number(o.total_amount) || 0), 0)

        return {
            totalCount,
            inProgress,
            toAssign,
            totalRevenue
        }
    }, [orders])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-orange-500" />
                        <span>Gestione Ordini</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Monitora lo stato degli ordini, assegna i posatori e gestisci gli avanzamenti di cantiere.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20"
                    >
                        <Plus size={16} />
                        <span>Nuovo Ordine</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => fetchData(true)}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Ricarica ordini"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Totale Ordini</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{metrics.totalCount}</p>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Da Assegnare</p>
                        <p className="text-2xl font-bold text-amber-600 mt-0.5">{metrics.toAssign}</p>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">In Lavorazione</p>
                        <p className="text-2xl font-bold text-blue-600 mt-0.5">{metrics.inProgress}</p>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Fatturato Ordini</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                            € {metrics.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Cerca per numero ordine, cliente, città..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="text-xs bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                        <option value="all">Tutti gli stati</option>
                        {ORDER_STATUSES.map(s => (
                            <option key={s} value={s}>
                                {orderStatusLabel(s)}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="text-xs bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                        <option value="date_desc">Più recenti</option>
                        <option value="total_desc">Importo più alto</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-24 text-center text-stone-400">
                        <RefreshCw size={36} className="mx-auto mb-3 animate-spin text-orange-500" />
                        <p className="text-sm font-semibold text-stone-700">Caricamento ordini in corso...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                        <ShoppingCart size={40} className="mx-auto mb-2 text-stone-300" />
                        <p className="text-base font-bold text-stone-700">Nessun ordine trovato</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                            Non ci sono ordini corrispondenti ai criteri di ricerca.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-stone-200 bg-stone-50/70 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                    <th className="py-3.5 px-4 sm:px-6">Ordine</th>
                                    <th className="py-3.5 px-4">Cliente</th>
                                    <th className="py-3.5 px-4">Indirizzo / Cantiere</th>
                                    <th className="py-3.5 px-4">Data Posa</th>
                                    <th className="py-3.5 px-4">Totale</th>
                                    <th className="py-3.5 px-4">Stato</th>
                                    <th className="py-3.5 px-4">Professionista</th>
                                    <th className="py-3.5 px-4 sm:px-6 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                                {filteredOrders.map(order => {
                                    const customerName = order.customer
                                        ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ') || order.customer.email
                                        : 'Cliente'

                                    const assignedPro = order.jobs?.[0]?.professional
                                    const proLabel = assignedPro?.company_name || assignedPro?.full_name

                                    const totalAmount = Number(order.total) || Number(order.total_amount) || 0

                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrderId(order.id)}
                                            className="hover:bg-orange-50/40 transition-colors group cursor-pointer"
                                        >
                                            {/* ID Ordine */}
                                            <td className="py-3.5 px-4 sm:px-6">
                                                <span className="font-mono font-bold text-stone-900">
                                                    #{order.order_number || order.id.slice(0, 8)}
                                                </span>
                                                <p className="text-[11px] text-stone-400 mt-0.5">
                                                    {order.created_at ? new Date(order.created_at).toLocaleDateString('it-IT') : '—'}
                                                </p>
                                            </td>

                                            {/* Cliente */}
                                            <td className="py-3.5 px-4">
                                                <p className="font-bold text-stone-900 truncate max-w-[150px]">{customerName}</p>
                                                {order.customer?.phone && (
                                                    <p className="text-[11px] text-stone-400 mt-0.5">{order.customer.phone}</p>
                                                )}
                                            </td>

                                            {/* Indirizzo Cantiere */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1 text-stone-600 text-xs truncate max-w-[180px]">
                                                    <MapPin size={13} className="text-stone-400 shrink-0" />
                                                    <span>
                                                        {typeof order.installation_address === 'string'
                                                            ? order.installation_address
                                                            : order.shipping_address?.city || '—'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Data Posa */}
                                            <td className="py-3.5 px-4 text-stone-600">
                                                {order.scheduled_date ? (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={13} className="text-orange-500 shrink-0" />
                                                        <span>{new Date(order.scheduled_date).toLocaleDateString('it-IT')}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-stone-300 font-mono italic">Da definire</span>
                                                )}
                                            </td>

                                            {/* Totale */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-bold text-stone-900">
                                                    € {totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>

                                            {/* Stato */}
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${orderStatusColor(order.status)}`}>
                                                    {orderStatusLabel(order.status)}
                                                </span>
                                            </td>

                                            {/* Professionista */}
                                            <td className="py-3.5 px-4">
                                                {proLabel ? (
                                                    <span className="inline-flex items-center gap-1 font-semibold text-stone-800 text-xs">
                                                        <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                                                        <span className="truncate max-w-[130px]">{proLabel}</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                                        <AlertCircle size={12} />
                                                        <span>Da Assegnare</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Azioni */}
                                            <td className="py-3.5 px-4 sm:px-6 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedOrderId(order.id)}
                                                        className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                                                        title="Dettaglio e modifica ordine"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        disabled={deletingId === order.id}
                                                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                                                        title="Elimina ordine"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Detail & Edit Drawer */}
            <OrderDetailDrawer
                orderId={selectedOrderId}
                isOpen={!!selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
                onUpdated={() => fetchData(true)}
                onDelete={id => handleDeleteOrder(id)}
            />

            {/* Create Order Modal */}
            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchData(true)}
            />
        </div>
    )
}
