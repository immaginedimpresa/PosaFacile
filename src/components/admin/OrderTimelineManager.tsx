import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
    AlertCircle,
    CalendarCheck,
    Check,
    ChevronDown,
    Loader2,
    MessageSquareWarning,
    RotateCcw,
} from 'lucide-react'
import {
    buildTimeline,
    STEP_OWNER_LABELS,
    STEP_STATUS_STYLES,
    timelineProgress,
    type ResolvedStep,
    type StepStatus,
    type TimelineStepKey,
} from '@/lib/orderTimeline'
import {
    confirmWorkSchedule,
    ensureOrderMilestones,
    requestCustomerInfo,
    resolveCustomerInfo,
    setOrderMilestone,
} from '@/services/orderTimelineService'
import { effectiveDuration, isDurationConfirmed } from '@/lib/orderDuration'
import { estimateEndDate, formatDays } from '@/lib/layingDuration'

/** Gli stati selezionabili a mano: 'active' lo calcola la timeline stessa. */
const SELECTABLE: StepStatus[] = ['pending', 'blocked', 'done', 'skipped']

interface OrderTimelineManagerProps {
    orderId: string
    order: any
    actorId?: string | null
    onUpdated?: () => void
}

/**
 * Pannello admin della timeline: una checklist operativa.
 * Ogni tappa si chiude, si riapre o si mette in attesa con una nota che il
 * cliente legge nella sua pagina ordine — è il canale con cui l'admin spiega
 * perché una pratica è ferma senza dover scrivere un'email.
 */
