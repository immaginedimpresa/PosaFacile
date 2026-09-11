import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    VOCI_MARKUP,
    fetchRates,
    markupFor,
    type MarkupOverrides,
    type ProfessionalRates,
} from '@/services/ratesService'

interface MarkupVoicesEditorProps {
    professionalId: string
    /** Markup generale: vale per le voci senza eccezione. */
    markupPercent: number
    overrides: MarkupOverrides
    onSaved: (overrides: MarkupOverrides) => void
}

const INPUT = 'w-20 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white '
    + 'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 '
    + 'text-sm font-bold text-right transition-all outline-none'

/**
 * Margini per singola voce di tariffa.
 *
 * Il markup era uno solo per professionista: lo stesso su una posa a spina e
 * su uno smaltimento macerie. Qui si differenzia dove serve, lasciando le
 * altre voci al valore generale — chi non differenzia continua a lavorare con
 * un numero solo.
 */
export function MarkupVoicesEditor({
    professionalId,
    markupPercent,
    overrides,
    onSaved,
}: MarkupVoicesEditorProps) {
    const [rates, setRates] = useState<ProfessionalRates | null>(null)
    const [draft, setDraft] = useState<Record<string, string>>({})
    const [tutte, setTutte] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let attivo = true
        void (async () => {
            const dati = await fetchRates(professionalId)
            if (attivo) setRates(dati)
        })()
        return () => { attivo = false }
    }, [professionalId])

    useEffect(() => {
        setDraft(
            Object.fromEntries(
                VOCI_MARKUP.map((v) => [
                    v.campo,
                    overrides?.[v.campo] !== undefined ? String(overrides[v.campo]) : '',
                ]),
            ),
        )
    }, [overrides])

    const applicaATutte = () => {
        const n = Number(tutte)
        if (tutte.trim() === '' || !Number.isFinite(n) || n < 0) {
            toast.error('Indica una percentuale valida')
            return
        }
        setDraft(Object.fromEntries(VOCI_MARKUP.map((v) => [v.campo, String(n)])))
    }

    const azzeraTutte = () =>
        setDraft(Object.fromEntries(VOCI_MARKUP.map((v) => [v.campo, ''])))

    const salva = async () => {
        // Solo le voci compilate diventano eccezioni: le altre restano al
        // markup generale invece di essere congelate a un valore uguale.
        const nuove: MarkupOverrides = {}
        for (const voce of VOCI_MARKUP) {
            const grezzo = draft[voce.campo]
            if (grezzo === undefined || grezzo.trim() === '') continue
            const n = Number(grezzo)
            if (!Number.isFinite(n) || n < 0) {
                toast.error(`Valore non valido su "${voce.label}"`)
                return
            }
            nuove[voce.campo] = n
        }

        setSaving(true)
        try {
            const { error } = await supabase
                .from('professional_profiles')
                .update({ markup_overrides: nuove, updated_at: new Date().toISOString() })
                .eq('id', professionalId)

            if (error) throw error
            onSaved(nuove)
            toast.success(
                Object.keys(nuove).length === 0
                    ? 'Tutte le voci tornano al markup generale'
                    : `${Object.keys(nuove).length} voci con margine dedicato`,
            )
        } catch (err: any) {
            toast.error(err.message || 'Salvataggio non riuscito')
        } finally {
            setSaving(false)
        }
    }

    const tariffa = (campo: string): number | null => {
        const valore = rates ? (rates as unknown as Record<string, unknown>)[campo] : null
        const n = Number(valore)
        return Number.isFinite(n) && n > 0 ? n : null
    }

    const riga = (voce: typeof VOCI_MARKUP[number]) => {
        const base = tariffa(voce.campo)
        const grezzo = draft[voce.campo] ?? ''
        const usaGenerale = grezzo.trim() === ''
        const percentuale = usaGenerale
            ? markupPercent
            : markupFor(voce.campo, markupPercent, { [voce.campo]: Number(grezzo) })
        const finale = base !== null ? base * (1 + percentuale / 100) : null

        return (
            <tr key={voce.campo} className="hover:bg-stone-50/50">
                <td className="px-4 py-2.5 text-sm font-medium text-stone-800">
                    <span>{voce.label}</span>
                    {voce.campo === 'porto_piano' && rates?.porto_piano_attivo === false && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                            Disattivato dal posatore
                        </span>
                    )}
                </td>
                <td className="px-4 py-2.5 text-sm text-stone-600 text-right tabular-nums">
                    {base !== null ? `€ ${base.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={grezzo}
                            placeholder={String(markupPercent)}
                            onChange={(e) =>
                                setDraft((prev) => ({ ...prev, [voce.campo]: e.target.value }))
                            }
                            className={INPUT}
                        />
                        <span className="text-xs font-bold text-stone-400">%</span>
                    </div>
                </td>
                <td className="px-4 py-2.5 text-sm font-bold text-stone-900 text-right tabular-nums">
                    {finale !== null ? `€ ${finale.toFixed(2)}` : '—'}
                </td>
            </tr>
        )
    }

    return (
        <div className="bg-stone-50/70 border-t border-stone-200/80 p-5 space-y-4">
            {/* Azione su tutte le voci insieme */}
            <div className="flex flex-wrap items-center gap-2.5">
                <Wand2 size={16} className="text-orange-500" />
                <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                    Applica a tutte le voci
                </span>
                <input
                    type="number"
                    min="0"
                    value={tutte}
                    onChange={(e) => setTutte(e.target.value)}
                    placeholder="%"
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-sm font-bold text-right outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                    type="button"
                    onClick={applicaATutte}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all active:scale-95"
                >
                    Applica
                </button>
                <button
                    type="button"
                    onClick={azzeraTutte}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors"
                >
                    Torna al markup generale
                </button>
            </div>

            {!rates ? (
                <p className="text-sm text-stone-500 font-medium py-2">Carico le tariffe…</p>
            ) : (
                <div className="bg-white rounded-xl border border-stone-200/90 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-stone-50/80 border-b border-stone-100 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                            <tr>
                                <th className="px-4 py-2.5 text-left">Voce</th>
                                <th className="px-4 py-2.5 text-right">Tariffa posatore</th>
                                <th className="px-4 py-2.5 text-right">Markup</th>
                                <th className="px-4 py-2.5 text-right">Prezzo cliente</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            <tr className="bg-stone-50/40">
                                <td colSpan={4} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                    Posa
                                </td>
                            </tr>
                            {VOCI_MARKUP.filter((v) => v.gruppo === 'posa').map(riga)}
                            <tr className="bg-stone-50/40">
                                <td colSpan={4} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                    Lavorazioni accessorie
                                </td>
                            </tr>
                            {VOCI_MARKUP.filter((v) => v.gruppo === 'servizi').map(riga)}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-stone-500 font-medium">
                    Le caselle vuote usano il markup generale del posatore ({markupPercent}%).
                </p>
                <button
                    type="button"
                    onClick={salva}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Salvo…' : 'Salva margini'}
                </button>
            </div>
        </div>
    )
}
