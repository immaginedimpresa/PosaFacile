import { useEffect, useState, useMemo } from 'react'
import { useProStore } from '@/store/proStore'
import { TrendingUp, CheckCircle2, Clock, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function StatsCards() {
    const { jobs } = useProStore()
    const [profile, setProfile] = useState<any>(null)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('professional_profiles')
            .select('rating')
            .eq('id', user.id)
            .single()

        setProfile(data)
    }

    const completedJobs = useMemo(() => jobs.filter(j => j.status === 'completed').length, [jobs])
    const inProgressJobs = useMemo(() => jobs.filter(j => j.status === 'in_progress').length, [jobs])
    const assignedJobs = useMemo(() => jobs.filter(j => j.status === 'assigned' || j.status === 'accepted').length, [jobs])
    const rating = profile?.rating || 0

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* 1. Lavori In Corso */}
            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <TrendingUp size={22} />
                </div>
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Lavori In Corso
                    </div>
                    <div className="text-2xl font-black text-stone-900 mt-0.5">
                        {inProgressJobs}
                    </div>
                    <div className="text-[11px] text-orange-600 font-semibold mt-0.5">
                        Cantieri aperti
                    </div>
                </div>
            </div>

            {/* 2. Da Iniziare / Nuovi */}
            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock size={22} />
                </div>
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        In Programmazione
                    </div>
                    <div className="text-2xl font-black text-stone-900 mt-0.5">
                        {assignedJobs}
                    </div>
                    <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                        Assegnati o accettati
                    </div>
                </div>
            </div>

            {/* 3. Completati */}
            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                </div>
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Completati
                    </div>
                    <div className="text-2xl font-black text-stone-900 mt-0.5">
                        {completedJobs}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        Posati con successo
                    </div>
                </div>
            </div>

            {/* 4. Valutazione Posatore */}
            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                    <Star size={22} className="fill-amber-400" />
                </div>
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Valutazione Media
                    </div>
                    <div className="text-2xl font-black text-stone-900 mt-0.5 flex items-center gap-1.5">
                        <span>{rating > 0 ? rating.toFixed(1) : '5.0'}</span>
                        <span className="text-xs font-semibold text-stone-400">/ 5.0</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                        Feedback clienti PosaFacile
                    </div>
                </div>
            </div>
        </div>
    )
}
