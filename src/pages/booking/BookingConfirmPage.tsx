import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBookingStore } from '@/store/bookingStore'
import { CheckCircle, MapPin, Calendar, User, Loader2, ArrowLeft, Clock } from 'lucide-react'

export function BookingConfirmPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const {
        installationAddress,
        selectedProfessional,
        selectedDate,
        scheduledTimeSlot,
        totalAmount,
        reset
    } = useBookingStore()

    const [loading, setLoading] = useState(false)

    const handleConfirmBooking = async () => {
        if (!user || !installationAddress || !selectedProfessional || !selectedDate) {
            alert('Informazioni mancanti. Riprova.')
            return
        }

        setLoading(true)
        try {
            // 1. Crea ordine
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_id: user.id,
                    order_number: `ORD-${Date.now()}`,
                    status: 'pending' as any,
                    total: totalAmount,
                    installation_address: installationAddress,
                    installation_professional_id: selectedProfessional.id,
                    installation_date: format(selectedDate, 'yyyy-MM-dd'),
                    scheduled_time_slot: scheduledTimeSlot,
                } as any)
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Crea job assegnato al professionista
            const { error: jobError } = await supabase
                .from('jobs')
                .insert({
                    order_id: order.id,
                    professional_id: selectedProfessional.id,
                    scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
                    status: 'assigned',
                    notes: `Ordine web - Cliente: ${user.email} - Fascia oraria: ${scheduledTimeSlot}`
                })

            if (jobError) throw jobError

            // 3. Reset booking store
            reset()

            // 4. Redirect a success
            navigate('/booking/success', { state: { orderId: order.id } })

        } catch (error: any) {
            console.error('Error creating booking:', error)
            alert('Errore durante la prenotazione: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!installationAddress || !selectedProfessional || !selectedDate) {
        navigate('/cart')
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Modifica data
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Conferma Prenotazione</h1>
                    <p className="text-gray-600">Verifica i dettagli prima di confermare</p>
                </div>

                <div className="space-y-6">
                    {/* Indirizzo Intervento */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-green-50 p-2 rounded-lg text-green-600">
                                <MapPin size={24} />
                            </div>
                            <h3 className="font-semibold text-gray-900">Indirizzo Intervento</h3>
                        </div>
                        <p className="text-gray-700">{installationAddress.address}</p>
                        <p className="text-gray-600">{installationAddress.cap} {installationAddress.city} ({installationAddress.province})</p>
                    </motion.div>

                    {/* Professionista */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                <User size={24} />
                            </div>
                            <h3 className="font-semibold text-gray-900">Professionista Selezionato</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                {selectedProfessional.full_name?.charAt(0) || 'P'}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{selectedProfessional.full_name}</p>
                                {selectedProfessional.company_name && (
                                    <p className="text-sm text-gray-600">{selectedProfessional.company_name}</p>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Data Intervento */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                                <Calendar size={24} />
                            </div>
                            <h3 className="font-semibold text-gray-900">Data Programmata</h3>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <p className="text-2xl font-bold text-gray-900">
                                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })}
                            </p>
                            {scheduledTimeSlot && (
                                <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg text-purple-700 font-medium">
                                    <Clock size={20} />
                                    <span className="capitalize">{scheduledTimeSlot}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Totale */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white"
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-medium">Totale Ordine</span>
                            <span className="text-3xl font-bold">€{totalAmount.toFixed(2)}</span>
                        </div>
                    </motion.div>

                    {/* Info Nota */}
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                        <p className="font-semibold mb-1">📌 Nota:</p>
                        <p>
                            Il professionista ti contatterà a breve per confermare i dettagli dell'intervento.
                            Riceverai una email di conferma all'indirizzo <strong>{user?.email}</strong>.
                        </p>
                    </div>

                    {/* Bottone Conferma */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        onClick={handleConfirmBooking}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                Elaborazione...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={24} />
                                Conferma Prenotazione
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    )
}
