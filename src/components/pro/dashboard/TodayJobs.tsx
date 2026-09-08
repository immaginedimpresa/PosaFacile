import { useEffect } from 'react'
import { MapPin, ArrowRight, Clock, CalendarDays, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProStore } from '@/store/proStore'
import { isSameDay } from 'date-fns'

export function TodayJobs() {
    const { jobs, fetchJobs } = useProStore()

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    const today = new Date()
    const todayJobs = jobs.filter(job =>
        job.scheduled_date && isSameDay(new Date(job.scheduled_date), today)
    )

    return (
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <CalendarDays size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-sm">Lavori di Oggi</h3>
                        <p className="text-[11px] text-stone-500">
                            {today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                    {todayJobs.length} {todayJobs.length === 1 ? 'cantiere' : 'cantieri'}
                </span>
            </div>

            <div className="divide-y divide-stone-100 flex-1">
                {todayJobs.length > 0 ? (
                    todayJobs.map((job) => (
                        <div key={job.id} className="p-5 hover:bg-stone-50/70 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-stone-900">{job.customer_name}</h4>
                                    <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-1">
                                        <MapPin size={13} className="text-stone-400" />
                                        <span>{job.address && job.city ? `${job.address}, ${job.city}` : 'Indirizzo da confermare'}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
                                    <Clock size={13} />
                                    <span>{job.scheduled_date ? new Date(job.scheduled_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-stone-50">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    job.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    job.status === 'accepted' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                    'bg-stone-100 text-stone-600 border border-stone-200'
                                }`}>
                                    {job.status === 'completed' ? 'Completato' :
                                     job.status === 'in_progress' ? 'In Corso' :
                                     job.status === 'accepted' ? 'Accettato' :
                                     'Assegnato'}
                                </span>
                                <Link
                                    to={`/pro/jobs/${job.id}`}
                                    className="text-xs font-bold text-orange-600 flex items-center gap-1 hover:text-orange-700 transition-colors"
                                >
                                    <span>Apri cantiere</span>
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-10 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="font-bold text-stone-900 text-sm">Nessun cantiere programmato per oggi</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xs">
                            Consulta la sezione calendario per visualizzare le date future e impostare la tua disponibilità.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