export function OrderTimelineManager({ orderId, order, actorId, onUpdated }: OrderTimelineManagerProps) {
    const [steps, setSteps] = useState<ResolvedStep[]>([])
    const [loading, setLoading] = useState(true)
    const [busyStep, setBusyStep] = useState<TimelineStepKey | null>(null)
    const [expanded, setExpanded] = useState<TimelineStepKey | null>(null)
    const [noteDraft, setNoteDraft] = useState('')
    const [startDate, setStartDate] = useState<string>(
        order?.work_start_date?.slice(0, 10) || order?.installation_date?.slice(0, 10) || '',
    )
    const [infoRequest, setInfoRequest] = useState('')

    // Se il posatore ha corretto le giornate, la programmazione usa le sue.
    const durata = effectiveDuration(order)
    const confermata = isDurationConfirmed(order)
    const fine = startDate ? estimateEndDate(startDate, durata) : null

    const load = useCallback(async () => {
        setLoading(true)
        const milestones = await ensureOrderMilestones(orderId)
        setSteps(buildTimeline(order?.status || 'new', milestones))
        setLoading(false)
    }, [orderId, order?.status])

    useEffect(() => {
        load()
    }, [load])

    const updateStep = async (step: TimelineStepKey, status: StepStatus, note?: string | null) => {
        setBusyStep(step)
        try {
            await setOrderMilestone(orderId, step, { status, ...(note !== undefined ? { note } : {}) }, actorId)
            await load()
            onUpdated?.()
            toast.success('Timeline aggiornata')
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Impossibile aggiornare la tappa')
        } finally {
            setBusyStep(null)
        }
    }

    const handleRequestInfo = async () => {
        if (!infoRequest.trim()) {
            toast.error('Scrivi cosa serve al cliente prima di inviare la richiesta')
            return
        }
        setBusyStep('info_pending')
        try {
            await requestCustomerInfo(orderId, infoRequest.trim(), actorId)
            setInfoRequest('')
            await load()
            onUpdated?.()
            toast.success('Richiesta inviata: l’ordine risulta in attesa del cliente')
        } catch (err: any) {
            toast.error(err.message || 'Impossibile registrare la richiesta')
        } finally {
            setBusyStep(null)
        }
    }

    const handleConfirmSchedule = async () => {
        if (!startDate) {
            toast.error('Seleziona la data di inizio lavori')
            return
        }
        setBusyStep('date_confirmed')
        try {
            await confirmWorkSchedule(orderId, startDate, durata, actorId)
            await load()
            onUpdated?.()
            toast.success('Data confermata e avviso "prepara la stanza" programmato')
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Impossibile confermare la data')
        } finally {
            setBusyStep(null)
        }
    }

    if (loading) {
        return (
            <div className="py-10 text-center text-stone-400">
                <Loader2 size={24} className="mx-auto animate-spin mb-2 text-orange-500" />
                <p className="text-xs font-medium">Caricamento timeline...</p>
            </div>
        )
    }

    const progress = timelineProgress(steps)
    const infoStep = steps.find((s) => s.key === 'info_pending')

    return (
        <div className="space-y-5">
            {/* Avanzamento complessivo */}
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Avanzamento pratica
                    </h3>
                    <span className="text-lg font-black text-stone-900 tabular-nums">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Programmazione cantiere */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <CalendarCheck size={14} className="text-orange-500" />
                    <span>Programmazione cantiere</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">Inizio lavori</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">Fine prevista</label>
                        <div className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100/70 text-stone-500 text-sm font-medium">
                            {fine ? fine.toLocaleDateString('it-IT') : '—'}
                        </div>
                    </div>
                </div>
                <p className="text-xs text-stone-500 font-medium">
                    Durata {confermata ? 'confermata dal posatore' : 'stimata da PosaFacile'}:{' '}
                    <strong className="text-stone-900">{formatDays(durata.workDays)} di cantiere</strong>
                    {durata.curingDays > 0 && ` + ${formatDays(durata.curingDays)} di attese tecniche`}.
                </p>
                {!confermata && (
                    <p className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80">
                        Il posatore non ha ancora confermato le giornate: la data di fine è ancora
                        una stima e può cambiare.
                    </p>
                )}
                <button
                    type="button"
                    onClick={handleConfirmSchedule}
                    disabled={busyStep === 'date_confirmed'}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                    <CalendarCheck size={15} />
                    Conferma data e programma avvisi
                </button>
            </div>

            {/* Richiesta informazioni al cliente */}
            <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200/70 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <MessageSquareWarning size={14} className="text-amber-600" />
                    <span>Informazioni mancanti</span>
                </h3>
                {infoStep?.status === 'blocked' ? (
                    <>
                        <p className="text-sm font-medium text-amber-900">
                            In attesa del cliente: {infoStep.note || 'informazioni non specificate'}
                        </p>
                        <button
                            type="button"
                            onClick={async () => {
                                setBusyStep('info_pending')
                                try {
                                    await resolveCustomerInfo(orderId, infoStep.note, actorId)
                                    await load()
                                    onUpdated?.()
                                    toast.success('Informazioni registrate: l’ordine riparte')
                                } catch (err: any) {
                                    toast.error(err.message || 'Impossibile chiudere l’attesa')
                                } finally {
                                    setBusyStep(null)
                                }
                            }}
                            disabled={busyStep === 'info_pending'}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200/90 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                            <Check size={14} /> Informazioni ricevute
                        </button>
                    </>
                ) : (
                    <>
                        <textarea
                            rows={2}
                            value={infoRequest}
                            onChange={(e) => setInfoRequest(e.target.value)}
                            placeholder="Es. servono le misure del vano porta e la conferma dell'accesso al cantiere"
                            className="w-full text-sm p-3 bg-white rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-stone-900 resize-none font-medium"
                        />
                        <button
                            type="button"
                            onClick={handleRequestInfo}
                            disabled={busyStep === 'info_pending'}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200/90 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                            <AlertCircle size={14} /> Metti in attesa e chiedi al cliente
                        </button>
                    </>
                )}
            </div>

            {/* Checklist delle tappe */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="p-5 border-b border-stone-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Tappe dell’ordine
                    </h3>
                </div>
                <ul className="divide-y divide-stone-100">
                    {steps.map((step) => {
                        const style = STEP_STATUS_STYLES[step.status]
                        const aperto = expanded === step.key
                        return (
                            <li key={step.key} className="p-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        title={step.status === 'done' ? 'Riapri la tappa' : 'Segna come completata'}
                                        onClick={() =>
                                            updateStep(step.key, step.status === 'done' ? 'pending' : 'done')
                                        }
                                        disabled={busyStep === step.key}
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer active:scale-95 ${style.dot}`}
                                    >
                                        {busyStep === step.key ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : step.status === 'done' ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-stone-900">{step.label}</p>
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}
                                            >
                                                {style.label}
                                            </span>
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                                {STEP_OWNER_LABELS[step.owner]}
                                            </span>
                                        </div>
                                        {step.note && (
                                            <p className="text-xs text-stone-500 font-medium mt-0.5 truncate">
                                                {step.note}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setExpanded(aperto ? null : step.key)
                                            setNoteDraft(step.note || '')
                                        }}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                                    >
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform ${aperto ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>

                                {aperto && (
                                    <div className="mt-3 pl-11 space-y-2">
                                        <textarea
                                            rows={2}
                                            value={noteDraft}
                                            onChange={(e) => setNoteDraft(e.target.value)}
                                            placeholder="Nota visibile al cliente nella pagina dell’ordine"
                                            className="w-full text-sm p-3 bg-stone-50/50 rounded-xl border border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none font-medium transition-all"
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            {SELECTABLE.map((st) => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => updateStep(step.key, st, noteDraft || null)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                                                        step.status === st
                                                            ? STEP_STATUS_STYLES[st].badge
                                                            : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                                                    }`}
                                                >
                                                    {STEP_STATUS_STYLES[st].label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
