import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Building2, Mail, Phone, FileText, MapPin, Save, Loader2, Map, Search, X } from 'lucide-react'
import { ITALIAN_PROVINCES } from '@/lib/provinces'

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)
        try {
            // Update profile
            const { error: profileError } = await supabase
                .from('professional_profiles')
                .update(profile)
                .eq('id', user.id)

            if (profileError) throw profileError

            // Update zones: delete all and re-insert
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

            alert('Profilo aggiornato con successo!')
        } catch (error: any) {
            console.error('Error updating profile:', error)
            alert('Errore durante il salvataggio: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Il Mio Profilo</h1>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Personal Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Building2 size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Informazioni Personali</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                            <input
                                type="text"
                                value={profile.full_name}
                                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full pl-10 pr-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Anni di Esperienza</label>
                            <input
                                type="number"
                                min="0"
                                value={profile.years_experience}
                                onChange={e => setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Presentazione</label>
                        <textarea
                            rows={3}
                            value={profile.bio}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Descrivi brevemente la tua attività e le tue competenze..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                        />
                    </div>
                </motion.div>

                {/* Company & Fiscal Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                            <FileText size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Dati Fiscali</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ragione Sociale</label>
                            <input
                                type="text"
                                value={profile.company_name}
                                onChange={e => setProfile({ ...profile, company_name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
                            <input
                                type="text"
                                value={profile.vat_number}
                                onChange={e => setProfile({ ...profile, vat_number: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                            <input
                                type="text"
                                value={profile.fiscal_code}
                                onChange={e => setProfile({ ...profile, fiscal_code: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Codice SDI</label>
                            <input
                                type="text"
                                value={profile.sdi_code}
                                onChange={e => setProfile({ ...profile, sdi_code: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PEC</label>
                            <input
                                type="email"
                                value={profile.pec}
                                onChange={e => setProfile({ ...profile, pec: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Billing Address */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-green-50 p-2 rounded-lg text-green-600">
                            <MapPin size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Sede Legale / Fatturazione</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                            <input
                                type="text"
                                value={profile.billing_address}
                                onChange={e => setProfile({ ...profile, billing_address: e.target.value })}
                                placeholder="Via/Piazza, Civico"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                            <input
                                type="text"
                                value={profile.billing_cap}
                                onChange={e => setProfile({ ...profile, billing_cap: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                            <input
                                type="text"
                                value={profile.billing_city}
                                onChange={e => setProfile({ ...profile, billing_city: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                            <input
                                type="text"
                                maxLength={2}
                                value={profile.billing_province}
                                onChange={e => setProfile({ ...profile, billing_province: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none uppercase"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Work Zones */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                            <Map size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Zone di Lavoro</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Province Coperte
                        </label>

                        {/* Selected Zones Display */}
                        {selectedZones.length > 0 && (
                            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-semibold text-green-700">Selezionate ({selectedZones.length}):</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedZones.map(code => {
                                        const prov = ITALIAN_PROVINCES.find(p => p.code === code)
                                        return (
                                            <button
                                                key={code}
                                                type="button"
                                                onClick={() => setSelectedZones(selectedZones.filter(z => z !== code))}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-green-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                                            >
                                                {code} - {prov?.name}
                                                <X size={14} />
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

                        <div className="border rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                            <div className="grid grid-cols-2 gap-2">
                                {ITALIAN_PROVINCES
                                    .filter(prov =>
                                        provinceSearch === '' ||
                                        prov.name.toLowerCase().includes(provinceSearch.toLowerCase()) ||
                                        prov.code.toLowerCase().includes(provinceSearch.toLowerCase())
                                    )
                                    .map(prov => (
                                        <label key={prov.code} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
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
                        {selectedZones.length === 0 && (
                            <p className="text-sm text-amber-600 mt-2">
                                ⚠️ Seleziona almeno una provincia per ricevere lavori nella tua zona
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Save Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-end"
                >
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Salva Modifiche
                            </>
                        )}
                    </button>
                </motion.div>
            </form>
        </div>
    )
}
