import { useEffect, useState } from 'react'
import { StatsCards } from '@/components/pro/dashboard/StatsCards'
import { TodayJobs } from '@/components/pro/dashboard/TodayJobs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function DashboardPage() {
    const { user } = useAuth()
    const [userName, setUserName] = useState('')

    useEffect(() => {
        fetchUserName()
    }, [user])

    const fetchUserName = async () => {
        if (!user) return

        const { data } = await supabase
            .from('professional_profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        setUserName(data?.full_name || user.email?.split('@')[0] || 'Professionista')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Bentornato, {userName} 👋</h1>
                <p className="text-gray-500">Ecco il riepilogo della tua giornata</p>
            </div>

            <StatsCards />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TodayJobs />

                {/* Future Components: Recent Activity or Calendar Preview */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center text-gray-400 min-h-[300px]">
                    Calendario o Attività Recenti (Coming Soon)
                </div>
            </div>
        </div>
    )
}
