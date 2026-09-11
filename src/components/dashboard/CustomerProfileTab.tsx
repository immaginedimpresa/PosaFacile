import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/store/userStore'
import {
    User,
    Phone,
    Mail,
    Receipt,
    Building2,
    MapPin,
    Save,
    Loader2,
    ShieldCheck,
    LogOut,
    Info,
    Sparkles
} from 'lucide-react'
import { ITALIAN_PROVINCES } from '@/lib/provinces'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface CustomerFormData {
    first_name: string
    last_name: string
    email: string
    phone: string
    customer_type: 'private' | 'business'
    company_name: string
    vat_number: string
    fiscal_code: string
    street: string
    city: string
    province: string
    postal_code: string
    newsletter_consent: boolean
    marketing_consent: boolean
}

export function CustomerProfileTab() {
    const navigate = useNavigate()
    const { user, profile, loadProfile, signOut } = useUserStore()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [addressId, setAddressId] = useState<string | null>(null)

    const [form, setForm] = useState<CustomerFormData>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        customer_type: 'private',
        company_name: '',
        vat_number: '',
        fiscal_code: '',
        street: '',
        city: '',
        province: '',
        postal_code: '',
        newsletter_consent: false,
        marketing_consent: false,
    })

    useEffect(() => {
        if (user?.id) {
            fetchCustomerData()
        }
    }, [user?.id])

    const fetchCustomerData = async () => {
        if (!user?.id) return
        setLoading(true)

        try {
            // 1. Dati da public.users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('first_name, last_name, phone, email')
                .eq('id', user.id)
                .maybeSingle()

            if (userError) {
                console.warn('Error fetching users row:', userError)
            }

            // 2. Dati da public.customers
            const { data: custData, error: custError } = await supabase
                .from('customers')
                .select('customer_type, company_name, vat_number, fiscal_code, billing_address_id, newsletter_consent, marketing_consent')
                .eq('id', user.id)
                .maybeSingle()

            if (custError) {
                console.warn('Error fetching customers row:', custError)
            }

            // 3. Dati da public.addresses (indirizzo predefinito dell'utente)
            let addrData: any = null
            if (custData?.billing_address_id) {
                const { data: aRow } = await supabase
                    .from('addresses')
                    .select('id, street, city, province, postal_code')
                    .eq('id', custData.billing_address_id)
                    .maybeSingle()
                addrData = aRow
            }

            if (!addrData) {
                const { data: defaultAddr } = await supabase
                    .from('addresses')
                    .select('id, street, city, province, postal_code')
                    .eq('user_id', user.id)
                    .order('is_default', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                addrData = defaultAddr
            }

            if (addrData?.id) {
                setAddressId(addrData.id)
            }

            // Popola lo stato del form
            setForm({
                first_name: userData?.first_name || profile?.first_name || '',
                last_name: userData?.last_name || profile?.last_name || '',
                email: userData?.email || user.email || '',
                phone: userData?.phone || profile?.phone || '',
                customer_type: (custData?.customer_type as any) === 'business' ? 'business' : 'private',
                company_name: custData?.company_name || '',
                vat_number: custData?.vat_number || '',
                fiscal_code: custData?.fiscal_code || '',
                street: addrData?.street || '',
                city: addrData?.city || '',
                province: addrData?.province || '',
                postal_code: addrData?.postal_code || '',
                newsletter_consent: custData?.newsletter_consent || false,
                marketing_consent: custData?.marketing_consent || false,
            })
        } catch (err: any) {
            console.error('Error loading customer profile data:', err)
            toast.error('Impossibile caricare tutti i dati del profilo')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: keyof CustomerFormData, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!user?.id) return

        // Validazioni di base
        if (!form.first_name.trim()) {
            toast.error('Inserisci il tuo nome')
            return
        }

        const isCompany = form.customer_type === 'business'
        if (isCompany && !form.company_name.trim()) {
            toast.error('Inserisci la ragione sociale per l\'account aziendale')
            return
        }

        setSaving(true)
        try {
            // 1. Aggiorna public.users (first_name, last_name, phone)
            const { error: userError } = await supabase
                .from('users')
                .update({
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    phone: form.phone.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (userError) throw userError

            // 2. Salva o aggiorna indirizzo se compilato
            let currentAddressId = addressId
            const hasAddressInfo = Boolean(form.street.trim() || form.city.trim() || form.postal_code.trim())

            if (hasAddressInfo) {
                if (currentAddressId) {
                    const { error: addrErr } = await supabase
                        .from('addresses')
                        .update({
                            street: form.street.trim() || null,
                            city: form.city.trim() || null,
                            province: form.province.trim().toUpperCase() || null,
                            postal_code: form.postal_code.trim() || null,
                            is_default: true
                        })
                        .eq('id', currentAddressId)

                    if (addrErr) console.warn('Address update warning:', addrErr)
                } else {
                    const { data: newAddr, error: insertAddrErr } = await supabase
                        .from('addresses')
                        .insert({
                            user_id: user.id,
                            street: form.street.trim() || null,
                            city: form.city.trim() || null,
                            province: form.province.trim().toUpperCase() || null,
                            postal_code: form.postal_code.trim() || null,
                            country: 'Italy',
                            is_default: true
                        })
                        .select('id')
                        .single()

                    if (!insertAddrErr && newAddr?.id) {
                        currentAddressId = newAddr.id
                        setAddressId(newAddr.id)
                    }
                }
            }

            // 3. Upsert su public.customers (customer_type, company_name, vat_number, fiscal_code, consensi)
            const customerPayload: any = {
                id: user.id,
                customer_type: form.customer_type,
                company_name: isCompany ? (form.company_name.trim() || null) : null,
                vat_number: isCompany ? (form.vat_number.trim() || null) : null,
                fiscal_code: form.fiscal_code.trim().toUpperCase() || null,
                newsletter_consent: form.newsletter_consent,
                marketing_consent: form.marketing_consent,
                is_active: true
            }

            if (currentAddressId) {
                customerPayload.billing_address_id = currentAddressId
            }

            const { error: customerError } = await supabase
                .from('customers')
                .upsert(customerPayload)

            if (customerError) throw customerError

            // 4. Ricarica il profilo nello store globale dell'utente
            await loadProfile(user.id)

            toast.success('Profilo aggiornato con successo!')
        } catch (error: any) {
            console.error('Error saving customer profile:', error)
            toast.error(error.message || 'Errore durante il salvataggio delle impostazioni')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3 border border-orange-500/20">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <h3 className="text-base font-bold text-stone-900">Caricamento impostazioni profilo...</h3>
                <p className="text-xs text-stone-500 mt-1">Recupero dati anagrafici e fiscali salvati.</p>
            </div>
        )
    }

    const isCompany = form.customer_type === 'business'

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* INTESTAZIONE GENERALE TAB */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                            <User size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-black text-stone-900 tracking-tight font-display">
                                    Impostazioni Profilo & Dati Fiscali
                                </h2>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
                                    <Sparkles size={11} />
                                    Cliente PosaFacile
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
                                Gestisci i tuoi recapiti personali per essere contattato dal posatore incaricato, i dati fiscali per l'emissione delle ricevute/fatture e l'indirizzo predefinito dei cantieri.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-stone-900 font-extrabold text-sm shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Salvataggio...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Salva Modifiche</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* SEZIONE 1: ANAGRAFICA & RECAPITI PERSONALI */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <User size={16} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-base text-stone-900">Dati Anagrafici & Contatto Rapido</h3>
                        <p className="text-xs text-stone-500">I dati utilizzati per le comunicazioni e per il posatore</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nome */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Nome <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.first_name}
                            onChange={(e) => handleChange('first_name', e.target.value)}
                            placeholder="Es. Mario"
                            className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-900 transition-all outline-hidden"
                        />
                    </div>

                    {/* Cognome */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Cognome <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.last_name}
                            onChange={(e) => handleChange('last_name', e.target.value)}
                            placeholder="Es. Rossi"
                            className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-900 transition-all outline-hidden"
                        />
                    </div>

                    {/* Email Account */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Email Account
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                readOnly
                                value={form.email}
                                className="w-full bg-stone-100/80 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-stone-600 cursor-not-allowed outline-hidden"
                            />
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1">
                            L'indirizzo email di accesso è protetto tramite autenticazione Supabase.
                        </p>
                    </div>

                    {/* Numero di Telefono per Contatto */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Numero di Telefono per Contatto
                        </label>
                        <div className="relative">
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="+39 340 1234567"
                                className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-stone-900 transition-all outline-hidden font-mono"
                            />
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                            <Info size={12} className="text-orange-500 shrink-0" />
                            Fornito al posatore incaricato solo dopo l'accettazione del cantiere per coordinare l'avvio lavori.
                        </p>
                    </div>
                </div>
            </div>

            {/* SEZIONE 2: INQUADRAMENTO FISCALE & CODICE FISCALE / P.IVA */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Receipt size={16} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-base text-stone-900">Inquadramento Fiscale & Fatturazione</h3>
                        <p className="text-xs text-stone-500">Codice Fiscale e Partita IVA per ricevute o fatture elettroniche</p>
                    </div>
                </div>

                {/* Scelta Tipologia Committente */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                        Tipologia di Committente
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleChange('customer_type', 'private')}
                            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                                !isCompany
                                    ? 'border-orange-500 bg-orange-50/30 text-stone-900'
                                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 text-stone-600'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                !isCompany ? 'bg-orange-500 text-stone-900' : 'bg-stone-200 text-stone-600'
                            }`}>
                                <User size={16} />
                            </div>
                            <div>
                                <span className="block font-black text-sm text-stone-900">Cliente Privato</span>
                                <span className="block text-xs text-stone-500 mt-0.5">
                                    Persona fisica (ricevuta fiscale o fattura con Codice Fiscale)
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleChange('customer_type', 'business')}
                            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                                isCompany
                                    ? 'border-orange-500 bg-orange-50/30 text-stone-900'
                                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 text-stone-600'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isCompany ? 'bg-orange-500 text-stone-900' : 'bg-stone-200 text-stone-600'
                            }`}>
                                <Building2 size={16} />
                            </div>
                            <div>
                                <span className="block font-black text-sm text-stone-900">Azienda / Professionista (B2B)</span>
                                <span className="block text-xs text-stone-500 mt-0.5">
                                    Partita IVA, detrazione fiscale e fatturazione elettronica
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Codice Fiscale (Sempre presente, formattato in maiuscolo) */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Codice Fiscale (C.F.)
                        </label>
                        <input
                            type="text"
                            maxLength={16}
                            value={form.fiscal_code}
                            onChange={(e) => handleChange('fiscal_code', e.target.value.toUpperCase())}
                            placeholder="RSSMRA85M01H501Z"
                            className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-stone-900 uppercase transition-all outline-hidden"
                        />
                        <p className="text-[11px] text-stone-400 mt-1">
                            16 caratteri alfanumerici per persone fisiche.
                        </p>
                    </div>

                    {/* Se Azienda: Partita IVA */}
                    {isCompany && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                                Partita IVA (P.IVA) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={11}
                                value={form.vat_number}
                                onChange={(e) => handleChange('vat_number', e.target.value.replace(/\D/g, ''))}
                                placeholder="12345678901"
                                className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-stone-900 transition-all outline-hidden"
                            />
                            <p className="text-[11px] text-stone-400 mt-1">
                                11 cifre numeriche.
                            </p>
                        </div>
                    )}

                    {/* Se Azienda: Ragione Sociale */}
                    {isCompany && (
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                                Ragione Sociale / Intestazione Società <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.company_name}
                                onChange={(e) => handleChange('company_name', e.target.value)}
                                placeholder="Es. Impresa Edile Rossi S.r.l."
                                className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 transition-all outline-hidden"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* SEZIONE 3: INDIRIZZO DI RESIDENZA / FATTURAZIONE PREDEFINITO */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                        <MapPin size={16} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-base text-stone-900">Indirizzo Predefinito di Residenza / Cantiere</h3>
                        <p className="text-xs text-stone-500">Coordinate geografiche precompilate per i tuoi preventivi e ordini</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Via e Civico */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Indirizzo (Via, Piazza, Corso e Civico)
                        </label>
                        <input
                            type="text"
                            value={form.street}
                            onChange={(e) => handleChange('street', e.target.value)}
                            placeholder="Es. Via Roma, 14"
                            className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-900 transition-all outline-hidden"
                        />
                    </div>

                    {/* CAP */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            C.A.P.
                        </label>
                        <input
                            type="text"
                            maxLength={5}
                            value={form.postal_code}
                            onChange={(e) => handleChange('postal_code', e.target.value.replace(/\D/g, ''))}
                            placeholder="Es. 20121"
                            className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-stone-900 transition-all outline-hidden"
                        />
                    </div>

                    {/* Città */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Città / Comune
                        </label>
                        <input
                            type="text"
                            value={form.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            placeholder="Es. Milano"
                            className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-900 transition-all outline-hidden"
                        />
                    </div>

                    {/* Provincia */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Provincia
                        </label>
                        <select
                            value={form.province}
                            onChange={(e) => handleChange('province', e.target.value)}
                            className="w-full bg-stone-50/70 focus:bg-white border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 transition-all outline-hidden cursor-pointer"
                        >
                            <option value="">Seleziona Provincia</option>
                            {ITALIAN_PROVINCES.map((p) => (
                                <option key={p.code} value={p.code}>
                                    {p.name} ({p.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* SEZIONE 4: PREFERENZE & PRIVACY */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                        <ShieldCheck size={16} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-base text-stone-900">Consensi & Privacy</h3>
                        <p className="text-xs text-stone-500">Gestisci i canali di aggiornamento sul tuo cantiere</p>
                    </div>
                </div>

                <div className="space-y-3 pt-1">
                    <label className="flex items-start gap-3 p-3 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/70 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={form.newsletter_consent}
                            onChange={(e) => handleChange('newsletter_consent', e.target.checked)}
                            className="w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500 mt-0.5"
                        />
                        <div className="text-xs">
                            <span className="font-bold text-stone-900 block">
                                Ricevi aggiornamenti e guide pratiche sulla posa delle piastrelle
                            </span>
                            <span className="text-stone-500 block mt-0.5">
                                Consigli su manutenzione, trattamenti protettivi per gres e novità sui materiali.
                            </span>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/70 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={form.marketing_consent}
                            onChange={(e) => handleChange('marketing_consent', e.target.checked)}
                            className="w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500 mt-0.5"
                        />
                        <div className="text-xs">
                            <span className="font-bold text-stone-900 block">
                                Offerte esclusive e promozioni su materiali da posa
                            </span>
                            <span className="text-stone-500 block mt-0.5">
                                Comunicazioni commerciali riservate ai clienti registrati PosaFacile.
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* BARRA INFERIORE SALVATAGGIO & DISCONNESSIONE */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Ruolo account: <strong className="text-stone-800 font-bold">{profile?.role || 'Cliente'}</strong></span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            signOut()
                            navigate('/')
                        }}
                        className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer"
                    >
                        <LogOut size={15} />
                        <span>Disconnetti Account</span>
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-stone-900 font-extrabold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Salvataggio...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Salva Modifiche Profilo</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    )
}
