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
    CheckCircle2,
    Truck,
    CalendarClock,
    Package,
    ShieldCheck,
    Sparkles,
    Hammer,
} from 'lucide-react'
import { toast } from 'sonner'
import {
    fetchLogisticsSettings,
    saveLogisticsSettings,
    DEFAULT_LOGISTICS,
    type LogisticsSettings,
} from '@/services/settingsService'
import { useAuth } from '@/hooks/useAuth'
import {
    earliestStartDate,
    estimateLayingDuration,
    formatDays,
    materialWaitDays,
    type DurationInput,
} from '@/lib/layingDuration'

/** Cantieri tipo su cui l'admin vede subito l'effetto della resa di posa. */
const LAYING_EXAMPLES: { label: string; input: DurationInput }[] = [
    {
        label: 'Soggiorno 25 mq · 60x60 · dritta',
        input: { floorSqm: 25, wallSqm: 0, layingType: 'dritta', ambiente: 'soggiorno', intervento: 'nuova_costruzione', tileWidthMm: 600, tileHeightMm: 600 },
    },
    {
        label: 'Soggiorno 50 mq · 60x60 · dritta',
        input: { floorSqm: 50, wallSqm: 0, layingType: 'dritta', ambiente: 'soggiorno', intervento: 'nuova_costruzione', tileWidthMm: 600, tileHeightMm: 600 },
    },
    {
        label: 'Open space 100 mq · 60x60 · dritta',
        input: { floorSqm: 100, wallSqm: 0, layingType: 'dritta', ambiente: 'soggiorno', intervento: 'nuova_costruzione', tileWidthMm: 600, tileHeightMm: 600 },
    },
    {
        label: 'Bagno 6 mq + 20 mq pareti · 30x60',
        input: { floorSqm: 6, wallSqm: 20, layingType: 'dritta', ambiente: 'bagno', intervento: 'ristrutturazione', tileWidthMm: 300, tileHeightMm: 600 },
    },
]

