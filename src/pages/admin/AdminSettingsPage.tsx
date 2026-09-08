import { useState, useEffect } from 'react'
import {
    Settings,
    Save,
    Building2,
    DollarSign,
    Bell,
    RotateCcw
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

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
            toast.success('Impostazioni salvate con successo!')
        } catch (err: any) {
            console.error(err)
            toast.error('Errore durante il salvataggio delle impostazioni')
        } finally {
            setSaving(false)
        }
    }

    const handleReset = () => {
        if (window.confirm('Vuoi ripristinare le impostazioni predefinite?')) {
            setSettings(DEFAULT_SETTINGS)
            localStorage.removeItem(SETTINGS_STORAGE_KEY)
            toast.info('Impostazioni reimpostate ai valori predefiniti')
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-orange-500" />
                        <span>Impostazioni Piattaforma</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Configura tariffe posa di default, dati aziendali per fatturazione e notifiche.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                        <RotateCcw size={15} />
                        <span>Predefiniti</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        <Save size={16} />
                        <span>{saving ? 'Salvataggio...' : 'Salva Impostazioni'}</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 gap-6 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('pricing')}
                    className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'pricing'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-stone-500 hover:text-stone-800'
                    }`}
                >
                    <DollarSign size={16} />
                    <span>Tariffe & Maggiorazioni Posa</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('company')}
                    className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'company'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-stone-500 hover:text-stone-800'
                    }`}
                >
                    <Building2 size={16} />
                    <span>Dati Aziendali PosaFacile</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'notifications'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-stone-500 hover:text-stone-800'
                    }`}
                >
                    <Bell size={16} />
                    <span>Preferenze Notifiche</span>
                </button>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSave} className="space-y-6">
                {activeTab === 'pricing' && (
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-6">
                        <div>
                            <h3 className="text-base font-bold text-stone-900">Tariffario Base di Posa</h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Questi valori vengono applicati come riferimento iniziale nel configuratore per i calcoli dei preventivi.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                    Posa Standard (€ / mq)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={settings.standardLayingRate}
                                        onChange={e => setSettings({ ...settings, standardLayingRate: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-stone-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                    Spina di Pesce (€ / mq)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={settings.herringboneLayingRate}
                                        onChange={e => setSettings({ ...settings, herringboneLayingRate: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-stone-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                    Posa Diagonale (€ / mq)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={settings.diagonalLayingRate}
                                        onChange={e => setSettings({ ...settings, diagonalLayingRate: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-stone-900"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-stone-100" />

                        <div>
                            <h3 className="text-sm font-bold text-stone-900 mb-1">Servizi Accessori & Fiscale</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-3">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                        Smantellamento Vecchio Pav. (€ / mq)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={settings.removalRate}
                                            onChange={e => setSettings({ ...settings, removalRate: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-stone-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                        Massetto Autolivellante (€ / mq)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={settings.screedRate}
                                            onChange={e => setSettings({ ...settings, screedRate: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-stone-900"
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
                                            className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-stone-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'company' && (
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-5">
                        <div>
                            <h3 className="text-base font-bold text-stone-900">Anagrafica Aziendale</h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Dati riportati nelle conferme d'ordine, nei preventivi PDF e nelle fatture emesse.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Ragione Sociale</label>
                                <input
                                    type="text"
                                    value={settings.companyName}
                                    onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Partita IVA / C.F.</label>
                                <input
                                    type="text"
                                    value={settings.vatNumber}
                                    onChange={e => setSettings({ ...settings, vatNumber: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Indirizzo Sede Legale</label>
                                <input
                                    type="text"
                                    value={settings.address}
                                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Città e CAP</label>
                                <input
                                    type="text"
                                    value={settings.city}
                                    onChange={e => setSettings({ ...settings, city: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Email Supporto Clienti</label>
                                <input
                                    type="email"
                                    value={settings.supportEmail}
                                    onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Telefono Assistenza</label>
                                <input
                                    type="text"
                                    value={settings.supportPhone}
                                    onChange={e => setSettings({ ...settings, supportPhone: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 space-y-5">
                        <div>
                            <h3 className="text-base font-bold text-stone-900">Notifiche Automatiche</h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Gestisci gli alert automatici inviati allo staff e ai clienti.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer">
                                <div>
                                    <span className="font-bold text-stone-900 text-sm block">Notifica Nuovo Ordine via Email</span>
                                    <span className="text-xs text-stone-500">Invia un'email immediata allo staff admin alla ricezione di ogni nuovo ordine.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifyNewOrder}
                                    onChange={e => setSettings({ ...settings, emailNotifyNewOrder: e.target.checked })}
                                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer">
                                <div>
                                    <span className="font-bold text-stone-900 text-sm block">Notifica Registrazione Professionista</span>
                                    <span className="text-xs text-stone-500">Avvisa l'amministratore quando un nuovo posatore richiede l'iscrizione per l'approvazione.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifyNewPro}
                                    onChange={e => setSettings({ ...settings, emailNotifyNewPro: e.target.checked })}
                                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer">
                                <div>
                                    <span className="font-bold text-stone-900 text-sm block">Aggiornamenti di Stato SMS / WhatsApp</span>
                                    <span className="text-xs text-stone-500">Invia notifiche automatiche al cliente ad ogni cambio di stato dell'ordine.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.smsNotifyCustomer}
                                    onChange={e => setSettings({ ...settings, smsNotifyCustomer: e.target.checked })}
                                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                                />
                            </label>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}
