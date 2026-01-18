import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Users, Briefcase, TrendingUp } from 'lucide-react'


export function AdminDashboard() {
    const [stats, setStats] = useState({
        orders: 0,
        customers: 0,
        professionals: 0,
        revenue: 0
    })

    useEffect(() => {
        async function fetchStats() {
            // In a real app complexity, we might want RPC calls or specific separate queries
            // For this MVP we just do simple counts or use mock data if DB is empty

            const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
            const { count: customersCount } = await supabase.from('customers').select('*', { count: 'exact', head: true })
            const { count: prosCount } = await supabase.from('professionals').select('*', { count: 'exact', head: true })

            // Revenue calculation would require aggregation, let's just mock or query all if small
            const { data: orders } = await supabase.from('orders').select('total')
            const revenue = orders?.reduce((acc, curr: any) => acc + (curr.total || 0), 0) || 0

            setStats({
                orders: ordersCount || 0,
                customers: customersCount || 0,
                professionals: prosCount || 0,
                revenue: revenue
            })
        }

        fetchStats()
    }, [])

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard icon={<Package className="text-blue-600" />} label="Totale Ordini" value={stats.orders} />
                <StatsCard icon={<Users className="text-green-600" />} label="Clienti" value={stats.customers} />
                <StatsCard icon={<Briefcase className="text-orange-600" />} label="Professionisti" value={stats.professionals} />
                <StatsCard icon={<TrendingUp className="text-purple-600" />} label="Fatturato" value={`€ ${stats.revenue.toFixed(2)}`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border rounded-lg p-6 bg-white">
                    <h2 className="text-xl font-bold mb-4">Ordini Recenti</h2>
                    <p className="text-gray-500 text-sm">Nessun ordine recente trovato.</p>
                </div>
                <div className="border rounded-lg p-6 bg-white">
                    <h2 className="text-xl font-bold mb-4">Da Approvare</h2>
                    <p className="text-gray-500 text-sm">Nessun professionista in attesa di approvazione.</p>
                </div>
            </div>
        </div>
    )
}

function StatsCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
    return (
        <div className="p-6 bg-white border rounded-lg shadow-sm flex items-center gap-4">
            <div className="p-3 bg-gray-50 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    )
}
