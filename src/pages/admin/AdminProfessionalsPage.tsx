import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ShieldCheck, ShieldAlert, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

import { AddProfessionalDialog } from '@/components/admin/AddProfessionalDialog'

interface Professional {
    id: string
    company_name: string
    vat_number: string
    fiscal_code?: string
    sdi_code?: string
    pec?: string
    phone: string
    verified: boolean
    rating: number
    users: {
        email: string
        full_name: string
    }
}

export function AdminProfessionalsPage() {
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchProfessionals = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('professional_profiles')
                .select('*')

            if (error) throw error

            const mapped = data.map((p: any) => ({
                ...p,
                users: {
                    email: 'user@example.com',
                    full_name: p.company_name || 'Nome Cognome'
                }
            }))

            setProfessionals(mapped)
        } catch (error) {
            console.error('Error fetching pros:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleVerify = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('professional_profiles')
                .update({ verified: !currentStatus })
                .eq('id', id)

            if (error) throw error
            fetchProfessionals()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo professionista? Questa azione non può essere annullata.')) {
            return
        }

        try {
            setDeletingId(id)

            // Delete professional profile (cascade will handle related data)
            const { error: profileError } = await supabase
                .from('professional_profiles')
                .delete()
                .eq('id', id)

            if (profileError) throw profileError

            // Delete from auth users (requires admin privileges via Edge Function or RLS)
            // For now we'll use the admin SDK via Edge Function
            const { error: authError } = await supabase.functions.invoke('delete-user', {
                body: { userId: id }
            })

            if (authError) {
                console.warn('Auth deletion warning:', authError)
                // Profile is deleted, auth deletion might need manual cleanup
            }

            alert('Professionista eliminato con successo')
            fetchProfessionals()
        } catch (error: any) {
            console.error('Error deleting professional:', error)
            alert('Errore durante l\'eliminazione: ' + error.message)
        } finally {
            setDeletingId(null)
        }
    }

    useEffect(() => {
        fetchProfessionals()
    }, [])

    const filtered = professionals.filter(p =>
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vat_number?.includes(searchTerm)
    )

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Gestione Professionisti</h1>
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
                    placeholder="Cerca P.IVA o Ragione Sociale..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Professionista</th>
                            <th className="px-6 py-4">Dati Aziendali</th>
                            <th className="px-6 py-4">Rating</th>
                            <th className="px-6 py-4">Stato</th>
                            <th className="px-6 py-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                    Caricamento lista...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                    Nessun professionista trovato.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((pro, index) => (
                                <motion.tr
                                    key={pro.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-gray-50/50"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{pro.company_name}</div>
                                        <div className="text-gray-500 text-xs">{pro.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-600">
                                        <div>P.IVA: {pro.vat_number}</div>
                                        {pro.fiscal_code && <div>CF: {pro.fiscal_code}</div>}
                                        <div className="flex gap-2 text-[10px] text-gray-400 mt-1">
                                            {pro.sdi_code && <span>SDI: {pro.sdi_code}</span>}
                                            {pro.pec && <span>PEC: {pro.pec}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-orange-500 font-medium">
                                            <Award size={16} />
                                            {pro.rating || 'N/A'}
                                        </div>
                                        <div className="text-gray-400 text-xs mt-0.5">{pro.phone}</div>
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
                                        <div className="flex items-center justify-end gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => toggleVerify(pro.id, pro.verified)}
                                                className={`text-sm font-medium px-3 py-1 rounded-lg ${pro.verified ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                            >
                                                {pro.verified ? 'Revoca' : 'Approva'}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleDelete(pro.id)}
                                                disabled={deletingId === pro.id}
                                                className="text-sm font-medium px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                            >
                                                {deletingId === pro.id ? 'Eliminando...' : 'Elimina'}
                                            </motion.button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Dialog */}
            {isAddDialogOpen && (
                <AddProfessionalDialog
                    onClose={() => setIsAddDialogOpen(false)}
                    onSuccess={fetchProfessionals}
                />
            )}
        </div>
    )
}
