import { useState, useEffect, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useProStore } from '@/store/proStore'
import {
    Plus,
    Trash2,
    Calendar as CalendarIcon,
    RefreshCw,
    Hammer,
    CalendarX,
    CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import 'react-day-picker/dist/style.css'
import { ScheduleSettings } from '@/components/pro/calendar/ScheduleSettings'
import { AddAbsenceModal } from '@/components/pro/calendar/AddAbsenceModal'
import { fetchSchedule, isoWeekday, DEFAULT_SCHEDULE, type ProfessionalSchedule } from '@/services/scheduleService'
import { useAuth } from '@/hooks/useAuth'
import { SlidersHorizontal, CalendarDays } from 'lucide-react'


export function CalendarPage() {
    const { user } = useAuth()
    // Due piani distinti: le regole che valgono sempre e le eccezioni del
    // singolo giorno. Tenerli separati è metà del problema di comprensione.
    const [vista, setVista] = useState<'regole' | 'eccezioni'>('regole')
    // Il calendario deve mostrare l'effetto delle regole, altrimenti le due
    // viste raccontano cose diverse dello stesso mese.
    const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null)
    const [absenceOpen, setAbsenceOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const { jobs, availability, fetchJobs, fetchAvailability, toggleAvailability, bulkUpdateAvailability, loading } = useProStore()

    // Bulk Management State

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    useEffect(() => {
        if (!user?.id) return
        let attivo = true
        void (async () => {
            const regole = await fetchSchedule(user.id)
            if (attivo) setSchedule(regole)
        })()
        return () => { attivo = false }
    }, [user?.id, vista])

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

    const handleDayClick = async (date: Date) => {
        const jobOnDay = jobs.find(j => j.scheduled_date && isSameDay(new Date(j.scheduled_date), date))
        if (jobOnDay) {
            toast.warning('C\'è già un cantiere assegnato per questo giorno.')
            return
        }

        if (date < new Date(new Date().setHours(0, 0, 0, 0))) return

        if (!regoleAttive.working_days.includes(isoWeekday(date))) {
            toast.info('Non è un giorno in cui lavori: cambialo da "Come lavori di norma".')
            return
        }

        const isoDate = format(date, 'yyyy-MM-dd')
        try {
            await toggleAvailability(isoDate, 'busy')
        } catch {
            toast.error('Non sono riuscito a modificare la disponibilità')
        }
    }

    /** Salva le date scelte nella modale come assenza. */
    const aggiungiAssenze = async (dates: string[]) => {
        await bulkUpdateAvailability(dates, 'busy')
        await fetchAvailability(startOfMonth(currentMonth), endOfMonth(currentMonth))
        toast.success(
            dates.length === 1 ? 'Assenza registrata' : `${dates.length} giornate segnate come assenza`,
        )
    }


    const bookedDays = jobs
        .filter(j => j.scheduled_date && j.status !== 'draft' && j.status !== 'pending' && j.status !== 'cancelled')
        .map(j => new Date(j.scheduled_date!))

    const pendingDays = jobs
        .filter(j => j.scheduled_date && (j.status === 'draft' || j.status === 'pending'))
        .map(j => new Date(j.scheduled_date!))

    // Solo da oggi in avanti: le assenze passate non servono a nessuno.
    const assenzeFuture = availability
        .filter((a) => a.status === 'busy' && new Date(a.date) >= new Date(new Date().toDateString()))
        .sort((a, b) => a.date.localeCompare(b.date))

    const busyDays = availability
        .filter(a => a.status === 'busy')
        .map(a => new Date(a.date))

    const regoleAttive = schedule ?? { professional_id: user?.id ?? '', ...DEFAULT_SCHEDULE }

    const modifiers = {
        booked: bookedDays,
        pending: pendingDays,
        busy: busyDays,
        // Non è un'assenza da segnare: è la regola settimanale che lo esclude.
        nonLavorativo: (date: Date) => !regoleAttive.working_days.includes(isoWeekday(date)),
    }

    const modifiersStyles = {
        booked: { color: 'white', backgroundColor: '#1c1917' },
        pending: { color: 'white', backgroundColor: '#eab308' },
        busy: { color: 'white', backgroundColor: '#ef4444' },
        nonLavorativo: { color: '#a8a29e', backgroundColor: '#f5f5f4', textDecoration: 'line-through' },
    }


    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header matching Admin style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <CalendarIcon className="w-8 h-8 text-orange-500" />
                        <span>Disponibilità</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Decidi quando sei prenotabile: le regole valgono sempre, le eccezioni
                        riguardano un giorno solo.
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

            {/* Le due viste: regole permanenti ed eccezioni puntuali */}
            <div className="p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200/60 inline-flex items-center gap-1.5 mb-8">
                <button
                    type="button"
                    onClick={() => setVista('regole')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        vista === 'regole'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                    }`}
                >
                    <SlidersHorizontal size={16} className={vista === 'regole' ? 'text-orange-500' : ''} />
                    <span>Come lavori di norma</span>
                </button>
                <button
                    type="button"
                    onClick={() => setVista('eccezioni')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        vista === 'eccezioni'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                    }`}
                >
                    <CalendarDays size={16} className={vista === 'eccezioni' ? 'text-orange-500' : ''} />
                    <span>Assenze e cantieri</span>
                </button>
            </div>

            {/* Regole permanenti */}
            {vista === 'regole' && user?.id && (
                <ScheduleSettings professionalId={user.id} />
            )}

            {vista === 'eccezioni' && (
            <>
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

                    {/* Legenda: dice cosa significano i colori e cosa fa il clic */}
                    <div className="border-t border-stone-100">
                        <p className="px-5 pt-4 text-xs font-medium text-stone-500">
                            Clicca un giorno per segnare o togliere un’assenza. I cantieri
                            confermati non si spostano da qui.
                        </p>
                        <div className="p-5 pt-3 flex flex-wrap items-center gap-5 text-xs font-semibold text-stone-600">
                            <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-md bg-stone-900 shadow-2xs"></span>
                                <span>Cantiere confermato</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-md bg-amber-500 shadow-2xs"></span>
                                <span>In attesa di conferma</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-2xs"></span>
                                <span>Tua assenza</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-md bg-stone-100 border border-stone-200"></span>
                                <span>Non lavorativo (dalle tue regole)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assenze in programma: leggibili, non solo pallini rossi */}
                <div className="space-y-4 lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-5 border-b border-stone-100 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-stone-900">Le tue assenze</h2>
                                <p className="text-xs text-stone-500 mt-0.5">Giorni in cui non ricevi proposte</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAbsenceOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer flex-shrink-0"
                            >
                                <Plus size={15} />
                                <span>Aggiungi</span>
                            </button>
                        </div>

                        {assenzeFuture.length === 0 ? (
                            <p className="p-5 text-sm text-stone-500 font-medium">
                                Nessuna assenza in programma. Sei prenotabile in tutti i giorni
                                lavorativi che hai impostato.
                            </p>
                        ) : (
                            <ul className="divide-y divide-stone-100 max-h-[420px] overflow-y-auto">
                                {assenzeFuture.map((assenza) => (
                                    <li key={assenza.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-stone-800 capitalize">
                                                {format(new Date(assenza.date), 'EEEE d MMMM', { locale: it })}
                                            </p>
                                            <p className="text-[11px] text-stone-400 font-medium">
                                                {format(new Date(assenza.date), 'yyyy')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleAvailability(assenza.date, 'busy')}
                                            title="Rimuovi questa assenza"
                                            className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
            </>
            )}

            <AddAbsenceModal
                isOpen={absenceOpen}
                onClose={() => setAbsenceOpen(false)}
                onConfirm={aggiungiAssenze}
            />

        </div>
    )
}