/** Giorni di sola posa e giorni di cantiere di un esempio, con la resa indicata. */
function layingExample(input: DurationInput, layingSqmPerDay: number) {
    const estimate = estimateLayingDuration({ ...input, layingSqmPerDay })
    const layingDays = estimate.phases
        .filter((phase) => phase.key.startsWith('posa'))
        .reduce((sum, phase) => sum + phase.criticalDays, 0) / estimate.crewThroughput
    return { layingDays, workDays: estimate.workDays }
}

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
    const { user } = useAuth()
    const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
    // La logistica sta sul database, non in localStorage: deve poter bloccare
    // le date nel calendario che vede il cliente.
    const [logistics, setLogistics] = useState<LogisticsSettings>(DEFAULT_LOGISTICS)
    const [activeTab, setActiveTab] = useState<'pricing' | 'logistics' | 'company' | 'notifications'>('pricing')
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

    useEffect(() => {
        fetchLogisticsSettings(true).then(setLogistics)
    }, [])

    const activeNotificationsCount = useMemo(() => {
        let count = 0
        if (settings.emailNotifyNewOrder) count++
        if (settings.emailNotifyNewPro) count++
        if (settings.smsNotifyCustomer) count++
        return count
    }, [settings])

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setSaving(true)
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
            await saveLogisticsSettings(logistics, user?.id)
            toast.success('Impostazioni della piattaforma salvate con successo!')
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Errore durante il salvataggio delle impostazioni')
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
                    setLogistics(DEFAULT_LOGISTICS)
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
                    onClick={() => setActiveTab('logistics')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'logistics'
                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                    }`}
                >
                    <Truck size={16} className={activeTab === 'logistics' ? 'text-orange-500' : ''} />
                    <span>Logistica & Disponibilità</span>
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

                {activeTab === 'logistics' && (
                    <div className="space-y-6">
                        {/* 1. Tempi di Approvvigionamento */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                            <div className="p-6 border-b border-stone-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Tempi di Approvvigionamento</h2>
                                    <p className="text-xs text-stone-500">
                                        Determinano da quando in poi il cliente può scegliere una data di posa nel calendario
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Giorni dall&apos;ordine alla spedizione
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={180}
                                            value={logistics.materialLeadDays}
                                            onChange={e => setLogistics({
                                                ...logistics,
                                                materialLeadDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                                            })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                        />
                                        <p className="text-[11px] text-stone-400 mt-1.5">
                                            Tempo che serve per ordinare al fornitore e far partire la merce dal magazzino.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Giorni di trasporto fino al cantiere
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={60}
                                            value={logistics.shippingTransitDays}
                                            onChange={e => setLogistics({
                                                ...logistics,
                                                shippingTransitDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                                            })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                        />
                                        <p className="text-[11px] text-stone-400 mt-1.5">
                                            Consegna del corriere all&apos;indirizzo di posa.
                                        </p>
                                    </div>
                                </div>

                                {/* Effetto immediato del valore impostato */}
                                <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-5 flex items-start gap-3.5">
                                    <CalendarClock size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-stone-900">
                                            Con questi valori il cliente non può scegliere le prossime{' '}
                                            {materialWaitDays(logistics)} giornate.
                                        </p>
                                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                            Un ordine fatto oggi avrebbe come prima data di posa selezionabile il{' '}
                                            <strong className="text-stone-900">
                                                {earliestStartDate(logistics).toLocaleDateString('it-IT', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                })}
                                            </strong>
                                            . Se il prodotto scelto a catalogo ha un approvvigionamento più lungo
                                            (campo <em>lead time</em> della scheda prodotto), vince quello.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Tempi di posa: base della stima dei giorni di cantiere */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                            <div className="p-6 border-b border-stone-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Hammer size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-stone-900">Tempi di Posa</h2>
                                    <p className="text-xs text-stone-500">
                                        Base della stima dei giorni di cantiere mostrata al cliente e salvata sull&apos;ordine
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Mq posati al giorno dal cantiere
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={1}
                                                max={200}
                                                step={1}
                                                value={logistics.layingSqmPerDay}
                                                onChange={e => setLogistics({
                                                    ...logistics,
                                                    layingSqmPerDay: Math.max(0, parseInt(e.target.value, 10) || 0),
                                                })}
                                                className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                            />
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">mq/giorno</span>
                                        </div>
                                        <p className="text-[11px] text-stone-400 mt-1.5">
                                            Riferimento: pavimento in 60x60, posa dritta, ambiente senza ostacoli. Con {logistics.layingSqmPerDay || DEFAULT_LOGISTICS.layingSqmPerDay} mq/giorno, 1 giorno di posa ogni {logistics.layingSqmPerDay || DEFAULT_LOGISTICS.layingSqmPerDay} mq.
                                        </p>
                                    </div>
                                    <div className="text-xs text-stone-500 leading-relaxed sm:pt-6">
                                        Formato della piastrella, schema di posa, ambiente, tipo di intervento e rivestimento a parete correggono questa resa in automatico. Demolizione, massetto, stuccatura e le altre lavorazioni si aggiungono ai giorni di posa.
                                    </div>
                                </div>

                                {/* Effetto immediato del valore impostato */}
                                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                                    <div className="flex items-center gap-2 text-stone-900">
                                        <Sparkles size={16} className="text-orange-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider">
                                            Simulazione giorni stimati al cliente
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                        {LAYING_EXAMPLES.map(({ label, input }) => {
                                            const { layingDays, workDays } = layingExample(input, logistics.layingSqmPerDay)
                                            return (
                                                <div key={label} className="p-3 bg-white rounded-xl border border-stone-200/70 space-y-1">
                                                    <p className="text-stone-500 font-medium">{label}</p>
                                                    <p className="text-base font-bold text-stone-900">
                                                        {layingDays.toFixed(1).replace('.', ',')} giorni di posa
                                                    </p>
                                                    <p className="text-[10px] text-stone-400">
                                                        {formatDays(workDays)} di cantiere con allestimento, stuccatura e pulizia
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Tariffario Consegna, Piani e Facchinaggio Materiali */}
                        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-stone-900">Tariffario Consegna, Piani e Facchinaggio</h2>
                                        <p className="text-xs text-stone-500">
                                            Costi applicati nel preventivo per piano, disponibilità montacarichi, scarico nel box e distanza di sosta
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {/* Costo Base Consegna a Terra */}
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Costo Base Scarico Merci a Terra
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={logistics.baseDeliveryCost ?? 0}
                                                onChange={e => setLogistics({
                                                    ...logistics,
                                                    baseDeliveryCost: Math.max(0, parseFloat(e.target.value) || 0)
                                                })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                        <p className="text-[11px] text-stone-400 mt-1.5">
                                            Quota fissa di scarico piano terra o box (0 = scarico base incluso).
                                        </p>
                                    </div>

                                    {/* Costo al piano CON Montacarichi */}
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Costo / Piano CON Montacarichi
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={logistics.costPerFloorWithLift ?? 10}
                                                onChange={e => setLogistics({
                                                    ...logistics,
                                                    costPerFloorWithLift: Math.max(0, parseFloat(e.target.value) || 0)
                                                })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                        <p className="text-[11px] text-stone-400 mt-1.5">
                                            Costo per singolo piano con montacarichi o ascensore abilitato ai pesi.
                                        </p>
                                    </div>

                                    {/* Costo al piano SENZA Montacarichi */}
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Costo / Piano SENZA Montacarichi
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={logistics.costPerFloorNoLift ?? 25}
                                                onChange={e => setLogistics({
                                                    ...logistics,
                                                    costPerFloorNoLift: Math.max(0, parseFloat(e.target.value) || 0)
                                                })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                        <p className="text-[11px] text-stone-400 mt-1.5">
                                            Costo per piano per salita a piedi lungo le scale (facchinaggio manuale).
                                        </p>
                                    </div>

                                    {/* Maggiorazione Sosta Distante */}
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                                            Supplemento Sosta Distante (&gt; 50m / ZTL)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">€</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={logistics.noUnloadingZoneSurcharge ?? 35}
                                                onChange={e => setLogistics({
                                                    ...logistics,
                                                    noUnloadingZoneSurcharge: Math.max(0, parseFloat(e.target.value) || 0)
                                                })}
                                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-stone-900 transition-all"
                                            />
                                        </div>
                                        <p className="text-[11px] text-stone-400 mt-1.5">
                                            Costo aggiuntivo fisso per trasbordo prolungato o area pedonale / ZTL.
                                        </p>
                                    </div>
                                </div>

                                {/* Simulatore Calcolo Automatico Live per Admin */}
                                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                                    <div className="flex items-center gap-2 text-stone-900">
                                        <Sparkles size={16} className="text-orange-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider">
                                            Simulazione Tariffe Applicate al Cliente nel Configuratore
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                        <div className="p-3 bg-white rounded-xl border border-stone-200/70 space-y-1">
                                            <p className="text-stone-500 font-medium">1. Bordo Strada (ci penso io) / Box</p>
                                            <p className="text-base font-bold text-emerald-600">
                                                € {((logistics.baseDeliveryCost || 0)).toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-stone-400">Zero costi piani o supplementi sosta</p>
                                        </div>

                                        <div className="p-3 bg-white rounded-xl border border-stone-200/70 space-y-1">
                                            <p className="text-stone-500 font-medium">2. Consegna 3° Piano (con montacarichi)</p>
                                            <p className="text-base font-bold text-stone-900">
                                                € {((logistics.baseDeliveryCost || 0) + 3 * (logistics.costPerFloorWithLift || 0)).toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-stone-400">Base + 3 × € {logistics.costPerFloorWithLift || 0}</p>
                                        </div>

                                        <div className="p-3 bg-white rounded-xl border border-stone-200/70 space-y-1">
                                            <p className="text-stone-500 font-medium">3. Consegna 3° Piano (a piedi / scale)</p>
                                            <p className="text-base font-bold text-stone-900">
                                                € {((logistics.baseDeliveryCost || 0) + 3 * (logistics.costPerFloorNoLift || 0)).toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-stone-400">Base + 3 × € {logistics.costPerFloorNoLift || 0}</p>
                                        </div>

                                        <div className="p-3 bg-white rounded-xl border border-stone-200/70 space-y-1">
                                            <p className="text-stone-500 font-medium">4. 2° Piano + Sosta furgone &gt; 50m</p>
                                            <p className="text-base font-bold text-amber-600">
                                                € {((logistics.baseDeliveryCost || 0) + 2 * (logistics.costPerFloorWithLift || 0) + (logistics.noUnloadingZoneSurcharge || 0)).toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-stone-400">Include supplemento sosta +€ {logistics.noUnloadingZoneSurcharge || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Card Save Bar */}
                            <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between">
                                <div className="text-xs text-stone-500 flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-600" />
                                    <span>I valori modificati aggiornano immediatamente i nuovi preventivi dei clienti</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSave()}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>Salva Impostazioni Logistica</span>
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

