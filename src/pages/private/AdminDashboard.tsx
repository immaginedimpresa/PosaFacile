import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
    ShoppingCart,
    Users,
    Briefcase,
    TrendingUp,
    FileText,
    Package,
    CheckCircle,
    ArrowUpRight,
    MapPin,
    Calendar,
    RefreshCw,
    Plus,
    UserPlus,
    ShieldAlert,
    ChevronRight
} from 'lucide-react'
import { orderStatusLabel, orderStatusColor } from '@/lib/orderStatus'
import { toast } from 'sonner'

interface DashboardData {
    ordersCount: number
    quotesCount: number
    productsCount: number
    prosCount: number
    verifiedProsCount: number
    pendingProsCount: number
    customersCount: number
    totalRevenue: number
    recentOrders: any[]
    pendingPros: any[]
    recentQuotes: any[]
    recentCustomers: any[]
}

export function AdminDashboard() {
    const [data, setData] = useState<DashboardData>({
        ordersCount: 0,
        quotesCount: 0,
        productsCount: 0,
        prosCount: 0,
        verifiedProsCount: 0,
        pendingProsCount: 0,
        customersCount: 0,
        totalRevenue: 0,
        recentOrders: [],
        pendingPros: [],
        recentQuotes: [],
        recentCustomers: []
    })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [approvingId, setApprovingId] = useState<string | null>(null)

    const fetchDashboardData = async (isManual = false) => {
        if (isManual) setRefreshing(true)
        else setLoading(true)

        try {
            // 1. Fetch count and stats in parallel
            const [
                { count: ordersCount, data: allOrders },
                { count: quotesCount, data: recentQuotes },
                { count: productsCount },
                { data: allPros },
                { count: customersCount, data: recentUsers }
            ] = await Promise.all([
                supabase.from('orders').select('id, total, status, created_at, scheduled_date, order_number, installation_address, shipping_address, customer:users!orders_customer_id_fkey(first_name, last_name, email)', { count: 'exact' }).order('created_at', { ascending: false }).limit(6),
                supabase.from('saved_quotes').select('id, name, project_type, total, status, city, provincia, created_at, customer:users!saved_quotes_customer_id_fkey(first_name, last_name, email)', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('professional_profiles').select('id, company_name, full_name, phone, billing_city, billing_province, years_experience, rating, verified, created_at').order('created_at', { ascending: false }),
                supabase.from('users').select('id, email, first_name, last_name, phone, created_at', { count: 'exact' }).eq('role', 'customer').order('created_at', { ascending: false }).limit(5)
            ])

            // Calcolo entrate da ordini non cancellati
            const { data: revenueData } = await supabase.from('orders').select('total').neq('status', 'cancelled')
            const totalRevenue = (revenueData || []).reduce((acc, curr: any) => acc + (Number(curr.total) || 0), 0)

            const pros = allPros || []
            const verifiedProsCount = pros.filter(p => p.verified).length
            const pendingPros = pros.filter(p => !p.verified)

            setData({
                ordersCount: ordersCount || 0,
                quotesCount: quotesCount || 0,
                productsCount: productsCount || 0,
                prosCount: pros.length,
                verifiedProsCount,
                pendingProsCount: pendingPros.length,
                customersCount: customersCount || 0,
                totalRevenue,
                recentOrders: allOrders || [],
                pendingPros: pendingPros.slice(0, 6),
                recentQuotes: recentQuotes || [],
                recentCustomers: recentUsers || []
            })
        } catch (err: any) {
            console.error('Error loading dashboard data:', err)
            toast.error('Errore durante il caricamento dei dati della dashboard')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    // Azione rapida: approvazione immediata di un professionista con 1 click
    const handleQuickApprovePro = async (proId: string, companyName: string) => {
        setApprovingId(proId)
        try {
            const { error } = await supabase
                .from('professional_profiles')
                .update({ verified: true, updated_at: new Date().toISOString() })
                .eq('id', proId)

            if (error) throw error

            toast.success(`Posatore "${companyName}" verificato e approvato!`)
            setData(prev => ({
                ...prev,
                verifiedProsCount: prev.verifiedProsCount + 1,
                pendingProsCount: Math.max(0, prev.pendingProsCount - 1),
                pendingPros: prev.pendingPros.filter(p => p.id !== proId)
            }))
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Errore durante l\'approvazione del posatore')
        } finally {
            setApprovingId(null)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header con Azioni Rapide Hub */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                            Panoramica Generale
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live Database</span>
                        </span>
                    </div>
                    <p className="text-sm text-stone-500 mt-1">
                        Centro di controllo PosaFacile: monitoraggio in tempo reale su ordini, posatori, clienti e preventivi.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                        to="/admin/orders"
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-md shadow-orange-500/20"
                    >
                        <Plus size={16} />
                        <span>Crea Ordine</span>
                    </Link>

                    <Link
                        to="/admin/customers"
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-md"
                    >
                        <UserPlus size={16} />
                        <span>Nuovo Cliente</span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => fetchDashboardData(true)}
                        disabled={refreshing || loading}
                        className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                        title="Ricarica statistiche"
                    >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid (6 Metriche Chiave ad Alto Impatto) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {/* 1. Fatturato */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-purple-300 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Fatturato</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <p className="text-xl font-extrabold text-stone-900 mt-2">
                        € {data.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Ordini confermati</p>
                </div>

                {/* 2. Ordini */}
                <Link to="/admin/orders" className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-orange-300 transition-all group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Ordini Totali</span>
                        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ShoppingCart size={16} />
                        </div>
                    </div>
                    <p className="text-xl font-extrabold text-stone-900 mt-2">{data.ordersCount}</p>
                    <p className="text-[11px] text-orange-600 font-semibold mt-0.5 flex items-center gap-0.5">
                        <span>Gestisci ordini</span>
                        <ChevronRight size={12} />
                    </p>
                </Link>

                {/* 3. Posatori Rete */}
                <Link to="/admin/professionals" className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-blue-300 transition-all group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Rete Posatori</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Briefcase size={16} />
                        </div>
                    </div>
                    <p className="text-xl font-extrabold text-stone-900 mt-2">{data.prosCount}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                        <strong className="text-emerald-600">{data.verifiedProsCount}</strong> attivi • <strong className="text-amber-600">{data.pendingProsCount}</strong> in attesa
                    </p>
                </Link>

                {/* 4. Clienti Registrati */}
                <Link to="/admin/customers" className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-emerald-300 transition-all group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Clienti</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users size={16} />
                        </div>
                    </div>
                    <p className="text-xl font-extrabold text-stone-900 mt-2">{data.customersCount}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-0.5">
                        <span>Anagrafica completa</span>
                        <ChevronRight size={12} />
                    </p>
                </Link>

                {/* 5. Preventivi Configurati */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-amber-300 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Preventivi</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <FileText size={16} />
                        </div>
                    </div>
                    <p className="text-xl font-extrabold text-stone-900 mt-2">{data.quotesCount}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Bozze configuratore</p>
                </div>

                {/* 6. Catalogo Prodotti */}
                <Link to="/admin/products" className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-stone-400 transition-all group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Prodotti</span>
                        <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Package size={16} />
                        </div>
                    </div>
                    <p className="text-xl font-extrabold text-stone-900 mt-2">{data.productsCount}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-0.5">
                        <span>Vedi catalogo</span>
                        <ChevronRight size={12} />
                    </p>
                </Link>
            </div>

            {/* Sezione Centrale: Widget Smart a Due Colonne */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Colonna Sinistra (2 spans): Ordini Recenti & Avanzamento */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                <ShoppingCart size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-stone-900">Ultimi Ordini Ricevuti</h2>
                                <p className="text-[11px] text-stone-500">Stato avanzamento e date di posa</p>
                            </div>
                        </div>
                        <Link
                            to="/admin/orders"
                            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                            <span>Tutti gli ordini ({data.ordersCount})</span>
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>

                    <div className="p-0 flex-1">
                        {data.recentOrders.length === 0 ? (
                            <div className="p-8 text-center text-stone-400">
                                <ShoppingCart size={32} className="mx-auto mb-2 text-stone-300" />
                                <p className="text-xs font-semibold text-stone-700">Nessun ordine presente nel database</p>
                                <p className="text-[11px] text-stone-400 mt-1">Crea il tuo primo ordine manuale per iniziare.</p>
                                <Link
                                    to="/admin/orders"
                                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-600"
                                >
                                    <Plus size={13} />
                                    <span>Crea Ordine</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-stone-100">
                                {data.recentOrders.map(order => {
                                    const customerName = order.customer
                                        ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ') || order.customer.email
                                        : 'Cliente'

                                    return (
                                        <div
                                            key={order.id}
                                            className="p-4 hover:bg-stone-50/70 transition-colors flex items-center justify-between gap-4"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-xs text-stone-900">
                                                        #{order.order_number || order.id.slice(0, 8)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${orderStatusColor(order.status)}`}>
                                                        {orderStatusLabel(order.status)}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-medium text-stone-700 mt-1 truncate">
                                                    {customerName}
                                                </p>
                                                <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5">
                                                    {order.scheduled_date && (
                                                        <span className="flex items-center gap-1 text-stone-500">
                                                            <Calendar size={11} className="text-orange-500" />
                                                            {new Date(order.scheduled_date).toLocaleDateString('it-IT')}
                                                        </span>
                                                    )}
                                                    <span>{new Date(order.created_at).toLocaleDateString('it-IT')}</span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-sm font-bold text-stone-900 block">
                                                    € {(Number(order.total) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                </span>
                                                <Link
                                                    to="/admin/orders"
                                                    className="text-[11px] font-semibold text-orange-600 hover:underline"
                                                >
                                                    Dettaglio →
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Colonna Destra: Posatori in Attesa di Verifica (Richieste Urgenti) */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-amber-50/40">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                <ShieldAlert size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-stone-900">Da Approvare</h2>
                                <p className="text-[11px] text-stone-500">{data.pendingProsCount} posatori in attesa</p>
                            </div>
                        </div>
                        <Link
                            to="/admin/professionals"
                            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
                        >
                            <span>Tutti</span>
                            <ChevronRight size={14} />
                        </Link>
                    </div>

                    <div className="p-0 flex-1 divide-y divide-stone-100">
                        {data.pendingPros.length === 0 ? (
                            <div className="p-8 text-center text-stone-400">
                                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                                <p className="text-xs font-semibold text-stone-700">Tutti i posatori sono verificati!</p>
                                <p className="text-[11px] text-stone-400 mt-0.5">Nessun professionista in attesa di approvazione.</p>
                            </div>
                        ) : (
                            data.pendingPros.map(pro => (
                                <div key={pro.id} className="p-3.5 hover:bg-stone-50/70 transition-colors flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-xs text-stone-900 truncate">
                                            {pro.company_name || pro.full_name || pro.id.slice(0, 8)}
                                        </p>
                                        <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                                            <MapPin size={11} className="text-stone-400 shrink-0" />
                                            <span>{pro.billing_city || 'Italia'} ({pro.billing_province || 'PRO'})</span>
                                            {pro.years_experience && <span>• {pro.years_experience} anni exp</span>}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleQuickApprovePro(pro.id, pro.company_name || pro.full_name)}
                                        disabled={approvingId === pro.id}
                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                                        title="Approva e attiva profilo"
                                    >
                                        {approvingId === pro.id ? '...' : 'Approva ✓'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Sezione Inferiore: Preventivi Configuratore (Pipeline Lead) & Nuovi Clienti */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Preventivi Recenti dal Configuratore */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-orange-500" />
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base">Ultimi Preventivi Configurati (Lead Caldi)</h3>
                        </div>
                        <Link to="/admin/customers" className="text-xs font-bold text-orange-600 hover:underline">
                            Vedi nei Clienti →
                        </Link>
                    </div>

                    {data.recentQuotes.length === 0 ? (
                        <div className="py-8 text-center text-stone-400">
                            <FileText size={28} className="mx-auto mb-1.5 text-stone-300" />
                            <p className="text-xs font-semibold text-stone-600">Nessun preventivo configurato recentemente</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {data.recentQuotes.map(quote => (
                                <div
                                    key={quote.id}
                                    className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between hover:border-orange-300 transition-colors"
                                >
                                    <div>
                                        <p className="font-bold text-xs text-stone-900">{quote.name || 'Preventivo Posa'}</p>
                                        <p className="text-[11px] text-stone-500 mt-0.5">
                                            {quote.customer?.email || 'Ospite'} {quote.city && `• ${quote.city}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-orange-600 text-xs sm:text-sm">
                                            € {(Number(quote.total) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[10px] text-stone-400 block">
                                            {new Date(quote.created_at).toLocaleDateString('it-IT')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ultimi Clienti Registrati */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-emerald-600" />
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base">Ultimi Clienti Iscritti</h3>
                        </div>
                        <Link to="/admin/customers" className="text-xs font-bold text-emerald-700 hover:underline">
                            Gestione Clienti →
                        </Link>
                    </div>

                    {data.recentCustomers.length === 0 ? (
                        <div className="py-8 text-center text-stone-400">
                            <Users size={28} className="mx-auto mb-1.5 text-stone-300" />
                            <p className="text-xs font-semibold text-stone-600">Nessun cliente registrato</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {data.recentCustomers.map(customer => {
                                const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
                                const initials = ((customer.first_name?.[0] || '') + (customer.last_name?.[0] || '')).toUpperCase() || 'U'

                                return (
                                    <div
                                        key={customer.id}
                                        className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between hover:bg-stone-100/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-xs text-stone-900 truncate">{fullName}</p>
                                                <p className="text-[11px] text-stone-500 truncate">{customer.email}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-stone-400">
                                            {customer.created_at ? new Date(customer.created_at).toLocaleDateString('it-IT') : '—'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
