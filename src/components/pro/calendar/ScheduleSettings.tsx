import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, PauseCircle, Save } from 'lucide-react'
import {
    GIORNI_SETTIMANA,
    fetchSchedule,
    saveSchedule,
    type ProfessionalSchedule,
} from '@/services/scheduleService'

interface ScheduleSettingsProps {
    professionalId: string
    onSaved?: () => void
}

const CARD = 'bg-white rounded-2xl border border-stone-200/90 shadow-xs'
const LABEL = 'block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5'
const SELECT = 'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 '
    + 'focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 '
    + 'text-sm font-bold transition-all outline-none'

/**
 * Regole permanenti di disponibilità.
 *
 * Sono cinque impostazioni: se ognuna prende una scheda con icona, titolo e
 * sottotitolo, la pagina diventa un rotolo e nessuna si legge. Qui stanno in
 * tre blocchi — i giorni, i numeri, la pausa — con le spiegazioni accanto al
 * campo e non sopra la sezione.
 */
export function ScheduleSettings({ professionalId, onSaved }: ScheduleSettingsProps) {
    const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let attivo = true
        void (async () => {
            const dati = await fetchSchedule(professionalId)
            if (attivo) setSchedule(dati)
        })()
        return () => { attivo = false }
    }, [professionalId])

    if (!schedule) {
        return (
            <div className={`${CARD} p-6 text-sm text-stone-500 font-medium`}>
                Carico le tue regole…
            </div>
        )
    }

    const aggiorna = <K extends keyof ProfessionalSchedule>(campo: K, valore: ProfessionalSchedule[K]) =>
        setSchedule((prev) => (prev ? { ...prev, [campo]: valore } : prev))

    const toggleGiorno = (iso: number) => {
        const attuali = schedule.working_days
        aggiorna(
            'working_days',
            attuali.includes(iso)
                ? attuali.filter((g) => g !== iso)
                : [...attuali, iso].sort((a, b) => a - b),
        )
    }

    const salva = async () => {
        if (schedule.working_days.length === 0) {
            toast.error('Scegli almeno un giorno lavorativo, altrimenti non ricevi proposte.')
            return
        }
        setSaving(true)
        try {
            await saveSchedule(schedule)
            toast.success('Regole salvate: il calendario dei clienti le applica da subito')
            onSaved?.()
        } catch (err: any) {
            toast.error(err.message || 'Non sono riuscito a salvare')
        } finally {
            setSaving(false)
        }
    }

    const inPausa = Boolean(
        schedule.paused_until && new Date(schedule.paused_until) >= new Date(new Date().toDateString()),
    )

    const giorniAttivi = GIORNI_SETTIMANA.filter((g) => schedule.working_days.includes(g.iso))

    return (
        <div className="space-y-5">
            {/* Giorni: la scelta più frequente, la più visibile */}
            <div className={`${CARD} p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-base font-bold text-stone-900">Giorni in cui lavori</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                            Quelli spenti non compaiono mai nel calendario del cliente
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={() => aggiorna('working_days', [1, 2, 3, 4, 5])}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                            Lun–Ven
                        </button>
                        <button
                            type="button"
                            onClick={() => aggiorna('working_days', [1, 2, 3, 4, 5, 6])}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                            Lun–Sab
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {GIORNI_SETTIMANA.map((giorno) => {
                        const attivo = schedule.working_days.includes(giorno.iso)
                        return (
                            <button
                                key={giorno.iso}
                                type="button"
                                aria-pressed={attivo}
                                aria-label={giorno.lungo}
                                onClick={() => toggleGiorno(giorno.iso)}
                                className={`py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                                    attivo
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                                        : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300'
                                }`}
                            >
                                {giorno.breve}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* I quattro numeri, in griglia: stessa forma, lettura rapida */}
            <div className={`${CARD} p-6`}>
                <h3 className="text-base font-bold text-stone-900 mb-4">Regole di prenotazione</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                        <label className={LABEL}>Preavviso minimo</label>
                        <select
                            value={schedule.min_notice_days}
                            onChange={(e) => aggiorna('min_notice_days', Number(e.target.value))}
                            className={SELECT}
                        >
                            <option value={0}>Anche per domani</option>
                            <option value={1}>1 giorno</option>
                            <option value={2}>2 giorni</option>
                            <option value={3}>3 giorni</option>
                            <option value={7}>1 settimana</option>
                            <option value={14}>2 settimane</option>
                            <option value={30}>1 mese</option>
                        </select>
                        <p className="text-xs text-stone-500 mt-1.5">Sotto questa soglia non sei prenotabile</p>
                    </div>

                    <div>
                        <label className={LABEL}>Accetti fino a</label>
                        <select
                            value={schedule.booking_horizon_weeks}
                            onChange={(e) => aggiorna('booking_horizon_weeks', Number(e.target.value))}
                            className={SELECT}
                        >
                            <option value={4}>1 mese</option>
                            <option value={8}>2 mesi</option>
                            <option value={12}>3 mesi</option>
                            <option value={26}>6 mesi</option>
                            <option value={52}>1 anno</option>
                        </select>
                        <p className="text-xs text-stone-500 mt-1.5">Oltre, il calendario non propone date</p>
                    </div>

                    <div>
                        <label className={LABEL}>Cantieri in parallelo</label>
                        <select
                            value={schedule.max_concurrent_jobs}
                            onChange={(e) => aggiorna('max_concurrent_jobs', Number(e.target.value))}
                            className={SELECT}
                        >
                            {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n === 1 ? 'Uno per volta' : `Fino a ${n}`}</option>
                            ))}
                        </select>
                        <p className="text-xs text-stone-500 mt-1.5">Quante squadre tieni in campo</p>
                    </div>

                    <div>
                        <label className={LABEL}>Stacco fra cantieri</label>
                        <select
                            value={schedule.buffer_days}
                            onChange={(e) => aggiorna('buffer_days', Number(e.target.value))}
                            className={SELECT}
                        >
                            <option value={0}>Nessuno</option>
                            <option value={1}>1 giorno</option>
                            <option value={2}>2 giorni</option>
                            <option value={3}>3 giorni</option>
                        </select>
                        <p className="text-xs text-stone-500 mt-1.5">Per smontare e spostarti</p>
                    </div>
                </div>
            </div>

            {/* Pausa: una riga, non una scheda intera */}
            <div className={`${CARD} p-5 ${inPausa ? 'ring-2 ring-amber-400/40 border-amber-200' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        inPausa ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-stone-400'
                    }`}>
                        <PauseCircle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900">
                            {inPausa ? 'Sei in pausa' : 'Sospendi le proposte'}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                            {inPausa
                                ? `Nessuna nuova data fino al ${new Date(schedule.paused_until!).toLocaleDateString('it-IT')}. I cantieri confermati restano.`
                                : 'Per ferie lunghe o periodi pieni. Resti nella rete.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                            type="date"
                            aria-label="Riprendo dal"
                            value={schedule.paused_until ?? ''}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => aggiorna('paused_until', e.target.value || null)}
                            className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                        />
                        {schedule.paused_until && (
                            <button
                                type="button"
                                onClick={() => aggiorna('paused_until', null)}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                            >
                                Annulla
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Effetto e salvataggio: restano a vista mentre si modifica */}
            <div className="sticky bottom-4 bg-stone-900 text-stone-100 rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <CalendarClock size={20} className="text-orange-400 flex-shrink-0" />
                    <p className="flex-1 text-sm text-stone-300 leading-relaxed">
                        {inPausa
                            ? 'In pausa: nessuna data selezionabile finché non riprendi.'
                            : giorniAttivi.length === 0
                                ? 'Nessun giorno lavorativo: non compari fra le date disponibili.'
                                : <>
                                    Il cliente sceglie fra{' '}
                                    <strong className="text-white">{giorniAttivi.map((g) => g.breve).join(', ')}</strong>,
                                    da <strong className="text-white">{schedule.min_notice_days === 0 ? 'domani' : `${schedule.min_notice_days} giorni`}</strong>
                                    {' '}fino a <strong className="text-white">{schedule.booking_horizon_weeks} settimane</strong>.
                                </>}
                    </p>
                    <button
                        type="button"
                        onClick={salva}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                        <Save size={16} />
                        {saving ? 'Salvo…' : 'Salva'}
                    </button>
                </div>
            </div>
        </div>
    )
}
