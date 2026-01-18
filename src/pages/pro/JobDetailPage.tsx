import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProStore, type JobStatus } from '@/store/proStore'
import { ArrowLeft, MapPin, Calendar, CheckCircle, Play, AlertTriangle } from 'lucide-react'
import { PhotoUpload } from '@/components/pro/jobs/PhotoUpload'
import { JobChat } from '@/components/chat/JobChat'
import { useAuth } from '@/hooks/useAuth'

const STATUS_ACTIONS: Record<JobStatus, { label: string; next: JobStatus; icon: any; color: string } | null> = {
    assigned: { label: 'Accetta Lavoro', next: 'accepted', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
    accepted: { label: 'Inizia Lavoro', next: 'in_progress', icon: Play, color: 'bg-orange-600 hover:bg-orange-700' },
    in_progress: { label: 'Completa Lavoro', next: 'completed', icon: CheckCircle, color: 'bg-blue-600 hover:bg-blue-700' },
    completed: null,
    cancelled: null,
    draft: null,
    pending: null
}

export function JobDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { jobs, fetchJobs, updateJobStatus } = useProStore()
    // In a real app we get the user from auth context. For now, we assume we have a way or pass it.
    // Let's import useAuth actually.
    const { user } = useAuth()


    const job = jobs.find(j => j.id === id)

    useEffect(() => {
        if (jobs.length === 0) fetchJobs()
    }, [fetchJobs, jobs.length])

    if (!job) return <div className="p-8">Caricamento...</div>

    const action = STATUS_ACTIONS[job.status]

    const handleAction = async () => {
        if (!action) return
        await updateJobStatus(job.id, action.next)
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <button onClick={() => navigate('/pro/jobs')} className="flex items-center text-gray-500 hover:text-gray-900">
                <ArrowLeft size={20} className="mr-2" /> Torna alla lista
            </button>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{job.customer_name}</h1>
                            <p className="text-sm text-gray-500">Ordine #{job.order_id.slice(0, 8)}</p>
                        </div>
                        <span className="capitalize px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                            {job.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase">Indirizzo</p>
                                <p className="font-medium text-sm">{job.address || 'Via Roma 1'}, {job.city || 'Milano'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase">Data Programmata</p>
                                <p className="font-medium text-sm">{job.scheduled_date || 'Da concordare'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Note Cliente</h3>
                        <div className="bg-yellow-50 p-4 rounded-xl text-yellow-800 text-sm border border-yellow-100 flex gap-3">
                            <AlertTriangle className="flex-shrink-0 w-5 h-5" />
                            <p>{job.notes || 'Nessuna nota particolare specificata dal cliente.'}</p>
                        </div>
                    </div>

                    {/* Action Button */}
                    {action && (
                        <div className="pt-4 border-t border-gray-100">
                            <button
                                onClick={handleAction}
                                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${action.color}`}
                            >
                                <action.icon size={24} />
                                {action.label}
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-2">
                                Cliccando aggiornerai lo stato del lavoro a "{action.next.replace('_', ' ')}"
                            </p>
                        </div>
                    )}

                    {/* Chat Component */}
                    <div className="pt-6 border-t border-gray-100">
                        <JobChat
                            jobId={job.id}
                            currentUserId={user?.id || ''}
                            title="Chat con Amministrazione"
                        />
                    </div>

                    {/* Photos Section */}
                    {job.status !== 'assigned' && job.status !== 'cancelled' && (
                        <div className="pt-6 border-t border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4">Foto Cantiere</h3>
                            <PhotoUpload
                                jobId={job.id}
                                onUploadComplete={() => {
                                    // Refresh logic could go here, for now just an alert or toast
                                    // fetchJobs() // maybe reload to see logs?
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
