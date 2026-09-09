import { useEffect, useState } from 'react'
import { Euro, Hammer, Percent, ShieldCheck, Wrench } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { RatesSettings } from '@/components/pro/RatesSettings'
import { VOCI_SERVIZI, fetchRates, type ProfessionalRates } from '@/services/ratesService'

/**
 * Le tariffe hanno una pagina propria.
 *
 * Stavano in fondo al profilo, dopo dati anagrafici, fiscali e zone: sono il
 * dato che entra in ogni preventivo e che si aggiorna piu' spesso di tutto il
 * resto, e finiva dove nessuno arrivava a scorrere.
 *
 * Il layout e' quello delle altre pagine dell'area professionisti:
 * contenitore max-w-7xl, intestazione con icona e striscia di quattro card.
 */
export function RatesPage() {
    const { user } = useAuth()
    const [rates, setRates] = useState<ProfessionalRates | null>(null)
    const [ricarica, setRicarica] = useState(0)

    useEffect(() => {
        if (!user?.id) return
        let attivo = true
        void (async () => {
            const dati = await fetchRates(user.id)
            if (attivo) setRates(dati)
        })()
        return () => { attivo = false }
    }, [user?.id, ricarica])

    const esclusi = rates?.servizi_esclusi?.length ?? 0
    const offerti = VOCI_SERVIZI.length - esclusi
    const posaBase = rates?.laying_dritta ?? null
    const posaAlta = rates
        ? Math.max(
            rates.laying_dritta ?? 0, rates.laying_correre ?? 0, rates.laying_diagonale ?? 0,
            rates.laying_spina ?? 0, rates.laying_mosaico ?? 0,
        )
        : null
    // Una tariffa vale come compilata solo se e' un numero positivo.
    const compilate = rates
        ? [
            rates.laying_dritta, rates.laying_correre, rates.laying_diagonale,
            rates.laying_spina, rates.laying_mosaico,
        ].filter((v) => Number(v) > 0).length
        : 0

    const euro = (valore: number | null) =>
        valore && valore > 0 ? `€ ${Number(valore).toFixed(2)}` : '—'

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Euro className="w-8 h-8 text-orange-500" />
                        <span>Le tue Tariffe</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Il prezzo della manodopera nei preventivi che ricevi: PosaFacile fornisce
                        il materiale, la posa e le lavorazioni le quoti tu.
                    </p>
                </div>
            </div>

            {/* Striscia KPI, come nelle altre pagine dell'area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Hammer size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Posa dritta
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">{euro(posaBase)}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">Al mq, tariffa di riferimento</div>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Percent size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Tariffa più alta
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">{euro(posaAlta)}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">Lo schema che paghi di più</div>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Wrench size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Lavorazioni offerte
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {offerti} <span className="text-base text-stone-400">/ {VOCI_SERVIZI.length}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                            {esclusi === 0 ? 'Le esegui tutte' : `${esclusi} escluse`}
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        compilate === 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Schemi quotati
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {compilate} <span className="text-base text-stone-400">/ 5</span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                            {compilate === 5 ? 'Nessun valore di ripiego' : 'I vuoti usano i valori di piattaforma'}
                        </div>
                    </div>
                </div>
            </div>

            {user?.id && (
                <RatesSettings professionalId={user.id} onSaved={() => setRicarica((n) => n + 1)} />
            )}
        </div>
    )
}
