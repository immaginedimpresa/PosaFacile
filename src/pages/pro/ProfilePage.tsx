import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Phone, FileText, MapPin, Save, Loader2, Map, Search, X, UserCircle, Briefcase, Award } from 'lucide-react'
import { ITALIAN_PROVINCES } from '@/lib/provinces'
import { toast } from 'sonner'

interface ProfessionalProfile {
    company_name: string
    vat_number: string
    fiscal_code: string
    phone: string
    sdi_code: string
    pec: string
    billing_address: string
    billing_city: string
    billing_cap: string
    billing_province: string
    full_name: string
    bio: string
    years_experience: number
}

export function ProfilePage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedZones, setSelectedZones] = useState<string[]>([])
    const [provinceSearch, setProvinceSearch] = useState('')
    const [profile, setProfile] = useState<ProfessionalProfile>({
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
        full_name: '',
        bio: '',
        years_experience: 0
    })

    useEffect(() => {
        fetchProfile()
        fetchZones()
    }, [user])

    const fetchProfile = async () => {
        if (!user) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('professional_profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error

            if (data) {
                setProfile({
                    company_name: data.company_name || '',
                    vat_number: data.vat_number || '',
                    fiscal_code: data.fiscal_code || '',
                    phone: data.phone || '',
                    sdi_code: data.sdi_code || '',
                    pec: data.pec || '',
                    billing_address: data.billing_address || '',
                    billing_city: data.billing_city || '',
                    billing_cap: data.billing_cap || '',
                    billing_province: data.billing_province || '',
                    full_name: data.full_name || '',
                    bio: data.bio || '',
                    years_experience: data.years_experience || 0
                })
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchZones = async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('professional_zones')
                .select('province_code')
                .eq('professional_id', user.id)

            if (error) throw error

            setSelectedZones(data.map(z => z.province_code))
        } catch (error) {
            console.error('Error fetching zones:', error)
        }
    }

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!user) return

        setSaving(true)
        const toastId = toast.loading('Salvataggio profilo in corso...')
        try {
            const { error: profileError } = await supabase
                .from('professional_profiles')
                .update(profile)
                .eq('id', user.id)

            if (profileError) throw profileError

            const { error: deleteError } = await supabase
                .from('professional_zones')
                .delete()
                .eq('professional_id', user.id)

            if (deleteError) throw deleteError

            if (selectedZones.length > 0) {
                const zoneRecords = selectedZones.map(code => ({
                    professional_id: user.id,
                    province_code: code
                }))

                const { error: insertError } = await supabase
                    .from('professional_zones')
                    .insert(zoneRecords)

                if (insertError) throw insertError
            }

            toast.success('Profilo e zone operative aggiornati con successo!', { id: toastId })
        } catch (error: any) {
            console.error('Error updating profile:', error)
            toast.error('Errore durante il salvataggio: ' + error.message, { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="animate-spin text-orange-500" size={28} />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Caricamento Profilo...</h2>
                <p className="text-stone-500 text-sm mt-1">Stiamo recuperando le tue informazioni aziendali.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <UserCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">Profilo Professionista</h1>
                        <p className="text-stone-500 text-sm mt-0.5">Gestisci la tua anagrafica, i dati fiscali e le zone operative coperte</p>
                    </div>
                </div>

                <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salva Modifiche
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Personal & Professional Info */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 sm:p-8"
                >
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-stone-100">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Briefcase size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900">Informazioni Personali & Esperienza</h2>
                            <p className="text-xs text-stone-500">I recapiti del referente tecnico o titolare</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Nome Completo Referente</label>
                            <input
                                type="text"
                                value={profile.full_name}
                                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                placeholder="Mario Rossi"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Email di Accesso (Non Modificabile)</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3 text-stone-400" size={18} />
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100/70 text-stone-500 text-sm font-medium cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Telefono / WhatsApp Reperibilità</label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-3 text-stone-400" size={18} />
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                    placeholder="+39 340 0000000"
                                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Anni di Esperienza nel Settore</label>
                            <div className="relative">
                                <Award className="absolute left-3.5 top-3 text-stone-400" size={18} />
                                <input
                                    type="number"
                                    min="0"
                                    value={profile.years_experience}
                                    onChange={e => setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 })}
                                    placeholder="10"
                                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5">
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Presentazione Aziendale / Specializzazioni</label>
                        <textarea
                            rows={3}
                            value={profile.bio}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Descrivi brevemente le tue specializzazioni: posa parquet, grandi formati, pavimenti continui..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none resize-none leading-relaxed"
                        />
                    </div>
                </motion.div>

                {/* Company & Fiscal Info */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 sm:p-8"
                >
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-stone-100">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 flex-shrink-0">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900">Dati Fiscali & Fatturazione Elettronica</h2>
                            <p className="text-xs text-stone-500">Necessari per la liquidazione compensi e conformità SDI</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Ragione Sociale / Denominazione</label>
                            <input
                                type="text"
                                value={profile.company_name}
                                onChange={e => setProfile({ ...profile, company_name: e.target.value })}
                                placeholder="Rossi Pavimenti S.r.l."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Partita IVA</label>
                            <input
                                type="text"
                                value={profile.vat_number}
                                onChange={e => setProfile({ ...profile, vat_number: e.target.value })}
                                placeholder="IT01234567890"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Codice Fiscale</label>
                            <input
                                type="text"
                                value={profile.fiscal_code}
                                onChange={e => setProfile({ ...profile, fiscal_code: e.target.value.toUpperCase() })}
                                placeholder="RSSMRA80A01H501U"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Codice Univoco Destinatario SDI</label>
                            <input
                                type="text"
                                maxLength={7}
                                value={profile.sdi_code}
                                onChange={e => setProfile({ ...profile, sdi_code: e.target.value.toUpperCase() })}
                                placeholder="M5UXCR1 (o 0000000)"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Indirizzo Posta PEC</label>
                            <input
                                type="email"
                                value={profile.pec}
                                onChange={e => setProfile({ ...profile, pec: e.target.value })}
                                placeholder="azienda@pec.it"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Billing Address */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 sm:p-8"
                >
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-stone-100">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900">Sede Legale & Operativa</h2>
                            <p className="text-xs text-stone-500">Indirizzo registrato della società o ditta individuale</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-6">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Indirizzo e Civico</label>
                            <input
                                type="text"
                                value={profile.billing_address}
                                onChange={e => setProfile({ ...profile, billing_address: e.target.value })}
                                placeholder="Via dei Maestri Artigiani 42"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">CAP</label>
                            <input
                                type="text"
                                maxLength={5}
                                value={profile.billing_cap}
                                onChange={e => setProfile({ ...profile, billing_cap: e.target.value })}
                                placeholder="20121"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Città</label>
                            <input
                                type="text"
                                value={profile.billing_city}
                                onChange={e => setProfile({ ...profile, billing_city: e.target.value })}
                                placeholder="Milano"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Provincia</label>
                            <input
                                type="text"
                                maxLength={2}
                                value={profile.billing_province}
                                onChange={e => setProfile({ ...profile, billing_province: e.target.value.toUpperCase() })}
                                placeholder="MI"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none uppercase text-center"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Work Zones */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 sm:p-8"
                >
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-stone-100">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                            <Map size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900">Province & Raggio Operativo</h2>
                            <p className="text-xs text-stone-500">Seleziona le aree in cui sei disponibile ad effettuare posa e collaudi</p>
                        </div>
                    </div>

                    <div>
                        {/* Selected Zones Display */}
                        {selectedZones.length > 0 ? (
                            <div className="mb-4 p-4 bg-orange-50/50 border border-orange-200/70 rounded-2xl">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-orange-800">
                                        Zone Selezionate ({selectedZones.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedZones([])}
                                        className="text-xs text-stone-500 hover:text-rose-600 transition-colors font-semibold"
                                    >
                                        Deseleziona tutte
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedZones.map(code => {
                                        const prov = ITALIAN_PROVINCES.find(p => p.code === code)
                                        return (
                                            <span
                                                key={code}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-bold text-stone-800 shadow-2xs"
                                            >
                                                <span className="text-orange-600 font-black">{code}</span>
                                                <span>{prov?.name || code}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedZones(selectedZones.filter(z => z !== code))}
                                                    className="hover:bg-rose-50 hover:text-rose-600 rounded p-0.5 transition-colors"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4 p-4 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-xs text-amber-900 font-medium">
                                ⚠️ Non hai ancora selezionato alcuna provincia. Seleziona almeno una provincia per ricevere le assegnazioni di cantieri nella tua zona.
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3.5 top-3 text-stone-400" size={18} />
                            <input
                                type="text"
                                placeholder="Filtra province per nome o sigla (es. Milano, MI, Roma...)"
                                value={provinceSearch}
                                onChange={e => setProvinceSearch(e.target.value)}
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            />
                        </div>

                        <div className="border border-stone-200 rounded-2xl p-3 max-h-60 overflow-y-auto bg-stone-50/40">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {ITALIAN_PROVINCES
                                    .filter(prov =>
                                        provinceSearch === '' ||
                                        prov.name.toLowerCase().includes(provinceSearch.toLowerCase()) ||
                                        prov.code.toLowerCase().includes(provinceSearch.toLowerCase())
                                    )
                                    .map(prov => {
                                        const isChecked = selectedZones.includes(prov.code)
                                        return (
                                            <label
                                                key={prov.code}
                                                className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                                    isChecked 
                                                        ? 'bg-orange-50 text-orange-950 border border-orange-200/60' 
                                                        : 'hover:bg-white text-stone-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedZones([...selectedZones, prov.code])
                                                        } else {
                                                            setSelectedZones(selectedZones.filter(z => z !== prov.code))
                                                        }
                                                    }}
                                                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-4 h-4"
                                                />
                                                <span className="font-bold text-stone-900">{prov.code}</span>
                                                <span className="truncate text-stone-600">{prov.name}</span>
                                            </label>
                                        )
                                    })}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Bottom Save Bar */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-stone-900 hover:bg-black text-white rounded-xl text-sm font-black shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvataggio Profilo...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Salva Tutte le Modifiche
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

