import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CoverageSelector, type CoverageValue } from '@/components/admin/CoverageSelector'

interface AddProfessionalDialogProps {
    onClose: () => void
    onSuccess: () => void
}

export function AddProfessionalDialog({ onClose, onSuccess }: AddProfessionalDialogProps) {
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<1 | 2>(1)

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
        billing_province: '',
        price_per_sqm: ''
    })
    const [coverage, setCoverage] = useState<CoverageValue>({
        mode: 'province', zones: [], centerLat: null, centerLon: null, centerLabel: '', radiusKm: '',
    })
    const [error, setError] = useState<string | null>(null)

    const update = (field: keyof typeof formData, value: string) =>
        setFormData(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Gli stessi controlli del vincolo a DB, per dare un messaggio comprensibile.
            if (coverage.mode === 'radius') {
                const km = Number(coverage.radiusKm)
                if (coverage.centerLat === null || coverage.centerLon === null) {
                    throw new Error('Scegli il comune da cui parte il raggio')
                }
                if (!Number.isFinite(km) || km <= 0) {
                    throw new Error('Indica un raggio in km maggiore di zero')
                }
            } else if (coverage.zones.length === 0) {
                throw new Error('Seleziona almeno una provincia servita')
            }

            const { data, error: fnError } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: formData.email,
                    meta: {
                        ...formData,
                        coverage_mode: coverage.mode,
                        center_lat: coverage.mode === 'radius' ? coverage.centerLat : null,
                        center_lon: coverage.mode === 'radius' ? coverage.centerLon : null,
                        radius_km: coverage.mode === 'radius' ? Number(coverage.radiusKm) : null,
                    },
                    zones: coverage.mode === 'province' ? coverage.zones : [],
                }
            })
            if (fnError) throw fnError
            // La funzione risponde 200 anche sugli errori applicativi.
            if (data?.success === false) throw new Error(data.error)
            setStep(2)
        } catch (err: any) {
            setError(err.message || 'Errore durante la registrazione')
        } finally {
            setLoading(false)
        }
    }

    const modalContent = (
        <AnimatePresence>
            {/* Overlay */}
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
            >
                {/* Dialog */}
                <motion.div
                    key="dialog"
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.97 }}
                    transition={{ type: 'spring', duration: 0.35 }}
                    className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header — fisso */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                {step === 1 ? 'Nuovo Professionista' : 'Invito inviato'}
                            </h2>
                            {step === 1 && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Compila i dati e invia l'invito via email
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body — scrollabile */}
                    <div className="flex-1 overflow-y-auto">
                        {step === 1 ? (
                            <form id="add-pro-form" onSubmit={handleSubmit} className="p-6 space-y-6">

                                {/* — Sezione 1: Account & Contatto — */}
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Dati Account &amp; Contatto
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Email (Login) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email" required
                                                placeholder="nome@azienda.it"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.email}
                                                onChange={e => update('email', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Telefono <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel" required
                                                placeholder="+39 333 1234567"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.phone}
                                                onChange={e => update('phone', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Nome Completo Referente <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text" required
                                                placeholder="Mario Rossi"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.full_name}
                                                onChange={e => update('full_name', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <div className="border-t border-gray-100" />

                                {/* — Sezione 2: Dati Fiscali — */}
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Dati Fiscali Aziendali
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                            Ragione Sociale <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text" required
                                            placeholder="Posa & Tiles S.r.l."
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                            value={formData.company_name}
                                            onChange={e => update('company_name', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Partita IVA <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text" required
                                                placeholder="IT12345678901"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.vat_number}
                                                onChange={e => update('vat_number', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Codice Fiscale <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text" required
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition uppercase"
                                                value={formData.fiscal_code}
                                                onChange={e => update('fiscal_code', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Codice SDI
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="XXXXXXX"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.sdi_code}
                                                onChange={e => update('sdi_code', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                PEC
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="pec@pec.it"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.pec}
                                                onChange={e => update('pec', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <div className="border-t border-gray-100" />

                                {/* — Sezione 3: Sede Legale — */}
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Sede Legale / Fatturazione
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                            Indirizzo <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text" required
                                            placeholder="Via Roma 1"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                            value={formData.billing_address}
                                            onChange={e => update('billing_address', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-6 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                CAP <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text" required maxLength={5}
                                                placeholder="20100"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.billing_cap}
                                                onChange={e => update('billing_cap', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Città <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text" required
                                                placeholder="Milano"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                value={formData.billing_city}
                                                onChange={e => update('billing_city', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Prov.
                                            </label>
                                            <input
                                                type="text" maxLength={2}
                                                placeholder="MI"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition uppercase"
                                                value={formData.billing_province}
                                                onChange={e => update('billing_province', e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <div className="border-t border-gray-100" />

                                {/* — Sezione 4: Condizioni Economiche — */}
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Condizioni Economiche
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                Prezzo/mq <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                                                    €
                                                </span>
                                                <input
                                                    type="number" required
                                                    min="0" step="0.01" inputMode="decimal"
                                                    placeholder="35.00"
                                                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                                                    value={formData.price_per_sqm}
                                                    onChange={e => update('price_per_sqm', e.target.value)}
                                                />
                                            </div>
                                            <p className="mt-1 text-[11px] text-gray-400">
                                                Tariffa di posa al metro quadro, IVA esclusa
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <div className="border-t border-gray-100" />

                                {/* — Sezione 5: Copertura — */}
                                <CoverageSelector
                                    value={coverage}
                                    onChange={patch => setCoverage(prev => ({ ...prev, ...patch }))}
                                />

                                {/* Errore */}
                                {error && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}
                            </form>
                        ) : (
                            /* — Step 2: Success — */
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <CheckCircle2 size={36} className="text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Invito Inviato!</h3>
                                <p className="text-sm text-gray-500 max-w-xs">
                                    Abbiamo inviato un'email a <strong>{formData.email}</strong>.<br />
                                    Il profilo è stato creato con tutti i dati inseriti.
                                </p>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => { onSuccess(); onClose() }}
                                        className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                                    >
                                        Chiudi
                                    </button>
                                    <button
                                        onClick={() => { setStep(1); setFormData({ email: '', full_name: '', company_name: '', vat_number: '', fiscal_code: '', phone: '', sdi_code: '', pec: '', billing_address: '', billing_city: '', billing_cap: '', billing_province: '', price_per_sqm: '' }); setCoverage({ mode: 'province', zones: [], centerLat: null, centerLon: null, centerLabel: '', radiusKm: '' }) }}
                                        className="px-6 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Aggiungi un altro
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer — fisso, solo in step 1 */}
                    {step === 1 && (
                        <div className="flex-none flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                form="add-pro-form"
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Registrazione...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} />
                                        Registra &amp; Invia Invito
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )

    // Usa un portal per evitare problemi di z-index e overflow del layout admin
    return createPortal(modalContent, document.body)
}
