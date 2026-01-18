import { useEffect, useState } from 'react'
import { useProStore } from '@/store/proStore'
import { TrendingUp, CheckCircle, Clock, Star } from 'lucide-react'
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

    // Calculate real stats from jobs
    const completedJobs = jobs.filter(j => j.status === 'completed').length
    const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length
    const rating = profile?.rating || 0

    const stats = [
        {
            label: 'Lavori Attivi',
            value: inProgressJobs.toString(),
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50'
        },
        {
            label: 'Completati',
            value: completedJobs.toString(),
            icon: CheckCircle,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            label: 'Totali',
            value: jobs.length.toString(),
            icon: Clock,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
        {
            label: 'Rating',
            value: rating.toFixed(1),
            icon: Star,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50'
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                    <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <Icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                    </div>
                )
            })}
        </div>
    )
}
