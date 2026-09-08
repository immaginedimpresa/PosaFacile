import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfMonth, endOfMonth, isSameDay, eachDayOfInterval, getDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useProStore } from '@/store/proStore'
import { Loader2, Repeat, CalendarRange, Calendar as CalendarIcon, CheckCircle2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import 'react-day-picker/dist/style.css'

export function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const { jobs, availability, fetchJobs, fetchAvailability, toggleAvailability, bulkUpdateAvailability, loading } = useProStore()

    // Bulk Management State
    const [activeTab, setActiveTab] = useState<'recurring' | 'range'>('recurring')
    const [bulkStart, setBulkStart] = useState<string>('')
    const [bulkEnd, setBulkEnd] = useState<string>('')
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0])
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

        const [sY, sM, sD] = startStr.split('-').map(Number)
        const [eY, eM, eD] = endStr.split('-').map(Number)

        const start = new Date(sY, sM - 1, sD, 12, 0, 0)
        const end = new Date(eY, eM - 1, eD, 12, 0, 0)

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return []

        try {
            const interval = eachDayOfInterval({ start, end })
            return interval.filter(d => days.includes(getDay(d)))
        } catch (e) {
            return []
        }
    }

    const getEffectiveDays = () => {
        if (activeTab === 'range') return [0, 1, 2, 3, 4, 5, 6]
        return selectedDays
    }

    useEffect(() => {
        const targets = calculateTargetDates(bulkStart, bulkEnd, getEffectiveDays())
        setPreviewDates(targets)
    }, [bulkStart, bulkEnd, selectedDays, activeTab])

    const handleDayClick = async (date: Date) => {
        const jobOnDay = jobs.find(j => j.scheduled_date && isSameDay(new Date(j.scheduled_date), date))
        if (jobOnDay) {
            toast.warning('C\'è già un cantiere assegnato per questo giorno.')
            return
        }

        if (date < new Date(new Date().setHours(0, 0, 0, 0))) return

        const isoDate = format(date, 'yyyy-MM-dd')
        try {
            await toggleAvailability(isoDate, 'busy')
        } catch (e) {
            toast.error('Errore durante la modifica della disponibilità')
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

        toast(`Vuoi modificare ${targetStrings.length} date?`, {
            description: `Imposta come ${action === 'busy' ? 'NON DISPONIBILI' : 'DISPONIBILI'}`,
            action: {
                label: 'Conferma',
                onClick: async () => {
                    const toastId = toast.loading('Aggiornamento in corso...')
                    try {
                        await bulkUpdateAvailability(targetStrings, action)
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
        booked: { color: 'white', backgroundColor: '#f97316' },
        pending: { color: 'white', backgroundColor: '#eab308' },
        busy: { color: 'white', backgroundColor: '#ef4444' }
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
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">Calendario Disponibilità</h1>
                        <p className="text-stone-500 text-sm mt-0.5">Gestisci giorni operativi, ferie e blocca fasce orarie o ricorrenze</p>
                    </div>
                </div>

                {loading && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 text-xs font-bold border border-orange-200/60">
                        <Loader2 className="animate-spin" size={14} /> Sincronizzazione calendario...
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Calendar Card - 2/3 */}
                <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col">
                    <style>{`
                        .rdp {
                            display: block !important;
                            margin: 0 !important;
                            width: 100% !important;
                            --rdp-cell-size: 100% !important;
                            --rdp-accent-color: #f97316;
                        }
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
                        .rdp-caption { 
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0 0.5rem; 
                            margin-bottom: 1.5rem; 
                            width: 100%;
                            position: relative;
                            font-weight: 800;
                            color: #1c1917;
                        }
                        .rdp-caption_label {
                            font-size: 1.15rem !important;
                            font-weight: 800 !important;
                            text-transform: capitalize;
                        }
                        .rdp-head_cell {
                            width: 14.28% !important;
                            font-size: 0.8rem;
                            font-weight: 700;
                            color: #78716c;
                            padding-bottom: 0.75rem;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            text-align: center;
                        }
                        .rdp-cell { 
                            width: 14.28% !important;
                            text-align: center;
                            padding: 3px !important;
                        }
                        .rdp-button { 
                            width: 100% !important; 
                            height: 64px !important; 
                            font-size: 1.15rem !important; 
                            font-weight: 700 !important;
                            border-radius: 14px !important;
                            display: flex !important;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.15s ease;
                        }
                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { 
                            background-color: #f5f5f4 !important; 
                        }
                        
                        /* BUSY STYLE */
                        .rdp-day_busy { 
                            position: relative;
                            background-color: #ef4444 !important; 
                            color: white !important;
                            box-shadow: 0 2px 6px -1px rgba(239, 68, 68, 0.3) !important;
                        }
                        .rdp-day_busy::after {
                            content: "✕";
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 22px;
                            color: rgba(255, 255, 255, 0.75);
                            pointer-events: none;
                        }

                        /* PREVIEW STYLE */
                        .rdp-day_preview:not(.rdp-day_busy) {
                            background-color: #ffedd5 !important; 
                            color: #c2410c !important;
                            border: 2px dashed #f97316 !important;
                            font-weight: 800;
                        }
                        .rdp-day_preview.rdp-day_busy {
                            border: 2px solid #ffffff !important;
                            transform: scale(0.92);
                        }
                        
                        .rdp-nav_button { 
                            width: 36px !important; 
                            height: 36px !important; 
                            border-radius: 10px !important;
                            border: 1px solid #e7e5e4 !important;
                            background: #ffffff !important;
                            display: flex !important;
                            align-items: center;
                            justify-content: center;
                        }
                        .rdp-nav_button:hover {
                            background: #f5f5f4 !important;
                        }

                        @media (max-width: 640px) {
                            .rdp-button { height: 46px !important; font-size: 0.95rem !important; border-radius: 10px !important; }
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
                    <div className="mt-6 border-t border-stone-100 pt-5">
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-600">
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-md bg-orange-500 shadow-2xs"></div>
                                <span>Cantiere Confermato</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-md bg-yellow-500 shadow-2xs"></div>
                                <span>In Attesa</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-md bg-red-500 flex items-center justify-center text-white text-[9px] font-bold shadow-2xs">✕</div>
                                <span>Non Disponibile</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-md bg-orange-100 border border-dashed border-orange-500"></div>
                                <span>Anteprima Selezione</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Management Toolbar Card - 1/3 */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs sticky top-6 overflow-hidden">
                        {/* Segmented Control Tabs */}
                        <div className="p-2 bg-stone-100/70 border-b border-stone-200/70 grid grid-cols-2 gap-1.5">
                            <button
                                onClick={() => setActiveTab('recurring')}
                                className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'recurring'
                                    ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                                    : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                                    }`}
                            >
                                <Repeat size={14} className="text-orange-500" />
                                Ricorrenze
                            </button>
                            <button
                                onClick={() => setActiveTab('range')}
                                className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'range'
                                    ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                                    : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                                    }`}
                            >
                                <CalendarRange size={14} className="text-orange-500" />
                                Intervalli
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {activeTab === 'recurring' ? (
                                <>
                                    <div className="bg-orange-50/70 p-3 rounded-xl text-xs text-orange-900 border border-orange-200/70 leading-relaxed font-medium">
                                        Seleziona un intervallo temporale e i giorni della settimana da impostare in blocco.
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 block">1. Periodo di Validità</label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                onClick={() => {
                                                    const today = new Date()
                                                    setBulkStart(format(today, 'yyyy-MM-dd'))
                                                    setBulkEnd(format(endOfMonth(today), 'yyyy-MM-dd'))
                                                }}
                                                className="px-3 py-2 text-xs font-bold bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-xl border border-stone-200/80 shadow-2xs transition-all active:scale-95"
                                            >
                                                Questo Mese
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const today = new Date()
                                                    setBulkStart(format(today, 'yyyy-MM-dd'))
                                                    setBulkEnd(format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd'))
                                                }}
                                                className="px-3 py-2 text-xs font-bold bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-xl border border-stone-200/80 shadow-2xs transition-all active:scale-95"
                                            >
                                                Tutto l'Anno
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 block">
                                            2. Giorni della Settimana
                                        </label>
                                        <div className="grid grid-cols-7 gap-1.5">
                                            {WEEKDAYS.map(day => {
                                                const isSelected = selectedDays.includes(day.id)
                                                return (
                                                    <button
                                                        key={day.id}
                                                        onClick={() => toggleWeekDay(day.id)}
                                                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${isSelected
                                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                            : 'bg-stone-50 text-stone-400 border border-stone-200/70 hover:border-stone-300 hover:bg-white'
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
                                    <div className="bg-stone-100 p-3 rounded-xl text-xs text-stone-700 border border-stone-200/80 leading-relaxed font-medium">
                                        Seleziona un periodo continuo esatto da bloccare o sbloccare (es. ferie estive o chiusura).
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 block">Intervallo Date</label>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-stone-600 mb-1">Data Inizio</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                                    value={bulkStart}
                                                    onChange={(e) => setBulkStart(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-stone-600 mb-1">Data Fine</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                                    value={bulkEnd}
                                                    onChange={(e) => setBulkEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Actions Footer */}
                            <div className="pt-4 border-t border-stone-100 flex flex-col gap-2.5">
                                <button
                                    onClick={() => handleBulkAction('busy')}
                                    className="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md shadow-rose-600/15 flex items-center justify-center gap-2 transition-transform active:scale-95"
                                >
                                    <Lock size={16} />
                                    Blocca {activeTab === 'recurring' ? 'Giorni' : 'Periodo'}
                                </button>
                                <button
                                    onClick={() => handleBulkAction('available')}
                                    className="w-full bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200/90 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-2xs"
                                >
                                    <CheckCircle2 size={16} />
                                    Rendi Disponibili
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

