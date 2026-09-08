import { useState, useEffect, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfMonth, endOfMonth, isSameDay, eachDayOfInterval, getDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useProStore } from '@/store/proStore'
import {
    Calendar as CalendarIcon,
    CalendarRange,
    Repeat,
    CheckCircle2,
    Lock,
    RefreshCw,
    Hammer,
    CalendarX,
    CheckCircle
} from 'lucide-react'
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

    // KPI Metrics aggregate
    const kpiMetrics = useMemo(() => {
        const totalJobs = jobs.filter(j => j.status !== 'cancelled').length
        const busyDaysCount = availability.filter(a => a.status === 'busy').length

        const mStart = startOfMonth(currentMonth)
        const mEnd = endOfMonth(currentMonth)
        const thisMonthJobs = jobs.filter(j => {
            if (!j.scheduled_date || j.status === 'cancelled') return false
            const d = new Date(j.scheduled_date)
            return d >= mStart && d <= mEnd
        }).length

        return {
            totalJobs,
            busyDaysCount,
            thisMonthJobs
        }
    }, [jobs, availability, currentMonth])

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
        .filter(j => j.scheduled_date && j.status !== 'draft' && j.status !== 'pending' && j.status !== 'cancelled')
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
        booked: { color: 'white', backgroundColor: '#1c1917' },
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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header matching Admin style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <CalendarIcon className="w-8 h-8 text-orange-500" />
                        <span>Calendario & Disponibilità</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Pianifica le tue disponibilità per i cantieri, blocca i giorni di ferie o gestisci periodi di chiusura.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            const mStart = startOfMonth(currentMonth)
                            const mEnd = endOfMonth(currentMonth)
                            fetchJobs()
                            fetchAvailability(mStart, mEnd)
                            toast.success('Calendario aggiornato')
                        }}
                        disabled={loading}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : ''} />
                        <span>Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* 4-Card KPI Strip matching Admin/Pro style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Cantieri del Mese */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Cantieri questo Mese</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{kpiMetrics.thisMonthJobs}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Programmati nel periodo</p>
                    </div>
                </div>

                {/* 2. Totale Cantieri Assegnati */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Hammer size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Totale Cantieri</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{kpiMetrics.totalJobs}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">In carico e completati</p>
                    </div>
                </div>

                {/* 3. Giorni Bloccati / Ferie */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <CalendarX size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Giorni Bloccati</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{kpiMetrics.busyDaysCount}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Ferie e indisponibilità</p>
                    </div>
                </div>

                {/* 4. Stato Operatività */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Stato Posatore</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-base font-bold text-stone-900">Operativo</span>
                        </div>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Disponibile a ricevere lavori</p>
                    </div>
                </div>
            </div>

            {/* Main Calendar + Management Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Calendar Card - 2/3 */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                <CalendarIcon size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-stone-900">Mese Operativo</h2>
                                <p className="text-xs text-stone-500">Clicca su una data libera per bloccarla o sbloccarla singolarmente</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
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
                                height: 60px !important; 
                                font-size: 1.1rem !important; 
                                font-weight: 700 !important;
                                border-radius: 12px !important;
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
                                font-size: 20px;
                                color: rgba(255, 255, 255, 0.8);
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
                                .rdp-button { height: 44px !important; font-size: 0.95rem !important; border-radius: 10px !important; }
                            }
                        `}</style>
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

                    {/* LEGEND matching system styles */}
                    <div className="p-5 bg-stone-50/60 border-t border-stone-100 flex flex-wrap items-center gap-5 text-xs font-semibold text-stone-600">
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md bg-stone-900 shadow-2xs"></span>
                            <span>Cantiere Confermato</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md bg-amber-500 shadow-2xs"></span>
                            <span>In Attesa</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md bg-rose-500 flex items-center justify-center text-white text-[9px] font-bold shadow-2xs">✕</span>
                            <span>Non Disponibile / Bloccato</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md bg-orange-100 border border-orange-500"></span>
                            <span>Selezione Azione Rapida</span>
                        </div>
                    </div>
                </div>

                {/* Management Toolbar Card - 1/3 */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs sticky top-6 overflow-hidden">
                        <div className="p-6 border-b border-stone-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <CalendarRange size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Azioni in Blocco</h2>
                                    <p className="text-xs text-stone-500">Imposta disponibilità su più date</p>
                                </div>
                            </div>
                        </div>

                        {/* Segmented Control Tabs */}
                        <div className="p-1.5 mx-6 mt-6 bg-stone-100/80 rounded-xl border border-stone-200/60 grid grid-cols-2 gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('recurring')}
                                className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    activeTab === 'recurring'
                                        ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                                        : 'text-stone-500 hover:text-stone-900'
                                }`}
                            >
                                <Repeat size={14} className={activeTab === 'recurring' ? 'text-orange-500' : ''} />
                                Ricorrenze
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('range')}
                                className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    activeTab === 'range'
                                        ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                                        : 'text-stone-500 hover:text-stone-900'
                                }`}
                            >
                                <CalendarRange size={14} className={activeTab === 'range' ? 'text-orange-500' : ''} />
                                Intervalli
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {activeTab === 'recurring' ? (
                                <>
                                    <div className="bg-orange-50/70 p-3.5 rounded-xl text-xs text-orange-950 border border-orange-200/70 leading-relaxed font-medium">
                                        Seleziona un periodo e i giorni della settimana da impostare in blocco.
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2.5 block">1. Periodo di Validità</label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const today = new Date()
                                                    setBulkStart(format(today, 'yyyy-MM-dd'))
                                                    setBulkEnd(format(endOfMonth(today), 'yyyy-MM-dd'))
                                                }}
                                                className="px-3 py-2 text-xs font-bold bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-xl border border-stone-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                            >
                                                Questo Mese
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const today = new Date()
                                                    setBulkStart(format(today, 'yyyy-MM-dd'))
                                                    setBulkEnd(format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd'))
                                                }}
                                                className="px-3 py-2 text-xs font-bold bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-xl border border-stone-200/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                            >
                                                Tutto l'Anno
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2.5 block">
                                            2. Giorni della Settimana
                                        </label>
                                        <div className="grid grid-cols-7 gap-1.5">
                                            {WEEKDAYS.map(day => {
                                                const isSelected = selectedDays.includes(day.id)
                                                return (
                                                    <button
                                                        key={day.id}
                                                        type="button"
                                                        onClick={() => toggleWeekDay(day.id)}
                                                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all cursor-pointer ${isSelected
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
                                    <div className="bg-stone-100/80 p-3.5 rounded-xl text-xs text-stone-700 border border-stone-200/80 leading-relaxed font-medium">
                                        Seleziona un periodo continuativo esatto da bloccare o sbloccare (es. ferie estive o chiusura aziendale).
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2.5 block">Intervallo Date</label>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-stone-600 mb-1">Data Inizio</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-sm p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                                    value={bulkStart}
                                                    onChange={(e) => setBulkStart(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-stone-600 mb-1">Data Fine</label>
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

                            {/* Standard PosaFacile buttons */}
                            <div className="pt-4 border-t border-stone-100 flex flex-col gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => handleBulkAction('busy')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                                >
                                    <Lock size={15} />
                                    <span>Blocca {activeTab === 'recurring' ? 'Giorni Selezionati' : 'Intervallo'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBulkAction('available')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20"
                                >
                                    <CheckCircle2 size={15} />
                                    <span>Rendi Date Disponibili</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


