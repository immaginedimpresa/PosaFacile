import { AlertTriangle, CalendarClock, Info, ShieldCheck, Users } from 'lucide-react'
import { formatDays, type DurationEstimate, type DurationPhase } from '@/lib/layingDuration'

const CONFIDENCE_STYLES = {
    alta: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', label: 'Stima affidabile' },
    media: { badge: 'bg-blue-50 text-blue-700 border-blue-200/80', label: 'Stima indicativa' },
    bassa: { badge: 'bg-amber-50 text-amber-700 border-amber-200/80', label: 'Da verificare in sopralluogo' },
} as const

/** Nomi brevi delle fasi, nella lingua del cliente. */
const PHASE_SHORT_LABELS: Record<string, string> = {
    allestimento: 'preparazione del cantiere',
    demolizione: 'demolizione del vecchio pavimento',
    smaltimento: 'smaltimento macerie',
    massetto: 'massetto',
    impermeabilizzazione: 'impermeabilizzazione',
    posa_pavimento: 'posa del pavimento',
    posa_rivestimento: 'posa del rivestimento',
    stuccatura: 'stuccatura delle fughe',
    battiscopa: 'battiscopa',
    soglie: 'soglie',
    consegna: 'pulizia finale',
}

/** Perché si aspetta, detto in modo che il cliente lo capisca. */
const WAIT_REASONS: Record<string, string> = {
    massetto: 'il massetto asciuga',
    impermeabilizzazione: 'la guaina impermeabilizzante asciuga',
    stuccatura: 'la colla fa presa prima della stuccatura',
}

/** Fasi la cui attesa viene prima del lavoro: si stucca a colla indurita. */
const WAIT_BEFORE_WORK = new Set(['stuccatura'])

