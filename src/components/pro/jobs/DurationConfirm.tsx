import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Check, Minus, Plus, ShieldCheck } from 'lucide-react'
import { useProStore, type Job } from '@/store/proStore'
import { durationForOrder } from '@/lib/orderDuration'
import { formatDays } from '@/lib/layingDuration'

/**
 * Conferma della durata da parte del posatore.
 *
 * Il modello è: le giornate le calcola PosaFacile, il professionista le
 * corregge se il preventivo è sbagliato. Chi posa conosce il cantiere e ha
 * l'ultima parola, ma parte da un numero già proposto invece che dal foglio
 * bianco. Finché non si pronuncia, la pianificazione lavora su una stima non
 * validata e la data di fine resta provvisoria.
 */
export function DurationConfirm({ job }: { job: Job }) {
    const { confirmJobDuration } = useProStore()
    const stima = durationForOrder(job.order)

    const giaConfermate = Number(job.order?.confirmed_work_days) || 0
    const [workDays, setWorkDays] = useState<number>(giaConfermate || stima.workDays)
    const [note, setNote] = useState<string>(job.order?.duration_pro_note || '')
    const [saving, setSaving] = useState(false)

    if (stima.workDays <= 0) return null

    const calendarDays = Math.ceil(workDays) + stima.curingDays
    const confermata = giaConfermate > 0
    const scostamento = workDays - stima.workDays

    const handleConfirm = async () => {
        if (workDays <= 0) {
            toast.error('Indica almeno mezza giornata di lavoro')
            return
        }
        setSaving(true)
        try {
            await confirmJobDuration(job.id, workDays, calendarDays, note.trim() || null)
            toast.success('Durata confermata: la pianificazione userà queste giornate')
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Impossibile confermare la durata')
        } finally {
            setSaving(false)
        }
    }

    const step = (delta: number) => setWorkDays((d) => Math.max(0.5, Math.round((d + delta) * 2) / 2))

    return (
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-stone-900">Giornate di cantiere</h3>
                        <p className="text-stone-500 text-sm mt-0.5">
                            PosaFacile ha stimato <strong className="text-stone-700">{formatDays(stima.workDays)}</strong>
                            {stima.crewSize > 1 ? ` con una squadra di ${stima.crewSize}` : ' per un posatore'}.
                            Confermale o correggile.
                        </p>
                    </div>
                </div>
                {confermata && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200/80">
                        <ShieldCheck className="w-3.5 h-3.5" /> Vale la tua durata
                    </span>
                )}
            </div>

            <div className="p-6 space-y-4">
                {/* Selettore giornate a mezze giornate */}
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => step(-0.5)}
                        className="w-10 h-10 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/90 shadow-2xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                        <Minus size={16} />
                    </button>
                    <div className="text-center flex-1">
                        <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight tabular-nums">
                            {formatDays(workDays)}
                        </p>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                            {stima.curingDays > 0
                                ? `${calendarDays} giorni di cantiere, attese tecniche incluse`
                                : `${calendarDays} giorni di cantiere`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => step(0.5)}
                        className="w-10 h-10 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/90 shadow-2xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {Math.abs(scostamento) >= 0.5 && (
                    <p
                        className={`text-xs font-bold px-3 py-2 rounded-xl border ${
                            scostamento > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                                : 'bg-blue-50 text-blue-700 border-blue-200/80'
                        }`}
                    >
                        {scostamento > 0 ? '+' : ''}
                        {scostamento.toFixed(1).replace('.', ',')} giorni rispetto alla stima di PosaFacile.
                        Scrivi il motivo nella nota: l’ufficio la legge prima di fissare la data con il
                        cliente, e la data di fine viene ricalcolata su queste giornate.
                    </p>
                )}

                <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nota per l'ufficio (es. sottofondo da livellare, accesso senza ascensore)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none resize-none"
                />

                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                    <Check size={16} />
                    {saving
                        ? 'Salvataggio...'
                        : Math.abs(scostamento) < 0.25
                            ? `Confermo: ${formatDays(workDays)}`
                            : `Correggo a ${formatDays(workDays)}`}
                </button>

                <ul className="space-y-1 pt-1">
                    {stima.assumptions.map((a, i) => (
                        <li key={i} className="text-xs text-stone-400 font-medium leading-relaxed">• {a}</li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
