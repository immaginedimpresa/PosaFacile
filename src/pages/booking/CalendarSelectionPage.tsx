import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import { format, isSameDay, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useBookingStore } from '@/store/bookingStore'
import { Calendar as CalendarIcon, ArrowRight, ArrowLeft, AlertCircle, Clock } from 'lucide-react'
import 'react-day-picker/dist/style.css'

export function CalendarSelectionPage() {
    const { professionalId } = useParams<{ professionalId: string }>()
    const navigate = useNavigate()
    const {
        selectedProfessional,
        selectedDate,
        setSelectedDate,
        scheduledTimeSlot,
        setScheduledTimeSlot
    } = useBookingStore()

    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [busyDates, setBusyDates] = useState<Date[]>([])
    const [jobDates, setJobDates] = useState<Date[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!selectedProfessional || selectedProfessional.id !== professionalId) {
            navigate('/booking/professionals')
            return
        }
        fetchAvailability()
    }, [professionalId, currentMonth])

    const fetchAvailability = async () => {
        if (!professionalId) return

        setLoading(true)
        try {
            const start = startOfMonth(currentMonth)
            const end = endOfMonth(addMonths(currentMonth, 2)) // Carica 3 mesi

            // Fetch date non disponibili (busy/vacation)
            const { data: availabilityData, error: availError } = await supabase
                .from('professional_availability')
                .select('date')
                .eq('professional_id', professionalId)
                .gte('date', start.toISOString().split('T')[0])
                .lte('date', end.toISOString().split('T')[0])

            if (availError) throw availError

            // Fetch date con lavori già assegnati
            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('scheduled_date')
                .eq('professional_id', professionalId)
                .not('status', 'in', '(cancelled,completed)')
                .gte('scheduled_date', start.toISOString().split('T')[0])
                .lte('scheduled_date', end.toISOString().split('T')[0])

            if (jobsError) throw jobsError

            setBusyDates(availabilityData?.map(a => new Date(a.date)) || [])
            setJobDates(jobsData?.filter(j => j.scheduled_date).map(j => new Date(j.scheduled_date!)) || [])
        } catch (error) {
            console.error('Error fetching availability:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDayClick = (date: Date) => {
        // Check se è disponibile
        const isOccupied = [...busyDates, ...jobDates].some(d => isSameDay(d, date))
        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))

        if (isOccupied || isPast) {
            return // Non selezionabile
        }

        setSelectedDate(date)
        setScheduledTimeSlot(null) // Reset slot quando cambia il giorno
    }

    const handleConfirm = () => {
        if (!selectedDate || !scheduledTimeSlot) return
        navigate('/booking/confirm')
    }

    const occupiedDays = [...busyDates, ...jobDates]
    const modifiers = {
        occupied: occupiedDays,
        selected: selectedDate ? [selectedDate] : []
    }

    const modifiersStyles = {
        occupied: {
            color: 'white',
            backgroundColor: '#ef4444',
            cursor: 'not-allowed'
        },
        selected: {
            color: 'white',
            backgroundColor: '#22c55e',
            fontWeight: 'bold'
        }
    }

    const timeSlots = [
        { id: 'mattina', label: 'Mattina', hours: '08:00 - 12:00' },
        { id: 'pomeriggio', label: 'Pomeriggio', hours: '13:00 - 17:00' }
    ]

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Carico disponibilità...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <button
                    onClick={() => navigate('/booking/professionals')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Torna ai professionisti
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Scegli Data e Ora</h1>
                    <p className="text-gray-600">
                        Disponibilità di <strong>{selectedProfessional?.full_name}</strong>
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Calendar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <style>{`
                            .rdp { --rdp-cell-size: 50px; --rdp-accent-color: #22c55e; }
                            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f0fdf4; }
                            .rdp-day_today { font-weight: bold; }
                        `}</style>
                        <DayPicker
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            onDayClick={handleDayClick}
                            modifiers={modifiers}
                            modifiersStyles={modifiersStyles}
                            locale={it}
                            disabled={{ before: new Date() }}
                            footer={
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span>Data selezionata</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span>Non disponibile</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                                        <span>Disponibile</span>
                                    </div>
                                </div>
                            }
                        />
                    </motion.div>

                    {/* Info & Confirm */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        {/* Instructions */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                    <CalendarIcon size={24} />
                                </div>
                                <h3 className="font-semibold text-gray-900">Come funziona</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                                    <span>Clicca su un giorno <strong>disponibile</strong> per selezionarlo</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                                    <span>I giorni in <strong>rosso</strong> sono già occupati</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5 flex-shrink-0"></div>
                                    <span>I giorni passati non sono selezionabili</span>
                                </li>
                            </ul>
                        </div>

                        {/* Time Slot Selection */}
                        {selectedDate && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4"
                            >
                                <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                                    <Clock size={20} className="text-orange-500" />
                                    <h3>Seleziona Fascia Oraria</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {timeSlots.map((slot) => (
                                        <button
                                            key={slot.id}
                                            onClick={() => setScheduledTimeSlot(slot.id)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${scheduledTimeSlot === slot.id
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-orange-200'
                                                }`}
                                        >
                                            <div className="font-semibold text-gray-900">{slot.label}</div>
                                            <div className="text-sm text-gray-500">{slot.hours}</div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Summary & Confirm */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                            <h3 className="font-semibold text-gray-900">Riepilogo Selezione</h3>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Data</span>
                                    <span className="font-medium text-gray-900">
                                        {selectedDate
                                            ? format(selectedDate, 'd MMMM yyyy', { locale: it })
                                            : '-'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Orario</span>
                                    <span className="font-medium text-gray-900 capitalize">
                                        {scheduledTimeSlot || '-'}
                                    </span>
                                </div>
                            </div>

                            {!loading && occupiedDays.length > 10 && !selectedDate && (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2 text-sm mt-2">
                                    <AlertCircle className="text-amber-600 flex-shrink-0" size={16} />
                                    <p className="text-amber-800">
                                        Molti giorni sono occupati questo mese.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleConfirm}
                                disabled={!selectedDate || !scheduledTimeSlot}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors mt-4"
                            >
                                Conferma Appuntamento
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
