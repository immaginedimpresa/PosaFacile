import {
    STEP_OWNER_LABELS,
    STEP_STATUS_STYLES,
    timelineProgress,
    currentStep as pickCurrentStep,
    type ResolvedStep,
} from '@/lib/orderTimeline'
import {
    Check,
    Clock,
    Loader2,
    AlertCircle,
    Minus,
} from 'lucide-react'

const STEP_ICONS = {
    done: Check,
    active: Loader2,
    blocked: AlertCircle,
    pending: Clock,
    skipped: Minus,
} as const

const formatDateTime = (iso: string | null): string | null => {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

interface OrderTimelineProps {
    steps: ResolvedStep[]
    /** Mostra chi deve muoversi per ogni tappa: utile ad admin e posatore. */
    showOwner?: boolean
    className?: string
}

/**
 * Barra di stato dell'ordine.
 * Verticale su ogni breakpoint: le tappe sono dodici e hanno note e date,
 * una fila orizzontale le renderebbe illeggibili appena c'è del testo.
 */
export function OrderTimeline({ steps, showOwner = false, className = '' }: OrderTimelineProps) {
    if (steps.length === 0) return null

    const progress = timelineProgress(steps)
    const attuale = pickCurrentStep(steps)

    return (
        <div className={`bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden ${className}`}>
            {/* Riepilogo: percentuale e tappa in corso */}
            <div className="p-6 border-b border-stone-100">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Stato di avanzamento
                        </p>
                        <p className="text-lg font-bold text-stone-900 mt-0.5">
                            {attuale ? attuale.label : 'In lavorazione'}
                        </p>
                        {attuale && (
                            <p className="text-sm text-stone-500 font-medium mt-0.5">
                                {attuale.status === 'done' ? attuale.doneDescription : attuale.description}
                            </p>
                        )}
                    </div>
                    <span className="text-2xl font-black text-stone-900 tracking-tight tabular-nums">
                        {progress}%
                    </span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Elenco delle tappe */}
            <ol className="p-6 space-y-0">
                {steps.map((step, index) => {
                    const style = STEP_STATUS_STYLES[step.status]
                    const Icon = STEP_ICONS[step.status]
                    const ultimo = index === steps.length - 1
                    const quando = formatDateTime(step.occurredAt)
                    const scadenza = step.status !== 'done' ? formatDateTime(step.dueAt) : null

                    return (
                        <li key={step.key} className="flex gap-4">
                            {/* Colonna indicatore + filo di collegamento */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${style.dot}`}
                                >
                                    <Icon className={`w-4 h-4 ${step.status === 'active' ? 'animate-spin' : ''}`} />
                                </div>
                                {!ultimo && (
                                    <div
                                        className={`w-0.5 flex-1 min-h-8 ${step.status === 'done' ? 'bg-emerald-500/40' : 'bg-stone-200'}`}
                                    />
                                )}
                            </div>

                            {/* Contenuto della tappa */}
                            <div className={`flex-1 ${ultimo ? 'pb-0' : 'pb-6'}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className={`text-sm font-bold ${style.text}`}>{step.label}</h4>
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}
                                    >
                                        {style.label}
                                    </span>
                                    {showOwner && (
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                            {STEP_OWNER_LABELS[step.owner]}
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-stone-500 font-medium mt-1 leading-relaxed">
                                    {step.status === 'done' ? step.doneDescription : step.description}
                                </p>

                                {step.note && (
                                    <p className="text-sm text-stone-700 font-medium mt-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/70">
                                        {step.note}
                                    </p>
                                )}

                                {(quando || scadenza) && (
                                    <p className="text-xs text-stone-400 font-medium mt-2">
                                        {quando && `Completato il ${quando}`}
                                        {scadenza && `Previsto entro il ${scadenza}`}
                                    </p>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}

/** Versione compatta per elenchi ordini: solo pallini e tappa corrente. */
export function OrderTimelineCompact({ steps }: { steps: ResolvedStep[] }) {
    if (steps.length === 0) return null

    const attuale = pickCurrentStep(steps)
    const rilevanti = steps.filter((s) => s.status !== 'skipped')

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
                {rilevanti.map((step) => (
                    <span
                        key={step.key}
                        title={`${step.label} — ${STEP_STATUS_STYLES[step.status].label}`}
                        className={`h-1.5 w-4 rounded-full ${
                            step.status === 'done'
                                ? 'bg-emerald-500'
                                : step.status === 'blocked'
                                    ? 'bg-amber-500'
                                    : step.status === 'active'
                                        ? 'bg-orange-500'
                                        : 'bg-stone-200'
                        }`}
                    />
                ))}
            </div>
            {attuale && (
                <span className="text-xs font-bold text-stone-500 truncate">{attuale.label}</span>
            )}
        </div>
    )
}
