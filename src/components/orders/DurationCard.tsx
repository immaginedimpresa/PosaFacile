import { AlertTriangle, CalendarClock, Hammer, Hourglass, Info, ShieldCheck, Users } from 'lucide-react'
import { formatDays, type DurationEstimate } from '@/lib/layingDuration'

const CONFIDENCE_STYLES = {
    alta: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', label: 'Stima affidabile' },
    media: { badge: 'bg-blue-50 text-blue-700 border-blue-200/80', label: 'Stima indicativa' },
    bassa: { badge: 'bg-amber-50 text-amber-700 border-amber-200/80', label: 'Da verificare in sopralluogo' },
} as const

interface DurationCardProps {
    estimate: DurationEstimate
    /** Giornate confermate dal professionista: prevalgono sulla stima. */
    confirmedWorkDays?: number | null
    confirmedCalendarDays?: number | null
    proNote?: string | null
    /** Il dettaglio delle fasi interessa admin e posatore più del cliente. */
    showPhases?: boolean
    /** Nasconde il blocco "Come è calcolata" se non necessario */
    hideAssumptions?: boolean
    className?: string
}

/**
 * Scheda "quanto dura il cantiere".
 * Distingue sempre le giornate di lavoro dalle attese tecniche: è la domanda
 * che il cliente pone davvero ("quanti giorni ho casa occupata?") e quella a
 * cui il posatore risponde ("quante giornate ci metto?").
 */
export function DurationCard({
    estimate,
    confirmedWorkDays,
    confirmedCalendarDays,
    proNote,
    showPhases = false,
    hideAssumptions = false,
    className = '',
}: DurationCardProps) {
    const confermato = typeof confirmedWorkDays === 'number' && confirmedWorkDays > 0
    const workDays = confermato ? confirmedWorkDays! : estimate.workDays
    const calendarDays = confermato
        ? (confirmedCalendarDays ?? Math.ceil(workDays) + estimate.curingDays)
        : estimate.calendarDays

    if (estimate.workDays <= 0 && !confermato) return null

    const confidence = CONFIDENCE_STYLES[estimate.confidence]

    return (
        <div className={`bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden ${className}`}>
            <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-stone-900">Stima dei lavori</h3>
                        <p className="text-stone-500 text-sm mt-0.5">
                            {confermato ? 'Confermata dal professionista' : 'Calcolata sul progetto'}
                        </p>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-100 border-b border-stone-100">
                <div className="p-5">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Giornate-uomo
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
                        {formatDays(estimate.laborDays)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1 font-medium">
                        Il lavoro da fare, base del compenso
                    </p>
                </div>
                <div className="p-5">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Hammer className="w-3.5 h-3.5" /> Giorni di cantiere
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
                        {formatDays(workDays)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1 font-medium">
                        {estimate.crewSize > 1
                            ? `Squadra di ${estimate.crewSize} (resa ${estimate.crewThroughput}×)`
                            : 'Un posatore'}
                        {!confermato && estimate.maxWorkDays > estimate.minWorkDays
                            ? ` · ${estimate.minWorkDays}–${estimate.maxWorkDays} gg`
                            : ''}
                    </p>
                </div>
                <div className="p-5">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Hourglass className="w-3.5 h-3.5" /> Durata totale
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
                        {formatDays(calendarDays)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1 font-medium">
                        {estimate.curingDays > 0
                            ? `Include ${formatDays(estimate.curingDays)} di asciugatura`
                            : 'Nessuna attesa tecnica prevista'}
                    </p>
                </div>
            </div>

            {showPhases && estimate.phases.length > 0 && (
                <div className="p-6 border-b border-stone-100">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">
                        Dettaglio delle fasi
                    </p>
                    <ul className="space-y-2">
                        {estimate.phases.map((phase) => (
                            <li
                                key={phase.key}
                                className="flex items-baseline justify-between gap-4 text-sm border-b border-stone-100 last:border-0 pb-2 last:pb-0"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-stone-700 truncate">{phase.label}</p>
                                    {phase.note && (
                                        <p className="text-xs text-stone-400 font-medium">{phase.note}</p>
                                    )}
                                    {phase.criticalShare < 1 && (
                                        <p className="text-xs text-blue-600 font-medium">
                                            In parallelo ad altre lavorazioni: sul calendario pesa il{' '}
                                            {Math.round(phase.criticalShare * 100)}%
                                        </p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    {phase.laborDays > 0 && (
                                        <span className="font-bold text-stone-900 tabular-nums">
                                            {phase.laborDays.toFixed(2).replace('.', ',')} g/uomo
                                        </span>
                                    )}
                                    {phase.criticalShare < 1 && phase.criticalDays > 0 && (
                                        <span className="block text-xs font-medium text-stone-500 tabular-nums">
                                            → {phase.criticalDays.toFixed(2).replace('.', ',')} sul cantiere
                                        </span>
                                    )}
                                    {phase.curingDays > 0 && (
                                        <span className="block text-xs font-bold text-amber-600 tabular-nums">
                                            +{phase.curingDays} g attesa
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 pt-3 border-t border-stone-200 flex items-baseline justify-between text-sm">
                        <span className="font-bold text-stone-900">Totale</span>
                        <span className="text-right">
                            <span className="font-black text-stone-900 tabular-nums">
                                {estimate.laborDays.toFixed(1).replace('.', ',')} g/uomo
                            </span>
                            <span className="block text-xs font-medium text-stone-500 tabular-nums">
                                ÷ {estimate.crewThroughput}× squadra = {formatDays(estimate.workDays)} di cantiere
                                {estimate.curingDays > 0 && ` + ${estimate.curingDays} di attesa`}
                            </span>
                        </span>
                    </div>
                </div>
            )}

            {estimate.warnings.length > 0 && (
                <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-200/70">
                    <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
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

            {!hideAssumptions && estimate.assumptions.length > 0 && (
                <div className="p-6 bg-stone-50/70">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
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
