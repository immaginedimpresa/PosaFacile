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
    variant?: 'full' | 'progress-only' | 'steps-only'
    className?: string
}

/**
 * Barra di avanzamento dell'ordine: smart, compatta e altamente leggibile.
 */
export function OrderProgressBar({
    steps,
    className = '',
    embedded = false,
}: {
    steps: ResolvedStep[]
    className?: string
    embedded?: boolean
}) {
    if (steps.length === 0) return null

    const progress = timelineProgress(steps)
    const attuale = pickCurrentStep(steps)
    const rilevanti = steps.filter((s) => s.status !== 'skipped')

    // Modalità Integrata (Embedded all'interno della card principale ordine/preventivo)
    if (embedded) {
        return (
            <div className={`space-y-2.5 ${className}`}>
                {/* Riquadro Intelligente Compatto: Stato & Percentuale */}
                <div className="bg-stone-50/80 rounded-xl p-3 sm:px-4 sm:py-3 border border-stone-200/70 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                            </span>
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
                                    Stato Cantiere:
                                </span>
                                <span className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight">
                                    {attuale ? (attuale.status === 'done' ? (attuale.doneLabel || attuale.label) : (attuale.activeLabel || attuale.label)) : 'In lavorazione'}
                                </span>
                                {attuale && (
                                    <span className="hidden md:inline text-xs text-stone-500 font-medium truncate max-w-sm">
                                        — {attuale.status === 'done' ? attuale.doneDescription : attuale.description}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                            <div className="flex items-center gap-1.5 bg-white border border-stone-200/80 shadow-2xs px-2.5 py-0.5 rounded-full">
                                <span className="text-xs sm:text-sm font-black text-orange-600 font-mono tabular-nums">
                                    {progress}%
                                </span>
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                    Avanzamento
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Descrizione visibile su mobile */}
                    {attuale && (
                        <p className="text-xs text-stone-500 font-medium mt-1 md:hidden leading-relaxed">
                            {attuale.status === 'done' ? attuale.doneDescription : attuale.description}
                        </p>
                    )}

                    {/* Barra di Avanzamento Snella */}
                    <div className="mt-2.5">
                        <div className="h-2 rounded-full bg-stone-200/70 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 transition-all duration-500 shadow-2xs"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Micro-indicatori tappe (da tablet/desktop sm+) */}
                    {rilevanti.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-stone-200/50 hidden sm:flex items-center justify-between gap-1 text-[10px]">
                            {rilevanti.map((step, idx) => {
                                const isDone = step.status === 'done'
                                const isActive = step.status === 'active' || step.status === 'blocked'
                                return (
                                    <div
                                        key={step.key || idx}
                                        title={`${step.label}: ${step.status === 'done' ? 'Completato' : step.status === 'active' ? 'In corso' : 'In attesa'}`}
                                        className="flex items-center gap-1.5 shrink-0"
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                isDone
                                                    ? 'bg-emerald-500'
                                                    : isActive
                                                    ? 'bg-orange-500 ring-2 ring-orange-200'
                                                    : 'bg-stone-300'
                                            }`}
                                        />
                                        <span
                                            className={`truncate max-w-[85px] ${
                                                isActive
                                                    ? 'font-bold text-stone-900'
                                                    : isDone
                                                    ? 'font-medium text-stone-600'
                                                    : 'text-stone-400'
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                        {idx < rilevanti.length - 1 && (
                                            <span className="text-stone-300 ml-0.5">›</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Modalità Standalone: Snella, moderna, senza margini gonfi
    return (
        <div className={`bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden p-4 sm:p-5 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                        <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Stato di avanzamento del cantiere
                        </p>
                    </div>
                    <p className="text-base sm:text-lg font-black text-stone-900 mt-0.5 tracking-tight">
                        {attuale ? (attuale.status === 'done' ? (attuale.doneLabel || attuale.label) : (attuale.activeLabel || attuale.label)) : 'In lavorazione'}
                    </p>
                    {attuale && (
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                            {attuale.status === 'done' ? attuale.doneDescription : attuale.description}
                        </p>
                    )}
                </div>
                <div className="sm:text-right flex items-center sm:flex-col justify-between gap-1 flex-shrink-0">
                    <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight tabular-nums">
                        {progress}%
                    </span>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Completamento</p>
                </div>
            </div>
            <div className="h-2 rounded-full bg-stone-100 overflow-hidden border border-stone-200/60">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 shadow-2xs"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

/**
 * Elenco verticale di tutti gli stati del cantiere con indicatori e date.
 */
export function OrderTimelineSteps({ steps, showOwner = false, className = '' }: OrderTimelineProps) {
    if (steps.length === 0) return null

    return (
        <div className={`bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden ${className}`}>
            <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100/80">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">Stati e fasi del cantiere</h3>
                        <p className="text-xs text-stone-500">Cronologia operativa dall'ordine alla chiusura</p>
                    </div>
                </div>
            </div>

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

/**
 * Componente unificato o selettivo per la barra di stato dell'ordine.
 */
export function OrderTimeline({ steps, showOwner = false, variant = 'full', className = '' }: OrderTimelineProps) {
    if (variant === 'progress-only') return <OrderProgressBar steps={steps} className={className} />
    if (variant === 'steps-only') return <OrderTimelineSteps steps={steps} showOwner={showOwner} className={className} />

    return (
        <div className={`space-y-6 ${className}`}>
            <OrderProgressBar steps={steps} />
            <OrderTimelineSteps steps={steps} showOwner={showOwner} />
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
                        className={`h-1.5 w-4 rounded-full ${step.status === 'done'
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
