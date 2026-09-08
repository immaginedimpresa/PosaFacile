import { useState, useEffect, useMemo } from 'react'
import {
    Settings,
    Save,
    Building2,
    DollarSign,
    Bell,
    RotateCcw,
    Percent,
    Loader2,
    Mail,
    Phone,
    MapPin,
    CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

interface PlatformSettings {
    // Tariffe Posa
    standardLayingRate: number
    herringboneLayingRate: number
    diagonalLayingRate: number
    removalRate: number
    screedRate: number
    defaultVatRate: number

    // Dati Aziendali
    companyName: string
    vatNumber: string
    address: string
    city: string
    supportEmail: string
    supportPhone: string

    // Notifiche
    emailNotifyNewOrder: boolean
    emailNotifyNewPro: boolean
    smsNotifyCustomer: boolean
}

const DEFAULT_SETTINGS: PlatformSettings = {
    standardLayingRate: 25,
    herringboneLayingRate: 32,
    diagonalLayingRate: 28,
    removalRate: 15,
    screedRate: 18,
    defaultVatRate: 22,

    companyName: 'PosaFacile S.r.l.',
    vatNumber: 'IT01234567890',
    address: 'Via dell\'Artigianato 42',
    city: '20121 Milano (MI)',
    supportEmail: 'supporto@posafacile.it',
    supportPhone: '+39 02 8900 1234',

    emailNotifyNewOrder: true,
    emailNotifyNewPro: true,
    smsNotifyCustomer: false
}

const SETTINGS_STORAGE_KEY = 'posafacile_platform_settings'

export function AdminSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
    const [activeTab, setActiveTab] = useState<'pricing' | 'company' | 'notifications'>('pricing')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        try {
            const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
            if (saved) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
            }
        } catch (e) {
            console.error('Error loading settings:', e)
        }
    }, [])

    const activeNotificationsCount = useMemo(() => {
        let count = 0
        if (settings.emailNotifyNewOrder) count++
        if (settings.emailNotifyNewPro) count++
        if (settings.smsNotifyCustomer) count++
        return count
    }, [settings])

    const handleSave = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setSaving(true)
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
            toast.success('Impostazioni della piattaforma salvate con successo!')
        } catch (err: any) {
            console.error(err)
            toast.error('Errore durante il salvataggio delle impostazioni')
        } finally {
            setSaving(false)
        }
    }

    const handleReset = () => {
        toast('Vuoi ripristinare le impostazioni predefinite?', {
            description: 'Tutte le tariffe, le anagrafiche e i canali torneranno ai valori di fabbrica.',
            action: {
                label: 'Ripristina',
                onClick: () => {
                    setSettings(DEFAULT_SETTINGS)
                    localStorage.removeItem(SETTINGS_STORAGE_KEY)
                    toast.success('Impostazioni reimpostate ai valori predefiniti!')
                }
            },
            cancel: {
                label: 'Annulla',
                onClick: () => {}
            }
        })
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header matching Admin style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-orange-500" />
                        <span>Impostazioni Piattaforma</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Configura tariffe base per il configuratore, dati aziendali per fatture e notifiche automatiche.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                        <RotateCcw size={15} />
                        <span>Ripristina Default</span>
                    </button>
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
                {/* 1. Tariffa Base Posa */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Tariffa Base Posa</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">€ {settings.standardLayingRate}/mq</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Riferimento configuratore</p>
                    </div>
                </div>

                {/* 2. Intestazione Fiscale */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Intestazione Fiscale</p>
                        <p className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5 truncate">{settings.companyName}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5 truncate">{settings.vatNumber}</p>
                    </div>
                </div>

                {/* 3. Aliquota IVA Standard */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Percent size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Aliquota IVA Standard</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{settings.defaultVatRate}%</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Regime ordinario attivo</p>
                    </div>
                </div>

                {/* 4. Canali Notifiche */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Bell size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Canali Notifiche</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-base font-bold text-stone-900">{activeNotificationsCount} di 3 Attivi</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">Avvisi automatici staff e clienti</p>
                    </div>
                </div>
            </div>

            {/* Segmented Tab Navigation Control */}
            <div className="p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200/60 inline-flex flex-wrap items-center gap-1.5 mb-8 w-full sm:w-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('pricing')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'pricing'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                    }`}
                >
                    <DollarSign size={16} className={activeTab === 'pricing' ? 'text-orange-500' : ''} />
                    <span>Tariffario Posa & IVA</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('company')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'company'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                    }`}
                >
                    <Building2 size={16} className={activeTab === 'company' ? 'text-orange-500' : ''} />
                    <span>Dati Aziendali & Fatturazione</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'notifications'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                    }`}
                >
                    <Bell size={16} className={activeTab === 'notifications' ? 'text-orange-500' : ''} />
                    <span>Canali Notifiche & Alert</span>
                </button>
            </div>

            {/* Main Form Content */}
            <form onSubmit={handleSave}>
                {activeTab === 'pricing' && (
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Tariffario Base di Posa in Opera</h2>
                                    <p className="text-xs text-stone-500">Valori di riferimento utilizzati per il calcolo automatico dei preventivi</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                                    Tipologie di Schema Posa (€ al metro quadro)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Posa Dritta Standard
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={settings.standardLayingRate}
                                                onChange={e => setSettings({ ...settings, standardLayingRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Posa a Spina di Pesce
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={settings.herringboneLayingRate}
                                                onChange={e => setSettings({ ...settings, herringboneLayingRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Posa Diagonale
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={settings.diagonalLayingRate}
                                                onChange={e => setSettings({ ...settings, diagonalLayingRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-5 border-t border-stone-100">
                                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                                    Lavorazioni Accessorie & Aliquota Fiscale
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Smantellamento Vecchio Pavimento
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={settings.removalRate}
                                                onChange={e => setSettings({ ...settings, removalRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Realizzazione Massetto Autolivellante
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={settings.screedRate}
                                                onChange={e => setSettings({ ...settings, screedRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Aliquota IVA Ordinaria (%)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">%</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.defaultVatRate}
                                                onChange={e => setSettings({ ...settings, defaultVatRate: parseInt(e.target.value, 10) || 0 })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Card Save Bar */}
                            <div className="pt-6 border-t border-stone-100 flex items-center justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    <span>Salva Modifiche Tariffe</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'company' && (
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Anagrafica Aziendale & Fatturazione</h2>
                                    <p className="text-xs text-stone-500">Dati riportati nelle conferme d'ordine, nei preventivi PDF e nei documenti fiscali</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Ragione Sociale
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.companyName}
                                        onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-stone-900 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Partita IVA / Codice Fiscale
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.vatNumber}
                                        onChange={e => setSettings({ ...settings, vatNumber: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-medium text-stone-900 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Indirizzo Sede Legale
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3 text-stone-400" size={16} />
                                        <input
                                            type="text"
                                            value={settings.address}
                                            onChange={e => setSettings({ ...settings, address: e.target.value })}
                                            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-stone-900 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Città e CAP
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.city}
                                        onChange={e => setSettings({ ...settings, city: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-stone-900 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Email Supporto & Assistenza Clienti
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-3 text-stone-400" size={16} />
                                        <input
                                            type="email"
                                            value={settings.supportEmail}
                                            onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                                            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-stone-900 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Recapito Telefonico Operativo
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-3 text-stone-400" size={16} />
                                        <input
                                            type="text"
                                            value={settings.supportPhone}
                                            onChange={e => setSettings({ ...settings, supportPhone: e.target.value })}
                                            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-stone-900 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Card Save Bar */}
                            <div className="pt-6 border-t border-stone-100 flex items-center justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    <span>Salva Dati Aziendali</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Canali Notifiche & Alert Automatici</h2>
                                    <p className="text-xs text-stone-500">Configura i messaggi inviati automaticamente a staff admin e clienti</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <label className="flex items-center justify-between p-4 bg-stone-50/50 hover:bg-stone-50 rounded-2xl border border-stone-200/80 cursor-pointer transition-all">
                                <div className="pr-4">
                                    <span className="font-bold text-stone-900 text-sm flex items-center gap-2">
                                        Notifica Nuovo Ordine via Email
                                        {settings.emailNotifyNewOrder && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Attiva</span>
                                        )}
                                    </span>
                                    <span className="text-xs text-stone-500 mt-0.5 block">
                                        Invia un'email istantanea con riepilogo cantiere allo staff admin alla ricezione di ogni nuovo ordine.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifyNewOrder}
                                    onChange={e => setSettings({ ...settings, emailNotifyNewOrder: e.target.checked })}
                                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-5 h-5 cursor-pointer"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 bg-stone-50/50 hover:bg-stone-50 rounded-2xl border border-stone-200/80 cursor-pointer transition-all">
                                <div className="pr-4">
                                    <span className="font-bold text-stone-900 text-sm flex items-center gap-2">
                                        Notifica Registrazione Nuovo Professionista
                                        {settings.emailNotifyNewPro && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Attiva</span>
                                        )}
                                    </span>
                                    <span className="text-xs text-stone-500 mt-0.5 block">
                                        Avvisa l'amministrazione quando un nuovo posatore completa la richiesta di iscrizione per l'approvazione.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifyNewPro}
                                    onChange={e => setSettings({ ...settings, emailNotifyNewPro: e.target.checked })}
                                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-5 h-5 cursor-pointer"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 bg-stone-50/50 hover:bg-stone-50 rounded-2xl border border-stone-200/80 cursor-pointer transition-all">
                                <div className="pr-4">
                                    <span className="font-bold text-stone-900 text-sm flex items-center gap-2">
                                        Aggiornamenti di Stato SMS / WhatsApp per Clienti
                                        {settings.smsNotifyCustomer && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Attiva</span>
                                        )}
                                    </span>
                                    <span className="text-xs text-stone-500 mt-0.5 block">
                                        Invia notifiche automatiche sul cellulare del cliente ad ogni cambio di stato operativo dell'ordine.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.smsNotifyCustomer}
                                    onChange={e => setSettings({ ...settings, smsNotifyCustomer: e.target.checked })}
                                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 w-5 h-5 cursor-pointer"
                                />
                            </label>

                            {/* Bottom Card Save Bar */}
                            <div className="pt-6 border-t border-stone-100 flex items-center justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>Salva Preferenze Notifiche</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}

