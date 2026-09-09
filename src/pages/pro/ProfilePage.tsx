import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
    Euro,
    Mail,
    Phone,
    FileText,
    Save,
    Loader2,
    Map,
    Search,
    X,
    UserCircle,
    Briefcase,
    Award,
    CheckCircle2
} from 'lucide-react'
import { ITALIAN_PROVINCES } from '@/lib/provinces'
import { toast } from 'sonner'
import { RatesSettings } from '@/components/pro/RatesSettings'


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

    // Filtered provinces for picker
    const filteredProvinces = useMemo(() => {
        if (!provinceSearch.trim()) return ITALIAN_PROVINCES
        const q = provinceSearch.toLowerCase().trim()
        return ITALIAN_PROVINCES.filter(p =>
            p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        )
    }, [provinceSearch])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-20 max-w-7xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="animate-spin text-orange-500" size={28} />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Caricamento Profilo...</h2>
                <p className="text-stone-500 text-sm mt-1">Stiamo recuperando le tue informazioni aziendali.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header matching Admin style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <UserCircle className="w-8 h-8 text-orange-500" />
                        <span>Profilo & Zone Operative</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Aggiorna la tua anagrafica, i dati fiscali per la fatturazione elettronica e le province coperte.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>Salva Modifiche</span>
                    </button>
                </div>
            </div>

            {/* 4-Card KPI Strip matching Admin/Pro style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Impresa / Referente */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Briefcase size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Impresa / Referente</p>
                        <p className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5 truncate">
                            {profile.company_name || profile.full_name || 'Da compilare'}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5 truncate">{user?.email}</p>
                    </div>
                </div>

                {/* 2. Anni di Esperienza */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Esperienza</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{profile.years_experience} Anni</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Attività certificata</p>
                    </div>
                </div>

                {/* 3. Zone Operative */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Map size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Zone Coperte</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{selectedZones.length} Province</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Disponibile per incarichi</p>
                    </div>
                </div>

                {/* 4. Conformità Fiscale */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Dati Fiscali</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${profile.vat_number ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            <span className="text-base font-bold text-stone-900">
                                {profile.vat_number ? 'Completati' : 'Da completare'}
                            </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">Fatturazione elettronica SDI</p>
                    </div>
                </div>
            </div>

            {/* Dual Column Layout: Forms on Left (7 cols), Zones on Right (5 cols) */}
            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Personal & Fiscal Cards (7 cols) */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Card 1: Informazioni Personali */}
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <UserCircle size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Informazioni Personali & Referente</h2>
                                    <p className="text-xs text-stone-500">I recapiti del referente tecnico o titolare</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Nome Completo Referente
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.full_name}
                                        onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                        placeholder="Mario Rossi"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Email di Accesso (Non Modificabile)
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-3 text-stone-400" size={16} />
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100/70 text-stone-500 text-sm font-medium cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Telefono / WhatsApp
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-3 text-stone-400" size={16} />
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
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Anni di Esperienza nel Settore
                                    </label>
                                    <div className="relative">
                                        <Award className="absolute left-3.5 top-3 text-stone-400" size={16} />
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

                            <div>
                                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                    Presentazione Aziendale & Specializzazioni
                                </label>
                                <textarea
                                    rows={3}
                                    value={profile.bio}
                                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                    placeholder="Descrivi brevemente le tue lavorazioni principali: posa grandi formati, parquet, pavimenti continui..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none resize-none leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Dati Fiscali & Sede Legale */}
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Dati Fiscali & Sede Legale</h2>
                                    <p className="text-xs text-stone-500">Per la fatturazione elettronica e liquidazione compensi</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                    Ragione Sociale / Denominazione
                                </label>
                                <input
                                    type="text"
                                    value={profile.company_name}
                                    onChange={e => setProfile({ ...profile, company_name: e.target.value })}
                                    placeholder="Rossi Posa S.r.l."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Partita IVA
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.vat_number}
                                        onChange={e => setProfile({ ...profile, vat_number: e.target.value })}
                                        placeholder="IT01234567890"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Codice Fiscale
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.fiscal_code}
                                        onChange={e => setProfile({ ...profile, fiscal_code: e.target.value.toUpperCase() })}
                                        placeholder="RSSMRA80A01H501U"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Codice Univoco Destinatario SDI
                                    </label>
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
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Indirizzo PEC
                                    </label>
                                    <input
                                        type="email"
                                        value={profile.pec}
                                        onChange={e => setProfile({ ...profile, pec: e.target.value })}
                                        placeholder="azienda@pec.it"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-stone-100">
                                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2.5">
                                    Sede Legale
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                                    <div className="sm:col-span-6">
                                        <input
                                            type="text"
                                            value={profile.billing_address}
                                            onChange={e => setProfile({ ...profile, billing_address: e.target.value })}
                                            placeholder="Indirizzo e Numero Civico"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <input
                                            type="text"
                                            maxLength={5}
                                            value={profile.billing_cap}
                                            onChange={e => setProfile({ ...profile, billing_cap: e.target.value })}
                                            placeholder="CAP (es. 20121)"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <input
                                            type="text"
                                            value={profile.billing_city}
                                            onChange={e => setProfile({ ...profile, billing_city: e.target.value })}
                                            placeholder="Città"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                        />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <input
                                            type="text"
                                            maxLength={2}
                                            value={profile.billing_province}
                                            onChange={e => setProfile({ ...profile, billing_province: e.target.value.toUpperCase() })}
                                            placeholder="PR"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none uppercase text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Work Zones Card (5 cols) */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden sticky top-6">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Map size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Zone di Lavoro & Province</h2>
                                    <p className="text-xs text-stone-500">Aree coperte per le assegnazioni</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                {selectedZones.length} Selezionate
                            </span>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Selected Zones Chip Display */}
                            {selectedZones.length > 0 ? (
                                <div className="p-3.5 bg-orange-50/50 border border-orange-200/70 rounded-xl">
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                                            Province Attive ({selectedZones.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedZones([])}
                                            className="text-xs text-stone-500 hover:text-rose-600 transition-colors font-semibold cursor-pointer"
                                        >
                                            Svuota
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                        {selectedZones.map(code => {
                                            const prov = ITALIAN_PROVINCES.find(p => p.code === code)
                                            return (
                                                <span
                                                    key={code}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-orange-200 rounded-lg text-xs font-bold text-stone-800 shadow-2xs"
                                                >
                                                    <span className="text-orange-600 font-black">{code}</span>
                                                    <span className="text-stone-700 text-[11px]">{prov?.name || code}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedZones(selectedZones.filter(z => z !== code))}
                                                        className="hover:bg-rose-50 hover:text-rose-600 rounded p-0.5 transition-colors cursor-pointer"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 font-medium">
                                    ⚠️ Nessuna provincia attiva. Seleziona almeno una zona per ricevere richieste di cantieri.
                                </div>
                            )}

                            {/* Province Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-3 text-stone-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Cerca provincia per nome o sigla..."
                                    value={provinceSearch}
                                    onChange={e => setProvinceSearch(e.target.value)}
                                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm font-medium transition-all outline-none"
                                />
                                {provinceSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setProvinceSearch('')}
                                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Province Checkbox Grid */}
                            <div className="border border-stone-200 rounded-xl p-2.5 max-h-72 overflow-y-auto bg-stone-50/30 divide-y divide-stone-100">
                                {filteredProvinces.map(prov => {
                                    const isChecked = selectedZones.includes(prov.code)
                                    return (
                                        <label
                                            key={prov.code}
                                            className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                                isChecked
                                                    ? 'bg-orange-50/80 text-orange-950 font-bold'
                                                    : 'hover:bg-white text-stone-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
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
                                                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                                />
                                                <span className="font-black text-stone-900">{prov.code}</span>
                                                <span className="text-stone-600 text-[11px] truncate">{prov.name}</span>
                                            </div>
                                            {isChecked && (
                                                <CheckCircle2 size={14} className="text-orange-500 shrink-0" />
                                            )}
                                        </label>
                                    )
                                })}
                            </div>

                            {/* Save Submit Button */}
                            <div className="pt-3 border-t border-stone-100">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>Salva Tutte le Modifiche</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Tariffe: salvataggio indipendente dal resto del profilo, perche'
                sono il dato che entra nei preventivi e va aggiornato da solo. */}
            {user?.id && (
                <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                            <Euro className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                                Le tue tariffe
                            </h2>
                            <p className="text-stone-500 text-sm mt-0.5">
                                Il prezzo della manodopera nei preventivi che ricevi
                            </p>
                        </div>
                    </div>
                    <RatesSettings professionalId={user.id} />
                </div>
            )}
        </div>
    )
}


