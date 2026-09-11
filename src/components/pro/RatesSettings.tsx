import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Euro, Hammer, Info, Save, Wrench, Truck } from 'lucide-react'
import {
    VOCI_POSA,
    VOCI_SERVIZI,
    fetchRates,
    saveRates,
    type ProfessionalRates,
} from '@/services/ratesService'

interface RatesSettingsProps {
    professionalId: string
    onSaved?: () => void
}

const CARD = 'bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6'
const INPUT = 'w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 '
    + 'focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 '
    + 'text-sm font-bold transition-all outline-none'

/**
 * Tariffe della manodopera.
 *
 * Il preventivo che arriva al cliente si costruisce da qui: PosaFacile mette
 * il materiale e il proprio margine, il resto e' il prezzo dichiarato dal
 * professionista. Finche' queste caselle restano vuote il preventivo usa
 * valori di piattaforma, che quasi certamente non sono i suoi.
 */
export function RatesSettings({ professionalId, onSaved }: RatesSettingsProps) {
    const [rates, setRates] = useState<ProfessionalRates | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let attivo = true
        void (async () => {
            const dati = await fetchRates(professionalId)
            if (attivo) setRates(dati)
        })()
        return () => { attivo = false }
    }, [professionalId])

    if (!rates) {
        return <div className={`${CARD} text-sm text-stone-500 font-medium`}>Carico le tue tariffe…</div>
    }

    const aggiorna = (campo: keyof ProfessionalRates, valore: string) => {
        const n = valore === '' ? null : Number(valore)
        setRates((prev) => (prev ? { ...prev, [campo]: n } : prev))
    }

    const toggleServizio = (chiave: string) => {
        setRates((prev) => {
            if (!prev) return prev
            const esclusi = prev.servizi_esclusi ?? []
            return {
                ...prev,
                servizi_esclusi: esclusi.includes(chiave)
                    ? esclusi.filter((s) => s !== chiave)
                    : [...esclusi, chiave],
            }
        })
    }

    const isPortoPianoAttivo = rates.porto_piano_attivo !== false && !rates.servizi_esclusi?.includes('porto_piano')

    const togglePortoPiano = () => {
        setRates((prev) => {
            if (!prev) return prev
            const nuovoStato = !isPortoPianoAttivo
            const esclusi = prev.servizi_esclusi ?? []
            const nuoviEsclusi = nuovoStato
                ? esclusi.filter((s) => s !== 'porto_piano')
                : (esclusi.includes('porto_piano') ? esclusi : [...esclusi, 'porto_piano'])

            return {
                ...prev,
                porto_piano_attivo: nuovoStato,
                servizi_esclusi: nuoviEsclusi,
                porto_piano: prev.porto_piano ?? 2.0,
            }
        })
    }

    const salva = async () => {
        if (!rates.laying_dritta || rates.laying_dritta <= 0) {
            toast.error('La posa dritta è la tariffa di riferimento: indicala.')
            return
        }
        setSaving(true)
        try {
            await saveRates(rates)
            toast.success('Tariffe aggiornate: i nuovi preventivi le useranno')
            onSaved?.()
        } catch (err: any) {
            toast.error(err.message || 'Non sono riuscito a salvare le tariffe')
        } finally {
            setSaving(false)
        }
    }

    const campoPrezzo = (campo: keyof ProfessionalRates, valore: number | null) => (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">€</span>
            <input
                type="number"
                step="0.50"
                min="0"
                value={valore ?? ''}
                onChange={(e) => aggiorna(campo, e.target.value)}
                className={INPUT}
                placeholder="—"
            />
        </div>
    )

    return (
        <div className="space-y-5">
            {/* Come si compone il prezzo che vede il cliente */}
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 flex items-start gap-3.5">
                <Info size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-white">Da qui nasce il preventivo</p>
                    <p className="text-sm text-stone-300 leading-relaxed mt-1.5">
                        PosaFacile fornisce il materiale e ci aggiunge il proprio margine. Tutto il
                        resto — posa e lavorazioni — è il prezzo che dichiari tu. Il cliente non
                        vede le tue tariffe: vede il costo della lavorazione che ha scelto.
                    </p>
                </div>
            </div>

            {/* Posa e lavorazioni affiancate: sono due listini paralleli */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <div className={CARD}>
                    <div className="flex items-start gap-3.5 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                            <Hammer size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900">Posa, al metro quadro</h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Uno schema più lento vale di più: la spina non si paga come la dritta
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {VOCI_POSA.map((voce) => (
                            <div key={voce.campo} className="flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-stone-800">{voce.label}</p>
                                    <p className="text-xs text-stone-500">{voce.nota}</p>
                                </div>
                                <div className="w-32 flex-shrink-0">
                                    {campoPrezzo(voce.campo, rates[voce.campo] as number | null)}
                                </div>
                            </div>
                        ))}
                    </div>
            </div>

                {/* Lavorazioni accessorie */}
                <div className={CARD}>
                    <div className="flex items-start gap-3.5 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900">Lavorazioni accessorie</h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Spegni quelle che non esegui: non verranno proposte ai tuoi clienti
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {VOCI_SERVIZI.map((voce) => {
                            const escluso = rates.servizi_esclusi?.includes(voce.chiave)
                            return (
                                <div
                                    key={voce.chiave}
                                    className={`flex items-center gap-4 rounded-xl transition-opacity ${escluso ? 'opacity-45' : ''}`}
                                >
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={!escluso}
                                        aria-label={`${voce.label}: ${escluso ? 'non la eseguo' : 'la eseguo'}`}
                                        onClick={() => toggleServizio(voce.chiave)}
                                        className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative ${
                                            escluso ? 'bg-stone-200' : 'bg-orange-500'
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                                escluso ? 'left-0.5' : 'left-0.5 translate-x-4'
                                            }`}
                                        />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-stone-800">{voce.label}</p>
                                        <p className="text-xs text-stone-500">
                                            {escluso ? 'Non la esegui' : voce.nota}
                                        </p>
                                    </div>

                                    <div className="w-32 flex-shrink-0">
                                        {escluso ? (
                                            <p className="text-right text-xs font-bold text-stone-400 pr-1">
                                                esclusa
                                            </p>
                                        ) : (
                                            <>
                                                {campoPrezzo(voce.campo, rates[voce.campo] as number | null)}
                                                <p className="text-[10px] text-stone-400 font-bold text-right mt-1">
                                                    {voce.unita}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
            </div>

            </div>

            {/* Trasporto Materiale al Piano (dal punto di scarico strada/box al piano di lavoro) */}
            <div className={CARD}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-5">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                            <Truck size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-stone-900">Trasporto Materiale al Piano</h3>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    isPortoPianoAttivo
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                                        : 'bg-stone-100 text-stone-500'
                                }`}>
                                    {isPortoPianoAttivo ? 'Servizio Attivo' : 'Non Eseguito'}
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Portare bancali, piastrelle e collante dal punto di scarico merci (bordo strada o box) fino al piano dell&apos;immobile
                            </p>
                        </div>
                    </div>

                    {/* Switch Toggle */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs font-semibold text-stone-700">
                            {isPortoPianoAttivo ? 'Eseguo il servizio' : 'Non la eseguo'}
                        </span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isPortoPianoAttivo}
                            aria-label={`Trasporto materiale al piano: ${isPortoPianoAttivo ? 'attivo' : 'disattivato'}`}
                            onClick={togglePortoPiano}
                            className={`w-12 h-6 rounded-full flex-shrink-0 transition-colors relative cursor-pointer ${
                                isPortoPianoAttivo ? 'bg-orange-500' : 'bg-stone-200'
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                    isPortoPianoAttivo ? 'left-0.5 translate-x-6' : 'left-0.5'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Tariffa al mq per piano */}
                {isPortoPianoAttivo ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center p-4 bg-orange-50/40 rounded-xl border border-orange-200/60">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">
                                    Quanto prendi al mq per ciascun piano?
                                </label>
                                <p className="text-xs text-stone-500 leading-relaxed">
                                    Compenso calcolato automaticamente moltiplicando la tua tariffa per i mq complessivi del cantiere e per il numero di piani da salire.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 justify-start md:justify-end">
                                <div className="w-36">
                                    {campoPrezzo('porto_piano', rates.porto_piano as number | null)}
                                </div>
                                <span className="text-xs font-bold text-stone-600 whitespace-nowrap">
                                    € / mq per piano
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-stone-500 flex items-center gap-2 bg-stone-50 p-3 rounded-lg border border-stone-100">
                            <Info size={14} className="text-orange-500 shrink-0" />
                            <span>
                                <strong>Esempio di calcolo:</strong> per un appartamento al 2° piano di 50 mq, con tariffa di € {(Number(rates.porto_piano) || 2.0).toFixed(2)}/mq per piano, il tuo compenso per la movimentazione sarà di € {(50 * 2 * (Number(rates.porto_piano) || 2.0)).toFixed(2)}.
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-500">
                        Hai disattivato questo servizio. I clienti che selezionano te come posatore non potranno affidarti la salita dei materiali dal punto di scarico: dovranno portarli al piano autonomamente prima dell&apos;inizio della posa oppure richiedere la consegna al piano al corriere.
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={salva}
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
                {saving ? <Euro size={16} /> : <Save size={16} />}
                {saving ? 'Salvataggio…' : 'Salva le tariffe'}
            </button>
        </div>
    )
}
