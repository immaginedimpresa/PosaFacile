import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Search, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ITALIAN_PROVINCES } from '@/lib/provinces'

export interface EditableProfessional {
    id: string
    full_name: string | null
    company_name: string | null
    vat_number: string | null
    fiscal_code: string | null
    sdi_code: string | null
    pec: string | null
    phone: string | null
    bio: string | null
    years_experience: number | null
    rating: number | null
    verified: boolean | null
    price_per_sqm: number | null
    billing_address: string | null
    billing_city: string | null
    billing_cap: string | null
    billing_province: string | null
}

interface EditProfessionalDialogProps {
    professional: EditableProfessional
    onClose: () => void
    onSuccess: () => void
}

/** I campi del form sono stringhe: i numeri vengono convertiti solo al salvataggio. */
const toForm = (p: EditableProfessional) => ({
    full_name: p.full_name ?? '',
    company_name: p.company_name ?? '',
    vat_number: p.vat_number ?? '',
    fiscal_code: p.fiscal_code ?? '',
    sdi_code: p.sdi_code ?? '',
    pec: p.pec ?? '',
    phone: p.phone ?? '',
    bio: p.bio ?? '',
    years_experience: p.years_experience?.toString() ?? '',
    price_per_sqm: p.price_per_sqm?.toString() ?? '',
    billing_address: p.billing_address ?? '',
    billing_city: p.billing_city ?? '',
    billing_cap: p.billing_cap ?? '',
    billing_province: p.billing_province ?? '',
})

const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition'

