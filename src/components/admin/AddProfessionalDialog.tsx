import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Mail, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ITALIAN_PROVINCES } from '@/lib/provinces'

interface AddProfessionalDialogProps {
    onClose: () => void
    onSuccess: () => void
}

export function AddProfessionalDialog({ onClose, onSuccess }: AddProfessionalDialogProps) {
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1)

    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        company_name: '',
        vat_number: '',
        fiscal_code: '',
        phone: '',
        sdi_code: '',
        pec: '',
        billing_address: '',
        billing_city: '',
        billing_cap: '',
        billing_province: ''
    })
    const [selectedZones, setSelectedZones] = useState<string[]>([])
    const [provinceSearch, setProvinceSearch] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Function invoke with all metadata
            const { data: _data, error } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: formData.email,
                    meta: { ...formData },
                    zones: selectedZones
                }
            })

            if (error) throw error

            setStep(2) // Success step
        } catch (error: any) {
            console.error('Invite error details:', error)
            // Debugging
            if (error.message?.includes('Failed to send a request')) {
                alert('Errore di connessione alla Edge Function. Controlla: \n1. Che la funzione sia deployata (npx supabase functions deploy invite-user)\n2. Che il client non abbia blocchi (AdBlock, firewall)\n3. Vedi console per dettagli.')
            } else {
                alert('Errore invio invito: ' + error.message)
            }
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">Nuovo Professionista Completo</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Account Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-1">Dati Account & Contatto</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Email (Login)</label>
                                        <input
                                            type="email" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Telefono</label>
                                        <input
                                            type="tel" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Nome Completo Referente</label>
                                        <input
                                            type="text" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Company Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-1">Dati Fiscali Aziendali</h3>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Ragione Sociale</label>
                                    <input
                                        type="text" required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.company_name}
                                        onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Partita IVA</label>
                                        <input
                                            type="text" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.vat_number}
                                            onChange={e => setFormData({ ...formData, vat_number: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Codice Fiscale</label>
                                        <input
                                            type="text" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.fiscal_code}
                                            onChange={e => setFormData({ ...formData, fiscal_code: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Codice SDI</label>
                                        <input
                                            type="text" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.sdi_code}
                                            onChange={e => setFormData({ ...formData, sdi_code: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">PEC</label>
                                        <input
                                            type="email" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.pec}
                                            onChange={e => setFormData({ ...formData, pec: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Address */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-1">Sede Legale / Fatturazione</h3>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Indirizzo (Via/Piazza, Civico)</label>
                                    <input
                                        type="text" required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.billing_address}
                                        onChange={e => setFormData({ ...formData, billing_address: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-6 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">CAP</label>
                                        <input
                                            type="text" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.billing_cap}
                                            onChange={e => setFormData({ ...formData, billing_cap: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Città</label>
                                        <input
                                            type="text" required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            value={formData.billing_city}
                                            onChange={e => setFormData({ ...formData, billing_city: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Prov.</label>
                                        <input
                                            type="text" required maxLength={2}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none uppercase"
                                            value={formData.billing_province}
                                            onChange={e => setFormData({ ...formData, billing_province: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Work Zones */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-1">Zone di Lavoro</h3>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2">Province Coperte</label>

                                    {/* Selected Zones Display */}
                                    {selectedZones.length > 0 && (
                                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-semibold text-green-700">Selezionate ({selectedZones.length}):</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedZones.map(code => {
                                                    const prov = ITALIAN_PROVINCES.find(p => p.code === code)
                                                    return (
                                                        <button
                                                            key={code}
                                                            type="button"
                                                            onClick={() => setSelectedZones(selectedZones.filter(z => z !== code))}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-green-300 rounded-md text-xs font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                                                        >
                                                            {code} - {prov?.name}
                                                            <X size={12} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Search Bar */}
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Cerca provincia..."
                                            value={provinceSearch}
                                            onChange={e => setProvinceSearch(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>

                                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                                        <div className="grid grid-cols-2 gap-2">
                                            {ITALIAN_PROVINCES
                                                .filter(prov =>
                                                    provinceSearch === '' ||
                                                    prov.name.toLowerCase().includes(provinceSearch.toLowerCase()) ||
                                                    prov.code.toLowerCase().includes(provinceSearch.toLowerCase())
                                                )
                                                .map(prov => (
                                                    <label key={prov.code} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedZones.includes(prov.code)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedZones([...selectedZones, prov.code])
                                                                } else {
                                                                    setSelectedZones(selectedZones.filter(z => z !== prov.code))
                                                                }
                                                            }}
                                                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                                        />
                                                        <span className="text-sm text-gray-700">{prov.code} - {prov.name}</span>
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Registrazione in corso...' : 'Registra e Invia Invito'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Invito Inviato!</h3>
                            <p className="text-gray-500 mb-6">
                                Abbiamo inviato un'email a <strong>{formData.email}</strong>.<br />
                                Il profilo è stato creato completo di tutti i dati fiscali.
                            </p>
                            <button
                                onClick={() => { onSuccess(); onClose(); }}
                                className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium"
                            >
                                Chiudi
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
