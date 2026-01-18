import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, CheckCircle, MapPin, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { JobChat } from '@/components/chat/JobChat'
import { useAuth } from '@/hooks/useAuth'

// Types
interface Order {
    id: string
    created_at: string
    total_amount: number
    status: string
    shipping_address: {
        city: string
        address: string
    }
    jobs?: { id: string, professional_id: string }[]
}

interface Professional {
    id: string
    company_name: string
    rating: number
}

export function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [loading, setLoading] = useState(true)
    const [assigningOrder, setAssigningOrder] = useState<string | null>(null)
    const [selectedPro, setSelectedPro] = useState<string>('')
    const [chatJobId, setChatJobId] = useState<string | null>(null)
    const { user } = useAuth()
    const currentUserId = user?.id || ''

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Orders with nested Jobs
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*, jobs(id, professional_id)')
                .order('created_at', { ascending: false })

            if (ordersError) throw ordersError

            // Fetch Professionals for the dropdown
            const { data: prosData, error: prosError } = await supabase
                .from('professional_profiles')
                .select('id, company_name, rating')
                .eq('verified', true)

            if (prosError) throw prosError

            setOrders(ordersData as any)
            setProfessionals(prosData as any)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAssign = async () => {
        if (!assigningOrder || !selectedPro) return

        try {
            const { error } = await supabase
                .from('jobs')
                .insert({
                    order_id: assigningOrder,
                    professional_id: selectedPro,
                    status: 'assigned',
                    scheduled_date: null,
                    notes: 'Assegnato dall\'amministratore'
                })

            if (error) throw error

            setAssigningOrder(null)
            setSelectedPro('')
            fetchData()
            alert('Ordine assegnato con successo!')
        } catch (error) {
            console.error('Error assigning job:', error)
            alert('Errore durante l\'assegnazione')
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 p-6"
        >
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Gestione Ordini & Assegnazioni</h1>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">ID Ordine</th>
                            <th className="px-6 py-4">Cliente / Indirizzo</th>
                            <th className="px-6 py-4">Totale</th>
                            <th className="px-6 py-4">Stato</th>
                            <th className="px-6 py-4">Assegnazione Pro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Caricamento...</td></tr>
                        ) : (
                            <AnimatePresence>
                                {orders.map((order) => {
                                    const isAssigned = order.jobs && order.jobs.length > 0
                                    const isAssigningThis = assigningOrder === order.id

                                    return (
                                        <motion.tr
                                            key={order.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-gray-50/50"
                                        >
                                            <td className="px-6 py-4 font-mono text-gray-500">#{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-gray-900">
                                                    <MapPin size={14} className="text-gray-400" />
                                                    {order.shipping_address?.city}, {order.shipping_address?.address}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium">€{order.total_amount}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <AnimatePresence mode="wait">
                                                    {isAssigned ? (
                                                        <motion.div
                                                            key="assigned"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="flex items-center gap-2 text-green-600 font-medium"
                                                        >
                                                            <CheckCircle size={16} />
                                                            Già Assegnato
                                                        </motion.div>
                                                    ) : isAssigningThis ? (
                                                        <motion.div
                                                            key="assigning"
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: 20 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <select
                                                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-48"
                                                                value={selectedPro}
                                                                onChange={(e) => setSelectedPro(e.target.value)}
                                                            >
                                                                <option value="">Seleziona Pro...</option>
                                                                {professionals.map(p => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.company_name} (★{p.rating})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={handleAssign}
                                                                disabled={!selectedPro}
                                                                className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                OK
                                                            </motion.button>
                                                            <button
                                                                onClick={() => setAssigningOrder(null)}
                                                                className="text-gray-400 hover:text-gray-600"
                                                            >
                                                                X
                                                            </button>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.button
                                                            key="assign_btn"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setAssigningOrder(order.id)}
                                                            className="flex items-center gap-1 text-orange-600 font-medium hover:text-orange-800"
                                                        >
                                                            <UserPlus size={16} />
                                                            Assegna
                                                        </motion.button>
                                                    )}
                                                </AnimatePresence>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Admin Chat Dialog */}
            <AnimatePresence>
                {chatJobId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl h-[600px] flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">Chat Ordine</h2>
                                <button onClick={() => setChatJobId(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden p-4 bg-gray-50">
                                {/* We retrieve current admin user ID dynamically or from context */}
                                {/* For simple MVP, assume we have a user from useAuth hook or similar */}
                                {/* I'll add useAuth hook usage at top */}
                                <JobChat jobId={chatJobId} currentUserId={currentUserId} title="" />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