export function EditProfessionalDialog({ professional, onClose, onSuccess }: EditProfessionalDialogProps) {
    const [formData, setFormData] = useState(() => toForm(professional))
    const [verified, setVerified] = useState<boolean>(professional.verified ?? false)
    const [selectedZones, setSelectedZones] = useState<string[]>([])
    const [zonesLoading, setZonesLoading] = useState(true)
    const [provinceSearch, setProvinceSearch] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const update = (field: keyof typeof formData, value: string) =>
        setFormData(prev => ({ ...prev, [field]: value }))

    const toggleZone = (code: string) =>
        setSelectedZones(prev =>
            prev.includes(code) ? prev.filter(z => z !== code) : [...prev, code]
        )

    useEffect(() => {
        let cancelled = false
        supabase
            .from('professional_zones')
            .select('province_code')
            .eq('professional_id', professional.id)
            .then(({ data, error: zonesError }) => {
                if (cancelled) return
                if (zonesError) setError(`Zone non caricate: ${zonesError.message}`)
                else setSelectedZones((data ?? []).map(z => z.province_code))
                setZonesLoading(false)
            })
        return () => { cancelled = true }
    }, [professional.id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)

        try {
            const price = formData.price_per_sqm.trim()
            const years = formData.years_experience.trim()

            const { error: updateError } = await supabase
                .from('professional_profiles')
                .update({
                    full_name: formData.full_name || null,
                    company_name: formData.company_name || null,
                    vat_number: formData.vat_number || null,
                    fiscal_code: formData.fiscal_code || null,
                    sdi_code: formData.sdi_code || null,
                    pec: formData.pec || null,
                    phone: formData.phone || null,
                    bio: formData.bio || null,
                    years_experience: years === '' ? null : Number(years),
                    price_per_sqm: price === '' ? null : Number(price),
                    billing_address: formData.billing_address || null,
                    billing_city: formData.billing_city || null,
                    billing_cap: formData.billing_cap || null,
                    billing_province: formData.billing_province || null,
                    verified,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', professional.id)

            if (updateError) throw updateError

            // Le zone non hanno un vincolo di unicità su cui fare upsert:
            // si riscrive l'intero set solo se è effettivamente cambiato.
            const { data: currentZones, error: readError } = await supabase
                .from('professional_zones')
                .select('province_code')
                .eq('professional_id', professional.id)
            if (readError) throw readError

            const before = new Set((currentZones ?? []).map(z => z.province_code))
            const after = new Set(selectedZones)
            const changed = before.size !== after.size || [...after].some(z => !before.has(z))

            if (changed) {
                const { error: deleteError } = await supabase
                    .from('professional_zones')
                    .delete()
                    .eq('professional_id', professional.id)
                if (deleteError) throw deleteError

                if (selectedZones.length > 0) {
                    const { error: insertError } = await supabase
                        .from('professional_zones')
                        .insert(selectedZones.map(code => ({
                            professional_id: professional.id,
                            province_code: code,
                        })))
                    if (insertError) throw insertError
                }
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Errore durante il salvataggio')
        } finally {
            setSaving(false)
        }
    }

    const filteredProvinces = ITALIAN_PROVINCES.filter(p =>
        provinceSearch === '' ||
        p.name.toLowerCase().includes(provinceSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(provinceSearch.toLowerCase())
    )

    const modalContent = (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => { if (e.target === e.currentTarget) onClose() }}
            >
                <motion.div
                    key="dialog"
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.97 }}
                    transition={{ type: 'spring', duration: 0.35 }}
                    className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Modifica Professionista</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {professional.company_name || professional.full_name || professional.id.slice(0, 8)}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        <form id="edit-pro-form" onSubmit={handleSubmit} className="p-6 space-y-6">

                            <section className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Referente &amp; Contatto
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Completo</label>
                                        <input type="text" className={inputClass}
                                            value={formData.full_name}
                                            onChange={e => update('full_name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Telefono</label>
                                        <input type="tel" className={inputClass}
                                            value={formData.phone}
                                            onChange={e => update('phone', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Presentazione</label>
                                    <textarea rows={3} className={inputClass}
                                        value={formData.bio}
                                        onChange={e => update('bio', e.target.value)} />
                                </div>
                            </section>

                            <div className="border-t border-gray-100" />

                            <section className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Dati Fiscali Aziendali
                                </h3>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ragione Sociale</label>
                                    <input type="text" className={inputClass}
                                        value={formData.company_name}
                                        onChange={e => update('company_name', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Partita IVA</label>
                                        <input type="text" className={inputClass}
                                            value={formData.vat_number}
                                            onChange={e => update('vat_number', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Codice Fiscale</label>
                                        <input type="text" className={`${inputClass} uppercase`}
                                            value={formData.fiscal_code}
                                            onChange={e => update('fiscal_code', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Codice SDI</label>
                                        <input type="text" className={inputClass}
                                            value={formData.sdi_code}
                                            onChange={e => update('sdi_code', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">PEC</label>
                                        <input type="email" className={inputClass}
                                            value={formData.pec}
                                            onChange={e => update('pec', e.target.value)} />
                                    </div>
                                </div>
                            </section>

                            <div className="border-t border-gray-100" />

                            <section className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Sede Legale / Fatturazione
                                </h3>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Indirizzo</label>
                                    <input type="text" className={inputClass}
                                        value={formData.billing_address}
                                        onChange={e => update('billing_address', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-6 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">CAP</label>
                                        <input type="text" maxLength={5} className={inputClass}
                                            value={formData.billing_cap}
                                            onChange={e => update('billing_cap', e.target.value)} />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Città</label>
                                        <input type="text" className={inputClass}
                                            value={formData.billing_city}
                                            onChange={e => update('billing_city', e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Prov.</label>
                                        <input type="text" maxLength={2} className={`${inputClass} uppercase`}
                                            value={formData.billing_province}
                                            onChange={e => update('billing_province', e.target.value.toUpperCase())} />
                                    </div>
                                </div>
                            </section>

                            <div className="border-t border-gray-100" />

                            <section className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Condizioni &amp; Stato
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Prezzo/mq</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">€</span>
                                            <input type="number" min="0" step="0.01" inputMode="decimal"
                                                placeholder="35.00"
                                                className={`${inputClass} pl-7`}
                                                value={formData.price_per_sqm}
                                                onChange={e => update('price_per_sqm', e.target.value)} />
                                        </div>
                                        <p className="mt-1 text-[11px] text-gray-400">Tariffa di posa al mq, IVA esclusa</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Anni di esperienza</label>
                                        <input type="number" min="0" step="1" className={inputClass}
                                            value={formData.years_experience}
                                            onChange={e => update('years_experience', e.target.value)} />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={verified}
                                        onChange={e => setVerified(e.target.checked)}
                                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                                    Profilo verificato (visibile ai clienti in fase di prenotazione)
                                </label>
                            </section>

                            <div className="border-t border-gray-100" />

                            <section className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Zone di Lavoro
                                </h3>

                                {zonesLoading ? (
                                    <p className="text-xs text-gray-400">Caricamento zone...</p>
                                ) : (
                                    <>
                                        {selectedZones.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                                <span className="w-full text-xs font-semibold text-orange-700 mb-1">
                                                    {selectedZones.length} province selezionate:
                                                </span>
                                                {selectedZones.map(code => {
                                                    const prov = ITALIAN_PROVINCES.find(p => p.code === code)
                                                    return (
                                                        <button key={code} type="button" onClick={() => toggleZone(code)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-orange-200 rounded-md text-xs font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors">
                                                            {code} · {prov?.name ?? code}
                                                            <X size={10} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                            <input type="text" placeholder="Cerca provincia..."
                                                value={provinceSearch}
                                                onChange={e => setProvinceSearch(e.target.value)}
                                                className={`${inputClass} pl-9`} />
                                        </div>

                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="max-h-44 overflow-y-auto p-2 bg-gray-50">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                                                    {filteredProvinces.map(prov => (
                                                        <label key={prov.code}
                                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                                                                selectedZones.includes(prov.code)
                                                                    ? 'bg-orange-100 text-orange-800'
                                                                    : 'hover:bg-white text-gray-700'
                                                            }`}>
                                                            <input type="checkbox"
                                                                checked={selectedZones.includes(prov.code)}
                                                                onChange={() => toggleZone(prov.code)}
                                                                className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                                                            <span className="font-medium">{prov.code}</span>
                                                            <span className="text-gray-500 truncate">{prov.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </section>

                            {error && (
                                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="flex-none flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Annulla
                        </button>
                        <button type="submit" form="edit-pro-form" disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                            {saving ? <><Loader2 size={16} className="animate-spin" /> Salvataggio...</>
                                    : <><Save size={16} /> Salva Modifiche</>}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}
