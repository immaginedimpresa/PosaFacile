
import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfMonth, endOfMonth, isSameDay, eachDayOfInterval, getDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useProStore } from '@/store/proStore'
import { Loader2, Repeat, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'
import 'react-day-picker/dist/style.css'

export function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const { jobs, availability, fetchJobs, fetchAvailability, toggleAvailability, bulkUpdateAvailability, loading } = useProStore()

    // Bulk Management State
    const [activeTab, setActiveTab] = useState<'recurring' | 'range'>('recurring')
    const [bulkStart, setBulkStart] = useState<string>('')
    const [bulkEnd, setBulkEnd] = useState<string>('')
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]) // Default all days? User said "giorni ricorrenti non funzionano", maybe better to start with ALL selected so they see the range, then unselect? 
    // Or default to Weekend? Previous was [6, 0]. User might have been confused why everything wasn't selected.
    // Let's Default to ALL days selected, so the range works immediately.

    const [previewDates, setPreviewDates] = useState<Date[]>([])

    // Set default range for Recurring tab on load
    useEffect(() => {
        const today = new Date()
        setBulkStart(format(today, 'yyyy-MM-dd'))
        setBulkEnd(format(endOfMonth(today), 'yyyy-MM-dd'))
    }, [])

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    useEffect(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        fetchAvailability(start, end)
    }, [currentMonth, fetchAvailability])

    // Shared logic for calculating dates
    const calculateTargetDates = (startStr: string, endStr: string, days: number[]) => {
        if (!startStr || !endStr) return []

        // Parse explicitly as local date to avoid timezone issues
        // YYYY-MM-DD
        const [sY, sM, sD] = startStr.split('-').map(Number)
        const [eY, eM, eD] = endStr.split('-').map(Number)

        const start = new Date(sY, sM - 1, sD, 12, 0, 0) // Noon to be safe
        const end = new Date(eY, eM - 1, eD, 12, 0, 0)

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return []

        try {
            const interval = eachDayOfInterval({ start, end })
            return interval.filter(d => days.includes(getDay(d)))
        } catch (e) {
            return []
        }
    }

    // Determine which days to filter based on Tab
    const getEffectiveDays = () => {
        if (activeTab === 'range') return [0, 1, 2, 3, 4, 5, 6] // All days
        return selectedDays
    }

    // Update preview dates whenever inputs change
    useEffect(() => {
        const targets = calculateTargetDates(bulkStart, bulkEnd, getEffectiveDays())
        setPreviewDates(targets)
    }, [bulkStart, bulkEnd, selectedDays, activeTab])

    const handleDayClick = async (date: Date) => {
        // Check if there is a job
        const jobOnDay = jobs.find(j => j.scheduled_date && isSameDay(new Date(j.scheduled_date), date))
        if (jobOnDay) {
            toast.warning('C\'è già un lavoro assegnato per questo giorno.')
            return
        }

        // Check past
        if (date < new Date(new Date().setHours(0, 0, 0, 0))) return

        // Toggle availability
        const isoDate = format(date, 'yyyy-MM-dd')

        // Optimistic toggle feedback? No, let store handle it.
        // Or show simple toast?
        // toggleAvailability is async.
        try {
            await toggleAvailability(isoDate, 'busy')
            // Don't toast on every click, too noisy.
        } catch (e) {
            toast.error('Errore modifica disponibilità')
        }
    }

    const handleBulkAction = async (action: 'busy' | 'available') => {
        const targets = calculateTargetDates(bulkStart, bulkEnd, getEffectiveDays())

        if (targets.length === 0) {
            if (!bulkStart || !bulkEnd) {
                toast.error('Seleziona un periodo valido.')
            } else if (activeTab === 'recurring' && selectedDays.length === 0) {
                toast.error('Seleziona almeno un giorno della settimana.')
            } else {
                toast.info('Nessun giorno corrisponde ai criteri.')
            }
            return
        }

        const targetStrings = targets.map(d => format(d, 'yyyy-MM-dd'))

        // Custom Toast Confirmation
        toast(`Vuoi modificare ${targetStrings.length} date ? `, {
            description: `Imposta come ${action === 'busy' ? 'NON DISPONIBILI' : 'DISPONIBILI'} `,
            action: {
                label: 'Conferma',
                onClick: async () => {
                    const toastId = toast.loading('Aggiornamento in corso...')
                    try {
                        await bulkUpdateAvailability(targetStrings, action)

                        // Refresh
                        const mStart = startOfMonth(currentMonth)
                        const mEnd = endOfMonth(currentMonth)
                        await fetchAvailability(mStart, mEnd)

                        toast.success(`Aggiornate ${targetStrings.length} date con successo!`, { id: toastId })
                    } catch (error) {
                        toast.error('Errore durante l\'aggiornamento', { id: toastId })
                    }
                }
            },
            cancel: {
                label: 'Annulla',
                onClick: () => { }
            }
        })
    }

    const toggleWeekDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    // Modifiers for styling
    const bookedDays = jobs
        .filter(j => j.scheduled_date && j.status !== 'draft' && j.status !== 'pending')
        .map(j => new Date(j.scheduled_date!))

    const pendingDays = jobs
        .filter(j => j.scheduled_date && (j.status === 'draft' || j.status === 'pending'))
        .map(j => new Date(j.scheduled_date!))

    const busyDays = availability
        .filter(a => a.status === 'busy')
        .map(a => new Date(a.date))

    const modifiers = {
        booked: bookedDays,
        pending: pendingDays,
        busy: busyDays,
        preview: previewDates
    }

    const modifiersStyles = {
        booked: { color: 'white', backgroundColor: '#eab308' }, // Orange (Confirmed)
        pending: { color: 'white', backgroundColor: '#facc15' }, // Yellow (Draft)
        busy: { color: 'white', backgroundColor: '#ef4444' } // Red
    }

    const WEEKDAYS = [
        { id: 1, label: 'Lun' },
        { id: 2, label: 'Mar' },
        { id: 3, label: 'Mer' },
        { id: 4, label: 'Gio' },
        { id: 5, label: 'Ven' },
        { id: 6, label: 'Sab' },
        { id: 0, label: 'Dom' },
    ]

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Calendario Disponibilità</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Calendar Card - Takes 2/3 on large screens */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <style>{`
                        /* Base overrides */
                        .rdp {
                            display: block !important;
                            margin: 0 !important;
                            width: 100% !important;
                            --rdp-cell-size: 100% !important;
                            --rdp-accent-color: #f97316;
                        }
                        
                        /* Force full width on all internal containers */
                        .rdp-months { 
                            width: 100% !important;
                            min-width: 100% !important; 
                            justify-content: center;
                        }
                        .rdp-month { 
                            width: 100% !important; 
                        }
                        .rdp-table { 
                            width: 100% !important; 
                            max-width: none !important; 
                            table-layout: fixed !important;
                        }
                        
                        /* Nav & Caption */
                        .rdp-caption { 
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0 1rem; 
                            margin-bottom: 1.5rem; 
                            width: 100%;
                            position: relative;
                        }
                        
                        /* Cells geometry */
                        .rdp-head_cell {
                            width: 14.28% !important; /* 100% / 7 days */
                            font-size: 0.9rem;
                            font-weight: 600;
                            color: #6b7280;
                            padding-bottom: 1rem;
                            text-transform: capitalize;
                            text-align: center;
                        }
                        .rdp-cell { 
                            width: 14.28% !important; /* 100% / 7 days */
                            text-align: center;
                        }
                        
                        /* Button Styling */
                        .rdp-button { 
                            width: 100% !important; 
                            height: 70px !important; 
                            font-size: 1.25rem !important; 
                            border-radius: 12px;
                            display: flex !important;
                            align-items: center;
                            justify-content: center;
                        }
                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { 
                            background-color: #f3f4f6; 
                        }
                        
                        /* BUSY STYLE */
                        .rdp-day_busy { 
                            position: relative;
                            background-color: #ef4444 !important; 
                            color: white !important;
                        }
                        .rdp-day_busy::after {
                            content: "✕";
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 24px;
                            color: rgba(255, 255, 255, 0.7);
                            pointer-events: none;
                        }

                        /* PREVIEW STYLE */
                        .rdp-day_preview:not(.rdp-day_busy) {
                            background-color: #d8b4fe !important; 
                            color: #6b21a8 !important;
                            border: 3px dashed #9333ea;
                            font-weight: 700;
                        }
                        .rdp-day_preview.rdp-day_busy {
                            border: 3px solid #ffffff;
                            transform: scale(0.9);
                        }
                        
                        /* Icons/Nav Overrides */
                        .rdp-nav_button { width: 32px; height: 32px; }

                        @media (max-width: 640px) {
                            .rdp-button { height: 50px !important; font-size: 1rem !important; }
                        }
                    `}</style>
                    <div className="w-full">
                        <DayPicker
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            onDayClick={handleDayClick}
                            modifiers={modifiers}
                            modifiersStyles={modifiersStyles}
                            modifiersClassNames={{
                                busy: 'rdp-day_busy',
                                preview: 'rdp-day_preview'
                            }}
                            locale={it}
                            disabled={{ before: new Date() }}
                            showOutsideDays
                            className="w-full"
                            styles={{ caption: { width: '100%' }, table: { width: '100%', maxWidth: 'none' }, head_cell: { width: '14.28%' }, cell: { width: '14.28%' } }}
                        />
                    </div>

                    {/* LEGEND */}
                    <div className="mt-6 border-t border-gray-100 pt-4 px-2">
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-yellow-400"></div>
                                <span>In Attesa</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-yellow-600"></div>
                                <span>Confermato</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-500 relative flex items-center justify-center">
                                    <span className="text-white text-[10px]">✕</span>
                                </div>
                                <span>Non Disponibile</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-purple-100 border-2 border-dashed border-purple-600"></div>
                                <span>Anteprima Selezione</span>
                            </div>
                        </div>
                    </div>

                    {loading && <div className="mt-2 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Aggiornamento...</div>}
                </div>

                {/* Management Card - Takes 1/3 */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-6 overflow-hidden">
                        {/* Tabs Header - Segmented Control Style */}
                        <div className="p-2 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-1">
                            <button
                                onClick={() => setActiveTab('recurring')}
                                className={`py-2 px-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'recurring'
                                    ? 'bg-white text-purple-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:bg-gray-200/50'
                                    }`}
                            >
                                <Repeat size={16} />
                                Ricorrenze
                            </button>
                            <button
                                onClick={() => setActiveTab('range')}
                                className={`py-2 px-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'range'
                                    ? 'bg-white text-orange-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:bg-gray-200/50'
                                    }`}
                            >
                                <CalendarRange size={16} />
                                Date
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {activeTab === 'recurring' ? (
                                <>
                                    {/* RECURRING TAB CONTENT */}
                                    <div className="bg-purple-50 p-3 rounded-lg text-xs text-purple-800 border border-purple-100 leading-relaxed">
                                        Seleziona un periodo e i giorni della settimana da bloccare/sbloccare.
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">1. Periodo di Applicazione</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    const today = new Date()
                                                    setBulkStart(format(today, 'yyyy-MM-dd'))
                                                    setBulkEnd(format(endOfMonth(today), 'yyyy-MM-dd'))
                                                }}
                                                className="px-3 py-2.5 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 shadow-sm transition-all active:scale-95"
                                            >
                                                Questo Mese
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const today = new Date()
                                                    setBulkStart(format(today, 'yyyy-MM-dd'))
                                                    setBulkEnd(format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd'))
                                                }}
                                                className="px-3 py-2.5 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 shadow-sm transition-all active:scale-95"
                                            >
                                                Tutto l'Anno
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                                            2. Giorni della Settimana
                                        </label>
                                        <div className="grid grid-cols-7 gap-1">
                                            {WEEKDAYS.map(day => {
                                                const isSelected = selectedDays.includes(day.id)
                                                return (
                                                    <button
                                                        key={day.id}
                                                        onClick={() => toggleWeekDay(day.id)}
                                                        className={`aspect-square rounded-md flex items-center justify-center text-sm font-bold transition-all ${isSelected
                                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                                                            : 'bg-gray-50 text-gray-400 border border-gray-100 hover:border-gray-300 hover:bg-white'
                                                            }`}
                                                    >
                                                        {day.label.charAt(0)}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* RANGE TAB CONTENT */}
                                    <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-800 border border-orange-100 leading-relaxed">
                                        Seleziona un intervallo esatto da bloccare (es. ferie dal 10 al 20 agosto).
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Intervallo Date</label>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Data Inizio</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-sm p-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-orange-500 transition-colors"
                                                    value={bulkStart}
                                                    onChange={(e) => setBulkStart(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Data Fine</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-sm p-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-orange-500 transition-colors"
                                                    value={bulkEnd}
                                                    onChange={(e) => setBulkEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Actions Footer - Always Visible */}
                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                                <button
                                    onClick={() => handleBulkAction('busy')}
                                    className="w-full bg-red-600 text-white px-4 py-3.5 rounded-xl text-sm font-bold hover:bg-red-700 shadow-md shadow-red-100 flex items-center justify-center gap-2 transition-transform active:scale-95"
                                >
                                    🔒 Blocca {activeTab === 'recurring' ? 'Giorni' : 'Periodo'}
                                </button>
                                <button
                                    onClick={() => handleBulkAction('available')}
                                    className="w-full bg-white text-green-600 border border-green-200 px-4 py-3.5 rounded-xl text-sm font-bold hover:bg-green-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                                >
                                    ✅ Rendi Disponibili
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
