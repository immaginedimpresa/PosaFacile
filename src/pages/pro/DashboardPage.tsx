import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatsCards } from '@/components/pro/dashboard/StatsCards'
import { TodayJobs } from '@/components/pro/dashboard/TodayJobs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProStore } from '@/store/proStore'
import {
    HardHat,
    Calendar,
    Hammer,
    MapPin,
    ArrowRight,
    CalendarDays,
    ChevronRight
} from 'lucide-react'
import { format, isAfter } from 'date-fns'
import { it } from 'date-fns/locale'

export function DashboardPage() {
    const { user } = useAuth()
    const { jobs, fetchJobs } = useProStore()
    const [profile, setProfile] = useState<any>(null)

    useEffect(() => {
        fetchProfile()
        fetchJobs()
    }, [user, fetchJobs])

    const fetchProfile = async () => {
        if (!user) return

        const { data } = await supabase
            .from('professional_profiles')
            .select('full_name, company_name, rating, billing_city')
            .eq('id', user.id)
            .single()

        setProfile(data)
    }

    const userName = profile?.full_name || profile?.company_name || user?.email?.split('@')[0] || 'Posatore'

    // Prossimi lavori programmati (esclusi quelli di oggi già visualizzati a sinistra)
    const upcomingJobs = useMemo(() => {
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        return jobs
            .filter(j => j.scheduled_date && isAfter(new Date(j.scheduled_date), todayEnd))
            .sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime())
            .slice(0, 4)
    }, [jobs])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-3">
                            <HardHat className="w-8 h-8 text-orange-500 shrink-0" />
                            <span>Bentornato, {userName}</span>
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Posatore Qualificato</span>
                        </span>
                    </div>
                    <p className="text-sm text-stone-500 mt-1">
                        Pannello posatore: monitora i cantieri attivi, gestisci il calendario e aggiorna la tua disponibilità.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <Link
                        to="/pro/calendar"
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-orange-500/20"
                    >
                        <Calendar size={16} />
                        <span>Imposta Disponibilità</span>
                    </Link>

                    <Link
                        to="/pro/jobs"
                        className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 shadow-md"
                    >
                        <Hammer size={16} />
                        <span>Tutti i Lavori</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <StatsCards />

            {/* Grid Sezioni Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Colonna Sinistra: Lavori di Oggi */}
                <div className="lg:col-span-6">
                    <TodayJobs />
                </div>

                {/* Colonna Destra: Prossimi Cantieri Programmati */}
                <div className="lg:col-span-6">
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col h-full">
                        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <CalendarDays size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-900 text-sm">Prossimi Cantieri</h3>
                                    <p className="text-[11px] text-stone-500">Programmazione dei prossimi giorni</p>
                                </div>
                            </div>
                            <Link
                                to="/pro/calendar"
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                            >
                                <span>Vedi calendario</span>
                                <ChevronRight size={14} />
                            </Link>
                        </div>

                        <div className="divide-y divide-stone-100 flex-1">
                            {upcomingJobs.length > 0 ? (
                                upcomingJobs.map(job => (
                                    <div key={job.id} className="p-5 hover:bg-stone-50/70 transition-colors flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-stone-900">{job.customer_name}</span>
                                                <span className="text-[10px] text-stone-400 font-mono">#{job.order_id.slice(0, 6)}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-stone-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} className="text-stone-400" />
                                                    <span>{job.city || 'Da confermare'}</span>
                                                </span>
                                                <span className="text-stone-300">•</span>
                                                <span className="font-semibold text-stone-700">
                                                    {format(new Date(job.scheduled_date!), 'd MMM yyyy', { locale: it })}
                                                </span>
                                            </div>
                                        </div>

                                        <Link
                                            to={`/pro/jobs/${job.id}`}
                                            className="p-2 rounded-xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50 text-stone-600 hover:text-orange-600 transition-colors shrink-0"
                                            title="Vedi cantiere"
                                        >
                                            <ArrowRight size={15} />
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
                                    <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                                        <Calendar size={24} />
                                    </div>
                                    <p className="font-bold text-stone-900 text-sm">Nessun cantiere futuro fissato</p>
                                    <p className="text-xs text-stone-400 mt-1 max-w-xs">
                                        I nuovi cantieri assegnati dal team PosaFacile compariranno automaticamente qui.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