interface TimelineSegment {
    kind: 'work' | 'wait'
    days: number
    firstDay: number
    lastDay: number
    text: string
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const joinLabels = (labels: string[]) =>
    capitalize(labels.length > 1 ? `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}` : labels[0] ?? '')

/**
 * La sequenza del cantiere giorno per giorno: blocchi di lavoro separati
 * dalle attese tecniche, nell'ordine in cui avvengono. I giorni di lavoro
 * sono riscalati su quelli effettivi, così una durata confermata dal
 * posatore si ridistribuisce sulle stesse fasi.
 */
function buildTimeline(estimate: DurationEstimate, workDays: number): TimelineSegment[] {
    const throughput = estimate.crewThroughput || 1
    const raw = estimate.phases.reduce((sum, p) => sum + p.criticalDays / throughput, 0)
    const scale = raw > 0 ? workDays / raw : 1
    const totalWork = Math.ceil(workDays)

    const segments: Omit<TimelineSegment, 'firstDay' | 'lastDay'>[] = []
    let cumulative = 0
    let boundary = 0
    let pending: string[] = []

    const flushWork = () => {
        if (!pending.length) return
        const end = Math.min(totalWork, Math.max(Math.ceil(cumulative - 1e-6), boundary + 1))
        if (end > boundary) {
            segments.push({ kind: 'work', days: end - boundary, text: joinLabels(pending) })
            boundary = end
            pending = []
        }
    }
    const addWait = (phase: DurationPhase) => {
        flushWork()
        segments.push({ kind: 'wait', days: phase.curingDays, text: WAIT_REASONS[phase.key] ?? 'attesa tecnica' })
    }

    for (const phase of estimate.phases) {
        if (phase.curingDays > 0 && WAIT_BEFORE_WORK.has(phase.key)) addWait(phase)
        if (phase.criticalDays > 0) {
            cumulative += (phase.criticalDays / throughput) * scale
            pending.push(PHASE_SHORT_LABELS[phase.key] ?? phase.label.toLowerCase())
        }
        if (phase.curingDays > 0 && !WAIT_BEFORE_WORK.has(phase.key)) addWait(phase)
    }

    if (pending.length) {
        if (totalWork > boundary) {
            segments.push({ kind: 'work', days: totalWork - boundary, text: joinLabels(pending) })
        } else {
            // L'arrotondamento ha già esaurito i giorni: le ultime fasi chiudono l'ultimo blocco di lavoro.
            const lastWork = [...segments].reverse().find((s) => s.kind === 'work')
            if (lastWork) lastWork.text = `${lastWork.text}, ${pending.join(', ')}`
        }
    }

    let day = 1
    return segments.map((segment) => {
        const withDays = { ...segment, firstDay: day, lastDay: day + segment.days - 1 }
        day += segment.days
        return withDays
    })
}

/** Le giornate lavorative a partire dall'inizio: sabato e domenica non contano. */
function workingDates(start: Date | string, count: number): Date[] {
    const cursor = typeof start === 'string' ? new Date(start) : new Date(start)
    if (Number.isNaN(cursor.getTime()) || count <= 0) return []
    cursor.setHours(12, 0, 0, 0)
    const dates: Date[] = []
    while (dates.length < count) {
        const weekday = cursor.getDay()
        if (weekday !== 0 && weekday !== 6) dates.push(new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
    }
    return dates
}

const formatShortDate = (date: Date) =>
    date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

interface DurationCardProps {
    estimate: DurationEstimate
    /** Giornate confermate dal professionista: prevalgono sulla stima. */
    confirmedWorkDays?: number | null
    confirmedCalendarDays?: number | null
    proNote?: string | null
    /** Data di inizio lavori: se c'è, la linea del tempo mostra anche le date. */
    startDate?: Date | string | null
    /**
     * Il cliente vede quanto dura e cosa succede giorno per giorno; admin e
     * posatore vedono in più squadra, giornate-uomo e dettaglio delle fasi.
     */
    audience?: 'customer' | 'team'
    /** Nasconde il blocco "Come è calcolata". Di default è nascosto al cliente. */
    hideAssumptions?: boolean
    className?: string
}

/**
 * Scheda "quanto durano i lavori".
 * Risponde prima alla domanda del cliente — per quanti giorni ho la casa
 * occupata, e perché — e solo per admin e posatore scende nel dettaglio.
 */
export function DurationCard({
    estimate,
    confirmedWorkDays,
    confirmedCalendarDays,
    proNote,
    startDate,
    audience = 'customer',
    hideAssumptions,
    className = '',
}: DurationCardProps) {
    const confermato = typeof confirmedWorkDays === 'number' && confirmedWorkDays > 0
    const workDays = confermato ? confirmedWorkDays! : estimate.workDays
    const calendarDays = confermato
        ? (confirmedCalendarDays ?? Math.ceil(workDays) + estimate.curingDays)
        : estimate.calendarDays

    if (estimate.workDays <= 0 && !confermato) return null

    const isTeam = audience === 'team'
    const showAssumptions = !(hideAssumptions ?? !isTeam) && estimate.assumptions.length > 0
    const confidence = CONFIDENCE_STYLES[estimate.confidence]

    const timeline = buildTimeline(estimate, workDays)
    const timelineDays = timeline.reduce((sum, s) => sum + s.days, 0)
    // Se il posatore ha corretto anche la durata totale, la sequenza stimata non torna più: meglio non mostrarla.
    const showTimeline = timeline.length > 1 && timelineDays === calendarDays
    const dates = startDate ? workingDates(startDate, calendarDays) : []

    const waitReasons = [...new Set(timeline.filter((s) => s.kind === 'wait').map((s) => s.text))]
    const throughput = estimate.crewThroughput || 1

    const dayRange = (s: TimelineSegment) =>
        s.firstDay === s.lastDay ? `Giorno ${s.firstDay}` : `Giorni ${s.firstDay}–${s.lastDay}`
    const dateRange = (s: TimelineSegment) => {
        const first = dates[s.firstDay - 1]
        const last = dates[s.lastDay - 1]
        if (!first || !last) return null
        return s.firstDay === s.lastDay ? formatShortDate(first) : `${formatShortDate(first)} – ${formatShortDate(last)}`
    }

    return (
        <div className={`bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden ${className}`}>
            <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-stone-900">Durano dei lavori</h3>

                    </div>
                </div>
                <span
                    className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${confermato ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : confidence.badge
                        }`}
                >
                    {confermato ? <ShieldCheck className="w-3.5 h-3.5" /> : null}
                    {confermato ? 'Confermata' : confidence.label}
                </span>
            </div>

            <div className="p-6 space-y-5 border-b border-stone-100">
                {/* La risposta, in una riga */}
                <div>
                    {/* div e non p: nel configuratore i paragrafi hanno una taglia fissa su mobile */}
                    <div className="text-3xl font-black text-stone-900 tracking-tight leading-tight">
                        {formatDays(calendarDays)} lavorativi
                    </div>
                    <p className="text-sm text-stone-500 mt-1">
                        {dates.length > 0
                            ? <>Dal <strong className="text-stone-800">{formatShortDate(dates[0])}</strong> al <strong className="text-stone-800">{formatShortDate(dates[dates.length - 1])}</strong>, sabato e domenica esclusi.</>
                            : 'Sabato e domenica esclusi.'}
                    </p>
                    <p className="text-sm text-stone-700 mt-3 leading-relaxed">
                        {estimate.curingDays > 0 ? (
                            <>
                                <strong>{formatDays(workDays)}</strong> con i posatori al lavoro e{' '}
                                <strong>{formatDays(estimate.curingDays)}</strong> di attesa in cui in casa non lavora nessuno
                                {waitReasons.length > 0 ? `: ${waitReasons.join(', ')}.` : '.'}
                            </>
                        ) : (
                            <>Sono tutti giorni di lavoro in casa: non ci sono attese tecniche.</>
                        )}
                    </p>
                    {!confermato && estimate.maxWorkDays > estimate.minWorkDays && (
                        <p className="text-xs text-stone-500 mt-1.5">
                            I giorni di lavoro possono variare tra {estimate.minWorkDays} e {estimate.maxWorkDays}: li conferma il professionista.
                        </p>
                    )}
                </div>

                {/* Cosa succede, giorno per giorno */}
                {showTimeline && (
                    <div className="space-y-3">
                        <div className="flex gap-1 h-2.5" aria-hidden="true">
                            {timeline.map((segment, i) => (
                                <div
                                    key={i}
                                    className={`rounded-full ${segment.kind === 'work' ? 'bg-orange-500' : 'bg-amber-200'}`}
                                    style={{ flexGrow: segment.days, flexBasis: 0 }}
                                />
                            ))}
                        </div>
                        <ol className="space-y-2.5">
                            {timeline.map((segment, i) => {
                                const range = dateRange(segment)
                                return (
                                    <li key={i} className="flex items-start gap-3 text-sm">
                                        <span
                                            aria-hidden="true"
                                            className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${segment.kind === 'work' ? 'bg-orange-500' : 'bg-amber-300'}`}
                                        />
                                        <div className="min-w-0">
                                            <p className="font-bold text-stone-900">
                                                {dayRange(segment)}
                                                {range && <span className="font-medium text-stone-500"> · {range}</span>}
                                            </p>
                                            <p className="text-stone-600 leading-relaxed">
                                                {segment.kind === 'work'
                                                    ? segment.text
                                                    : `Attesa: ${segment.text}. In casa non si lavora.`}
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ol>
                    </div>
                )}
            </div>

