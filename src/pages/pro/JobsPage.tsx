import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProStore, type JobStatus } from '@/store/proStore'
import { MapPin, Calendar, ArrowRight, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const STATUS_COLORS: Record<JobStatus, string> = {
    assigned: 'bg-blue-50 text-blue-700 border-blue-100',
    accepted: 'bg-purple-50 text-purple-700 border-purple-100',
    in_progress: 'bg-orange-50 text-orange-700 border-orange-100',
    completed: 'bg-green-50 text-green-700 border-green-100',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
    draft: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
}

const STATUS_LABELS: Record<JobStatus, string> = {
    assigned: 'Nuovo',
    accepted: 'Accettato',
    in_progress: 'In Corso',
    completed: 'Completato',
    cancelled: 'Annullato',
    draft: 'Bozza',
    pending: 'In Attesa',
}

export function JobsPage() {
    const { jobs, loading, fetchJobs } = useProStore()

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    if (loading && jobs.length === 0) {
        return <div className="p-8 text-center text-gray-500">Caricamento lavori...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">I miei Lavori</h1>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                    {jobs.length} totali
                </span>
            </div>

            {jobs.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Nessun lavoro assegnato</h3>
                    <p className="text-gray-500 mt-1">Non hai ancora lavori programmati. Attendi nuove assegnazioni.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map((job) => {
                        const isDraft = job.status === 'draft' || job.status === 'pending'
                        return (
                            <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all relative overflow-hidden">
                                {isDraft && (
                                    <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-3 py-1 font-bold rounded-bl-lg z-10">
                                        Da finalizzare pagamento per conferma
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {STATUS_LABELS[job.status] || job.status}
                                            </span>
                                            <span className="text-sm text-gray-400">#{job.order_id.slice(0, 8)}</span>
                                        </div>

                                        <h3 className="text-lg font-semibold text-gray-900">{job.customer_name}</h3>

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={16} />
                                                {job.city || 'Milano'}, {job.address || 'Via Roma 1'}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={16} />
                                                {job.scheduled_date ? format(new Date(job.scheduled_date), 'd MMMM yyyy', { locale: it }) : 'Data da definire'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        {!isDraft && (
                                            <Link
                                                to={`/pro/jobs/${job.id}`}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors w-full md:w-auto"
                                            >
                                                Dettagli
                                                <ArrowRight size={16} />
                                            </Link>
                                        )}
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
