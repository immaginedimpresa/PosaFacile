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
    TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; border: string }> = {
    assigned: { label: 'Nuovo Assegnato', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
    accepted: { label: 'Accettato', color: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
    in_progress: { label: 'In Corso', color: 'bg-orange-50 text-orange-700', border: 'border-orange-200' },
    completed: { label: 'Completato', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
    cancelled: { label: 'Annullato', color: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
    draft: { label: 'In Attesa Pagamento', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
    pending: { label: 'In Valutazione', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
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
                        <span>I miei Cantieri e Lavori</span>
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'all'
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            Tutti ({jobs.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('new')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'new'
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            Da Iniziare ({kpiMetrics.newCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('in_progress')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'in_progress'
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            In Corso ({kpiMetrics.inProgressCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('completed')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'completed'
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
                        const isDraft = job.status === 'draft' || job.status === 'pending'
                        const config = STATUS_CONFIG[job.status] || {
                            label: job.status,
                            color: 'bg-stone-100 text-stone-700',
                            border: 'border-stone-200'
                        }

                        return (
                            <div
                                key={job.id}
                                className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:border-orange-300 hover:shadow-md transition-all relative overflow-hidden group"
                            >
                                {isDraft && (
                                    <div className="absolute top-0 right-0 bg-amber-100 text-amber-900 text-[10px] uppercase tracking-wider px-3 py-1 font-bold rounded-bl-xl z-10 border-b border-l border-amber-200">
                                        In attesa pagamento cliente
                                    </div>
                                )}

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.color} ${config.border}`}>
                                                {config.label}
                                            </span>
                                            <span className="text-xs text-stone-400 font-mono">
                                                Ordine #{job.order_id.slice(0, 8)}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                                            {job.customer_name}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-stone-400" />
                                                <span>{job.city || 'Milano'}, {job.address || 'Via Roma 1'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-stone-400" />
                                                <span>
                                                    {job.scheduled_date
                                                        ? format(new Date(job.scheduled_date), 'd MMMM yyyy', { locale: it })
                                                        : 'Data da concordare'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center shrink-0">
                                        <Link
                                            to={`/pro/jobs/${job.id}`}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 w-full md:w-auto cursor-pointer"
                                        >
                                            <span>Apri Scheda Cantiere</span>
                                            <ArrowRight size={15} />
                                        </Link>
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
