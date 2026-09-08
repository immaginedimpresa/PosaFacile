import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProStore, type JobStatus } from '@/store/proStore'
import { ArrowLeft, MapPin, Calendar, CheckCircle, Play, AlertTriangle, Hammer, User, Clock } from 'lucide-react'
import { PhotoUpload } from '@/components/pro/jobs/PhotoUpload'
import { DurationConfirm } from '@/components/pro/jobs/DurationConfirm'
import { JobChat } from '@/components/chat/JobChat'
import { useAuth } from '@/hooks/useAuth'

const STATUS_ACTIONS: Record<JobStatus, { label: string; next: JobStatus; icon: any; color: string } | null> = {
    assigned: { label: 'Accetta Incarico', next: 'accepted', icon: CheckCircle, color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' },
    accepted: { label: 'Inizia Lavoro nel Cantiere', next: 'in_progress', icon: Play, color: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' },
    in_progress: { label: 'Completa e Chiudi Cantiere', next: 'completed', icon: CheckCircle, color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' },
    completed: null,
    cancelled: null,
    draft: null,
    pending: null
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
    assigned: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/80', label: 'Assegnato' },
    accepted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80', label: 'Accettato' },
    in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200/80', label: 'In Lavorazione' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80', label: 'Completato' },
    cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80', label: 'Annullato' },
}

export function JobDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { jobs, fetchJobs, updateJobStatus } = useProStore()
    const { user } = useAuth()

    const job = jobs.find(j => j.id === id)

    useEffect(() => {
        if (jobs.length === 0) fetchJobs()
    }, [fetchJobs, jobs.length])

    if (!job) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-6 h-6 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Caricamento Cantiere...</h2>
                <p className="text-stone-500 text-sm mt-1">Stiamo recuperando i dettagli del lavoro assegnato.</p>
            </div>
        )
    }

    const action = STATUS_ACTIONS[job.status]
    const statusMeta = STATUS_STYLES[job.status] || {
        bg: 'bg-stone-100',
        text: 'text-stone-700',
        border: 'border-stone-200',
        label: job.status.replace('_', ' ')
    }

    const handleAction = async () => {
        if (!action) return
        await updateJobStatus(job.id, action.next)
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/pro/jobs')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 rounded-xl border border-stone-200/90 shadow-2xs transition-all active:scale-95"
                >
                    <ArrowLeft size={16} className="text-stone-500" />
                    Torna a Tutti i Lavori
                </button>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                    {statusMeta.label}
                </span>
            </div>

            {/* Main Header & Overview Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-stone-100 bg-stone-50/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                                <Hammer className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                                        Ordine #{job.order_id ? job.order_id.slice(0, 8) : 'N/D'}
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
                                    {job.customer_name || 'Cliente'}
                                </h1>
                                <p className="text-stone-500 text-sm mt-0.5">
                                    Scheda operativa per l'esecuzione della posa in opera
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Quick Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="flex items-center gap-3.5 bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                                <MapPin size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">Luogo Cantiere</p>
                                <p className="font-bold text-sm text-stone-900 truncate">
                                    {job.address || 'Indirizzo da confermare'}
                                </p>
                                <p className="text-xs text-stone-500 truncate">{job.city || 'Città'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                                <Calendar size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">Data Inizio Prevista</p>
                                <p className="font-bold text-sm text-stone-900">
                                    {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Da concordare'}
                                </p>
                                <p className="text-xs text-stone-500">Concordata con cliente</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                                <User size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">Referente Cliente</p>
                                <p className="font-bold text-sm text-stone-900 truncate">{job.customer_name || 'N/A'}</p>
                                <p className="text-xs text-stone-500 truncate">Contatto tramite chat</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-8 space-y-6">
                    {/* Customer Notes */}
                    <div>
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Note Speciali e Istruzioni Cantiere</h3>
                        <div className="bg-amber-50/70 p-4 rounded-2xl text-amber-900 text-sm border border-amber-200/70 flex items-start gap-3">
                            <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold text-amber-950">Indicazioni fornite per questo lavoro</p>
                                <p className="leading-relaxed text-amber-800">
                                    {job.notes || 'Nessuna nota particolare specificata dal cliente o dall\'amministrazione.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Step Button */}
                    {action && (
                        <div className="pt-4 border-t border-stone-100">
                            <button
                                onClick={handleAction}
                                className={`w-full py-4 px-6 rounded-xl text-white font-black text-base shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${action.color}`}
                            >
                                <action.icon size={22} className="stroke-[2.5]" />
                                {action.label}
                            </button>
                            <p className="text-center text-xs text-stone-400 font-medium mt-2.5">
                                Cliccando aggiornerai lo stato del cantiere ad operazione confermata
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Giornate di cantiere: il posatore conferma o corregge la stima */}
            {job.status !== 'cancelled' && job.status !== 'completed' && (
                <DurationConfirm job={job} />
            )}

            {/* Chat with Admin / Customer Section */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                    <h3 className="text-lg font-bold text-stone-900">Comunicazioni & Assistenza</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Canale di messaggistica diretto con l'ufficio operativo</p>
                </div>
                <div className="p-6">
                    <JobChat
                        jobId={job.id}
                        currentUserId={user?.id || ''}
                        title="Canale Ufficio Operativo & Assistenza"
                    />
                </div>
            </div>

            {/* Photos and Inspection Uploads */}
            {job.status !== 'assigned' && job.status !== 'cancelled' && (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-stone-100">
                        <h3 className="text-lg font-bold text-stone-900">Foto e Documentazione Cantiere</h3>
                        <p className="text-xs text-stone-500 mt-0.5">Carica fotografie dello stato d'inizio, avanzamento e collaudo finale</p>
                    </div>
                    <div className="p-6">
                        <PhotoUpload
                            jobId={job.id}
                            onUploadComplete={() => {}}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