            {/* Solo per admin e posatore: da dove vengono i numeri */}
            {isTeam && estimate.phases.length > 0 && (
                <div className="p-6 border-b border-stone-100 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5">
                            <p className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" /> Squadra
                            </p>
                            <p className="text-base font-bold text-stone-900 mt-0.5">
                                {estimate.crewSize === 1 ? '1 posatore' : `${estimate.crewSize} posatori`}
                            </p>
                        </div>
                        <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5">
                            <p className="text-xs font-semibold text-stone-500">Lavoro totale (base del compenso)</p>
                            <p className="text-base font-bold text-stone-900 mt-0.5">
                                {estimate.laborDays.toFixed(1).replace('.', ',')} giornate-uomo
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                                Le giornate di tutti gli operatori sommate
                                {estimate.crewSize > 1 ? `: in ${estimate.crewSize} diventano ${formatDays(estimate.workDays)} di cantiere.` : '.'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-stone-500 mb-2">Fasi del cantiere</p>
                        <ul className="space-y-2">
                            {estimate.phases.map((phase) => (
                                <li
                                    key={phase.key}
                                    className="flex items-baseline justify-between gap-4 text-sm border-b border-stone-100 last:border-0 pb-2 last:pb-0"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-stone-700">{phase.label}</p>
                                        {phase.note && <p className="text-xs text-stone-400 font-medium">{phase.note}</p>}
                                        {phase.criticalShare < 1 && (
                                            <p className="text-xs text-blue-600 font-medium">
                                                Si fa in parallelo ad altre lavorazioni: allunga il cantiere solo del{' '}
                                                {Math.round(phase.criticalShare * 100)}%
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0 tabular-nums">
                                        {phase.criticalDays > 0 && (
                                            <span className="font-bold text-stone-900">
                                                {(phase.criticalDays / throughput).toFixed(1).replace('.', ',')} gg di cantiere
                                            </span>
                                        )}
                                        {phase.laborDays > 0 && (
                                            <span className="block text-xs font-medium text-stone-400">
                                                {phase.laborDays.toFixed(1).replace('.', ',')} g/uomo
                                            </span>
                                        )}
                                        {phase.curingDays > 0 && (
                                            <span className="block text-xs font-bold text-amber-600">
                                                + {formatDays(phase.curingDays)} di attesa
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 pt-3 border-t border-stone-200 text-xs text-stone-500 leading-relaxed">
                            Somma arrotondata alla mezza giornata: <strong className="text-stone-800">{formatDays(estimate.workDays)} di cantiere</strong>
                            {estimate.curingDays > 0 && <> + {formatDays(estimate.curingDays)} di attesa = <strong className="text-stone-800">{formatDays(estimate.calendarDays)}</strong></>}.
                        </p>
                    </div>
                </div>
            )}

            {isTeam && estimate.warnings.length > 0 && (
                <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-200/70">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> Da verificare
                    </p>
                    <ul className="space-y-1">
                        {estimate.warnings.map((warning, i) => (
                            <li key={i} className="text-xs text-amber-900 font-medium leading-relaxed">
                                • {warning}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {proNote && (
                <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 text-sm text-blue-900 font-medium">
                    <span className="font-bold">Nota del posatore: </span>
                    {proNote}
                </div>
            )}

            {showAssumptions && (
                <div className="p-6 bg-stone-50/70">
                    <p className="text-xs font-bold text-stone-500 flex items-center gap-1.5 mb-2">
                        <Info className="w-3.5 h-3.5" /> Come è calcolata
                    </p>
                    <ul className="space-y-1">
                        {estimate.assumptions.map((assunzione, i) => (
                            <li key={i} className="text-xs text-stone-500 font-medium leading-relaxed">
                                • {assunzione}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
