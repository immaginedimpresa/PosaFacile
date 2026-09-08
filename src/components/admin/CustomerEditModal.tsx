import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, User, Building2, Phone, Hash, FileText } from 'lucide-react'
import { type CustomerSummary, updateCustomerProfile } from '@/services/customersService'
import { toast } from 'sonner'

interface CustomerEditModalProps {
    customer: CustomerSummary | null
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CustomerEditModal({
    customer,
    isOpen,
    onClose,
    onSuccess
}: CustomerEditModalProps) {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [customerType, setCustomerType] = useState<'private' | 'company'>('private')
    const [companyName, setCompanyName] = useState('')
    const [vatNumber, setVatNumber] = useState('')
    const [fiscalCode, setFiscalCode] = useState('')
    const [adminNotes, setAdminNotes] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (customer) {
            setFirstName(customer.first_name || '')
            setLastName(customer.last_name || '')
            setPhone(customer.phone || '')
            setCustomerType(customer.customer_type || 'private')
            setCompanyName(customer.company_name || '')
            setVatNumber(customer.vat_number || '')
            setFiscalCode(customer.fiscal_code || '')
            setAdminNotes(customer.admin_notes || '')
            setIsActive(customer.is_active ?? true)
        }
    }, [customer])

    if (!isOpen || !customer) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await updateCustomerProfile(customer.id, {
                first_name: firstName.trim() || undefined,
                last_name: lastName.trim() || undefined,
                phone: phone.trim() || undefined,
                customer_type: customerType,
                company_name: customerType === 'company' ? companyName.trim() : undefined,
                vat_number: customerType === 'company' ? vatNumber.trim() : undefined,
                fiscal_code: fiscalCode.trim().toUpperCase() || undefined,
                admin_notes: adminNotes.trim() || undefined,
                is_active: isActive
            })

            toast.success('Dati cliente aggiornati correttamente')
            onSuccess()
            onClose()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Errore durante il salvataggio dei dati')
        } finally {
            setSaving(false)
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-stone-100"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/50">
                        <div>
                            <h2 className="text-base font-bold text-stone-900">Modifica Dati Cliente</h2>
                            <p className="text-xs text-stone-500">{customer.email}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-xl transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        {/* Tipo Cliente */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                                Tipologia Cliente
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCustomerType('private')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                        customerType === 'private'
                                            ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                                            : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                                    }`}
                                >
                                    <User size={15} />
                                    <span>Privato</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomerType('company')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                        customerType === 'company'
                                            ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                                            : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                                    }`}
                                >
                                    <Building2 size={15} />
                                    <span>Azienda / P. IVA</span>
                                </button>
                            </div>
                        </div>

                        {/* Nome & Cognome */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-stone-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    placeholder="Es. Mario"
                                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700 mb-1">Cognome</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    placeholder="Es. Rossi"
                                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        {/* Telefono */}
                        <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                <Phone size={13} className="text-stone-400" />
                                <span>Telefono / WhatsApp</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="Es. +39 340 1234567"
                                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        {/* Campi Azienda */}
                        {customerType === 'company' && (
                            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                        <Building2 size={13} className="text-stone-400" />
                                        <span>Ragione Sociale</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        placeholder="Es. Impresa Edile Rossi Srl"
                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                        <Hash size={13} className="text-stone-400" />
                                        <span>Partita IVA</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={vatNumber}
                                        onChange={e => setVatNumber(e.target.value)}
                                        placeholder="Es. IT12345678901"
                                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Codice Fiscale */}
                        <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                <Hash size={13} className="text-stone-400" />
                                <span>Codice Fiscale</span>
                            </label>
                            <input
                                type="text"
                                value={fiscalCode}
                                onChange={e => setFiscalCode(e.target.value.toUpperCase())}
                                placeholder="Es. RSSMRA80A01H501Z"
                                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono uppercase"
                            />
                        </div>

                        {/* Note Interne Staff */}
                        <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                                <FileText size={13} className="text-stone-400" />
                                <span>Note Interne Admin</span>
                            </label>
                            <textarea
                                rows={3}
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                placeholder="Note interne sul cliente..."
                                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                <Save size={14} />
                                <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
