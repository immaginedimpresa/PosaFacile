import { useEffect, useState } from 'react'
import { canCancelOrder, orderStatusColor, orderStatusLabel, type OrderStatus } from '@/lib/orderStatus'
import { OrderTimelineCompact } from '@/components/orders/OrderTimeline'
import { customerTimeline, type ResolvedStep } from '@/lib/orderTimeline'
import { fetchMilestonesForOrders } from '@/services/orderTimelineService'
import { useNotificationStore } from '@/store/notificationStore'
import { Package, Clock, Settings, ChevronRight, Calendar, Trash2, ArrowRight, CheckCircle2, MapPin, Sparkles, Bell, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserStore } from '@/store/userStore'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { fetchSavedQuotes, deleteSavedQuote, convertSavedQuoteToOrder, type SavedQuoteItem } from '@/lib/quotesService'
import { CustomerNotificationsTab } from '@/components/dashboard/CustomerNotificationsTab'
import { CustomerChatTab } from '@/components/dashboard/CustomerChatTab'
import { CustomerProfileTab } from '@/components/dashboard/CustomerProfileTab'

interface Order {
    id: string
    created_at: string
    order_number: string
    status: OrderStatus
    total: number
    installation_address: any
    installation_professional_id: string
    installation_date: string
    scheduled_time_slot?: string
    professional?: {
        full_name: string
        company_name: string
        first_name?: string
        last_name?: string
    }
}

