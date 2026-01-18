import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { ArrowLeft, MapPin, Calendar, Clock, User, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderDetail {
    id: string
    created_at: string
    order_number: string
    status: 'draft' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
    total: number
    installation_address: any
    installation_date: string
    scheduled_time_slot?: string
    professional?: {
        full_name: string
        company_name: string
        email: string
        phone: string
        first_name?: string
        last_name?: string
    }
    items?: any[] // JSONB items if stored
}

export function CustomerOrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [order, setOrder] = useState<OrderDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id && user) fetchOrder()
    }, [id, user])

    const fetchOrder = async () => {
        if (!id || !user?.id) return

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    professional:users!professional_id(first_name, last_name, email, phone)
                `)
                .eq('id', id)
                .eq('customer_id', user.id) // Security check
                .single()

            if (error) throw error

            // Cast to handle array vs object response for relation
            const typedData = {
                ...data,
                professional: Array.isArray(data.professional) ? data.professional[0] : data.professional
            } as any

            // Normalize name
            if (typedData.professional) {
                typedData.professional.full_name = `${typedData.professional.first_name} ${typedData.professional.last_name}`
            }

            setOrder(typedData)
        } catch (error) {
            console.error('Error fetching order:', error)
            navigate('/dashboard') // Redirect if error/not found
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'confirmed': return 'bg-blue-100 text-blue-800'
            case 'completed': return 'bg-green-100 text-green-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'In Attesa'
            case 'confirmed': return 'Confermato'
            case 'completed': return 'Completato'
            case 'cancelled': return 'Annullato'
            default: return status
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            </div>
        )
    }

    if (!order) return null

    return (
        <div className="container mx-auto px-4 py-8">
            <Button
                variant="ghost"
                className="mb-6 pl-0 hover:pl-2 transition-all gap-2"
                onClick={() => navigate('/dashboard')}
            >
                <ArrowLeft size={20} /> Torna ai miei ordini
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        Ordine {order.order_number}
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)} uppercase`}>
                            {getStatusLabel(order.status)}
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Effettuato il {format(new Date(order.created_at), 'd MMMM yyyy, HH:mm', { locale: it })}
                    </p>
                </div>
                {/* Actions (Future implementation: Invoice download, etc.) */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Order Items Details */}
                    {order.items && order.items.map((item: any, index: number) => (
                        <div key={index} className="bg-white border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-orange-600">
                                <Package size={24} />
                                <h3 className="font-semibold text-gray-900 text-lg">Dettagli Preventivo</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Product & Dimensions */}
                                <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Prodotto Scelto</p>
                                        <p className="font-medium">{item.product?.name}</p>
                                        <p className="text-xs text-gray-400">€{item.product?.price_per_sqm} / mq</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Superficie Totale</p>
                                        <p className="font-medium">
                                            {((item.dimensions?.pavimentoMq || 0) + (item.dimensions?.paretiMq || 0)).toFixed(2)} mq
                                        </p>
                                        <div className="text-xs text-gray-400 flex gap-2">
                                            <span>Pav: {item.dimensions?.pavimentoMq} mq</span>
                                            <span>Par: {item.dimensions?.paretiMq} mq</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Tipo di Posa</p>
                                        <p className="font-medium capitalize">{item.laying_type || item.layingType || 'Standard'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Ambiente</p>
                                        <p className="font-medium capitalize">{item.projectInfo?.ambiente || '-'}</p>
                                    </div>
                                </div>

                                {/* Services */}
                                {item.services && Object.values(item.services).some(v => v) && (
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-3">Servizi Aggiuntivi Inclusi</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {item.services.demolizione && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Demolizione
                                                </div>
                                            )}
                                            {item.services.massetto && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Massetto
                                                </div>
                                            )}
                                            {item.services.impermeabilizzazione && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Impermeabilizzazione
                                                </div>
                                            )}
                                            {item.services.smaltimento && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Smaltimento Macerie
                                                </div>
                                            )}
                                            {item.services.battiscopa && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Posa Battiscopa ({item.services.battiscopaMetri}m)
                                                </div>
                                            )}
                                            {item.services.soglie && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Posa Soglie ({item.services.soglieQty}pz)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Professional Card */}
                    {order.professional && (
                        <div className="bg-white border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-blue-600">
                                <User size={24} />
                                <h3 className="font-semibold text-gray-900 text-lg">Professionista Assegnato</h3>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                                    {order.professional.full_name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{order.professional.full_name}</p>
                                    <p className="text-gray-600">{order.professional.company_name}</p>
                                    <div className="mt-2 text-sm text-gray-500 space-y-1">
                                        <p>Email: {order.professional.email}</p>
                                        <p>Tel: {order.professional.phone || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Address Card */}
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4 text-green-600">
                            <MapPin size={24} />
                            <h3 className="font-semibold text-gray-900 text-lg">Indirizzo di Installazione</h3>
                        </div>
                        <div className="pl-9">
                            <p className="font-medium text-gray-900">{order.installation_address.address}</p>
                            <p className="text-gray-600">
                                {order.installation_address.cap} {order.installation_address.city} ({order.installation_address.province})
                            </p>
                        </div>
                    </div>

                    {/* Schedule Card */}
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4 text-purple-600">
                            <Calendar size={24} />
                            <h3 className="font-semibold text-gray-900 text-lg">Programmazione</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-9">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Data Intervento</p>
                                <p className="font-semibold text-lg">
                                    {order.installation_date
                                        ? format(new Date(order.installation_date), 'EEEE d MMMM yyyy', { locale: it })
                                        : 'Da definire'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Fascia Oraria</p>
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-gray-400" />
                                    <p className="font-semibold text-lg capitalize">
                                        {order.scheduled_time_slot || 'Giornata intera'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Sidebar: Summary */}
                <div className="space-y-6">
                    <div className="bg-gray-50 border rounded-xl p-6">
                        <h3 className="font-bold text-lg mb-4 text-gray-900">Riepilogo Costi</h3>
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotale</span>
                                <span>€{order.total.toFixed(2)}</span>
                            </div>
                            {/* Add tax or shipping lines here if needed */}
                        </div>
                        <hr className="border-gray-200 my-4" />
                        <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                            <span>Totale</span>
                            <span>€{order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
