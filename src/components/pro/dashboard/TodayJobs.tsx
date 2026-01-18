import { useEffect } from 'react'
import { MapPin, ArrowRight, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProStore } from '@/store/proStore'
import { isSameDay } from 'date-fns'

export function TodayJobs() {
    const { jobs, fetchJobs } = useProStore()

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    // Filter jobs for today
    const today = new Date()
    const todayJobs = jobs.filter(job =>
        job.scheduled_date && isSameDay(new Date(job.scheduled_date), today)
    )

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Lavori di Oggi</h3>
                <span className="text-sm text-gray-500">{today.toLocaleDateString('it-IT')}</span>
            </div>

            <div className="divide-y divide-gray-100">
                {todayJobs.length > 0 ? (
                    todayJobs.map((job) => (
                        <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-medium text-gray-900">{job.customer_name}</h4>
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                        <MapPin size={14} />
                                        {job.address && job.city ? `${job.address}, ${job.city}` : 'Indirizzo da confermare'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                    <Clock size={14} />
                                    {job.scheduled_date ? new Date(job.scheduled_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-3">
                                <span className={`text-xs font-medium px-2 py-1 rounded ${job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                            job.status === 'accepted' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-600'
                                    }`}>
                                    {job.status === 'completed' ? 'Completato' :
                                        job.status === 'in_progress' ? 'In Corso' :
                                            job.status === 'accepted' ? 'Accettato' :
                                                'Assegnato'}
                                </span>
                                <Link
                                    to={`/pro/jobs/${job.id}`}
                                    className="text-sm font-medium text-orange-600 flex items-center gap-1 hover:text-orange-700"
                                >
                                    Apri cantiere <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        Nessun lavoro programmato per oggi.
                    </div>
                )}
            </div>
        </div>
    )
}
