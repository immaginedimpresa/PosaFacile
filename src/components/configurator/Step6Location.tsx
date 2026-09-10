import { useEffect } from 'react'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { MapPin, Truck, Building2, Package, Home, CheckCircle2, AlertCircle, Info, ShieldCheck } from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

export function Step6Location() {
    const {
        location,
        setLocation,
        deliveryAccess,
        setDeliveryAccess,
        getDeliveryBreakdown,
        loadLogisticsSettings,
        logisticsSettings,
    } = useConfiguratorStore()

    useEffect(() => {
        if (!logisticsSettings) {
            loadLogisticsSettings()
        }
    }, [logisticsSettings, loadLogisticsSettings])

    const breakdown = getDeliveryBreakdown()

    return (
        <div className="space-y-6">
            <div>
                <p className="text-gray-500">
                    Indica la zona per trovare i professionisti disponibili e definisci i dettagli di accesso per il corriere e la posa.
                </p>
            </div>

            {/* Address Form */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-base">Indirizzo di lavoro</h3>
                        <p className="text-xs text-stone-500">Città e via dell&apos;intervento di posa</p>
                    </div>
                </div>

                <AddressAutocomplete
                    value={location}
                    onChange={setLocation}
                />
            </div>

            {/* Delivery & Access Form */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Truck className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-900 text-base">Accesso al Cantiere e Scarico Merci</h3>
                            <p className="text-xs text-stone-500">I colli di piastrelle e collanti sono pesanti: definisci il piano e la modalità di scarico</p>
                        </div>
                    </div>
                    {breakdown.total > 0 ? (
                        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Supplemento facchinaggio: +€ {breakdown.total.toFixed(2)}
                        </span>
                    ) : (
                        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Scarico base: € 0.00
                        </span>
                    )}
                </div>

                {/* 1. Destinazione di Scarico: Box vs Appartamento */}
                <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        1. Destinazione di Scarico del Materiale
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Box / Garage */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'box' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                deliveryAccess.destination === 'box'
                                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    deliveryAccess.destination === 'box' ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    <Package className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-stone-900 text-sm">Scarico nel Box / Garage</h4>
                                        <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                            Piano Terra
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-500 leading-relaxed">
                                        I bancali vengono scaricati comodamente nel garage o locale al piano strada.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold">
                                <span className="text-emerald-700 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Nessun costo facchinaggio ai piani
                                </span>
                                <span className="font-bold text-emerald-700">€ 0.00</span>
                            </div>
                        </div>

                        {/* Consegna al Piano */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'floor' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                deliveryAccess.destination === 'floor'
                                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10'
                                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    deliveryAccess.destination === 'floor' ? 'bg-blue-500 text-white' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-stone-900 text-sm">Consegna al Piano (Appartamento)</h4>
                                    </div>
                                    <p className="text-xs text-stone-500 leading-relaxed">
                                        I materiali vengono portati direttamente al piano e all&apos;interno dell&apos;immobile / cantiere.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold">
                                <span className="text-blue-700 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" /> Tariffa in base al piano e montacarichi
                                </span>
                                <span className="font-bold text-stone-700">
                                    {deliveryAccess.floorType === 'ground' ? '€ 0.00' : `+€ ${breakdown.floorCost.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Dettaglio Piano e Montacarichi (Se Consegna al Piano) */}
                {deliveryAccess.destination === 'floor' && (
                    <div className="space-y-4 pt-2 border-t border-stone-100">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                            2. Piano dell&apos;Immobile
                        </label>

                        {/* Scelta Piano Terra vs Piano Superiore */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDeliveryAccess({ floorType: 'ground', floorNumber: 0 })}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                                    deliveryAccess.floorType === 'ground'
                                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                                }`}
                            >
                                <Home className="w-4 h-4" />
                                <span>Piano Terra / Rialzato</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setDeliveryAccess({
                                    floorType: 'upper',
                                    floorNumber: deliveryAccess.floorNumber > 0 ? deliveryAccess.floorNumber : 1
                                })}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                                    deliveryAccess.floorType === 'upper'
                                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                                }`}
                            >
                                <Building2 className="w-4 h-4" />
                                <span>Piano Superiore (1° o più)</span>
                            </button>
                        </div>

                        {/* Selettore Piano Specifico & Montacarichi (se Piano Superiore) */}
                        {deliveryAccess.floorType === 'upper' && (
                            <div className="p-4 bg-stone-50/80 rounded-xl border border-stone-200/80 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-stone-700 mb-2">
                                        A quale piano si trova l&apos;appartamento / cantiere?
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {[1, 2, 3, 4, 5, 6].map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setDeliveryAccess({ floorNumber: num })}
                                                className={`w-12 h-10 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border ${
                                                    deliveryAccess.floorNumber === num
                                                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs ring-2 ring-orange-500/20'
                                                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                                                }`}
                                            >
                                                {num}° {num >= 5 ? '+' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Montacarichi / Ascensore Toggle */}
                                <div className="pt-2 border-t border-stone-200/60">
                                    <label className="block text-xs font-medium text-stone-700 mb-2">
                                        Disponibilità Ascensore o Montacarichi Idoneo
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div
                                            onClick={() => setDeliveryAccess({ hasFreightElevator: true })}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                                                deliveryAccess.hasFreightElevator
                                                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                                            }`}
                                        >
                                            <CheckCircle2 className={`w-5 h-5 shrink-0 ${
                                                deliveryAccess.hasFreightElevator ? 'text-emerald-600' : 'text-stone-300'
                                            }`} />
                                            <div className="text-xs">
                                                <p className="font-bold text-stone-900">Montacarichi / Ascensore capiente</p>
                                                <p className="text-stone-500 text-[11px]">Idoneo a carichi pesanti (tariffa agevolata)</p>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setDeliveryAccess({ hasFreightElevator: false })}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                                                !deliveryAccess.hasFreightElevator
                                                    ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-semibold'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                                            }`}
                                        >
                                            <AlertCircle className={`w-5 h-5 shrink-0 ${
                                                !deliveryAccess.hasFreightElevator ? 'text-amber-600' : 'text-stone-300'
                                            }`} />
                                            <div className="text-xs">
                                                <p className="font-bold text-stone-900">Solo scale (a piedi)</p>
                                                <p className="text-stone-500 text-[11px]">Nessun ascensore idoneo ai carichi</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Zona di Sosta e Scarico Furgone */}
                <div className="space-y-3 pt-2 border-t border-stone-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        3. Sosta e Spazio di Scarico per il Furgone
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                            onClick={() => setDeliveryAccess({ hasUnloadingZone: true })}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                deliveryAccess.hasUnloadingZone
                                    ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900/10'
                                    : 'border-stone-200 bg-white hover:border-stone-300'
                            }`}
                        >
                            <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${
                                deliveryAccess.hasUnloadingZone ? 'text-emerald-600' : 'text-stone-300'
                            }`} />
                            <div>
                                <h4 className="font-bold text-stone-900 text-xs sm:text-sm">Sosta adiacente all&apos;ingresso (≤ 50m)</h4>
                                <p className="text-stone-500 text-xs mt-0.5">
                                    Il mezzo può sostare regolarmente in prossimità del portone / cancello.
                                </p>
                            </div>
                        </div>

                        <div
                            onClick={() => setDeliveryAccess({ hasUnloadingZone: false })}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                !deliveryAccess.hasUnloadingZone
                                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/10'
                                    : 'border-stone-200 bg-white hover:border-stone-300'
                            }`}
                        >
                            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                                !deliveryAccess.hasUnloadingZone ? 'text-amber-600' : 'text-stone-300'
                            }`} />
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm">Sosta distante / ZTL (&gt; 50m)</h4>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                        +€ {(logisticsSettings?.noUnloadingZoneSurcharge ?? 35).toFixed(0)}
                                    </span>
                                </div>
                                <p className="text-stone-500 text-xs mt-0.5">
                                    ZTL, via pedonale o divieto di fermata che richiede trasbordo manuale prolungato.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Note Logistiche */}
                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        4. Note per l&apos;Autista o Trasportatore (Opzionale)
                    </label>
                    <textarea
                        rows={2}
                        value={deliveryAccess.logisticsNotes}
                        onChange={(e) => setDeliveryAccess({ logisticsNotes: e.target.value })}
                        placeholder="Es. citofono Rossi scala B, cancello carrabile con larghezza 2.2m, orari accesso cortile 8:30-12:30..."
                        className="w-full text-xs sm:text-sm p-3 bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-stone-900 transition-all resize-none"
                    />
                </div>

                {/* Economic Transparency Callout */}
                <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-stone-600">
                        <Info className="w-4 h-4 text-orange-500 shrink-0" />
                        <span>
                            {deliveryAccess.destination === 'box'
                                ? 'Scarico a livello strada nel box: nessun costo di piano applicato.'
                                : deliveryAccess.floorType === 'ground'
                                    ? 'Consegna al piano terra: nessun supplemento di piano.'
                                    : `Consegna al ${deliveryAccess.floorNumber}° piano (${deliveryAccess.hasFreightElevator ? 'con montacarichi' : 'a piedi via scale'}).`
                            }
                            {!deliveryAccess.hasUnloadingZone ? ' (Inclusa maggiorazione sosta distante).' : ''}
                        </span>
                    </div>
                    <div className="font-bold text-stone-900 shrink-0">
                        {breakdown.total > 0 ? `+€ ${breakdown.total.toFixed(2)}` : 'Incluso'}
                    </div>
                </div>
            </div>
        </div>
    )
}
