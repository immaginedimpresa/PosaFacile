import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Briefcase,
    Search,
    ShieldCheck,
    ShieldAlert,
    Award,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    RefreshCw,
    TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

import { AddProfessionalDialog } from '@/components/admin/AddProfessionalDialog'
import { EditProfessionalDialog, type EditableProfessional } from '@/components/admin/EditProfessionalDialog'

type Professional = EditableProfessional

const PAGE_SIZE = 25

const euro = (value: number | null) =>
    value === null || value === undefined
        ? '—'
        : `€ ${Number(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function AdminProfessionalsPage() {
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all')
    const [page, setPage] = useState(0)

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editing, setEditing] = useState<Professional | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    const fetchProfessionals = async (isManual = false) => {
        if (isManual) setRefreshing(true)
        else setLoading(true)
        setError(null)
        try {
            const { data, error: fetchError } = await supabase
                .from('professional_profiles')
                .select('*')
                .order('company_name', { ascending: true })

            if (fetchError) throw fetchError
            setProfessionals((data ?? []) as Professional[])
        } catch (err: any) {
            console.error('Error fetching pros:', err)
            setError(err.message || 'Impossibile caricare i professionisti')
            toast.error('Errore durante il caricamento dei professionisti')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchProfessionals()
    }, [])

    const toggleVerify = async (pro: Professional) => {
        const next = !pro.verified
        setProfessionals(prev => prev.map(p => (p.id === pro.id ? { ...p, verified: next } : p)))
        setBusyId(pro.id)
        try {
            const { error: updateError } = await supabase
                .from('professional_profiles')
                .update({ verified: next, updated_at: new Date().toISOString() })
                .eq('id', pro.id)
            if (updateError) throw updateError
            toast.success(next ? `Posatore "${pro.company_name || pro.full_name}" approvato!` : `Stato verifica revocato`)
        } catch (err: any) {
            setProfessionals(prev => prev.map(p => (p.id === pro.id ? { ...p, verified: pro.verified } : p)))
            toast.error(`Stato non aggiornato: ${err.message}`)
        } finally {
            setBusyId(null)
        }
    }

    const handleDelete = async (pro: Professional) => {
        const label = pro.company_name || pro.full_name || pro.id.slice(0, 8)
        if (!confirm(`Eliminare definitivamente "${label}"?\n\nVerranno rimossi anche account, zone di lavoro e competenze.`)) {
            return
        }

        setBusyId(pro.id)
        setError(null)
        try {
            const { data, error: fnError } = await supabase.functions.invoke('delete-user', {
                body: { userId: pro.id },
            })
            if (fnError) throw fnError
            if (data?.error) throw new Error(data.error)

            setProfessionals(prev => prev.filter(p => p.id !== pro.id))
            toast.success(`Posatore "${label}" eliminato con successo`)
        } catch (err: any) {
            console.error('Error deleting professional:', err)
            toast.error(`Eliminazione fallita: ${err.message}`)
        } finally {
            setBusyId(null)
        }
    }

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        return professionals.filter(p => {
            if (statusFilter === 'verified' && !p.verified) return false
            if (statusFilter === 'pending' && p.verified) return false
            if (!q) return true
            return [p.company_name, p.full_name, p.vat_number, p.fiscal_code, p.billing_city, p.billing_province, p.pec]
                .some(field => field?.toLowerCase().includes(q))
        })
    }, [professionals, searchTerm, statusFilter])

    useEffect(() => { setPage(0) }, [searchTerm, statusFilter])

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

    // KPI Metrics
    const kpiMetrics = useMemo(() => {
        const totalCount = professionals.length
        const verifiedCount = professionals.filter(p => p.verified).length
        const pendingCount = professionals.filter(p => !p.verified).length
        const prices = professionals.map(p => Number(p.price_per_sqm)).filter(p => p > 0)
        const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

        return {
            totalCount,
            verifiedCount,
            pendingCount,
            avgPrice
        }
    }, [professionals])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-orange-500" />
                        <span>Rete Professionisti</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Gestisci l'albo dei posatori qualificati, verifiche documentali, tariffe base e contatti.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsAddDialogOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20"
                    >
                        <Plus size={16} />
                        <span>Nuovo Professionista</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => fetchProfessionals(true)}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Ricarica lista"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Totale Posatori */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Briefcase size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Totale Registrati
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.totalCount}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                            Albo posatori PosaFacile
                        </div>
                    </div>
                </div>

                {/* 2. Posatori Verificati */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Verificati & Attivi
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.verifiedCount}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                            Assegnabili ai cantieri
                        </div>
                    </div>
                </div>

                {/* 3. In Attesa di Verifica */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            In Attesa Approvazione
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.pendingCount}
                        </div>
                        <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                            Documenti da controllare
                        </div>
                    </div>
                </div>

                {/* 4. Tariffa Media */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Tariffa Media Base
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            € {kpiMetrics.avgPrice.toFixed(2)}
                            <span className="text-xs font-normal text-stone-500 ml-1">/mq</span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                            Media su profili attivi
                        </div>
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
                            placeholder="Cerca per azienda, referente, P.IVA, città o provincia..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50"
                        />
                    </div>

                    <div className="sm:col-span-4">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50"
                        >
                            <option value="all">Tutti gli stati</option>
                            <option value="verified">Solo Verificati</option>
                            <option value="pending">Solo In Attesa</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center justify-between mb-6">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-xs">
                        Chiudi
                    </button>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50/80 border-b border-stone-200">
                            <tr>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">Professionista</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">Dati Aziendali</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">Zona</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">Prezzo Base</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">Valutazione</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">Stato</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-stone-400">
                                        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <span>Caricamento albo posatori...</span>
                                    </td>
                                </tr>
                            ) : visible.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-stone-500">
                                        <Briefcase size={32} className="mx-auto text-stone-300 mb-2" />
                                        <p className="font-bold text-stone-900">Nessun professionista trovato</p>
                                        <p className="text-xs text-stone-400 mt-1">Prova a reimpostare i parametri di ricerca.</p>
                                    </td>
                                </tr>
                            ) : (
                                visible.map(pro => (
                                    <tr key={pro.id} className="hover:bg-stone-50/70 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-stone-900">{pro.company_name || '—'}</div>
                                            <div className="text-stone-500 text-xs mt-0.5">{pro.full_name || pro.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-stone-600">
                                            <div><strong className="text-stone-500">P.IVA:</strong> {pro.vat_number || '—'}</div>
                                            {pro.fiscal_code && <div className="text-stone-400">CF: {pro.fiscal_code}</div>}
                                            <div className="flex gap-2 text-[11px] text-stone-400 mt-1">
                                                {pro.sdi_code && <span>SDI: {pro.sdi_code}</span>}
                                                {pro.pec && <span className="truncate max-w-[160px] text-stone-500">{pro.pec}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-stone-600">
                                            <div className="font-semibold text-stone-800">{pro.billing_city || '—'}</div>
                                            <div className="text-stone-400">{pro.billing_province ? `(${pro.billing_province})` : ''}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-stone-900 whitespace-nowrap">
                                            {euro(pro.price_per_sqm)}
                                            {pro.price_per_sqm != null && <span className="text-xs font-normal text-stone-400 ml-1">/mq</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-orange-500 font-bold text-xs">
                                                <Award size={15} />
                                                <span>{pro.rating ? Number(pro.rating).toFixed(1) : 'Nuovo'}</span>
                                            </div>
                                            <div className="text-stone-400 text-xs mt-0.5">{pro.phone || 'Nessun tel.'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {pro.verified ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <ShieldCheck size={13} />
                                                    <span>Verificato</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <ShieldAlert size={13} />
                                                    <span>In attesa</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleVerify(pro)}
                                                    disabled={busyId === pro.id}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all disabled:opacity-50 cursor-pointer ${
                                                        pro.verified
                                                            ? 'border-stone-200 text-stone-600 hover:bg-stone-100'
                                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {pro.verified ? 'Revoca' : 'Approva'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditing(pro)}
                                                    title="Modifica"
                                                    aria-label="Modifica"
                                                    className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(pro)}
                                                    disabled={busyId === pro.id}
                                                    title="Elimina"
                                                    aria-label="Elimina"
                                                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    {busyId === pro.id
                                                        ? <Loader2 size={15} className="animate-spin" />
                                                        : <Trash2 size={15} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && pageCount > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50/50 text-sm">
                        <span className="text-stone-500 text-xs">
                            Pagina <strong className="text-stone-800">{page + 1}</strong> di <strong className="text-stone-800">{pageCount}</strong> ({filtered.length} risultati)
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
                            >
                                Precedente
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                                disabled={page >= pageCount - 1}
                                className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
                            >
                                Successiva
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isAddDialogOpen && (
                <AddProfessionalDialog
                    onClose={() => setIsAddDialogOpen(false)}
                    onSuccess={fetchProfessionals}
                />
            )}

            {editing && (
                <EditProfessionalDialog
                    professional={editing}
                    onClose={() => setEditing(null)}
                    onSuccess={fetchProfessionals}
                />
            )}
        </div>
    )
}
