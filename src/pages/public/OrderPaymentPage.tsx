import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Lock, CheckCircle2, Package } from 'lucide-react'
import { useConfiguratorStore } from '@/store/configuratorStore'

export function OrderPaymentPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { reset } = useConfiguratorStore()

    // State
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        if (id && user) fetchOrder()
    }, [id, user])

    const fetchOrder = async () => {
        if (!id) return
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setOrder(data)
        } catch (error) {
            console.error('Error fetching order:', error)
            navigate('/')
        } finally {
            setLoading(false)
        }
    }

    const handlePayment = async () => {
        if (!id) return
        setProcessing(true)

        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        try {
            // Update order status to confirmed
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'confirmed',
                    payment_status: 'paid',
                    payment_method: 'credit_card',
                    payment_intent_id: `pi_simulated_${Date.now()}`
                })
                .eq('id', id)

            if (error) throw error

            // Reset configurator store since order is complete
            reset()

            // Navigate to success page
            navigate('/booking/success')
        } catch (error) {
            console.error('Error processing payment:', error)
            alert('Errore durante il pagamento. Riprova.')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            </div>
        )
    }

    if (!order) return null

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="container mx-auto px-4 max-w-2xl">
                <Button
                    variant="ghost"
                    className="mb-8 pl-0 hover:pl-2 transition-all gap-2"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft size={20} /> Annulla e torna alla home
                </Button>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Header */}
                    <div className="bg-orange-500 p-6 text-white text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold">Checkout Sicuro</h1>
                        <p className="opacity-90 mt-1">Completa il pagamento per confermare l'ordine</p>
                    </div>

                    <div className="p-8">
                        {/* Order Items Details */}
                        {order.items && order.items.map((item: any, index: number) => (
                            <div key={index} className="mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-orange-500" />
                                    Dettagli Preventivo
                                </h2>

                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
                                    {/* Product & Dimensions */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Prodotto Scelto</p>
                                            <p className="font-medium text-gray-900">{item.product?.name}</p>
                                            <p className="text-xs text-gray-400">€{item.product?.price_per_sqm} / mq</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Superficie Totale</p>
                                            <p className="font-medium text-gray-900">
                                                {((item.dimensions?.pavimentoMq || 0) + (item.dimensions?.paretiMq || 0)).toFixed(2)} mq
                                            </p>
                                            <div className="text-xs text-gray-400 flex gap-2">
                                                <span>Pav: {item.dimensions?.pavimentoMq} mq</span>
                                                <span>Par: {item.dimensions?.paretiMq} mq</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Tipo di Posa</p>
                                            <p className="font-medium capitalize text-gray-900">{item.laying_type || item.layingType || 'Standard'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Ambiente</p>
                                            <p className="font-medium capitalize text-gray-900">{item.projectInfo?.ambiente || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Data Intervento</p>
                                            <p className="font-medium text-orange-600">
                                                {order.installation_date
                                                    ? new Date(order.installation_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                                                    : 'Da definire'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Services */}
                                    {item.services && Object.values(item.services).some((v: any) => v) && (
                                        <div className="pt-4 border-t border-gray-200">
                                            <h4 className="font-medium text-gray-900 mb-3 text-sm">Servizi Aggiuntivi</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {item.services.demolizione && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Demolizione
                                                    </span>
                                                )}
                                                {item.services.massetto && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Massetto
                                                    </span>
                                                )}
                                                {item.services.impermeabilizzazione && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Impermeabilizzazione
                                                    </span>
                                                )}
                                                {item.services.smaltimento && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Smaltimento
                                                    </span>
                                                )}
                                                {item.services.battiscopa && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Battiscopa ({item.services.battiscopaMetri}m)
                                                    </span>
                                                )}
                                                {item.services.soglie && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Soglie ({item.services.soglieQty}pz)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Order Summary */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo Ordine #{order.order_number}</h2>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotale</span>
                                    <span>€{order.subtotal?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>IVA (22%)</span>
                                    <span>€{order.vat_amount?.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                                    <span className="font-bold text-gray-900">Totale</span>
                                    <span className="font-bold text-2xl text-orange-600">€{order.total?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method Stub */}
                        <div className="mb-8">
                            <h3 className="font-semibold text-gray-900 mb-4">Metodo di Pagamento</h3>
                            <div className="border rounded-xl p-4 flex items-center gap-4 border-orange-200 bg-orange-50/50">
                                <div className="bg-white p-2 rounded-lg border shadow-sm">
                                    <CreditCard className="w-6 h-6 text-gray-700" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Carta di Credito (Simulata)</p>
                                    <p className="text-sm text-gray-500">**** **** **** 4242</p>
                                </div>
                                <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />
                            </div>
                        </div>

                        {/* Actions */}
                        <Button
                            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                            onClick={handlePayment}
                            disabled={processing}
                        >
                            {processing ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Elaborazione...
                                </div>
                            ) : (
                                `Paga €${order.total?.toFixed(2)}`
                            )}
                        </Button>

                        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                            <Lock size={12} /> Pagamento sicuro e crittografato SSL
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
