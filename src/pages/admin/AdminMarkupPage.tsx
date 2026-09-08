import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Search,
    Percent,
    Euro,
    Save,
    Loader2,
    RefreshCw,
    Users,
    Clock
} from 'lucide-react'
import { ITALIAN_PROVINCES } from '@/lib/provinces'
import { toast } from 'sonner'

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
    'w-full px-3 py-1.5 text-sm text-right border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-hidden bg-stone-50/50 focus:bg-white transition-colors'

export function AdminMarkupPage() {
    const [rows, setRows] = useState<MarkupRow[]>([])
    const [draft, setDraft] = useState<Record<string, { percent: string; fixed: string }>>({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [province, setProvince] = useState('')
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const [bulkPercent, setBulkPercent] = useState('')
    const [bulkFixed, setBulkFixed] = useState('')

    const fetchRows = async (isManual = false) => {
        if (isManual) setRefreshing(true)
        else setLoading(true)
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
            toast.error('Errore durante il caricamento dei markup')
        } finally {
            setLoading(false)
            setRefreshing(false)
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

    const toggleAllFiltered = () => {
        setSelected(prev => {
            const next = new Set(prev)
            if (allFilteredSelected) {
                filtered.forEach(r => next.delete(r.id))
            } else {
                filtered.forEach(r => next.add(r.id))
            }
            return next
        })
    }

    const applyBulk = () => {
        const hasPercent = bulkPercent.trim() !== ''
        const hasFixed = bulkFixed.trim() !== ''
        if (!hasPercent && !hasFixed) return

        const pNum = Number(bulkPercent)
        const fNum = Number(bulkFixed)
        if ((hasPercent && (!Number.isFinite(pNum) || pNum < 0)) ||
            (hasFixed && (!Number.isFinite(fNum) || fNum < 0))) {
            toast.error('I markup devono essere numeri non negativi')
            return
        }

        setDraft(prev => {
            const next = { ...prev }
            selected.forEach(id => {
                const current = next[id] ?? { percent: '0', fixed: '0' }
                next[id] = {
                    percent: hasPercent ? String(pNum) : current.percent,
                    fixed: hasFixed ? String(fNum) : current.fixed,
                }
            })
            return next
        })
        toast.success(`Modifiche applicate in bozza a ${selected.size} posatori`)
    }

    const resetDraft = () => {
        setDraft(Object.fromEntries(rows.map(r => [r.id, {
            percent: String(r.markup_percent ?? 0),
            fixed: String(r.markup_fixed ?? 0),
        }])))
        toast.info('Modifiche in bozza ripristinate')
    }

    const save = async () => {
        if (dirtyIds.length === 0) return
        setSaving(true)
        setError(null)

        try {
            const invalid = dirtyIds.find(id => {
                const d = draft[id]
                const p = Number(d.percent), f = Number(d.fixed)
                return !Number.isFinite(p) || !Number.isFinite(f) || p < 0 || f < 0
            })
            if (invalid) throw new Error('I markup devono essere numeri non negativi')

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
            toast.success(`${dirtyIds.length} markup salvati con successo`)
        } catch (err: any) {
            setError(err.message || 'Salvataggio fallito')
            toast.error(`Errore durante il salvataggio: ${err.message}`)
        } finally {
            setSaving(false)
        }
    }

    const usedProvinces = useMemo(() => {
        const codes = new Set(rows.map(r => r.billing_province).filter(Boolean) as string[])
        return ITALIAN_PROVINCES.filter(p => codes.has(p.code))
    }, [rows])

    const kpiMetrics = useMemo(() => {
        const totalCount = rows.length
        const avgPercent = rows.length
            ? rows.reduce((sum, r) => sum + (Number(r.markup_percent) || 0), 0) / rows.length
            : 0
        const avgFixed = rows.length
            ? rows.reduce((sum, r) => sum + (Number(r.markup_fixed) || 0), 0) / rows.length
            : 0
        const dirtyCount = dirtyIds.length

        return {
            totalCount,
            avgPercent,
            avgFixed,
            dirtyCount
        }
    }, [rows, dirtyIds])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Percent className="w-8 h-8 text-orange-500" />
                        <span>Markup Piattaforma</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Configura la percentuale di ricarico e l'importo fisso applicati alle tariffe dei posatori per calcolare il prezzo al cliente.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {dirtyIds.length > 0 && (
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>Salva {dirtyIds.length} Modifiche</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => fetchRows(true)}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Ricarica markup"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Users size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Posatori a Listino</div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">{kpiMetrics.totalCount}</div>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Percent size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Markup % Medio</div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">+{kpiMetrics.avgPercent.toFixed(1)}%</div>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Euro size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Fisso Medio</div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">€ {kpiMetrics.avgFixed.toFixed(2)}</div>
                    </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpiMetrics.dirtyCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-stone-50 text-stone-400'}`}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Modifiche in Bozza</div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">{kpiMetrics.dirtyCount}</div>
                    </div>
                </div>
            </div>

            {/* Filter / Search Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
                        <input
                            type="text"
                            placeholder="Cerca professionista o città..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm bg-stone-50/50"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="sm:col-span-4">
                        <select
                            value={province}
                            onChange={e => setProvince(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm bg-stone-50/50"
                        >
                            <option value="">Tutte le province ({usedProvinces.length})</option>
                            {usedProvinces.map(p => (
                                <option key={p.code} value={p.code}>{p.code} · {p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Azioni in Blocco */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs mb-6">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div className="flex flex-wrap items-end gap-3 flex-1">
                        <div>
                            <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">Applica in blocco</span>
                            <span className="text-sm font-bold text-stone-900">{selected.size} posatori selezionati</span>
                        </div>
                        <div className="w-32">
                            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">Markup %</label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                                <input type="number" min="0" step="0.5" placeholder="invariato" className={`${inputClass} pl-7 text-left`} value={bulkPercent} onChange={e => setBulkPercent(e.target.value)} />
                            </div>
                        </div>
                        <div className="w-36">
                            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">Una tantum (€)</label>
                            <div className="relative">
                                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                                <input type="number" min="0" step="1" placeholder="invariato" className={`${inputClass} pl-7 text-left`} value={bulkFixed} onChange={e => setBulkFixed(e.target.value)} />
                            </div>
                        </div>
                        <button type="button" onClick={applyBulk} disabled={selected.size === 0 || (bulkPercent.trim() === '' && bulkFixed.trim() === '')} className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-sm font-bold rounded-xl disabled:opacity-40 cursor-pointer">Applica</button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-6 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-rose-600 font-bold text-xs underline">Chiudi</button>
                </div>
            )}

            {/* Tabella */}
            <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
                <table className="w-full text-left">
                    <thead className="bg-stone-50/80 border-b border-stone-200">
                        <tr>
                            <th className="px-5 py-4 w-12 text-center"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="rounded border-stone-300 text-orange-500 cursor-pointer" /></th>
                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">Professionista</th>
                            <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-stone-500">Tariffa/mq</th>
                            <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-stone-500 w-36">Markup %</th>
                            <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-stone-500 w-36">Una Tantum (€)</th>
                            <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-stone-500">Prezzo Finale</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loading ? <tr><td colSpan={6} className="px-6 py-16 text-center text-stone-400">Caricamento...</td></tr> : filtered.map(r => {
                            const d = draft[r.id] ?? { percent: '0', fixed: '0' }
                            const client = clientPricePerSqm(r.price_per_sqm, Number(d.percent))
                            const isDirty = dirtyIds.includes(r.id)
                            return (
                                <tr key={r.id} className={isDirty ? 'bg-amber-50/50' : 'hover:bg-stone-50/70'}>
                                    <td className="px-5 py-3.5 text-center"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} className="rounded border-stone-300 text-orange-500 cursor-pointer" /></td>
                                    <td className="px-6 py-3.5"><div className="font-bold text-stone-900">{r.company_name || '—'}</div><div className="text-xs text-stone-500">{r.billing_city}</div></td>
                                    <td className="px-6 py-3.5 text-right font-medium">{euro(r.price_per_sqm)}</td>
                                    <td className="px-6 py-3.5"><input type="number" className={inputClass} value={d.percent} onChange={e => setDraftValue(r.id, 'percent', e.target.value)} /></td>
                                    <td className="px-6 py-3.5"><input type="number" className={inputClass} value={d.fixed} onChange={e => setDraftValue(r.id, 'fixed', e.target.value)} /></td>
                                    <td className="px-6 py-3.5 text-right font-bold text-stone-900">{euro(client)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Sticky Save Bar */}
            {dirtyIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-6 bg-stone-900 text-white rounded-2xl px-6 py-3.5 shadow-2xl border border-stone-700 w-full max-w-xl">
                    <span className="text-sm font-semibold">{dirtyIds.length} modifiche in sospeso</span>
                    <div className="flex items-center gap-2">
                        <button onClick={resetDraft} className="px-3.5 py-2 text-xs font-semibold text-stone-300 hover:text-white cursor-pointer">Annulla</button>
                        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 rounded-xl font-bold text-xs cursor-pointer">{saving ? 'Salvataggio...' : 'Salva Tutto'}</button>
                    </div>
                </div>
            )}
        </div>
    )
}
