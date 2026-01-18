import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, isSameDay, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { supabase } from '@/lib/supabase'
import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react'
import 'react-day-picker/dist/style.css'

export function Step8CalendarSelect() {
    const { selectedProfessional, selectedDate, setSelectedDate, prevStep, nextStep } = useConfiguratorStore()
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [busyDates, setBusyDates] = useState<Date[]>([])
    const [jobDates, setJobDates] = useState<Date[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (selectedProfessional) {
            fetchAvailability()
        }
    }, [selectedProfessional, currentMonth])

    const fetchAvailability = async () => {
        if (!selectedProfessional) return

        setLoading(true)
        try {
            const start = startOfMonth(currentMonth)
            const end = endOfMonth(addMonths(currentMonth, 2))

            const { data: availabilityData, error: availError } = await supabase
                .from('professional_availability')
                .select('date')
                .eq('professional_id', selectedProfessional.id)
                .gte('date', start.toISOString().split('T')[0])
                .lte('date', end.toISOString().split('T')[0])

            if (availError) throw availError

            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('scheduled_date')
                .eq('professional_id', selectedProfessional.id)
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
        const isOccupied = [...busyDates, ...jobDates].some(d => isSameDay(d, date))
        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))

        if (isOccupied || isPast) {
            return
        }

        setSelectedDate(date)
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Scegli la Data dell'Intervento</h2>
                <p className="text-gray-600">
                    Disponibilità di <strong>{selectedProfessional?.full_name}</strong>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calendar */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
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
                </div>

                {/* Info */}
                <div className="space-y-4">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-3 mb-4">
                            <CalendarIcon className="text-blue-600" size={24} />
                            <h3 className="font-semibold">Come funziona</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                                <span>Clicca su un giorno disponibile per selezionarlo</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5"></div>
                                <span>I giorni in rosso sono già occupati</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5"></div>
                                <span>I giorni passati non sono selezionabili</span>
                            </li>
                        </ul>
                    </div>

                    {selectedDate && (
                        <div className="bg-green-50 border-2 border-green-300 p-6 rounded-xl">
                            <p className="text-sm font-semibold text-green-700 mb-2">Data selezionata:</p>
                            <p className="text-2xl font-bold text-green-900">
                                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                    Indietro
                </button>
                <button
                    onClick={nextStep}
                    disabled={!selectedDate}
                    className="flex items-center gap-2 px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continua <ArrowRight size={20} />
                </button>
            </div>
        </div>
    )
}
