import { useEffect, useState } from 'react'
import { canCancelOrder, orderStatusColor, orderStatusLabel, type OrderStatus } from '@/lib/orderStatus'
import { Package, Clock, Heart, Settings, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Order {
    id: string
    created_at: string
    order_number: string
    status: OrderStatus
    total: number
    installation_address: any
    installation_professional_id: string
    installation_date: string
    scheduled_time_slot?: string
    professional?: {
        full_name: string
        company_name: string
        first_name?: string
        last_name?: string
    }
}

export function CustomerDashboard() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [orderToCancel, setOrderToCancel] = useState<string | null>(null)

    useEffect(() => {
        if (user) fetchOrders()
    }, [user])

    const fetchOrders = async () => {
        if (!user?.id) return

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    professional:users!professional_id(first_name, last_name)
                `)
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Cast data safely handling potentially null fields from Supabase
            const typedData = (data || []).map((order: any) => ({
                ...order,
                professional: Array.isArray(order.professional) ? order.professional[0] : order.professional
            })) as Order[]

            // Normalize names
            typedData.forEach(order => {
                if (order.professional) {
                    order.professional.full_name = `${order.professional.first_name} ${order.professional.last_name}`.trim()
                }
            })

            setOrders(typedData)
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCancelOrder = async () => {
        if (!orderToCancel) return

        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderToCancel)

        if (error) {
            console.error('Error cancelling order:', error)
            // Keep alert for error fallback or use toast if available
            alert('Errore durante l\'annullamento')
        } else {
            fetchOrders()
            setOrderToCancel(null)
        }
    }

    const getStatusColor = orderStatusColor
    const getStatusLabel = orderStatusLabel

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Il mio account</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Menu */}
                <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-2 bg-gray-100 font-semibold">
                        <Package size={18} /> I miei Ordini
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900">
                        <Clock size={18} /> Preventivi Salvati
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900">
                        <Heart size={18} /> Preferiti
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900">
                        <Settings size={18} /> Impostazioni
                    </Button>
                </div>

                {/* Content */}
                <div className="md:col-span-3">
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-6">Storico Ordini</h2>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">Non hai ancora effettuato ordini</h3>
                                <p className="text-gray-500 mb-6">Esplora il nostro catalogo per trovare le piastrelle perfette per te.</p>
                                <Button onClick={() => navigate('/catalog')}>
                                    Vai al Catalogo
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => {
                                    const isDraft = order.status === 'draft'

                                    return (
                                        <div key={order.id} className="border rounded-xl p-6 hover:shadow-md transition-shadow bg-white relative overflow-hidden">
                                            {isDraft && (
                                                <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-3 py-1 font-medium rounded-bl-lg">
                                                    BOZZA - NON PAGATO
                                                </div>
                                            )}

                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-bold text-lg">{order.order_number}</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)} uppercase`}>
                                                            {getStatusLabel(order.status)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500">
                                                        Ordinato il {format(new Date(order.created_at), 'd MMMM yyyy', { locale: it })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold">€{order.total?.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            <hr className="my-4 border-gray-100" />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                {/* Professional Info */}
                                                {order.professional && (
                                                    <div className="flex items-start gap-2">
                                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-0.5">
                                                            <Package size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">Professionista</p>
                                                            <p className="text-gray-600">{order.professional.full_name}</p>
                                                            {order.professional.company_name && (
                                                                <p className="text-gray-500 text-xs">{order.professional.company_name}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Date Info */}
                                                {order.installation_date && (
                                                    <div className="flex items-start gap-2">
                                                        <div className="bg-purple-50 p-2 rounded-lg text-purple-600 mt-0.5">
                                                            <Calendar size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">Installazione Programmata</p>
                                                            <p className="text-gray-600">
                                                                {format(new Date(order.installation_date), 'd MMMM yyyy', { locale: it })}
                                                            </p>
                                                            {order.scheduled_time_slot && (
                                                                <p className="text-gray-500 text-xs capitalize">
                                                                    Fascia: {order.scheduled_time_slot}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-6 flex justify-end gap-3 flex-wrap">
                                                {canCancelOrder(order.status) && (
                                                    <Button
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => setOrderToCancel(order.id)}
                                                    >
                                                        Annulla
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="outline"
                                                    className="flex items-center gap-2 text-sm"
                                                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                                                >
                                                    Dettagli Ordine
                                                </Button>

                                                {isDraft && (
                                                    <Button
                                                        className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
                                                        onClick={() => navigate(`/checkout/pay/${order.id}`)}
                                                    >
                                                        Concludi Ordine <ChevronRight size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Dialog for cancellation */}
            <Dialog open={!!orderToCancel}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Annulla Preventivo</DialogTitle>
                        <DialogDescription>
                            Sei sicuro di voler annullare questo preventivo? Questa azione non può essere annullata.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 p-6 pt-0">
                        <Button variant="ghost" onClick={() => setOrderToCancel(null)}>
                            Annulla
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleCancelOrder}
                        >
                            Conferma Annullamento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
