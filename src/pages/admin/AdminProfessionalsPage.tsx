import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ShieldCheck, ShieldAlert, Award, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

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
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(0)

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editing, setEditing] = useState<Professional | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    const fetchProfessionals = async () => {
        setLoading(true)
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
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfessionals()
    }, [])

    const toggleVerify = async (pro: Professional) => {
        const next = !pro.verified
        // Aggiornamento ottimistico: la riga cambia stato subito, si annulla in caso di errore.
        setProfessionals(prev => prev.map(p => (p.id === pro.id ? { ...p, verified: next } : p)))
        setBusyId(pro.id)
        try {
            const { error: updateError } = await supabase
                .from('professional_profiles')
                .update({ verified: next, updated_at: new Date().toISOString() })
                .eq('id', pro.id)
            if (updateError) throw updateError
        } catch (err: any) {
            setProfessionals(prev => prev.map(p => (p.id === pro.id ? { ...p, verified: pro.verified } : p)))
            setError(`Stato non aggiornato: ${err.message}`)
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
            // professional_profiles.id ha una FK verso auth.users con ON DELETE CASCADE:
            // eliminare l'account porta via profilo, zone e skill in un colpo solo.
            // Cancellare prima il profilo lascerebbe l'account orfano se la seconda
            // chiamata fallisse, quindi si parte da auth.
            const { data, error: fnError } = await supabase.functions.invoke('delete-user', {
                body: { userId: pro.id },
            })
            if (fnError) throw fnError
            if (data?.error) throw new Error(data.error)

            setProfessionals(prev => prev.filter(p => p.id !== pro.id))
        } catch (err: any) {
            console.error('Error deleting professional:', err)
            setError(`Eliminazione fallita: ${err.message}`)
        } finally {
            setBusyId(null)
        }
    }

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        if (!q) return professionals
        return professionals.filter(p =>
            [p.company_name, p.full_name, p.vat_number, p.fiscal_code, p.billing_city, p.billing_province, p.pec]
                .some(field => field?.toLowerCase().includes(q))
        )
    }, [professionals, searchTerm])

    // La ricerca può ridurre le pagine sotto quella corrente: si torna alla prima.
    useEffect(() => { setPage(0) }, [searchTerm])

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestione Professionisti</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {loading ? 'Caricamento...' : `${filtered.length} profili${searchTerm ? ` su ${professionals.length}` : ''}`}
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAddDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium shadow-lg shadow-gray-200"
                >
                    <Plus size={20} />
                    Aggiungi Professionista
                </motion.button>
            </div>

            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Cerca per nome, P.IVA, città o provincia..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-medium">
                        Chiudi
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Professionista</th>
                                <th className="px-6 py-4">Dati Aziendali</th>
                                <th className="px-6 py-4">Zona</th>
                                <th className="px-6 py-4">Prezzo/mq</th>
                                <th className="px-6 py-4">Rating</th>
                                <th className="px-6 py-4">Stato</th>
                                <th className="px-6 py-4 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                        Caricamento lista...
                                    </td>
                                </tr>
                            ) : visible.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                        Nessun professionista trovato.
                                    </td>
                                </tr>
                            ) : (
                                visible.map(pro => (
                                    <tr key={pro.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{pro.company_name || '—'}</div>
                                            <div className="text-gray-500 text-xs">{pro.full_name || pro.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-600">
                                            <div>P.IVA: {pro.vat_number || '—'}</div>
                                            {pro.fiscal_code && <div>CF: {pro.fiscal_code}</div>}
                                            <div className="flex gap-2 text-[10px] text-gray-400 mt-1">
                                                {pro.sdi_code && <span>SDI: {pro.sdi_code}</span>}
                                                {pro.pec && <span className="truncate max-w-[160px]">{pro.pec}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-600">
                                            <div>{pro.billing_city || '—'}</div>
                                            <div className="text-gray-400">{pro.billing_province || ''}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {euro(pro.price_per_sqm)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-orange-500 font-medium">
                                                <Award size={16} />
                                                {pro.rating ?? 'N/A'}
                                            </div>
                                            <div className="text-gray-400 text-xs mt-0.5">{pro.phone || ''}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {pro.verified ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <ShieldCheck size={12} /> Verificato
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                    <ShieldAlert size={12} /> In attesa
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => toggleVerify(pro)}
                                                    disabled={busyId === pro.id}
                                                    className={`text-sm font-medium px-3 py-1 rounded-lg disabled:opacity-50 ${
                                                        pro.verified ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                                                    }`}
                                                >
                                                    {pro.verified ? 'Revoca' : 'Approva'}
                                                </button>
                                                <button
                                                    onClick={() => setEditing(pro)}
                                                    title="Modifica"
                                                    aria-label="Modifica"
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(pro)}
                                                    disabled={busyId === pro.id}
                                                    title="Elimina"
                                                    aria-label="Elimina"
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50 text-sm">
                        <span className="text-gray-500">
                            Pagina {page + 1} di {pageCount}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Precedente
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                                disabled={page >= pageCount - 1}
                                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40"
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