export function CustomerDashboard() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { user } = useAuth()
    const { profile } = useUserStore()

    // Tabs: 'orders' | 'quotes' | 'messages' | 'notifications' | 'settings'
    const rawTab = searchParams.get('tab')
    const normalizedTab = (rawTab === 'chat' ? 'messages' : rawTab) as 'orders' | 'quotes' | 'messages' | 'notifications' | 'settings' | null
    const initialTab = (normalizedTab && ['orders', 'quotes', 'messages', 'notifications', 'settings'].includes(normalizedTab)) ? normalizedTab : 'quotes'
    const [activeTab, setActiveTab] = useState<'orders' | 'quotes' | 'messages' | 'notifications' | 'settings'>(initialTab)

    // Orders state
    const [orders, setOrders] = useState<Order[]>([])
    // Il contatore viene dallo store gia' alimentato dalla campanella.
    const unreadCount = useNotificationStore((state) => state.unreadCount)
    /** Barra di stato compatta per ogni ordine dell'elenco. */
    const [timelines, setTimelines] = useState<Record<string, ResolvedStep[]>>({})
    const [loadingOrders, setLoadingOrders] = useState(true)
    const [orderToCancel, setOrderToCancel] = useState<string | null>(null)

    // Saved Quotes state
    const [savedQuotes, setSavedQuotes] = useState<SavedQuoteItem[]>([])
    const [loadingQuotes, setLoadingQuotes] = useState(true)
    const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)
    const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null)

    // Sync tab with URL
    useEffect(() => {
        const tab = searchParams.get('tab') as 'orders' | 'quotes' | 'messages' | 'notifications' | 'settings' | 'chat'
        if (tab) {
            const mapped = tab === 'chat' ? 'messages' : tab
            if (['orders', 'quotes', 'messages', 'notifications', 'settings'].includes(mapped)) {
                setActiveTab(mapped as any)
            }
        }
    }, [searchParams])

    const handleTabChange = (tab: 'orders' | 'quotes' | 'messages' | 'notifications' | 'settings') => {
        setActiveTab(tab)
        setSearchParams({ tab })
    }

    // Load data
    useEffect(() => {
        if (user) {
            loadOrders()
            loadQuotes()
        }
    }, [user])

    const loadOrders = async () => {
        if (!user?.id) return
        setLoadingOrders(true)

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    professional:users!professional_id(first_name, last_name)
                `)
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            const typedData = (data || []).map((order: any) => ({
                ...order,
                professional: Array.isArray(order.professional) ? order.professional[0] : order.professional
            })) as Order[]

            typedData.forEach(order => {
                if (order.professional) {
                    order.professional.full_name = `${order.professional.first_name} ${order.professional.last_name}`.trim()
                }
            })

            setOrders(typedData)

            // Una sola query per tutte le barre di stato dell'elenco.
            const milestones = await fetchMilestonesForOrders(typedData.map(o => o.id))
            setTimelines(
                Object.fromEntries(
                    typedData.map(o => [o.id, customerTimeline(o.status, milestones[o.id] || [])]),
                ),
            )
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoadingOrders(false)
        }
    }

    const loadQuotes = async () => {
        if (!user?.id) return
        setLoadingQuotes(true)
        try {
            const quotes = await fetchSavedQuotes(user.id)
            setSavedQuotes(quotes)
        } catch (err) {
            console.error('Error fetching saved quotes:', err)
        } finally {
            setLoadingQuotes(false)
        }
    }

    const handleCancelOrder = async () => {
        if (!orderToCancel) return

        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderToCancel)

        if (error) {
            console.error('Error cancelling order:', error)
            alert('Errore durante l\'annullamento')
        } else {
            loadOrders()
            setOrderToCancel(null)
        }
    }

    const handleDeleteQuote = async () => {
        if (!quoteToDelete || !user?.id) return

        const success = await deleteSavedQuote(quoteToDelete, user.id)
        if (success) {
            setSavedQuotes(prev => prev.filter(q => q.id !== quoteToDelete))
            setQuoteToDelete(null)
        } else {
            alert('Errore durante l\'eliminazione del preventivo.')
        }
    }

    const handleResumeQuote = (quote: SavedQuoteItem) => {
        // Load the quote into the configurator store
        useConfiguratorStore.getState().loadFromSavedQuote(quote)
        // Navigate to configurator
        navigate('/configuratore')
    }

    const handleConvertToOrder = async (quote: SavedQuoteItem) => {
        if (!user) return
        setConvertingQuoteId(quote.id)

        try {
            const { orderId, error } = await convertSavedQuoteToOrder(quote, user.id)
            if (error || !orderId) {
                alert('Errore nella creazione dell\'ordine. Riprova.')
                return
            }

            // Redirect to checkout payment
            navigate(`/checkout/pay/${orderId}`)
        } catch (err) {
            console.error('Error converting quote:', err)
            alert('Si è verificato un errore.')
        } finally {
            setConvertingQuoteId(null)
        }
    }

    const getStatusColor = orderStatusColor
    const getStatusLabel = orderStatusLabel

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">
                        Il mio account
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Bentornato, {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : user?.email}
                    </p>
                </div>

                <Link
                    to="/configuratore"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/20 transition-all active:scale-95"
                >
                    <Sparkles size={16} />
                    Nuovo Preventivo
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Menu */}
                <div className="space-y-1.5 md:col-span-1">
                    <button
                        type="button"
                        onClick={() => handleTabChange('quotes')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === 'quotes'
                                ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                    >
                        <span className="flex items-center gap-2.5">
                            <Clock size={18} /> Preventivi Salvati
                        </span>
                        {savedQuotes.length > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                activeTab === 'quotes' ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-700'
                            }`}>
                                {savedQuotes.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('orders')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === 'orders'
                                ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                    >
                        <span className="flex items-center gap-2.5">
                            <Package size={18} /> I miei Ordini
                        </span>
                        {orders.length > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                activeTab === 'orders' ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-700'
                            }`}>
                                {orders.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('messages')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === 'messages'
                                ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                    >
                        <span className="flex items-center gap-2.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            <MessageSquare size={18} /> Chat di Cantiere
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                Live
                            </span>
                            {orders.filter(o => o.status !== 'draft').length > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    activeTab === 'messages' ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-700'
                                }`}>
                                    {orders.filter(o => o.status !== 'draft').length}
                                </span>
                            )}
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('notifications')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === 'notifications'
                                ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                    >
                        <span className="flex items-center gap-2.5">
                            <Bell size={18} /> Notifiche
                        </span>
                        {unreadCount > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('settings')}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === 'settings'
                                ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                    >
                        <Settings size={18} /> Profilo & Impostazioni
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-3">
                    {/* TAB: PREVENTIVI SALVATI */}
                    {activeTab === 'quotes' && (
                        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 mb-6 border-b border-stone-100">
                                <div>
                                    <h2 className="text-xl font-bold text-stone-900">Preventivi Salvati</h2>
                                    <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                                        Riprendi, modifica o finalizza i tuoi preventivi calcolati online.
                                    </p>
                                </div>
                                <div className="text-xs text-stone-500 bg-stone-100/80 px-3 py-1.5 rounded-lg w-fit">
                                    🔒 Prezzo bloccato per 30 giorni
                                </div>
                            </div>

                            {loadingQuotes ? (
                                <div className="text-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto"></div>
                                    <p className="text-sm text-stone-500 mt-3 font-medium">Caricamento preventivi...</p>
                                </div>
                            ) : savedQuotes.length === 0 ? (
                                <div className="text-center py-16 px-4">
                                    <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
                                        <Clock size={30} />
                                    </div>
                                    <h3 className="text-lg font-bold text-stone-900 mb-1">
                                        Non hai ancora nessun preventivo salvato
                                    </h3>
                                    <p className="text-sm text-stone-500 max-w-md mx-auto mb-6 leading-relaxed">
                                        Configura i tuoi spazi con il preventivatore online. Potrai salvare le tue configurazioni qui per valutarle con calma.
                                    </p>
                                    <Button
                                        onClick={() => navigate('/configuratore')}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-6"
                                    >
                                        Calcola un Preventivo Online
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {savedQuotes.map((quote) => {
                                        const product = quote.product
                                        const totalSq = (quote.floor_sqm || 0) + (quote.wall_sqm || 0)
                                        const isConverted = quote.status === 'converted'

                                        return (
                                            <div
                                                key={quote.id}
                                                className="border border-stone-200/90 rounded-2xl p-5 sm:p-6 hover:shadow-md transition-all bg-white relative overflow-hidden group"
                                            >
                                                {/* Header of Quote Card */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h3 className="font-bold text-base sm:text-lg text-stone-900">
                                                                {quote.name || 'Preventivo Personalizzato'}
                                                            </h3>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                                isConverted
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : 'bg-amber-100 text-amber-900'
                                                            }`}>
                                                                {isConverted ? 'Ordine Confermato' : 'Bozza Salvata'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-stone-500">
                                                            Salvato il {format(new Date(quote.created_at), 'd MMMM yyyy', { locale: it })}
                                                        </p>
                                                    </div>

                                                    <div className="sm:text-right">
                                                        <p className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Totale Preventivo</p>
                                                        <p className="text-xl sm:text-2xl font-black text-orange-600">
                                                            €{(quote.total || 0).toFixed(2)}
                                                        </p>
                                                        <p className="text-[10px] text-stone-400">IVA 22% inclusa</p>
                                                    </div>
                                                </div>

                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
                                                    {/* Product Info */}
                                                    <div className="flex items-center gap-3">
                                                        {product?.images?.[0] ? (
                                                            <img
                                                                src={product.images[0]}
                                                                alt={product.name}
                                                                className="w-14 h-14 rounded-xl object-cover border border-stone-100 flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 flex-shrink-0">
                                                                <Package size={22} />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-stone-400 uppercase font-semibold">Materiale</p>
                                                            <p className="text-sm font-bold text-stone-900 truncate">
                                                                {product?.name || 'Da selezionare'}
                                                            </p>
                                                            {product?.price_per_sqm && (
                                                                <p className="text-xs text-stone-500">
                                                                    €{product.price_per_sqm.toFixed(2)}/mq
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Room & Specs */}
                                                    <div>
                                                        <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Dettagli Posa</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <span className="text-xs bg-stone-100 text-stone-700 font-medium px-2 py-0.5 rounded-md capitalize">
                                                                {quote.project_type || 'Ambiente'}
                                                            </span>
                                                            <span className="text-xs bg-stone-100 text-stone-700 font-medium px-2 py-0.5 rounded-md">
                                                                {totalSq.toFixed(1)} mq
                                                            </span>
                                                            <span className="text-xs bg-stone-100 text-stone-700 font-medium px-2 py-0.5 rounded-md capitalize">
                                                                Posa {quote.laying_type || 'dritta'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Location / Destination */}
                                                    <div>
                                                        <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Destinazione</p>
                                                        <div className="flex items-start gap-1.5 text-xs text-stone-600">
                                                            <MapPin size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                                                            <span className="truncate">
                                                                {quote.city ? `${quote.city} (${quote.provincia || ''})` : 'Indirizzo non specificato'}
                                                            </span>
                                                        </div>
                                                        {quote.scheduled_date && (
                                                            <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                                                                <Calendar size={13} className="text-stone-400" />
                                                                <span>Data: {format(new Date(quote.scheduled_date), 'd MMM yyyy', { locale: it })}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Cost Breakdown Accordion/Strip */}
                                                <div className="bg-stone-50/80 rounded-xl p-3 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2 border border-stone-100">
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <span>Materiale: <strong>€{(quote.material_total || 0).toFixed(2)}</strong></span>
                                                        <span>•</span>
                                                        <span>Manodopera posa: <strong>€{(quote.laying_total || 0).toFixed(2)}</strong></span>
                                                        <span>•</span>
                                                        <span>Servizi accessori: <strong>€{(quote.services_total || 0).toFixed(2)}</strong></span>
                                                    </div>
                                                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                                                        <CheckCircle2 size={13} /> Garanzia Posa 10 Anni
                                                    </span>
                                                </div>

                                                {/* Actions Footer */}
                                                <div className="mt-4 pt-3 flex items-center justify-between gap-3 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuoteToDelete(quote.id)}
                                                        className="text-stone-400 hover:text-red-600 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
                                                        title="Elimina questo preventivo"
                                                    >
                                                        <Trash2 size={15} />
                                                        <span className="hidden sm:inline">Elimina</span>
                                                    </button>

                                                    <div className="flex items-center gap-2.5 ml-auto">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleResumeQuote(quote)}
                                                            className="rounded-xl text-xs font-semibold gap-1.5 border-stone-300 hover:bg-stone-50 text-stone-800"
                                                        >
                                                            <span>Modifica nel Configuratore</span>
                                                            <ArrowRight size={14} />
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            disabled={convertingQuoteId === quote.id}
                                                            onClick={() => handleConvertToOrder(quote)}
                                                            className="rounded-xl text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                                                        >
                                                            {convertingQuoteId === quote.id ? (
                                                                'Elaborazione...'
                                                            ) : (
                                                                <>
                                                                    <span>Procedi all'Ordine</span>
                                                                    <ChevronRight size={14} />
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: I MIEI ORDINI */}
                    {activeTab === 'orders' && (
                        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
                            <h2 className="text-xl font-bold text-stone-900 mb-6">Storico Ordini</h2>

                            {loadingOrders ? (
                                <div className="text-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto"></div>
                                    <p className="text-sm text-stone-500 mt-3 font-medium">Caricamento ordini...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-16 px-4">
                                    <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Package size={30} />
                                    </div>
                                    <h3 className="text-lg font-bold text-stone-900 mb-1">Non hai ancora effettuato ordini</h3>
                                    <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
                                        Esplora il nostro catalogo o calcola il tuo primo preventivo online.
                                    </p>
                                    <div className="flex justify-center gap-3">
                                        <Button onClick={() => navigate('/configuratore')} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                            Vai al Configuratore
                                        </Button>
                                        <Button variant="outline" onClick={() => navigate('/catalog')} className="rounded-xl">
                                            Esplora Catalogo
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => {
                                        const isDraft = order.status === 'draft'

                                        return (
                                            <div key={order.id} className="border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-white relative overflow-hidden">
                                                {isDraft && (
                                                    <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[11px] px-3 py-1 font-bold rounded-bl-xl tracking-wider">
                                                        BOZZA NON PAGATA
                                                    </div>
                                                )}

                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="font-bold text-lg text-stone-900">{order.order_number}</span>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(order.status)} uppercase`}>
                                                                {getStatusLabel(order.status)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-stone-500">
                                                            Ordinato il {format(new Date(order.created_at), 'd MMMM yyyy', { locale: it })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-stone-900">€{order.total?.toFixed(2)}</p>
                                                    </div>
                                                </div>

                                                {!isDraft && timelines[order.id] && (
                                                    <OrderTimelineCompact steps={timelines[order.id]} />
                                                )}

                                                <hr className="my-4 border-stone-100" />

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    {order.professional && (
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="bg-blue-50 p-2 rounded-xl text-blue-600 mt-0.5">
                                                                <Package size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-stone-900 text-xs uppercase text-stone-400">Posatore Assegnato</p>
                                                                <p className="text-stone-800 font-medium">{order.professional.full_name}</p>
                                                                {order.professional.company_name && (
                                                                    <p className="text-stone-500 text-xs">{order.professional.company_name}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {order.installation_date && (
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="bg-purple-50 p-2 rounded-xl text-purple-600 mt-0.5">
                                                                <Calendar size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-stone-900 text-xs uppercase text-stone-400">Data Lavori</p>
                                                                <p className="text-stone-800 font-medium">
                                                                    {format(new Date(order.installation_date), 'd MMMM yyyy', { locale: it })}
                                                                </p>
                                                                {order.scheduled_time_slot && (
                                                                    <p className="text-stone-500 text-xs capitalize">
                                                                        Fascia: {order.scheduled_time_slot}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-6 flex justify-end gap-3 flex-wrap">
                                                    {canCancelOrder(order.status) && (
                                                        <Button
                                                            variant="ghost"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                                            onClick={() => setOrderToCancel(order.id)}
                                                        >
                                                            Annulla
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="outline"
                                                        className="flex items-center gap-2 text-sm rounded-xl"
                                                        onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                                                    >
                                                        Dettagli Ordine
                                                    </Button>

                                                    {!isDraft && (
                                                        <Button
                                                            variant="outline"
                                                            className="flex items-center gap-2 text-sm rounded-xl text-stone-800 bg-orange-50/60 hover:bg-orange-100 hover:text-orange-950 border-orange-200/80 font-bold transition-all shadow-2xs cursor-pointer"
                                                            onClick={() => navigate(`/dashboard?tab=messages&orderId=${order.id}`)}
                                                        >
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                                            </span>
                                                            <MessageSquare size={15} className="text-orange-600" />
                                                            <span>Apri Chat Cantiere</span>
                                                        </Button>
                                                    )}

                                                    {isDraft && (
                                                        <Button
                                                            className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 rounded-xl"
                                                            onClick={() => navigate(`/checkout/pay/${order.id}`)}
                                                        >
                                                            Concludi Pagamento <ChevronRight size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: CHAT DI CANTIERE */}
                    {activeTab === 'messages' && (
                        <CustomerChatTab orders={orders} initialOrderId={searchParams.get('orderId')} />
                    )}

                    {/* TAB: IMPOSTAZIONI PROFILO */}
                    {activeTab === 'settings' && (
                        <CustomerProfileTab />
                    )}

                    {/* TAB: NOTIFICHE */}
                    {activeTab === 'notifications' && (
                        <CustomerNotificationsTab />
                    )}
                </div>
            </div>

            {/* Dialog for Quote Deletion */}
            <Dialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Elimina Preventivo</DialogTitle>
                        <DialogDescription>
                            Sei sicuro di voler eliminare questo preventivo salvato? Non potrai più recuperarlo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 p-6 pt-2">
                        <Button variant="ghost" onClick={() => setQuoteToDelete(null)} className="rounded-xl">
                            Annulla
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            onClick={handleDeleteQuote}
                        >
                            Elimina Definitivamente
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog for Order Cancellation */}
            <Dialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Annulla Ordine</DialogTitle>
                        <DialogDescription>
                            Sei sicuro di voler annullare questo ordine? Questa azione non può essere annullata.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 p-6 pt-2">
                        <Button variant="ghost" onClick={() => setOrderToCancel(null)} className="rounded-xl">
                            Indietro
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            onClick={handleCancelOrder}
                        >
                            Conferma Annullamento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
