import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
    CalendarClock,
    CalendarRange,
    Layers,
    PauseCircle,
    PlayCircle,
    Save,
    Timer,
} from 'lucide-react'
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

const CARD = 'bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6'
const LABEL = 'block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5'
const HINT = 'text-xs text-stone-500 font-medium mt-1.5 leading-relaxed'
const SELECT = 'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 '
    + 'focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 '
    + 'text-sm font-medium transition-all outline-none'

/**
 * Regole permanenti di disponibilità.
 *
 * Prima si potevano solo cancellare i giorni a uno a uno: per dire "il sabato
 * non lavoro" servivano cinquantadue clic. Qui si dichiara come si lavora di
 * norma, e il calendario applica la regola da solo.
 *
 * Ogni campo spiega l'effetto che produce sul cliente, non il nome tecnico
 * dell'impostazione: è la differenza fra un pannello che si capisce e uno che
 * si compila a caso.
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
            <div className={`${CARD} text-sm text-stone-500 font-medium`}>
                Carico le tue regole di disponibilità…
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
            toast.success('Regole aggiornate: il calendario dei clienti le applica da subito')
            onSaved?.()
        } catch (err: any) {
            toast.error(err.message || 'Non sono riuscito a salvare le regole')
        } finally {
            setSaving(false)
        }
    }

    const inPausa = Boolean(
        schedule.paused_until && new Date(schedule.paused_until) >= new Date(new Date().toDateString()),
    )

    return (
        <div className="space-y-5">
            {/* Giorni lavorativi */}
            <div className={CARD}>
                <div className="flex items-start gap-3.5 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <CalendarRange size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">Quando lavori</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                            I giorni spenti non compaiono mai nel calendario del cliente
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {GIORNI_SETTIMANA.map((giorno) => {
                        const attivo = schedule.working_days.includes(giorno.iso)
                        return (
                            <button
                                key={giorno.iso}
                                type="button"
                                aria-pressed={attivo}
                                onClick={() => toggleGiorno(giorno.iso)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                                    attivo
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                                        : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
                                }`}
                            >
                                {giorno.breve}
                            </button>
                        )
                    })}
                </div>
                <p className={HINT}>
                    {schedule.working_days.length === 0
                        ? 'Nessun giorno selezionato: così non riceveresti nessuna proposta.'
                        : `Lavori ${schedule.working_days.length} giorni a settimana. Le assenze di un singolo giorno si segnano sul calendario qui sotto.`}
                </p>
            </div>

            {/* Regole di prenotazione */}
            <div className={CARD}>
                <div className="flex items-start gap-3.5 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <Timer size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">Con quanto anticipo</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                            Quanto vicino e quanto lontano un cliente può fissare l’inizio
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={LABEL}>Preavviso minimo</label>
                        <select
                            value={schedule.min_notice_days}
                            onChange={(e) => aggiorna('min_notice_days', Number(e.target.value))}
                            className={SELECT}
                        >
                            <option value={0}>Anche per domani</option>
                            <option value={1}>1 giorno prima</option>
                            <option value={2}>2 giorni prima</option>
                            <option value={3}>3 giorni prima</option>
                            <option value={7}>1 settimana prima</option>
                            <option value={14}>2 settimane prima</option>
                            <option value={30}>1 mese prima</option>
                        </select>
                        <p className={HINT}>
                            {schedule.min_notice_days === 0
                                ? 'Un cliente può fissare un cantiere per domani.'
                                : `Le prossime ${schedule.min_notice_days} giornate restano chiuse: nessuno può prenotarti all’ultimo.`}
                        </p>
                    </div>

                    <div>
                        <label className={LABEL}>Fin dove accetti</label>
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
                        <p className={HINT}>
                            Oltre questo periodo il calendario non propone date: utile se non sai
                            ancora come sarà la stagione.
                        </p>
                    </div>
                </div>
            </div>

            {/* Capacità */}
            <div className={CARD}>
                <div className="flex items-start gap-3.5 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <Layers size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">Quanti cantieri insieme</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                            Quante squadre riesci a tenere in campo nello stesso giorno
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={LABEL}>Cantieri in parallelo</label>
                        <select
                            value={schedule.max_concurrent_jobs}
                            onChange={(e) => aggiorna('max_concurrent_jobs', Number(e.target.value))}
                            className={SELECT}
                        >
                            {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                    {n === 1 ? 'Uno per volta' : `Fino a ${n}`}
                                </option>
                            ))}
                        </select>
                        <p className={HINT}>
                            {schedule.max_concurrent_jobs === 1
                                ? 'Con un cantiere aperto quel giorno risulti occupato.'
                                : `Resti prenotabile finché non hai ${schedule.max_concurrent_jobs} cantieri nello stesso giorno.`}
                        </p>
                    </div>

                    <div>
                        <label className={LABEL}>Giorni di stacco fra un cantiere e l’altro</label>
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
                        <p className={HINT}>
                            Tempo per smontare, spostarti e recuperare eventuali ritardi.
                        </p>
                    </div>
                </div>
            </div>

            {/* Pausa */}
            <div className={`${CARD} ${inPausa ? 'ring-2 ring-amber-400/40 border-amber-200' : ''}`}>
                <div className="flex items-start gap-3.5 mb-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        inPausa ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-stone-500'
                    }`}>
                        {inPausa ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900">
                            {inPausa ? 'Sei in pausa' : 'Sospendi le proposte'}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                            Resti nella rete, ma non ricevi nuovi cantieri fino alla data indicata
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                        <label className={LABEL}>Riprendo dal</label>
                        <input
                            type="date"
                            value={schedule.paused_until ?? ''}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => aggiorna('paused_until', e.target.value || null)}
                            className={SELECT}
                        />
                    </div>
                    {schedule.paused_until && (
                        <button
                            type="button"
                            onClick={() => aggiorna('paused_until', null)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200/90 text-sm font-bold shadow-2xs active:scale-95 transition-all"
                        >
                            Annulla pausa
                        </button>
                    )}
                </div>
                <p className={HINT}>
                    {inPausa
                        ? `I clienti non possono fissare date fino al ${new Date(schedule.paused_until!).toLocaleDateString('it-IT')}. I cantieri già confermati restano.`
                        : 'Lascia vuoto se sei operativo. Utile per ferie o periodi pieni.'}
                </p>
            </div>

            {/* Riepilogo dell'effetto, prima di salvare */}
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-6">
                <div className="flex items-start gap-3.5">
                    <CalendarClock size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Come ti vede un cliente</p>
                        <p className="text-sm text-stone-300 leading-relaxed mt-1.5">
                            {inPausa
                                ? 'In pausa: nessuna data selezionabile finché non riprendi.'
                                : schedule.working_days.length === 0
                                    ? 'Nessun giorno lavorativo: non compari fra le date disponibili.'
                                    : `Può scegliere fra ${GIORNI_SETTIMANA.filter((g) => schedule.working_days.includes(g.iso)).map((g) => g.lungo.toLowerCase()).join(', ')}, a partire da ${schedule.min_notice_days === 0 ? 'domani' : `${schedule.min_notice_days} giorni da oggi`}, fino a ${schedule.booking_horizon_weeks} settimane in avanti.`}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={salva}
                    disabled={saving}
                    className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    <Save size={16} />
                    {saving ? 'Salvataggio…' : 'Salva le regole'}
                </button>
            </div>
        </div>
    )
}
