import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProStore, jobInfoFromOrder, type JobStatus, type Job } from '@/store/proStore'
import { supabase } from '@/lib/supabase'
import {
    ArrowLeft,
    MapPin,
    Calendar,
    CheckCircle2,
    Play,
    AlertTriangle,
    Hammer,
    User,
    Clock,
    Phone,
    ExternalLink,
    MessageCircle,
    Layers,
    Package,
    ShieldCheck,
    Coins,
    Truck,
    ArrowUpRight,
    AlertCircle,
    Lock,
} from 'lucide-react'
import { PhotoUpload } from '@/components/pro/jobs/PhotoUpload'
import { DurationConfirm } from '@/components/pro/jobs/DurationConfirm'
import { JobChat } from '@/components/chat/JobChat'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const STATUS_ACTIONS: Record<JobStatus, { label: string; next: JobStatus; icon: any; color: string } | null> = {
    assigned: { label: 'Accetta Incarico Cantiere', next: 'accepted', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' },
    accepted: { label: 'Inizia Lavoro nel Cantiere', next: 'in_progress', icon: Play, color: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' },
    in_progress: { label: 'Completa e Chiudi Cantiere', next: 'completed', icon: CheckCircle2, color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' },
    completed: null,
    cancelled: null,
    draft: null,
    pending: null
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
    assigned: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200/90', label: 'Assegnato — In attesa di accettazione' },
    accepted: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200/90', label: 'Incarico Accettato' },
    in_progress: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200/90', label: 'Cantiere in Corso' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200/90', label: 'Cantiere Completato' },
    cancelled: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200/90', label: 'Annullato' },
    draft: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', label: 'Preventivo in Bozza' },
}

const extractProductImage = (product: any): string | null => {
    if (!product) return null
    if (product.tileable_image_url) return product.tileable_image_url
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0]
    if (typeof product.images === 'string') {
        try {
            const parsed = JSON.parse(product.images)
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
        } catch {
            return product.images
        }
    }
    if (product.image_url) return product.image_url
    if (product.image) return product.image
    return null
}

export function JobDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { jobs, fetchJobs, updateJobStatus } = useProStore()
    const { user } = useAuth()
    const [directJob, setDirectJob] = useState<Job | null>(null)
    const [directLoading, setDirectLoading] = useState(false)

    // Trova il job nello store o nel fallback diretto
    const job = jobs.find(j => j.id === id || j.order_id === id) || directJob

    useEffect(() => {
        if (jobs.length === 0) {
            fetchJobs()
        }
    }, [fetchJobs, jobs.length])

    // Fallback di caricamento diretto se non ancora presente nello store
    useEffect(() => {
        if (!job && id) {
            let isMounted = true
            setDirectLoading(true)

            const loadDirect = async () => {
                try {
                    const { data, error } = await supabase
                        .from('jobs')
                        .select('*')
                        .or(`id.eq.${id},order_id.eq.${id}`)
                        .maybeSingle()

                    if (!isMounted) return

                    if (data && !error) {
                        // Dati del lavoro dalla vista pro_orders: niente anagrafica né dati fiscali del cliente.
                        const { data: orderRow } = await supabase
                            .from('pro_orders' as any)
                            .select('*')
                            .eq('id', data.order_id)
                            .maybeSingle()
                        if (!isMounted) return
                        const order = (orderRow as any) || null

                        setDirectJob({
                            id: data.id,
                            order_id: data.order_id || (order?.id || ''),
                            status: data.status as JobStatus,
                            scheduled_date: data.scheduled_date || order?.installation_date || order?.work_start_date || null,
                            notes: data.notes || order?.notes || '',
                            created_at: data.created_at || new Date().toISOString(),
                            order,
                            ...jobInfoFromOrder(order),
                        })
                    }
                } finally {
                    if (isMounted) {
                        setDirectLoading(false)
                    }
                }
            }

            loadDirect()

            return () => {
                isMounted = false
            }
        }
    }, [id, job])

    if (!job || directLoading) {
        return (
            <div className="container mx-auto px-4 py-20 max-w-5xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                    <Clock className="w-6 h-6 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Caricamento Scheda Cantiere...</h2>
                <p className="text-stone-500 text-sm mt-1">Stiamo recuperando tutti i dettagli del lavoro assegnato.</p>
            </div>
        )
    }

    const order = job.order || {}
    const action = STATUS_ACTIONS[job.status]
    const statusMeta = STATUS_STYLES[job.status] || {
        bg: 'bg-stone-100',
        text: 'text-stone-700',
        border: 'border-stone-200',
        label: job.status.replace('_', ' ')
    }

    // Stato di accettazione cantiere: contatti del cliente, indirizzo esatto e chat si sbloccano SOLO dopo aver accettato
    const isJobAccepted = job.status === 'accepted' || job.status === 'in_progress' || job.status === 'completed'

    // Dati economici per il professionista
    const layingTotal = Number(job.laying_total ?? order?.laying_total ?? 0)
    const servicesTotal = Number(job.services_total ?? order?.services_total ?? 0)
    const proPayout = Number(job.payout ?? order?.professional_payout ?? (layingTotal + servicesTotal))

    // Del cliente il posatore riceve solo nome e telefono, dopo l'accettazione:
    // email, anagrafica e dati fiscali non arrivano nemmeno al browser.
    const customerName = job.customer_name || 'Cliente'
    const customerPhone = job.customer_phone || null

    // Dati indirizzo e logistica
    const fullStreet = job.address || (typeof order?.installation_address === 'object' ? (order.installation_address?.street || order.installation_address?.address) : order?.installation_address) || 'Indirizzo da confermare'
    const fullCity = [job.cap, job.city, job.province ? `(${job.province})` : ''].filter(Boolean).join(' ') || 'Italia'
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fullStreet}, ${fullCity}`)}`

    // Messaggio precompilato WhatsApp
    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : null
    const waPhone = cleanPhone ? (cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`) : null
    const waMessage = `Ciao ${customerName}, sono il posatore incaricato da PosaFacile per il tuo cantiere #${job.order_number || job.order_id.slice(0, 8)}. Ti contatto per coordinare l'inizio dei lavori e concordare i dettagli di accesso al cantiere.`
    const whatsappUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}` : null

    // Dati tecnici materiale e lavorazioni
    const item = (order?.items && order.items[0]) || {}
    const product = item?.product || order?.product || null
    const productImg = extractProductImage(product)
    const productName = product?.name || 'Gres Porcellanato Scelto'
    const productFormat = product?.format || (product?.format_width && product?.format_height ? `${product.format_width / 10}×${product.format_height / 10} cm` : null)
    const productThickness = product?.thickness ? `${product.thickness} mm` : '9-10 mm'
    const productFinish = product?.finish || product?.surface_finish || 'Naturale / Opaco'

    const floorSqm = Number(item?.dimensions?.pavimentoMq ?? order?.floor_sqm ?? 0)
    const wallSqm = Number(item?.dimensions?.paretiMq ?? order?.wall_sqm ?? 0)
    const totalSqm = floorSqm + wallSqm
    const layingType = item?.layingType || item?.laying_type || order?.laying_type || 'Standard'
    const ambiente = item?.projectInfo?.ambiente || order?.project_type || 'Ambiente'
    const services = item?.services || {}
    const deliveryAccess = typeof order?.installation_address === 'object' ? (order.installation_address?.delivery_access || item?.delivery_access) : null

    // Data di inizio
    const scheduledDateText = job.scheduled_date
        ? format(new Date(job.scheduled_date), 'd MMMM yyyy', { locale: it })
        : 'Data da concordare'

    const handleAction = async () => {
        if (!action) return
        await updateJobStatus(job.id, action.next)
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
            {/* ------------------------------------------------------------- */}
            {/* BARRA SUPERIORE: NAVIGAZIONE E STATO DEL CANTIERE              */}
            {/* ------------------------------------------------------------- */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                    onClick={() => navigate('/pro/jobs')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 rounded-xl border border-stone-200/90 shadow-2xs transition-all active:scale-95 w-fit"
                >
                    <ArrowLeft size={16} className="text-stone-500" />
                    Torna all'Elenco Lavori
                </button>

                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                        <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                        {statusMeta.label}
                    </span>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CARD 1: INTESTAZIONE GENERALE & 3 DATI CHIAVE (COME CLIENTE)  */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                <div className="px-6 py-5 sm:px-7 sm:py-6 border-b border-stone-100 bg-stone-50/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0 mt-0.5">
                                <Hammer className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                                        Scheda Cantiere Operativo
                                    </span>
                                    <span className="text-xs text-stone-400 font-medium">·</span>
                                    <span className="text-xs font-bold text-stone-600">
                                        Ordine #{job.order_number || job.order_id.slice(0, 8)}
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1 font-display">
                                    {isJobAccepted ? `Cantiere di ${customerName}` : `Cantiere a ${job.city || 'Destinazione'} ${job.province ? `(${job.province})` : ''}`}
                                </h1>
                                <p className="text-stone-500 text-xs sm:text-sm mt-0.5 font-medium">
                                    Assegnato il {job.created_at ? format(new Date(job.created_at), 'd MMMM yyyy, HH:mm', { locale: it }) : 'Data non specificata'}
                                </p>
                                {!isJobAccepted && (
                                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold">
                                        <Lock size={13} className="text-amber-600 flex-shrink-0" />
                                        In attesa di accettazione — I contatti diretti del cliente, la chat e l'indirizzo civico saranno visibili dopo la conferma dell'incarico
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between gap-1 p-3 sm:p-0 bg-emerald-50/50 sm:bg-transparent rounded-xl border sm:border-0 border-emerald-100/80">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                    Il Tuo Compenso Netto
                                </p>
                                <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                                    €{proPayout.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fascia 3 Metriche Principali Chiave */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100 bg-stone-50/40">
                    {/* Compenso Posatore */}
                    <div className="px-5 py-4 sm:px-6 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Coins size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                Compenso Manodopera
                            </p>
                            <p className="font-black text-stone-900 text-base mt-0.5">
                                €{proPayout.toFixed(2)} <span className="text-xs font-normal text-stone-500">netto</span>
                            </p>
                            <p className="text-xs text-stone-500 truncate font-medium mt-0.5">
                                Posa: €{layingTotal.toFixed(2)} · Servizi: €{servicesTotal.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Data Inizio Prevista */}
                    <div className="px-5 py-4 sm:px-6 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 text-orange-600 flex items-center justify-center flex-shrink-0">
                            <Calendar size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                Data Inizio Lavori
                            </p>
                            <p className="font-black text-stone-900 text-base truncate mt-0.5">
                                {scheduledDateText}
                            </p>
                            <p className="text-xs text-stone-500 truncate font-medium mt-0.5">
                                {order?.scheduled_time_slot ? `Fascia: ${order.scheduled_time_slot}` : 'Orario concordato con cliente'}
                            </p>
                        </div>
                    </div>

                    {/* Indirizzo Cantiere + Mappa */}
                    <div className="px-5 py-4 sm:px-6 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <MapPin size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Indirizzo Cantiere
                                </p>
                                <a
                                    href={isJobAccepted ? googleMapsUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullCity)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
                                >
                                    {isJobAccepted ? 'Mappe' : 'Zona Mappa'} <ArrowUpRight size={12} />
                                </a>
                            </div>
                            {isJobAccepted ? (
                                <>
                                    <p className="font-black text-stone-900 text-base truncate mt-0.5">
                                        {fullStreet}
                                    </p>
                                    <p className="text-xs text-stone-500 truncate font-medium mt-0.5">
                                        {fullCity}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-black text-stone-800 text-sm sm:text-base truncate mt-0.5 flex items-center gap-1.5">
                                        <Lock size={13} className="text-amber-500 flex-shrink-0" />
                                        <span>Civico riservato</span>
                                    </p>
                                    <p className="text-xs text-stone-600 font-bold truncate mt-0.5">
                                        {fullCity}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* AZIONI RICHIESTE IN ALTO: AZIONE OPERATIVA CANTIERE           */}
            {/* ------------------------------------------------------------- */}
            {action && (
                <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/50 to-white rounded-2xl border-2 border-orange-300 shadow-sm p-5 sm:p-6 transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="space-y-1.5 max-w-2xl">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-800 bg-orange-100/90 px-2.5 py-0.5 rounded-full border border-orange-200">
                                    <AlertCircle size={13} className="text-orange-600" />
                                    Azione Richiesta
                                </span>
                                <span className="text-xs font-bold text-stone-500">
                                    Stato Attuale: <strong className="text-stone-800 capitalize">{statusMeta.label}</strong>
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
                                {job.status === 'assigned' && 'Conferma la presa in carico di questo cantiere'}
                                {job.status === 'accepted' && 'Pronto per iniziare i lavori di posa?'}
                                {job.status === 'in_progress' && 'Hai ultimato la posa e le finiture?'}
                                {job.status !== 'assigned' && job.status !== 'accepted' && job.status !== 'in_progress' && action.label}
                            </h2>
                            <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
                                {job.status === 'assigned' && 'Esamina i dettagli del lavoro e l\'indirizzo. Clicca sul pulsante per accettare l\'incarico e notificare al cliente e a PosaFacile la tua disponibilità.'}
                                {job.status === 'accepted' && 'All\'arrivo in cantiere nella data concordata, clicca per notificare l\'avvio effettivo della posa e sincronizzare la timeline del cliente.'}
                                {job.status === 'in_progress' && 'Quando la posa è completata e collaudata con il cliente, premi per chiudere il cantiere e avviare la liquidazione del compenso.'}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 flex-shrink-0">
                            <button
                                onClick={handleAction}
                                className={`py-3.5 px-7 rounded-xl text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 ${action.color}`}
                            >
                                <action.icon size={20} className="stroke-[2.5]" />
                                {action.label}
                            </button>
                            <span className="text-[11px] text-stone-400 font-medium text-center lg:text-right">
                                Aggiornamento istantaneo cantiere & timeline cliente
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* RIGA PRINCIPALE A 2 COLONNE                                    */}
            {/* Sinistra (2 col): Contatti WhatsApp, Scheda Tecnica, Logistica */}
            {/* Destra (1 col): Compenso economico, Chat in tempo reale        */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* ========================================================= */}
                {/* COLONNA SINISTRA: DETTAGLI OPERATIVI E CONTATTI          */}
                {/* ========================================================= */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 1. CONTATTI DEL CLIENTE: SOLO NOME E TELEFONO */}
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3 bg-stone-50/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-base text-stone-900">Contatti del Cliente</h3>
                                    <p className="text-xs text-stone-500">Nome e telefono per coordinare il cantiere</p>
                                </div>
                            </div>
                            {isJobAccepted ? (
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 flex items-center gap-1">
                                    <ShieldCheck size={12} />
                                    Cliente PosaFacile
                                </span>
                            ) : (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 flex items-center gap-1">
                                    <Lock size={12} className="text-amber-600" />
                                    Sblocco all'accettazione
                                </span>
                            )}
                        </div>

                        {isJobAccepted ? (
                            <div className="p-5 sm:p-6 space-y-5">
                                {/* RECAPITI E CONTATTI */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Nome / Intestazione Cliente */}
                                    <div className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Referente Cantiere</span>
                                        <span className="text-sm font-black text-stone-900 block mt-0.5">{customerName}</span>
                                    </div>

                                    {/* Numero di Telefono per essere contattati */}
                                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/70">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                                            Numero di Telefono per Contatto
                                        </span>
                                        {customerPhone ? (
                                            <div className="flex items-center justify-between mt-0.5">
                                                <a
                                                    href={`tel:${customerPhone}`}
                                                    className="text-base font-black text-blue-700 hover:text-blue-800 inline-flex items-center gap-1.5"
                                                >
                                                    <Phone size={15} /> {customerPhone}
                                                </a>
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded">
                                                    Reperibile
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-stone-400 mt-0.5 block">
                                                Non specificato (utilizza la Chat PosaFacile)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* PULSANTE WHATSAPP DIRETTO CON MESSAGGIO PRECOMPILATO */}
                                {whatsappUrl ? (
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-extrabold text-sm shadow-xs transition-all flex items-center justify-center gap-2.5"
                                    >
                                        <MessageCircle size={18} className="fill-white" />
                                        Apri Chat WhatsApp con il Cliente
                                        <ExternalLink size={14} className="opacity-75" />
                                    </a>
                                ) : (
                                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-xs text-stone-500">
                                        Numero WhatsApp del cliente non disponibile. Puoi utilizzare la chat integrata a destra per comunicare direttamente.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6 space-y-5">
                                {/* AVVISO DATI PROTETTI */}
                                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Lock size={18} />
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <h4 className="font-extrabold text-amber-900 text-sm">
                                            Recapiti e dati committente protetti
                                        </h4>
                                        <p className="text-amber-800/90 leading-relaxed font-medium">
                                            Per la tutela della privacy, nome e telefono del cliente, il canale WhatsApp e l'indirizzo civico esatto saranno visibili solo dopo che avrai confermato e accettato l'incarico.
                                        </p>
                                    </div>
                                </div>

                                {/* ANTEPRIMA PROTETTA DATI */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Referente Cantiere</span>
                                        <span className="text-sm font-black text-stone-700 block mt-0.5">
                                            Committente
                                        </span>
                                        <span className="text-xs text-amber-700 font-bold block mt-0.5">
                                            {fullCity}
                                        </span>
                                    </div>

                                    <div className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Numero di Telefono</span>
                                        <div className="flex items-center gap-2 mt-1 text-stone-400 text-sm font-mono font-bold">
                                            <Lock size={13} className="text-amber-500" />
                                            <span>+39 3•• •••••••</span>
                                        </div>
                                        <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                                            Sbloccato con l'accettazione
                                        </span>
                                    </div>
                                </div>

                                {/* PULSANTE WHATSAPP BLOCCATO */}
                                <div className="p-3.5 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-center space-y-1">
                                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500">
                                        <MessageCircle size={15} className="text-stone-400" />
                                        <span>Canale Diretto WhatsApp: protetto fino ad accettazione</span>
                                    </div>
                                    <p className="text-[11px] text-stone-400">
                                        All'accettazione potrai avviare istantaneamente la chat WhatsApp con messaggio preimpostato.
                                    </p>
                                </div>

                                {/* CTA Rapida Accetta Incarico dentro la card contatti */}
                                {action && (
                                    <div className="pt-2">
                                        <button
                                            onClick={handleAction}
                                            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-black text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={18} />
                                            Accetta Incarico per Sbloccare Contatti e Indirizzo
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. SCHEDA TECNICA: MATERIALE, METRATURE E LAVORAZIONI */}
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Package size={16} />
                                </div>
                                <h3 className="font-extrabold text-base text-stone-900">Specifiche Tecniche & Lavorazioni</h3>
                            </div>
                            <span className="text-xs font-bold text-stone-800 bg-stone-50 px-2.5 py-0.5 rounded-md border border-stone-200/80">
                                Ambiente: <span className="text-orange-600 capitalize">{ambiente}</span>
                            </span>
                        </div>

                        <div className="p-5 sm:p-6 space-y-5">
                            {/* Materiale Scelto con Miniatura */}
                            <div className="bg-stone-50/70 rounded-2xl p-4 sm:p-5 border border-stone-200/70">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-2.5">
                                    Materiale da Posare
                                </p>
                                <div className="flex items-start gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-400 flex-shrink-0 overflow-hidden shadow-2xs">
                                        {productImg ? (
                                            <img
                                                src={productImg}
                                                alt={productName}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                                            />
                                        ) : (
                                            <Layers size={24} className="text-orange-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-extrabold text-stone-900 text-base leading-snug">
                                            {productName}
                                        </h4>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                            {productFormat && (
                                                <span className="text-[10px] font-bold text-stone-700 bg-white px-2 py-0.5 rounded-md border border-stone-200/80 shadow-2xs">
                                                    {productFormat}
                                                </span>
                                            )}
                                            <span className="text-[10px] font-bold text-stone-700 bg-white px-2 py-0.5 rounded-md border border-stone-200/80 shadow-2xs">
                                                Spessore {productThickness}
                                            </span>
                                            <span className="text-[10px] font-bold text-stone-700 bg-white px-2 py-0.5 rounded-md border border-stone-200/80 shadow-2xs">
                                                {productFinish}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Metrature e Schema di Posa */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                                    Superfici da Lavorare
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Superficie Totale</span>
                                        <span className="text-base font-black text-stone-900 mt-0.5 block">{totalSqm > 0 ? `${totalSqm.toFixed(2)} mq` : 'N/D'}</span>
                                    </div>
                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Pavimento</span>
                                        <span className="text-base font-black text-stone-900 mt-0.5 block">{floorSqm} mq</span>
                                    </div>
                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Pareti</span>
                                        <span className="text-base font-black text-stone-900 mt-0.5 block">{wallSqm} mq</span>
                                    </div>
                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Schema di Posa</span>
                                        <span className="text-xs font-black text-stone-900 mt-0.5 block capitalize truncate">{layingType}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Lavorazioni e Preparazioni Incluse (almeno 3 per riga) */}
                            {services && Object.values(services).some(Boolean) && (
                                <div className="pt-3 border-t border-stone-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                                        Lavorazioni e Preparazioni Richieste al Posatore
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {services.demolizione && (
                                            <div className="flex items-center gap-1.5 text-xs text-stone-800 bg-stone-50 p-2.5 rounded-lg border border-stone-200/70 font-medium">
                                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">Demolizione</span>
                                            </div>
                                        )}
                                        {services.massetto && (
                                            <div className="flex items-center gap-1.5 text-xs text-stone-800 bg-stone-50 p-2.5 rounded-lg border border-stone-200/70 font-medium">
                                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">Nuovo Massetto</span>
                                            </div>
                                        )}
                                        {services.impermeabilizzazione && (
                                            <div className="flex items-center gap-1.5 text-xs text-stone-800 bg-stone-50 p-2.5 rounded-lg border border-stone-200/70 font-medium">
                                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">Impermeabilizzazione</span>
                                            </div>
                                        )}
                                        {services.smaltimento && (
                                            <div className="flex items-center gap-1.5 text-xs text-stone-800 bg-stone-50 p-2.5 rounded-lg border border-stone-200/70 font-medium">
                                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">Smaltimento Macerie</span>
                                            </div>
                                        )}
                                        {services.battiscopa && (
                                            <div className="flex items-center gap-1.5 text-xs text-stone-800 bg-stone-50 p-2.5 rounded-lg border border-stone-200/70 font-medium">
                                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">Posa Battiscopa ({services.battiscopaMetri || 0}m)</span>
                                            </div>
                                        )}
                                        {services.soglie && (
                                            <div className="flex items-center gap-1.5 text-xs text-stone-800 bg-stone-50 p-2.5 rounded-lg border border-stone-200/70 font-medium">
                                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">Posa Soglie ({services.soglieQty || 0} pz)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. LOGISTICA DI SCARICO, PIANO E NOTE SPECIALI */}
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Truck size={16} />
                                </div>
                                <h3 className="font-extrabold text-base text-stone-900">Accesso al Cantiere & Logistica</h3>
                            </div>
                            <span className="text-[11px] font-bold text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/70">
                                Condizioni di Consegna
                            </span>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4">
                            {deliveryAccess ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

                                    <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/60 sm:col-span-2">
                                        <span className="text-stone-400 block text-[10px] font-bold uppercase">Movimentazione Materiale al Piano</span>
                                        <span className="font-bold text-stone-900 mt-0.5 block">
                                            {deliveryAccess.handlingBy === 'pro'
                                                ? 'Inclusa nell\'incarico del posatore (compensata a tariffa)'
                                                : 'A cura del cliente prima dell\'apertura del cantiere'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/60 text-xs text-stone-600">
                                    Accesso standard al piano terra o condizioni logistiche ordinarie.
                                </div>
                            )}

                            {/* Note Speciali Cantiere */}
                            <div className="bg-amber-50/70 p-4 rounded-xl text-amber-900 text-xs sm:text-sm border border-amber-200/70 flex items-start gap-3">
                                <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold text-amber-950">Note fornite per il lavoro</p>
                                    <p className="leading-relaxed text-amber-800">
                                        {job.notes || order?.notes || 'Nessuna nota particolare specificata dal cliente o dall\'ufficio operativo.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. GESTIONE DURATA CANTIERE (CONFERMA / MODIFICA POSATORE) */}
                    {job.status !== 'cancelled' && job.status !== 'completed' && (
                        <div id="conferma-durata">
                            <DurationConfirm job={job} />
                        </div>
                    )}

                    {/* 6. FOTO E DOCUMENTAZIONE DEL CANTIERE */}
                    {job.status !== 'assigned' && job.status !== 'cancelled' && (
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                            <div className="p-6 border-b border-stone-100">
                                <h3 className="text-lg font-bold text-stone-900">Foto e Documentazione Cantiere</h3>
                                <p className="text-xs text-stone-500 mt-0.5">Carica fotografie dello stato d'inizio, avanzamento e collaudo finale</p>
                            </div>
                            <div className="p-6">
                                <PhotoUpload
                                    jobId={job.id}
                                    onUploadComplete={() => { }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================= */}
                {/* COLONNA DESTRA: RIEPILOGO ECONOMICO & CHAT IN TEMPO REALE */}
                {/* ========================================================= */}
                <div className="lg:col-span-1 space-y-6">
                    {/* 1. RIEPILOGO COMPENSO PROFESSIONISTA */}
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden p-6">
                        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-100">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Coins size={16} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base text-stone-900">Compenso Posatore</h3>
                                <p className="text-[11px] text-stone-500">Riepilogo tariffario della manodopera</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm">
                            <div className="flex justify-between text-stone-600">
                                <span>Manodopera Posa ({layingType})</span>
                                <span className="font-bold text-stone-900">€{layingTotal.toFixed(2)}</span>
                            </div>

                            {servicesTotal > 0 && (
                                <div className="flex justify-between text-stone-600">
                                    <span>Lavorazioni & Preparazioni</span>
                                    <span className="font-bold text-stone-900">€{servicesTotal.toFixed(2)}</span>
                                </div>
                            )}

                            {deliveryAccess?.handlingBy === 'pro' && (
                                <div className="flex justify-between text-stone-600">
                                    <span>Trasporto materiale al piano</span>
                                    <span className="font-bold text-emerald-600">Incluso</span>
                                </div>
                            )}

                            <div className="pt-3 border-t border-stone-100 flex justify-between items-baseline">
                                <span className="font-black text-stone-900 text-sm">Totale Netto Manodopera</span>
                                <span className="text-xl font-black text-emerald-600">€{proPayout.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 space-y-1.5">
                            <p className="flex items-center gap-1.5 font-medium text-stone-700">
                                <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
                                Pagamento garantito da PosaFacile
                            </p>
                            <p className="text-stone-400 leading-relaxed">
                                L'importo viene liquidato automaticamente al termine e collaudo positivo del cantiere.
                            </p>
                        </div>
                    </div>

                    {/* 2. CHAT INTEGRATA IN TEMPO REALE (ABILITATA SOLO DOPO ACCETTAZIONE) */}
                    {isJobAccepted ? (
                        <JobChat
                            jobId={job.id}
                            currentUserId={user?.id || ''}
                            proUserId={user?.id || ''}
                            customerUserId={order?.customer_id || null}
                            title="Chat Cantiere & Cliente"
                            subtitle="Comunica con il cliente e il supporto operativo"
                        />
                    ) : (
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden p-6 text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/80">
                                <Lock size={26} />
                            </div>
                            <div className="max-w-xs mx-auto space-y-2">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black uppercase tracking-wider">
                                    <Clock size={12} />
                                    Chat in Attesa
                                </div>
                                <h3 className="text-base font-extrabold text-stone-900">
                                    Chat Cantiere Bloccata
                                </h3>
                                <p className="text-xs text-stone-500 leading-relaxed">
                                    La chat diretta in tempo reale con il cliente e il supporto PosaFacile si sbloccherà automaticamente non appena avrai confermato l'accettazione dell'incarico.
                                </p>
                            </div>

                            {action && (
                                <button
                                    onClick={handleAction}
                                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-black text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    {action.label}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


