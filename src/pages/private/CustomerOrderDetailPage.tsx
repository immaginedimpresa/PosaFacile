import { useEffect, useState } from 'react'
import { orderStatusLabel, type OrderStatus } from '@/lib/orderStatus'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Clock,
    User,
    CheckCircle2,
    AlertTriangle,
    ChevronRight,
    Phone,
    Mail,
    Layers,
    Receipt,
    HelpCircle,
    MessageSquare,
    ShieldCheck,
    Lock,
} from 'lucide-react'
import { OrderProgressBar, OrderTimelineSteps } from '@/components/orders/OrderTimeline'
import { DurationCard } from '@/components/orders/DurationCard'
import { JobChat } from '@/components/chat/JobChat'
import { customerTimeline, type ResolvedStep } from '@/lib/orderTimeline'
import { fetchOrderMilestones } from '@/services/orderTimelineService'
import { durationForOrder, effectiveDuration } from '@/lib/orderDuration'
import { estimateEndDate } from '@/lib/layingDuration'

interface OrderDetail {
    id: string
    created_at?: string | null
    order_number: string
    status: OrderStatus
    total: number
    subtotal?: number | null
    vat_amount?: number | null
    material_total?: number | null
    laying_total?: number | null
    services_total?: number | null
    payment_status?: string | null
    payment_method?: string | null
    installation_address: any
    installation_date?: string | null
    scheduled_time_slot?: string | null
    work_start_date?: string | null
    work_end_date?: string | null
    estimated_work_days?: number | null
    estimated_calendar_days?: number | null
    confirmed_work_days?: number | null
    confirmed_calendar_days?: number | null
    duration_pro_note?: string | null
    notes?: string | null
    professional?: {
        full_name: string
        company_name?: string | null
        email?: string | null
        phone?: string | null
        verified?: boolean | null
        rating?: number | null
        avatar_url?: string | null
    } | null
    items?: any
    resolvedProduct?: any | null
    productImageUrl?: string | null
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    draft: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200/80' },
    new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80' },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80' },
    assigned: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/80' },
    material_shipped: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/80' },
    material_delivered: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200/80' },
    in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200/80' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80' },
    cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80' },
    disputed: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80' },
    refunded: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/80' },
}

const extractProductImage = (prod: any): string | null => {
    if (!prod) return null
    if (typeof prod.image_url === 'string' && prod.image_url.trim()) return prod.image_url.trim()
    if (Array.isArray(prod.images) && prod.images.length > 0 && typeof prod.images[0] === 'string' && prod.images[0].trim()) {
        return prod.images[0].trim()
    }
    if (typeof prod.tileable_image_url === 'string' && prod.tileable_image_url.trim()) {
        return prod.tileable_image_url.trim()
    }
    if (typeof prod.thumbnail === 'string' && prod.thumbnail.trim()) return prod.thumbnail.trim()
    if (typeof prod.thumbnail_url === 'string' && prod.thumbnail_url.trim()) return prod.thumbnail_url.trim()
    return null
}

