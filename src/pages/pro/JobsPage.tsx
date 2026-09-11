import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProStore, type JobStatus } from '@/store/proStore'
import {
    Hammer,
    MapPin,
    Calendar,
    ArrowRight,
    Search,
    RefreshCw,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertCircle,
    Coins,
    Layers,
    Sparkles,
    CalendarCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface StatusConfigItem {
    label: string
    badge: string
    hint: string
    color: string
    border: string
    stripeBorder: string
    cardGlow: string
    icon: any
    hasPulse: boolean
    pulseColor: string
    actionText: string
}

const STATUS_CONFIG: Record<JobStatus, StatusConfigItem> = {
    assigned: {
        label: 'Nuovo Incarico Assegnato',
        badge: 'Azione Richiesta',
        hint: 'Nuovo cantiere assegnato: conferma la presa in carico entro 24h per bloccare le date e attivare la chat.',
        color: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/40',
        border: 'border-amber-300',
        stripeBorder: 'border-l-amber-500',
        cardGlow: 'hover:border-amber-400 hover:shadow-amber-500/5',
        icon: AlertCircle,
        hasPulse: true,
        pulseColor: 'bg-amber-500',
        actionText: 'Esamina e Accetta Incarico'
    },
    accepted: {
        label: 'Incarico Confermato',
        badge: 'Programmato',
        hint: 'Data di inizio fissata. All\'arrivo in cantiere clicca per notificare l\'avvio effettivo dei lavori.',
        color: 'bg-blue-50 text-blue-900 border-blue-300',
        border: 'border-blue-300',
        stripeBorder: 'border-l-blue-500',
        cardGlow: 'hover:border-blue-400 hover:shadow-blue-500/5',
        icon: CalendarCheck,
        hasPulse: false,
        pulseColor: 'bg-blue-500',
        actionText: 'Apri Scheda Cantiere'
    },
    in_progress: {
        label: 'Cantiere in Corso',
        badge: 'Lavori Attivi',
        hint: 'Posa attualmente in esecuzione. Ultimati i lavori, chiudi il cantiere con collaudo per avviare la liquidazione.',
        color: 'bg-orange-50 text-orange-900 border-orange-300 ring-1 ring-orange-400/30',
        border: 'border-orange-300',
        stripeBorder: 'border-l-orange-500',
        cardGlow: 'hover:border-orange-400 hover:shadow-orange-500/5',
        icon: Hammer,
        hasPulse: true,
        pulseColor: 'bg-orange-500',
        actionText: 'Gestisci Cantiere'
    },
    completed: {
        label: 'Cantiere Chiuso',
        badge: 'Completato',
        hint: 'Lavori conclusi con successo e collaudo confermato.',
        color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        border: 'border-emerald-300',
        stripeBorder: 'border-l-emerald-500',
        cardGlow: 'hover:border-emerald-400 hover:shadow-emerald-500/5',
        icon: CheckCircle2,
        hasPulse: false,
        pulseColor: 'bg-emerald-500',
        actionText: 'Vedi Riepilogo'
    },
    cancelled: {
        label: 'Incarico Annullato',
        badge: 'Annullato',
        hint: 'Questo cantiere è stato annullato.',
        color: 'bg-rose-50 text-rose-800 border-rose-200',
        border: 'border-rose-200',
        stripeBorder: 'border-l-rose-400',
        cardGlow: 'hover:border-rose-300',
        icon: AlertCircle,
        hasPulse: false,
        pulseColor: 'bg-rose-400',
        actionText: 'Dettagli Annullamento'
    },
    draft: {
        label: 'In Attesa Pagamento Cliente',
        badge: 'Preventivo Bozza',
        hint: 'Il cliente sta completando il pagamento dell\'acconto per confermare la prenotazione.',
        color: 'bg-stone-100 text-stone-800 border-stone-300',
        border: 'border-stone-300',
        stripeBorder: 'border-l-stone-400',
        cardGlow: 'hover:border-stone-400',
        icon: Clock,
        hasPulse: false,
        pulseColor: 'bg-stone-400',
        actionText: 'Vedi Scheda Bozza'
    },
    pending: {
        label: 'In Valutazione',
        badge: 'In Verifica',
        hint: 'Cantiere in fase di validazione tecnica.',
        color: 'bg-amber-50 text-amber-800 border-amber-300',
        border: 'border-amber-300',
        stripeBorder: 'border-l-amber-400',
        cardGlow: 'hover:border-amber-300',
        icon: Clock,
        hasPulse: false,
        pulseColor: 'bg-amber-400',
        actionText: 'Vedi Dettagli'
    }
}

export function JobsPage() {
    const { jobs, loading, fetchJobs } = useProStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'completed'>('all')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchJobs()
        setRefreshing(false)
    }

    // KPI Metrics
    const kpiMetrics = useMemo(() => {
        const totalCount = jobs.length
        const newCount = jobs.filter(j => j.status === 'assigned' || j.status === 'accepted').length
        const inProgressCount = jobs.filter(j => j.status === 'in_progress').length
        const completedCount = jobs.filter(j => j.status === 'completed').length

        return {
            totalCount,
            newCount,
            inProgressCount,
            completedCount
        }
    }, [jobs])

    // Filtered jobs
    const filteredJobs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        return jobs.filter(job => {
            // Status filter
            if (statusFilter === 'new' && job.status !== 'assigned' && job.status !== 'accepted') return false
            if (statusFilter === 'in_progress' && job.status !== 'in_progress') return false
            if (statusFilter === 'completed' && job.status !== 'completed') return false

            // Search filter
            if (!q) return true
            return [job.customer_name, job.city, job.address, job.order_id]
                .some(field => field?.toLowerCase().includes(q))
        })
    }, [jobs, searchTerm, statusFilter])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Hammer className="w-8 h-8 text-orange-500" />
                        <span>Commesse</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Monitora tutti i lavori di posa assegnati, aggiorna lo stato dei cantieri e apri la chat con i clienti.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Ricarica elenco"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Totale Cantieri */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Hammer size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Totale Cantieri
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.totalCount}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                            Storico posatore
                        </div>
                    </div>
                </div>

                {/* 2. Nuovi da Iniziare */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Da Iniziare
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.newCount}
                        </div>
                        <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                            Assegnati o accettati
                        </div>
                    </div>
                </div>

                {/* 3. In Corso */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            In Lavorazione
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.inProgressCount}
                        </div>
                        <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                            Cantiere attualmente aperto
                        </div>
                    </div>
                </div>

                {/* 4. Completati */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Completati
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.completedCount}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                            Chiusi con successo
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar Ricerca & Filtri Stato */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Campo Ricerca */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
                        <input
                            type="text"
                            placeholder="Cerca per cliente, città, indirizzo o ordine..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50"
                        />
                    </div>

                    {/* Filtro Stato Pillole */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'all'
                                ? 'bg-orange-500 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            Tutti ({jobs.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('new')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'new'
                                ? 'bg-orange-500 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            Da Iniziare ({kpiMetrics.newCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('in_progress')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'in_progress'
                                ? 'bg-orange-500 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            In Corso ({kpiMetrics.inProgressCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('completed')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'completed'
                                ? 'bg-orange-500 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            Completati ({kpiMetrics.completedCount})
                        </button>
                    </div>
                </div>
            </div>

            {/* Content List / Empty State */}
            {loading && jobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-16 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold text-stone-500 mt-4">Caricamento cantieri...</p>
                </div>
            ) : filteredJobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
                        <Hammer size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1">Nessun cantiere trovato</h3>
                    <p className="text-sm text-stone-500 max-w-md mx-auto">
                        {searchTerm || statusFilter !== 'all'
                            ? 'Nessun lavoro corrisponde ai filtri di ricerca applicati.'
                            : 'Non hai ancora cantieri assegnati. Il team di PosaFacile ti notificherà le nuove assegnazioni.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredJobs.map((job) => {
                        const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.assigned
                        const StatusIcon = config.icon

                        // Economic metrics for the professional
                        const layingTotal = Number(job.laying_total ?? job.order?.laying_total ?? 0)
                        const servicesTotal = Number(job.services_total ?? job.order?.services_total ?? 0)
                        const proPayout = Number(job.payout ?? job.order?.professional_payout ?? (layingTotal + servicesTotal))

                        // Technical specs
                        const floorSqm = Number(job.order?.floor_sqm || 0)
                        const wallSqm = Number(job.order?.wall_sqm || 0)
                        const totalSqm = floorSqm + wallSqm
                        const layingType = job.order?.laying_type || null
                        const projectType = job.order?.project_type || null

                        // Customer info & fallbacks
                        const customerDisplay = job.customer_name && job.customer_name !== 'Cliente'
                            ? job.customer_name
                            : (job.city ? `Committente (${job.city})` : 'Cliente Privato')
                        const customerPhone = job.customer_phone || (typeof job.order?.installation_address === 'object' ? (job.order.installation_address?.phone || job.order.installation_address?.contact_phone || job.order.installation_address?.telephone) : null)
                        const initial = customerDisplay.charAt(0).toUpperCase() || 'C'
                        const orderNum = job.order_number || (job.order_id ? `#${job.order_id.slice(0, 8)}` : '')

                        return (
                            <div
                                key={job.id}
                                className={`bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-md transition-all relative overflow-hidden group border-l-4 ${config.stripeBorder} ${config.cardGlow}`}
                            >
                                <div className="p-5 sm:p-6 space-y-4">
                                    {/* Top Status Bar: Status Pill + Pulsing beacon + Operational Badges + Scheduled Date */}
                                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Visual Status Signal Pill */}
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-2xs ${config.color}`}>
                                                {config.hasPulse && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pulseColor}`}></span>
                                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulseColor}`}></span>
                                                    </span>
                                                )}
                                                <StatusIcon size={13} className="shrink-0" />
                                                <span>{config.label}</span>
                                            </span>

                                            {/* Action Required Badge if assigned */}
                                            {job.status === 'assigned' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-2xs animate-pulse">
                                                    <Sparkles size={11} />
                                                    <span>Azione Richiesta</span>
                                                </span>
                                            )}
                                            {job.status === 'in_progress' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500 text-white shadow-2xs">
                                                    <span>Lavori in Corso</span>
                                                </span>
                                            )}

                                            {/* Order Code */}
                                            <span className="text-xs text-stone-400 font-mono bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200/70">
                                                {orderNum}
                                            </span>
                                        </div>

                                        {/* Scheduled Date */}
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 px-3 py-1 rounded-full">
                                            <Calendar size={13} className="text-orange-500 shrink-0" />
                                            <span>
                                                {job.scheduled_date
                                                    ? `Inizio: ${format(new Date(job.scheduled_date), 'd MMMM yyyy', { locale: it })}`
                                                    : 'Data da concordare'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle Section: Customer Details + Specs + Financial Net Payout Box */}
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
                                        {/* Customer and Work Specs */}
                                        <div className="space-y-2.5 flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 text-stone-700 font-bold flex items-center justify-center text-sm shrink-0 border border-stone-200 shadow-2xs">
                                                    {initial}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                                                            {customerDisplay}
                                                        </h3>
                                                        {customerPhone && (
                                                            <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                                                {customerPhone}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                                                        <MapPin size={13} className="text-stone-400 shrink-0" />
                                                        <span>{job.city || 'Milano'}, {job.address || 'Via Roma 1'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Badges for Metratura, Tipo Posa, Ambiente */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {totalSqm > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                                        <Layers size={12} className="text-stone-500" />
                                                        <span>{totalSqm} m² Totali</span>
                                                        {floorSqm > 0 && wallSqm > 0 && (
                                                            <span className="text-stone-400 text-[10px]">({floorSqm} pav + {wallSqm} par)</span>
                                                        )}
                                                    </span>
                                                )}
                                                {layingType && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                                        <Hammer size={12} className="text-orange-500" />
                                                        <span>{layingType}</span>
                                                    </span>
                                                )}
                                                {projectType && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                                        <span>Ambiente: {projectType}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Section: Payout Box and CTA */}
                                        <div className="flex items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                                            {/* Compenso Netto Box */}
                                            {proPayout > 0 && (
                                                <div className="bg-stone-50 border border-stone-200/90 rounded-xl px-4 py-2 text-right">
                                                    <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 flex items-center justify-end gap-1">
                                                        <Coins size={12} className="text-emerald-600" />
                                                        <span>Compenso Netto</span>
                                                    </div>
                                                    <div className="text-lg sm:text-xl font-black text-stone-900 leading-tight">
                                                        €{proPayout.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="text-[10px] text-emerald-700 font-semibold">
                                                        Garantito da PosaFacile
                                                    </div>
                                                </div>
                                            )}

                                            {/* Primary Action Button */}
                                            <Link
                                                to={`/pro/jobs/${job.id}`}
                                                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
                                                    job.status === 'assigned'
                                                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25 ring-2 ring-orange-500/20'
                                                        : 'bg-stone-900 hover:bg-black text-white shadow-stone-900/10'
                                                }`}
                                            >
                                                <span>{config.actionText}</span>
                                                <ArrowRight size={16} />
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Bottom Operational Status Cue Banner */}
                                    <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs ${
                                        job.status === 'assigned'
                                            ? 'bg-amber-500/10 border border-amber-300 text-amber-900'
                                            : job.status === 'in_progress'
                                            ? 'bg-orange-500/10 border border-orange-300 text-orange-900'
                                            : job.status === 'accepted'
                                            ? 'bg-blue-500/10 border border-blue-200 text-blue-900'
                                            : 'bg-stone-50 border border-stone-200/80 text-stone-600'
                                    }`}>
                                        <StatusIcon size={14} className="shrink-0" />
                                        <span className="font-medium">
                                            {config.hint}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
