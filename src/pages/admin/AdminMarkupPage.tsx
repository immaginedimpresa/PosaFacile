import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Percent, Euro, Save, Loader2, RotateCcw } from 'lucide-react'
import { ITALIAN_PROVINCES } from '@/lib/provinces'

interface MarkupRow {
    id: string
    company_name: string | null
    full_name: string | null
    billing_province: string | null
    billing_city: string | null
    price_per_sqm: number | null
    markup_percent: number
    markup_fixed: number
}

/** Prezzo esposto al cliente: la percentuale agisce sul mq, il fisso è una tantum. */
export function clientPricePerSqm(base: number | null, percent: number): number | null {
    if (base === null || base === undefined) return null
    return base * (1 + percent / 100)
}

const euro = (v: number | null) =>
    v === null || v === undefined
        ? '—'
        : `€ ${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const inputClass =
    'w-full px-2 py-1 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none'

export function AdminMarkupPage() {
    const [rows, setRows] = useState<MarkupRow[]>([])
    const [draft, setDraft] = useState<Record<string, { percent: string; fixed: string }>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [province, setProvince] = useState('')
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const [bulkPercent, setBulkPercent] = useState('')
    const [bulkFixed, setBulkFixed] = useState('')

    const fetchRows = async () => {
        setLoading(true)
        setError(null)
        try {
            const { data, error: fetchError } = await supabase
                .from('professional_profiles')
                .select('id, company_name, full_name, billing_province, billing_city, price_per_sqm, markup_percent, markup_fixed')
                .order('company_name', { ascending: true })
            if (fetchError) throw fetchError

            const list = (data ?? []) as MarkupRow[]
            setRows(list)
            setDraft(Object.fromEntries(list.map(r => [r.id, {
                percent: String(r.markup_percent ?? 0),
                fixed: String(r.markup_fixed ?? 0),
            }])))
            setSelected(new Set())
        } catch (err: any) {
            setError(err.message || 'Impossibile caricare i markup')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchRows() }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter(r => {
            if (province && r.billing_province !== province) return false
            if (!q) return true
            return [r.company_name, r.full_name, r.billing_city].some(f => f?.toLowerCase().includes(q))
        })
    }, [rows, search, province])

    /** Righe il cui valore in bozza differisce da quello salvato. */
    const dirtyIds = useMemo(() => {
        return rows
            .filter(r => {
                const d = draft[r.id]
                if (!d) return false
                return Number(d.percent) !== Number(r.markup_percent) ||
                       Number(d.fixed) !== Number(r.markup_fixed)
            })
            .map(r => r.id)
    }, [rows, draft])

    const setDraftValue = (id: string, field: 'percent' | 'fixed', value: string) =>
        setDraft(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

    const toggleRow = (id: string) =>
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })

    const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))

    const toggleAllFiltered = () =>
        setSelected(prev => {
            const next = new Set(prev)
            if (allFilteredSelected) filtered.forEach(r => next.delete(r.id))
            else filtered.forEach(r => next.add(r.id))
            return next
        })

    /** Il bulk scrive solo nella bozza: nulla va a DB finché non si salva. */
    const applyBulk = () => {
        if (selected.size === 0) return
        const percent = bulkPercent.trim()
        const fixed = bulkFixed.trim()
        if (percent === '' && fixed === '') return

        setDraft(prev => {
            const next = { ...prev }
            for (const id of selected) {
                next[id] = {
                    percent: percent === '' ? next[id].percent : percent,
                    fixed: fixed === '' ? next[id].fixed : fixed,
                }
            }
            return next
        })
        setNotice(`Valori applicati a ${selected.size} professionisti. Salva per confermare.`)
    }

    const resetDraft = () => {
        setDraft(Object.fromEntries(rows.map(r => [r.id, {
            percent: String(r.markup_percent ?? 0),
            fixed: String(r.markup_fixed ?? 0),
        }])))
        setNotice(null)
    }

    const save = async () => {
        if (dirtyIds.length === 0) return
        setSaving(true)
        setError(null)
        setNotice(null)

        try {
            const invalid = dirtyIds.find(id => {
                const d = draft[id]
                const p = Number(d.percent), f = Number(d.fixed)
                return !Number.isFinite(p) || !Number.isFinite(f) || p < 0 || f < 0
            })
            if (invalid) throw new Error('I markup devono essere numeri non negativi')

            // Un update per riga: PostgREST non fa update multipli con valori
            // diversi in una sola chiamata, e le righe modificate sono poche.
            const results = await Promise.all(dirtyIds.map(id =>
                supabase
                    .from('professional_profiles')
                    .update({
                        markup_percent: Number(draft[id].percent),
                        markup_fixed: Number(draft[id].fixed),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id)
            ))

            const failed = results.find(r => r.error)
            if (failed?.error) throw failed.error

            setRows(prev => prev.map(r => dirtyIds.includes(r.id)
                ? { ...r, markup_percent: Number(draft[r.id].percent), markup_fixed: Number(draft[r.id].fixed) }
                : r))
            setNotice(`${dirtyIds.length} markup salvati.`)
        } catch (err: any) {
            setError(err.message || 'Salvataggio fallito')
        } finally {
            setSaving(false)
        }
    }

    const usedProvinces = useMemo(() => {
        const codes = new Set(rows.map(r => r.billing_province).filter(Boolean) as string[])
        return ITALIAN_PROVINCES.filter(p => codes.has(p.code))
    }, [rows])

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Markup Professionisti</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Ricarico della piattaforma sulla tariffa di posa: percentuale sul mq e importo una tantum.
                </p>
            </div>

            {/* Filtri */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cerca professionista o città..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                    <option value="">Tutte le province</option>
                    {usedProvinces.map(p => (
                        <option key={p.code} value={p.code}>{p.code} · {p.name}</option>
                    ))}
                </select>
            </div>

            {/* Azioni in blocco */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Applica in blocco
                        </span>
                        <span className="text-sm text-gray-600">
                            {selected.size === 0
                                ? 'Nessun professionista selezionato'
                                : `${selected.size} selezionati`}
                        </span>
                    </div>
                    <div className="w-32">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Markup %</label>
                        <div className="relative">
                            <Percent className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                                type="number" min="0" step="0.5" placeholder="invariato"
                                className={`${inputClass} pl-7 text-left`}
                                value={bulkPercent}
                                onChange={e => setBulkPercent(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-36">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Una tantum</label>
                        <div className="relative">
                            <Euro className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                                type="number" min="0" step="1" placeholder="invariato"
                                className={`${inputClass} pl-7 text-left`}
                                value={bulkFixed}
                                onChange={e => setBulkFixed(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={applyBulk}
                        disabled={selected.size === 0 || (bulkPercent.trim() === '' && bulkFixed.trim() === '')}
                        className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Applica alla selezione
                    </button>
                    <p className="text-xs text-gray-400 w-full">
                        Un campo lasciato vuoto non viene toccato. Le modifiche restano in bozza finché non salvi.
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {notice && !error && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">{notice}</div>
            )}

            {/* Tabella */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allFilteredSelected}
                                        onChange={toggleAllFiltered}
                                        aria-label="Seleziona tutti i risultati"
                                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                                    />
                                </th>
                                <th className="px-4 py-4">Professionista</th>
                                <th className="px-4 py-4 text-right">Tariffa/mq</th>
                                <th className="px-4 py-4 text-right w-28">Markup %</th>
                                <th className="px-4 py-4 text-right w-32">Una tantum</th>
                                <th className="px-4 py-4 text-right">Prezzo cliente/mq</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Caricamento...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nessun professionista trovato.</td></tr>
                            ) : (
                                filtered.map(r => {
                                    const d = draft[r.id] ?? { percent: '0', fixed: '0' }
                                    const percentNum = Number(d.percent)
                                    const client = clientPricePerSqm(r.price_per_sqm, Number.isFinite(percentNum) ? percentNum : 0)
                                    const isDirty = dirtyIds.includes(r.id)
                                    return (
                                        <tr key={r.id} className={isDirty ? 'bg-amber-50/60' : 'hover:bg-gray-50/50'}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(r.id)}
                                                    onChange={() => toggleRow(r.id)}
                                                    aria-label={`Seleziona ${r.company_name ?? r.id}`}
                                                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{r.company_name || '—'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {r.billing_city}{r.billing_province ? ` (${r.billing_province})` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">{euro(r.price_per_sqm)}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number" min="0" step="0.5"
                                                    className={inputClass}
                                                    value={d.percent}
                                                    onChange={e => setDraftValue(r.id, 'percent', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number" min="0" step="1"
                                                    className={inputClass}
                                                    value={d.fixed}
                                                    onChange={e => setDraftValue(r.id, 'fixed', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                {euro(client)}
                                                {Number(d.fixed) > 0 && (
                                                    <span className="block text-xs font-normal text-gray-500">
                                                        + {euro(Number(d.fixed))} una tantum
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Barra di salvataggio: compare solo se c'è qualcosa da salvare */}
            {dirtyIds.length > 0 && (
                <div className="sticky bottom-4 flex items-center justify-between gap-4 bg-gray-900 text-white rounded-xl px-5 py-3 shadow-xl">
                    <span className="text-sm">
                        {dirtyIds.length} {dirtyIds.length === 1 ? 'modifica non salvata' : 'modifiche non salvate'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={resetDraft}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white disabled:opacity-50"
                        >
                            <RotateCcw size={15} /> Annulla
                        </button>
                        <button
                            onClick={save}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-60"
                        >
                            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                                    : <><Save size={15} /> Salva</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