export function CustomerOrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [order, setOrder] = useState<OrderDetail | null>(null)
    const [steps, setSteps] = useState<ResolvedStep[]>([])
    const [loading, setLoading] = useState(true)
    const [jobId, setJobId] = useState<string | null>(null)
    const [jobStatus, setJobStatus] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'status' | 'surfaces' | 'professional'>('status')

    useEffect(() => {
        if (id && user) fetchOrder()
    }, [id, user])

    const fetchOrder = async () => {
        if (!id || !user?.id) return

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    professional_user:users!professional_id(first_name, last_name, email, phone),
                    order_items(*, product:products(*))
                `)
                .eq('id', id)
                .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
                .single()

            if (error) throw error

            let proData: NonNullable<OrderDetail['professional']> | null = data.professional_user ? {
                full_name: `${data.professional_user.first_name || ''} ${data.professional_user.last_name || ''}`.trim(),
                email: data.professional_user.email || null,
                phone: data.professional_user.phone || null,
                company_name: null,
                verified: false,
                rating: 5.0,
                avatar_url: null,
            } : null

            const proId = data.installation_professional_id || data.professional_id
            if (proId) {
                const { data: profile } = await supabase
                    .from('professional_profiles')
                    .select('id, company_name, full_name, phone, rating, verified')
                    .eq('id', proId)
                    .maybeSingle()

                if (profile) {
                    proData = {
                        full_name: profile.full_name || proData?.full_name || 'Professionista Assegnato',
                        company_name: profile.company_name || null,
                        email: proData?.email || null,
                        phone: profile.phone || proData?.phone || null,
                        verified: profile.verified ?? true,
                        rating: profile.rating || 5.0,
                        avatar_url: null,
                    }
                }
            }

            // Risoluzione Prodotto e Miniatura Materiale
            let resolvedProduct = (data.items as any)?.[0]?.product || null
            let productImageUrl = extractProductImage(resolvedProduct)

            // Fallback 1: da order_items relazionati
            const orderItems = data.order_items || []
            if (!productImageUrl && orderItems.length > 0 && orderItems[0]?.product) {
                resolvedProduct = { ...orderItems[0].product, ...resolvedProduct }
                productImageUrl = extractProductImage(resolvedProduct)
            }

            // Fallback 2: per ID prodotto da database se l'immagine manca ancora
            const prodId = resolvedProduct?.id || (data as any).product_id || orderItems[0]?.product_id
            if (!productImageUrl && prodId) {
                const { data: dbProd } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', prodId)
                    .maybeSingle()

                if (dbProd) {
                    resolvedProduct = { ...dbProd, ...resolvedProduct }
                    productImageUrl = extractProductImage(dbProd)
                }
            }

            // Fallback 3: per nome prodotto se non abbiamo ID (es. nel caso di ordini bozza storici)
            if (!productImageUrl && resolvedProduct?.name) {
                const searchKeyword = resolvedProduct.name.split(' ')[0]
                if (searchKeyword && searchKeyword.length >= 3) {
                    const { data: matchProd } = await supabase
                        .from('products')
                        .select('*')
                        .ilike('name', `%${searchKeyword}%`)
                        .limit(1)
                        .maybeSingle()

                    if (matchProd) {
                        resolvedProduct = { ...matchProd, ...resolvedProduct }
                        productImageUrl = extractProductImage(matchProd)
                    }
                }
            }

            const formattedOrder: OrderDetail = {
                ...data,
                status: (data.status as OrderStatus) || 'draft',
                total: data.total || 0,
                professional: proData,
                resolvedProduct,
                productImageUrl,
            }

            setOrder(formattedOrder)

            // Timeline milestones
            const milestones = await fetchOrderMilestones(id)
            setSteps(customerTimeline(formattedOrder.status, milestones))

            // Risoluzione Job ID per la chat del cantiere
            try {
                const { data: jobData } = await supabase
                    .from('jobs')
                    .select('id, status')
                    .eq('order_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                let resolvedJobId = jobData?.id || null
                let resolvedJobStatus = jobData?.status || null

                if (!resolvedJobId) {
                    const proId = (formattedOrder as any).installation_professional_id || (formattedOrder as any).professional_id
                    if (proId) {
                        const { data: newJob } = await supabase
                            .from('jobs')
                            .insert({
                                order_id: id,
                                professional_id: proId,
                                status: 'assigned',
                                scheduled_date: (formattedOrder as any).installation_date || null,
                                notes: 'Creato per chat di cantiere'
                            })
                            .select('id, status')
                            .maybeSingle()
                        if (newJob?.id) {
                            resolvedJobId = newJob.id
                            resolvedJobStatus = newJob.status
                        }
                    }

                    if (!resolvedJobId) {
                        try {
                            const { data: rpcJobId } = await (supabase.rpc as any)('get_or_create_order_job', { p_order_id: id })
                            if (typeof rpcJobId === 'string' && rpcJobId) {
                                resolvedJobId = rpcJobId
                                resolvedJobStatus = 'assigned'
                            }
                        } catch {
                            // ignore rpc
                        }
                    }
                }

                if (resolvedJobId) {
                    setJobId(resolvedJobId)
                    setJobStatus(resolvedJobStatus || 'assigned')
                }
            } catch (jobErr) {
                console.warn('Job chat ID fetch warning:', jobErr)
            }
        } catch (error) {
            console.error('Error fetching order:', error)
            navigate('/dashboard?tab=orders')
        } finally {
            setLoading(false)
        }
    }

    // Scroll automatico alla chat o tab specifica se presente l'ancora o query param nell'URL
    useEffect(() => {
        if (!loading) {
            const searchParams = new URLSearchParams(window.location.search)
            const tabParam = searchParams.get('tab')

            if (
                window.location.hash === '#chat-cantiere' ||
                window.location.hash === '#professionista' ||
                tabParam === 'chat' ||
                tabParam === 'professional'
            ) {
                setActiveTab('professional')
                const timer = setTimeout(() => {
                    const el = document.getElementById('chat-cantiere')
                    el?.scrollIntoView({ behavior: 'smooth' })
                }, 300)
                return () => clearTimeout(timer)
            } else if (window.location.hash === '#superfici' || tabParam === 'surfaces') {
                setActiveTab('surfaces')
            } else if (window.location.hash === '#stato' || tabParam === 'status') {
                setActiveTab('status')
            }
        }
    }, [loading])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-24 max-w-7xl flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 border border-orange-500/20">
                    <Clock className="w-6 h-6 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Caricamento dettagli ordine...</h2>
                <p className="text-stone-500 text-sm mt-1">Stiamo recuperando la scheda tecnica e l'avanzamento.</p>
            </div>
        )
    }

    if (!order) return null

    const statusStyle = STATUS_STYLES[order.status] || {
        bg: 'bg-stone-100',
        text: 'text-stone-700',
        border: 'border-stone-200',
    }

    const isDraft = order.status === 'draft' || order.payment_status !== 'paid'
    const isJobAccepted = jobStatus === 'accepted' || jobStatus === 'in_progress' || jobStatus === 'completed' || (!jobStatus && (order.status === 'confirmed' || order.status === 'in_progress' || order.status === 'completed'))
    const durata = durationForOrder(order as any)
    const durataValida = effectiveDuration(order as any)
    const inizioLavori = (order as any).work_start_date || order.installation_date
    const fineLavori = inizioLavori ? estimateEndDate(inizioLavori, durataValida) : null

    // Calcolo costi per riepilogo pulito
    const materialCost = order.material_total || 0
    const layingCost = order.laying_total || 0
    const servicesCost = order.services_total || 0
    const totalCost = order.total || 0
    const deliveryAccess =
        (typeof order.installation_address === 'object' && order.installation_address?.delivery_access) ||
        (order as any).items?.[0]?.delivery_access
    const deliveryCost =
        (typeof order.installation_address === 'object' && order.installation_address?.delivery_cost) ||
        (order as any).items?.[0]?.delivery_cost ||
        0

    const item = (order.items && order.items[0]) || {}
    const product = order.resolvedProduct || item.product || null
    const productImg =
        order.productImageUrl ||
        extractProductImage(product) ||
        (order as any).order_items?.[0]?.product?.images?.[0] ||
        null

    const ambiente = item.projectInfo?.ambiente || (order as any).project_type || 'Ambiente'
    const layingType = item.layingType || item.laying_type || (order as any).laying_type || 'Standard'
    const supPav = Number(item.dimensions?.pavimentoMq ?? (order as any).floor_sqm ?? 0)
    const supPar = Number(item.dimensions?.paretiMq ?? (order as any).wall_sqm ?? 0)
    const supTot = supPav + supPar
    const services = item.services || {}

    const titleType = isDraft ? 'Preventivo' : 'Ordine'
    const productName = product?.name || 'Gres Porcellanato di Prima Scelta'
    const productPrice =
        product?.price_per_sqm ||
        (order.material_total && supTot > 0 ? (order.material_total / supTot).toFixed(2) : null)
    const productFormat =
        product?.format ||
        (product?.format_width && product?.format_height
            ? `${product.format_width / 10}×${product.format_height / 10} cm`
            : null)
    const productThickness = product?.thickness ? `${product.thickness} mm` : '9-10 mm'
    const productFinish = product?.finish || product?.surface_finish || 'Naturale / Opaco'
    const hasFornitura = Boolean(product || (order.material_total && Number(order.material_total) > 0))

    const inizioLavoriText = inizioLavori
        ? format(new Date(inizioLavori), 'd MMMM yyyy', { locale: it })
        : 'Da concordare'

    const fineLavoriText = fineLavori
        ? `Fine prevista: ${format(fineLavori, 'd MMM yyyy', { locale: it })}`
        : order.scheduled_time_slot
            ? `Fascia: ${order.scheduled_time_slot}`
            : 'Orario concordato'

    const addressText =
        typeof order.installation_address === 'string'
            ? order.installation_address
            : order.installation_address?.address || order.installation_address?.street || 'Indirizzo da confermare'

    const cityText =
        typeof order.installation_address === 'object' && (order.installation_address?.city || order.installation_address?.province)
            ? `${order.installation_address?.city || ''} ${order.installation_address?.province ? `(${order.installation_address.province})` : ''}`.trim()
            : 'Italia'

    const proName = order.professional?.full_name || 'In fase di assegnazione'
    const proSub = order.professional?.company_name || (order.professional?.verified ? 'Posatore Certificato PosaFacile' : 'Assegnazione posatore in corso')

    return (
        <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl space-y-6 sm:space-y-8">
            {/* Top Navigation & Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                    onClick={() => navigate('/dashboard?tab=orders')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 rounded-xl border border-stone-200/90 shadow-2xs transition-all active:scale-95 w-fit"
                >
                    <ArrowLeft size={16} className="text-stone-500" />
                    Torna a I Miei Ordini
                </button>

                <div className="flex items-center gap-3">
                    <span
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {orderStatusLabel(order.status)}
                    </span>

                    {isDraft && (
                        <Link
                            to={`/checkout/pay/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                        >
                            Completa Pagamento <ChevronRight size={14} />
                        </Link>
                    )}
                </div>
            </div>

            {/* Banner per Ordini in Bozza / Non Pagati */}
            {isDraft && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-amber-950">
                                    Preventivo in attesa di pagamento
                                </h3>
                                <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed max-w-2xl">
                                    Per confermare la data di inizio cantiere, bloccare il posatore selezionato e dare il via alla preparazione dei materiali, completa il pagamento dell'acconto.
                                </p>
                            </div>
                        </div>
                        <Link
                            to={`/checkout/pay/${order.id}`}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all active:scale-95 flex-shrink-0"
                        >
                            Concludi Pagamento <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            )}

            {/* Intestazione Principale dell'Ordine + Barra Percentuale Avanzamento (Compatta, Smart, Leggibile) */}
            <div className="w-full bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 sm:p-5 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-black text-stone-900 font-display tracking-tight">
                                {titleType} #{order.order_number}
                            </h1>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {orderStatusLabel(order.status)}
                            </span>
                        </div>
                        <p className="text-stone-400 text-xs mt-1 font-medium flex items-center gap-1.5 flex-wrap">
                            <span>Registrato il {order.created_at ? format(new Date(order.created_at), 'd MMMM yyyy, HH:mm', { locale: it }) : 'Data non specificata'}</span>
                            <span className="text-stone-300">·</span>
                            <span className="font-mono text-[11px] text-stone-400">Rif. ID: {order.id.slice(0, 8)}</span>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                        <div className="sm:text-right flex items-baseline sm:flex-col justify-between sm:justify-center gap-0.5 bg-stone-50/80 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-stone-200/60 sm:border-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                Importo Totale {titleType}
                            </p>
                            <div className="flex items-baseline gap-1.5 sm:justify-end">
                                <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                                    €{totalCost.toFixed(2)}
                                </p>
                                <span className="text-[11px] text-stone-500 font-medium">IVA e posa inclusi</span>
                            </div>
                        </div>

                        {!isDraft && (
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab('professional')
                                    setTimeout(() => {
                                        const el = document.getElementById('chat-cantiere')
                                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                                    }, 200)
                                }}
                                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                <MessageSquare size={15} />
                                <span>Apri Chat Cantiere</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Avanzamento Cantiere Smart Integrato (Zero card nidificate, spazi ottimizzati) */}
                <div className="mt-3.5 pt-3.5 border-t border-stone-100">
                    <OrderProgressBar steps={steps} embedded />
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* BARRA DEI TAB DI NAVIGAZIONE                                  */}
            {/* 1. Stato & Cronologia (default con colonna costi e stima)      */}
            {/* 2. Superfici e Schema di Posa (materiale e programmazione)    */}
            {/* 3. Scheda Professionista (dati posatore e chat di cantiere)   */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/90 flex flex-col sm:flex-row items-stretch gap-1.5 shadow-2xs">
                {/* TAB 1: STATO & CRONOLOGIA */}
                <button
                    type="button"
                    onClick={() => setActiveTab('status')}
                    className={`flex-1 flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'status'
                            ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                    }`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === 'status' ? 'bg-orange-50 text-orange-600' : 'bg-stone-200/60 text-stone-500'}`}>
                        <CheckCircle2 size={17} />
                    </div>
                    <div className="text-left">
                        <div className="leading-tight">Stato & Cronologia</div>
                        <div className="text-[10px] font-normal text-stone-400 hidden sm:block">Avanzamento e costi</div>
                    </div>
                </button>

                {/* TAB 2: SUPERFICI E SCHEMA DI POSA */}
                <button
                    type="button"
                    onClick={() => setActiveTab('surfaces')}
                    className={`flex-1 flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'surfaces'
                            ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                    }`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === 'surfaces' ? 'bg-orange-50 text-orange-600' : 'bg-stone-200/60 text-stone-500'}`}>
                        <Layers size={17} />
                    </div>
                    <div className="text-left">
                        <div className="leading-tight">Superfici & Schema di Posa</div>
                        <div className="text-[10px] font-normal text-stone-400 hidden sm:block">Materiale e lavorazioni</div>
                    </div>
                </button>

                {/* TAB 3: SCHEDA PROFESSIONISTA & CHAT */}
                <button
                    type="button"
                    onClick={() => setActiveTab('professional')}
                    className={`flex-1 flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'professional'
                            ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center relative ${activeTab === 'professional' ? 'bg-orange-50 text-orange-600' : 'bg-stone-200/60 text-stone-500'}`}>
                            <MessageSquare size={17} />
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                            </span>
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-1.5 leading-tight">
                                <span>Professionista Incaricato & Chat</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-1.5 py-0.2 rounded">Live</span>
                            </div>
                            <div className="text-[10px] font-normal text-stone-400 hidden sm:block">Referente e messaggi</div>
                        </div>
                    </div>
                </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CONTENUTO TAB 1: STATO CON A DESTRA COLONNA COSTI E STIMA     */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'status' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Colonna Sinistra (lg:col-span-2): Dati Principali + Cronologia Tappe */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Fascia dei 3 Dati Principali Chiave: Inizio Lavori, Professionista, Indirizzo */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100 bg-stone-50/40">
                                {/* Inizio Lavori */}
                                <div className="px-5 py-3.5 sm:px-6 sm:py-4 flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                        <Calendar size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                            Data Inizio Lavori
                                        </p>
                                        <p className="font-extrabold text-stone-900 text-sm sm:text-base truncate mt-0.5">
                                            {inizioLavoriText}
                                        </p>
                                        <p className="text-xs text-stone-500 truncate font-medium mt-0.5">
                                            {fineLavoriText}
                                        </p>
                                    </div>
                                </div>

                                {/* Professionista Assegnato */}
                                <div className="px-5 py-3.5 sm:px-6 sm:py-4 flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/80 text-purple-600 flex items-center justify-center flex-shrink-0">
                                        <User size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                Professionista
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('professional')}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg border border-orange-200/60 cursor-pointer transition-all"
                                            >
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                                </span>
                                                <span>Chat & Scheda →</span>
                                            </button>
                                        </div>
                                        <p className="font-extrabold text-stone-900 text-sm sm:text-base truncate mt-0.5">
                                            {proName}
                                        </p>
                                        <p className="text-xs text-stone-500 truncate font-medium mt-0.5">
                                            {proSub}
                                        </p>
                                    </div>
                                </div>

                                {/* Indirizzo Cantiere */}
                                <div className="px-5 py-3.5 sm:px-6 sm:py-4 flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                            Indirizzo Cantiere
                                        </p>
                                        <p className="font-extrabold text-stone-900 text-sm sm:text-base truncate mt-0.5">
                                            {addressText}
                                        </p>
                                        <p className="text-xs text-stone-500 truncate font-medium mt-0.5">
                                            {cityText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cronologia Tappe e Stati di Avanzamento */}
                        <OrderTimelineSteps steps={steps} />
                    </div>

                    {/* Colonna Destra (lg:col-span-1): Riepilogo Costi + Stima dei Lavori + Indirizzo & Assistenza */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* 1. RIEPILOGO COSTI */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden p-6 sm:p-7">
                            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-stone-100">
                                <Receipt size={18} className="text-orange-600" />
                                <h3 className="font-bold text-base text-stone-900">Riepilogo costi</h3>
                            </div>

                            <div className="space-y-3 text-xs sm:text-sm">
                                {materialCost > 0 && (
                                    <div className="flex justify-between text-stone-600">
                                        <span>Fornitura Piastrelle</span>
                                        <span className="font-semibold text-stone-900">€{materialCost.toFixed(2)}</span>
                                    </div>
                                )}
                                {layingCost > 0 && (
                                    <div className="flex justify-between text-stone-600">
                                        <span>Posa in Opera Specializzata</span>
                                        <span className="font-semibold text-stone-900">€{layingCost.toFixed(2)}</span>
                                    </div>
                                )}
                                {servicesCost > 0 && (
                                    <div className="flex justify-between text-stone-600">
                                        <span>Servizi e Preparazioni</span>
                                        <span className="font-semibold text-stone-900">€{servicesCost.toFixed(2)}</span>
                                    </div>
                                )}
                                {deliveryCost > 0 && (
                                    <div className="flex justify-between text-stone-600">
                                        <span>Consegna & Scarico</span>
                                        <span className="font-semibold text-stone-900">€{deliveryCost.toFixed(2)}</span>
                                    </div>
                                )}

                                {order.subtotal && order.subtotal > 0 && order.subtotal !== totalCost && (
                                    <>
                                        <div className="pt-2 border-t border-stone-100 flex justify-between text-stone-500 text-xs">
                                            <span>Imponibile</span>
                                            <span>€{order.subtotal.toFixed(2)}</span>
                                        </div>
                                        {order.vat_amount != null && (
                                            <div className="flex justify-between text-stone-500 text-xs">
                                                <span>IVA di Legge</span>
                                                <span>€{order.vat_amount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <hr className="border-stone-100 my-5" />

                            <div className="flex justify-between items-baseline mb-4">
                                <div>
                                    <span className="font-bold text-stone-900 text-base">Totale Ordine</span>
                                    <span className="block text-[11px] text-stone-400 font-medium">IVA inclusa</span>
                                </div>
                                <span className="text-2xl font-black text-stone-900 tracking-tight">
                                    €{totalCost.toFixed(2)}
                                </span>
                            </div>

                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-500 space-y-1">
                                <div className="flex justify-between">
                                    <span>Metodo Pagamento:</span>
                                    <span className="font-bold text-stone-800 capitalize">
                                        {order.payment_method === 'credit_card' ? 'Carta di Credito' : order.payment_method || 'Online'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Stato Pagamento:</span>
                                    <span className={`font-bold ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-700'}`}>
                                        {order.payment_status === 'paid' ? 'Saldato con Successo' : 'In attesa'}
                                    </span>
                                </div>
                                {(() => {
                                    const addr = typeof order.installation_address === 'object' ? order.installation_address : {}
                                    const fiscalCode = addr?.fiscal_code || addr?.cf || (order as any)?.fiscal_code
                                    const vatNumber = addr?.vat_number || addr?.partita_iva || (order as any)?.vat_number
                                    const wantsInvoice = Boolean(
                                        addr?.wants_invoice === true ||
                                        addr?.invoice_requested === true ||
                                        addr?.richiede_fattura === true ||
                                        (order as any)?.wants_invoice === true ||
                                        (order as any)?.requires_invoice === true ||
                                        vatNumber
                                    )

                                    return (
                                        <>
                                            <div className="flex justify-between pt-1 border-t border-stone-200/50">
                                                <span>Fatturazione:</span>
                                                <span className={`font-bold ${wantsInvoice ? 'text-emerald-700' : 'text-stone-700'}`}>
                                                    {wantsInvoice ? 'Fattura Elettronica' : 'Ricevuta Fiscale'}
                                                </span>
                                            </div>
                                            {(fiscalCode || vatNumber) && (
                                                <div className="flex justify-between">
                                                    <span>{vatNumber ? 'P.IVA / CF:' : 'Codice Fiscale:'}</span>
                                                    <span className="font-mono font-bold text-stone-800">
                                                        {vatNumber || fiscalCode}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>

                            {isDraft && (
                                <Link
                                    to={`/checkout/pay/${order.id}`}
                                    className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all active:scale-95"
                                >
                                    Procedi al Pagamento <ChevronRight size={16} />
                                </Link>
                            )}
                        </div>

                        {/* 2. STIMA DEI LAVORI (DURATA) */}
                        <DurationCard
                            estimate={durata}
                            confirmedWorkDays={order.confirmed_work_days}
                            confirmedCalendarDays={order.confirmed_calendar_days}
                            proNote={order.duration_pro_note}
                            startDate={inizioLavori}
                        />

                        {/* 3. INDIRIZZO DI POSA & LOGISTICA DI SCARICO */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-stone-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 flex-shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-stone-900">Indirizzo di Posa & Scarico</h3>
                                    <p className="text-xs text-stone-500">Destinazione e condizioni di consegna</p>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/70">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Indirizzo Cantiere</p>
                                    <p className="text-sm font-extrabold text-stone-900 mt-0.5">
                                        {addressText}
                                    </p>
                                    <p className="text-xs text-stone-600 mt-0.5">
                                        {cityText}
                                    </p>
                                </div>

                                {deliveryAccess && (
                                    <div className="space-y-2 text-xs">
                                        <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/60">
                                            <span className="text-stone-400 block text-[10px] font-bold uppercase">Punto di Scarico Corriere</span>
                                            <span className="font-bold text-stone-900 mt-0.5 block">
                                                {deliveryAccess.destination === 'street'
                                                    ? 'Bordo Strada (Sponda Idraulica)'
                                                    : deliveryAccess.destination === 'box'
                                                        ? 'Box / Garage al Piano Terra'
                                                        : 'Al Piano (Facchini corriere)'}
                                            </span>
                                        </div>

                                        <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/60">
                                            <span className="text-stone-400 block text-[10px] font-bold uppercase">Piano dei Lavori</span>
                                            <span className="font-bold text-stone-900 mt-0.5 block">
                                                {deliveryAccess.floorType === 'ground'
                                                    ? 'Piano Terra'
                                                    : `${deliveryAccess.floorNumber}° Piano ${deliveryAccess.hasFreightElevator ? '(Con ascensore)' : '(Senza ascensore)'}`}
                                            </span>
                                        </div>

                                        {deliveryAccess.destination !== 'floor' && (
                                            <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/60">
                                                <span className="text-stone-400 block text-[10px] font-bold uppercase">Movimentazione al Piano</span>
                                                <span className="font-bold text-stone-900 mt-0.5 block">
                                                    {deliveryAccess.handlingBy === 'pro'
                                                        ? 'Inclusa: materiale portato al piano dal posatore'
                                                        : 'A cura del cliente prima dell\'avvio cantiere'}
                                                </span>
                                            </div>
                                        )}

                                        {deliveryAccess.logisticsNotes && (
                                            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
                                                <span className="text-amber-800 block text-[10px] font-bold uppercase">Note Autista & Scarico</span>
                                                <span className="italic text-stone-800 font-medium mt-0.5 block">
                                                    &ldquo;{deliveryAccess.logisticsNotes}&rdquo;
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {order.notes && (
                                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-xs">
                                        <span className="text-stone-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
                                            Note Aggiuntive Cliente
                                        </span>
                                        <p className="text-stone-700 italic font-medium leading-relaxed">
                                            &ldquo;{order.notes}&rdquo;
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. BOX ASSISTENZA OPERATIVA */}
                        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 space-y-2.5">
                            <div className="flex items-center gap-2 text-stone-900">
                                <HelpCircle size={16} className="text-orange-600" />
                                <h4 className="font-bold text-xs uppercase tracking-wider">Serve Assistenza?</h4>
                            </div>
                            <p className="text-xs text-stone-500 leading-relaxed">
                                L'ufficio operativo PosaFacile è a disposizione per qualsiasi esigenza o chiarimento sul cantiere.
                            </p>
                            <div className="pt-1 text-xs font-bold text-stone-800 space-y-1">
                                <p className="flex items-center gap-1.5">
                                    <Mail size={13} className="text-stone-400" /> supporto@posafacile.com
                                </p>
                                <p className="flex items-center gap-1.5">
                                    <Phone size={13} className="text-stone-400" /> Lun-Ven 09:00 - 18:00
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveTab('professional')}
                                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200/80 transition-all cursor-pointer"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                <MessageSquare size={13} />
                                <span>Scrivi nella Chat di Cantiere</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* CONTENUTO TAB 2: SUPERFICI E SCHEMA DI POSA                   */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'surfaces' && (
                <div className="space-y-6">
                    {/* Materiale Acquistato e Superfici in 2 Colonne */}
                    <div className="w-full bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                                {/* Colonna Sinistra (lg:col-span-5): Materiale Scelto con Miniatura */}
                                <div className="lg:col-span-5 bg-stone-50/70 rounded-2xl p-4 sm:p-5 border border-stone-200/70 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                                                Gres Porcellanato Scelto
                                            </span>
                                            {productPrice && (
                                                <span className="text-xs font-black text-stone-900">
                                                    €{Number(productPrice).toFixed(2)} <span className="text-[10px] font-normal text-stone-500">/ mq</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-start gap-3.5">
                                            {/* Miniatura Immagine */}
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-400 flex-shrink-0 overflow-hidden shadow-2xs relative group">
                                                {productImg ? (
                                                    <img
                                                        src={productImg}
                                                        alt={productName}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLElement).style.display = 'none'
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center p-2 text-center text-stone-400">
                                                        <Layers size={26} className="text-orange-500 mb-1" />
                                                        <span className="text-[10px] font-bold text-stone-500">Gres</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nome e Dettagli */}
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-extrabold text-stone-900 text-base leading-snug">
                                                    {productName}
                                                </h3>
                                                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                                    {productFormat && (
                                                        <span className="text-[10px] font-bold text-stone-700 bg-white px-2 py-0.5 rounded-md border border-stone-200/80 shadow-2xs">
                                                            {productFormat}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-stone-700 bg-white px-2 py-0.5 rounded-md border border-stone-200/80 shadow-2xs">
                                                        {productThickness}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-stone-700 bg-white px-2 py-0.5 rounded-md border border-stone-200/80 shadow-2xs">
                                                        {productFinish}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-600">
                                        <span>Fornitura Piastrelle:</span>
                                        <span className="font-bold text-stone-900">
                                            {hasFornitura ? 'Inclusa nell\'ordine' : 'Solo posa in opera'}
                                        </span>
                                    </div>
                                </div>

                                {/* Colonna Destra (lg:col-span-7): Metrature, Ambiente e Lavorazioni Specialistiche */}
                                <div className="lg:col-span-7 bg-stone-50/70 rounded-2xl p-4 sm:p-5 border border-stone-200/70 flex flex-col justify-between space-y-4">
                                    {/* Griglia Metrature e Schema con Ambiente Integrato */}
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                Superfici e Schema di Posa
                                            </p>
                                            <span className="text-xs font-bold text-stone-800 bg-white px-2.5 py-0.5 rounded-md border border-stone-200/80 shadow-2xs inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                Ambiente: <span className="text-orange-600">{ambiente}</span>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="p-2.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Totale</span>
                                                <span className="text-sm sm:text-base font-black text-stone-900 mt-0.5 block">{supTot.toFixed(2)} mq</span>
                                            </div>
                                            <div className="p-2.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Pavimento</span>
                                                <span className="text-sm sm:text-base font-black text-stone-900 mt-0.5 block">{supPav} mq</span>
                                            </div>
                                            <div className="p-2.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Parete</span>
                                                <span className="text-sm sm:text-base font-black text-stone-900 mt-0.5 block">{supPar} mq</span>
                                            </div>
                                            <div className="p-2.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Posa</span>
                                                <span className="text-xs font-black text-stone-900 mt-0.5 block capitalize truncate">
                                                    {layingType}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fornitura e Lavorazioni Incluse */}
                                    {(hasFornitura || (services && Object.values(services).some(v => v))) && (
                                        <div className="pt-2 border-t border-stone-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                                                Fornitura, Lavorazioni e Preparazioni Incluse
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                                {hasFornitura && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-800 bg-white p-2 rounded-lg border border-stone-200/70 font-medium shadow-2xs">
                                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">Fornitura Inclusa</span>
                                                    </div>
                                                )}
                                                {services.demolizione && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-800 bg-white p-2 rounded-lg border border-stone-200/70 font-medium shadow-2xs">
                                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">Demolizione</span>
                                                    </div>
                                                )}
                                                {services.massetto && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-800 bg-white p-2 rounded-lg border border-stone-200/70 font-medium shadow-2xs">
                                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">Nuovo Massetto</span>
                                                    </div>
                                                )}
                                                {services.impermeabilizzazione && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-800 bg-white p-2 rounded-lg border border-stone-200/70 font-medium shadow-2xs">
                                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">Impermeabilizz.</span>
                                                    </div>
                                                )}
                                                {services.smaltimento && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-800 bg-white p-2 rounded-lg border border-stone-200/70 font-medium shadow-2xs">
                                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">Smaltimento</span>
                                                    </div>
                                                )}
                                                {services.battiscopa && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-800 bg-white p-2 rounded-lg border border-stone-200/70 font-medium shadow-2xs">
                                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">Battiscopa ({services.battiscopaMetri || 0}m)</span>
                                                    </div>
                                                )}
                                                {services.soglie && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-800 bg-white p-2 rounded-lg border border-stone-200/70 font-medium shadow-2xs">
                                                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">Soglie ({services.soglieQty || 0} pz)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Programmazione Cantiere e Durata Lavori (2 Colonne) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Card Programmazione Date */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-stone-900">Programmazione Cantiere</h3>
                                    <p className="text-xs text-stone-500">Date e fasce orarie concordate</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/60">
                                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Data Inizio Lavori</span>
                                    <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                                        {inizioLavoriText}
                                    </span>
                                </div>
                                <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/60">
                                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Fine Lavori Stimata</span>
                                    <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                                        {fineLavoriText}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/60 text-xs">
                                <span className="text-stone-400 block text-[10px] font-bold uppercase">Fascia Oraria Giornaliera</span>
                                <span className="font-bold text-stone-900 mt-0.5 block capitalize">
                                    {order.scheduled_time_slot || 'Giornata intera (08:30 - 18:00)'}
                                </span>
                            </div>

                            <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/60 text-xs">
                                <span className="text-stone-400 block text-[10px] font-bold uppercase">Stima Durata Esecuzione</span>
                                <span className="font-bold text-stone-900 mt-0.5 block">
                                    {order.confirmed_work_days ?? durata.workDays} giorni lavorativi ({order.confirmed_calendar_days ?? durata.calendarDays} giorni solari)
                                </span>
                            </div>
                        </div>

                        {/* Card Logistica Consegna e Scarico */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-stone-900">Logistica Consegna & Scarico</h3>
                                    <p className="text-xs text-stone-500">Destinazione e condizioni del cantiere</p>
                                </div>
                            </div>

                            <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/70 text-xs">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Indirizzo di Posa</span>
                                <span className="text-sm font-bold text-stone-900 mt-0.5 block">
                                    {addressText}
                                </span>
                                <span className="text-xs text-stone-500 mt-0.5 block">
                                    {cityText}
                                </span>
                            </div>

                            {deliveryAccess && (
                                <div className="space-y-2 text-xs">
                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/60 flex justify-between items-center">
                                        <span className="text-stone-500">Punto Scarico:</span>
                                        <span className="font-bold text-stone-900">
                                            {deliveryAccess.destination === 'street'
                                                ? 'Bordo Strada (Sponda)'
                                                : deliveryAccess.destination === 'box'
                                                    ? 'Box / Garage'
                                                    : 'Al Piano (Facchini)'}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/60 flex justify-between items-center">
                                        <span className="text-stone-500">Piano Abitazione:</span>
                                        <span className="font-bold text-stone-900">
                                            {deliveryAccess.floorType === 'ground'
                                                ? 'Piano Terra'
                                                : `${deliveryAccess.floorNumber}° Piano ${deliveryAccess.hasFreightElevator ? '(Con ascensore)' : ''}`}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/60 flex justify-between items-center">
                                        <span className="text-stone-500">Movimentazione al Piano:</span>
                                        <span className="font-bold text-stone-900">
                                            {deliveryAccess.handlingBy === 'pro' ? 'Inclusa (a cura del posatore)' : 'A cura del cliente'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* CONTENUTO TAB 3: SCHEDA PROFESSIONISTA INCARICATO E CHAT      */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'professional' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Colonna Sinistra (lg:col-span-5): Dati Professionista Incaricato */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-stone-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/80 shrink-0">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-stone-900">Professionista Incaricato</h3>
                                    <p className="text-xs text-stone-500">Referente esecutivo per il tuo cantiere</p>
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                {order.professional && isJobAccepted ? (
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 flex items-center justify-center font-black text-xl shrink-0 border border-purple-200 shadow-xs">
                                                {order.professional.full_name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-extrabold text-stone-900 text-lg leading-tight">
                                                        {order.professional.full_name}
                                                    </h4>
                                                    {order.professional.verified && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                            <CheckCircle2 size={12} className="text-emerald-600" />
                                                            Posatore Certificato
                                                        </span>
                                                    )}
                                                </div>
                                                {order.professional.company_name && (
                                                    <p className="text-stone-500 text-xs font-medium mt-1">
                                                        {order.professional.company_name}
                                                    </p>
                                                )}
                                                <p className="text-xs text-stone-400 mt-0.5">
                                                    Abbinato all'ordine #{order.order_number}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Contatti diretti */}
                                        <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200/70 space-y-2 text-xs">
                                            {order.professional.phone && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-stone-500">Telefono:</span>
                                                    <span className="font-bold text-stone-900 font-mono">
                                                        {order.professional.phone}
                                                    </span>
                                                </div>
                                            )}
                                            {order.professional.email && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-stone-500">Email:</span>
                                                    <span className="font-bold text-stone-900 truncate max-w-[200px]">
                                                        {order.professional.email}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Azioni Rapide WhatsApp e Telefono */}
                                        {order.professional.phone && (() => {
                                            const cleanPhone = (order.professional.phone || '').replace(/[^0-9]/g, '')
                                            const waNumber = cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`
                                            const waText = encodeURIComponent(`Buongiorno, ti contatto in merito all'ordine PosaFacile #${order.order_number || order.id.slice(0, 8)}.`)
                                            const waUrl = `https://wa.me/${waNumber}?text=${waText}`

                                            return (
                                                <div className="pt-2 flex items-center gap-2">
                                                    <a
                                                        href={waUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                                                    >
                                                        <MessageSquare size={16} />
                                                        <span>Scrivi su WhatsApp</span>
                                                    </a>
                                                    <a
                                                        href={`tel:${order.professional.phone}`}
                                                        className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm border border-stone-200/80 transition-all active:scale-95"
                                                    >
                                                        <Phone size={15} />
                                                        <span>Chiama</span>
                                                    </a>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                ) : order.professional && !isJobAccepted ? (
                                    <div className="text-center py-6 space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                                            <Clock size={22} />
                                        </div>
                                        <div>
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black uppercase tracking-wider mb-1.5">
                                                <Lock size={12} />
                                                In attesa di accettazione del posatore
                                            </div>
                                            <h4 className="text-base font-bold text-stone-900">Incarico Assegnato al Posatore</h4>
                                            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
                                                Il posatore selezionato sta verificando la disponibilità e i dettagli del cantiere. I recapiti telefonici, WhatsApp e la chat diretta si attiveranno automaticamente non appena il professionista confermerà l'accettazione.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                                            <Clock size={22} />
                                        </div>
                                        <h4 className="text-base font-bold text-stone-900">Assegnazione in corso</h4>
                                        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
                                            Il team PosaFacile sta selezionando il miglior posatore specializzato per la tua tipologia di piastrella e zona geografica. Riceverai una notifica non appena il posatore accetta l'incarico.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Garanzie e Standard PosaFacile */}
                        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-6 shadow-md space-y-3.5">
                            <div className="flex items-center gap-2 text-orange-400">
                                <ShieldCheck size={20} />
                                <h4 className="font-black text-xs uppercase tracking-wider text-white">Garanzia & Standard PosaFacile</h4>
                            </div>
                            <p className="text-xs text-stone-300 leading-relaxed">
                                Tutti i posatori della rete PosaFacile sono professionisti verificati con partita IVA, DURC regolare e conformità alla norma tecnica UNI 11493 per la posa certificata di ceramica e gres.
                            </p>
                            <div className="pt-2 border-t border-stone-700/60 text-[11px] text-stone-400 flex items-center justify-between">
                                <span>Copertura assicurativa inclusa</span>
                                <span className="text-emerald-400 font-bold">Attiva</span>
                            </div>
                        </div>
                    </div>

                    {/* Colonna Destra (lg:col-span-7): Chat di Cantiere Integrata */}
                    <div className="lg:col-span-7 space-y-6">
                        <div id="chat-cantiere" className="scroll-mt-6">
                            {jobId && user?.id ? (
                                <div className="space-y-3">
                                    {jobStatus === 'assigned' && (
                                        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
                                            <div className="p-1.5 rounded-xl bg-amber-200/60 text-amber-800 shrink-0 mt-0.5">
                                                <Clock size={16} />
                                            </div>
                                            <div className="leading-relaxed">
                                                <p className="font-bold">In attesa di conferma accettazione del posatore</p>
                                                <p className="text-amber-800/90 mt-0.5">
                                                    Il posatore incaricato sta verificando le date e i dettagli del cantiere. Puoi già scrivere e inviare messaggi qui: saranno notificati al posatore e monitorati dal supporto operativo PosaFacile.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <JobChat
                                        jobId={jobId}
                                        currentUserId={user.id}
                                        proUserId={(order as any).installation_professional_id || (order as any).professional_id || undefined}
                                        customerUserId={user.id}
                                        title="Chat di Cantiere"
                                        subtitle={`Canale diretto tra te, ${order.professional?.full_name || 'il posatore'} e PosaFacile`}
                                    />
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden p-8 text-center space-y-4">
                                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-100">
                                        <MessageSquare size={26} />
                                    </div>
                                    <div className="max-w-md mx-auto">
                                        <h3 className="text-lg font-bold text-stone-900">Assegnazione Cantiere in Corso</h3>
                                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                                            Stiamo abbinando il posatore certificato più adatto alla tua zona geografica e al tipo di piastrella. La chat live si attiverà non appena assegnato l'incarico.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
