import { useEffect } from 'react'
import { useConfiguratorStore, type MaterialHandling } from '@/store/configuratorStore'
import {
    Truck,
    Building2,
    Package,
    Home,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Info,
    ShieldCheck,
    UserCheck,
    HardHat,
} from 'lucide-react'

export function StepDeliveryAccess() {
    const {
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
    const isGround = deliveryAccess.floorType === 'ground'
    const isStreet = deliveryAccess.destination === 'street'
    const isBox = deliveryAccess.destination === 'box'
    const isFloorDirect = deliveryAccess.destination === 'floor'
    const handlingBy: MaterialHandling = isFloorDirect ? 'carrier' : (deliveryAccess.handlingBy || 'client')

    return (
        <div className="space-y-6">
            <div>
                <p className="text-gray-500">
                    I colli di piastrelle e i sacchi di colla sono materiali pesanti su bancale: definisci dove scaricarli e come raggiungere il piano dell&apos;immobile.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-6 shadow-xs">
                {/* Header Card */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-900 text-base">1. Punto di Scarico Merci del Corriere</h3>
                            <p className="text-xs text-stone-500">Dove desideri che il camion del fornitore scarichi i bancali</p>
                        </div>
                    </div>
                    {breakdown.total > 0 ? (
                        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Supplemento totale: +€ {breakdown.total.toFixed(2)}
                        </span>
                    ) : (
                        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Scarico base: € 0.00
                        </span>
                    )}
                </div>

                {/* 1. Scelta Destinazione: Strada vs Box vs Piano */}
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {/* A Bordo Strada */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'street', handlingBy: deliveryAccess.handlingBy || 'client' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                isStreet
                                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isStreet ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-bold text-stone-900 text-sm">A Bordo Strada</h4>
                                        <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                            Sponda Idraulica
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-500 leading-relaxed">
                                        Scarico a piano terra dal camion con sponda idraulica sul ciglio stradale.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold">
                                <span className="text-emerald-700 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Nessun costo scarico
                                </span>
                                <span className="font-bold text-emerald-700">€ 0.00</span>
                            </div>
                        </div>

                        {/* Box / Garage */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'box', handlingBy: deliveryAccess.handlingBy || 'client' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                isBox
                                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isBox ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    <Package className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-stone-900 text-sm">Nel Box / Garage</h4>
                                        <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                            Piano Terra
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-500 leading-relaxed">
                                        I bancali vengono scaricati con transpallet all&apos;interno del garage o box al piano terra.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold">
                                <span className="text-emerald-700 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Nessun costo scarico
                                </span>
                                <span className="font-bold text-emerald-700">€ 0.00</span>
                            </div>
                        </div>

                        {/* Consegna Diretta al Piano */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'floor', handlingBy: 'carrier' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                isFloorDirect
                                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10'
                                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isFloorDirect ? 'bg-blue-500 text-white' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-stone-900 text-sm">Consegna al Piano</h4>
                                    </div>
                                    <p className="text-xs text-stone-500 leading-relaxed">
                                        I facchini del corriere portano subito i pacchi fin dentro l&apos;abitazione / cantiere al piano.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold">
                                <span className="text-blue-700 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" /> Servizio facchini corriere
                                </span>
                                <span className="font-bold text-stone-700">
                                    {isGround ? '€ 0.00' : `+€ ${breakdown.floorCost.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SOTTO-LINEATURA CHIARA: Bordo Strada e Box NON comprendono il deposito in casa */}
                {(isStreet || isBox) && (
                    <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-950">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold">
                                Nota importante: lo scarico a bordo strada o nel box NON comprende il deposito in casa.
                            </p>
                            <p className="text-amber-800 text-xs leading-relaxed">
                                I bancali vengono lasciati {isStreet ? 'sul ciglio della strada a livello terra' : 'all&apos;interno del garage/box'}. Per poter eseguire i lavori di posa, il materiale dovrà essere portato al piano dell&apos;appartamento.
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. Chi porterà il materiale al piano di posa? (Solo per Bordo Strada o Box) */}
                {(isStreet || isBox) && (
                    <div className="space-y-3 pt-2 border-t border-stone-100">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                            2. Chi porterà il materiale dal punto di scarico al piano di lavoro?
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Ci pensa il cliente */}
                            <div
                                onClick={() => setDeliveryAccess({ handlingBy: 'client' })}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                    handlingBy === 'client'
                                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                        handlingBy === 'client' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500'
                                    }`}>
                                        <UserCheck className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h4 className="font-bold text-stone-900 text-sm">Ci penso io (il cliente)</h4>
                                            <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                                Fai-da-te
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-500 leading-relaxed">
                                            Porterai tu i pacchi di piastrelle e la colla all&apos;interno dell&apos;appartamento prima dell&apos;inizio dei lavori.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
                                    <span className="text-emerald-700">Nessun costo aggiunto</span>
                                    <span className="text-emerald-700 font-black">€ 0.00</span>
                                </div>
                            </div>

                            {/* Lo porterà il posatore */}
                            <div
                                onClick={() => setDeliveryAccess({ handlingBy: 'pro' })}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                    handlingBy === 'pro'
                                        ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/10'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                        handlingBy === 'pro' ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'
                                    }`}>
                                        <HardHat className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h4 className="font-bold text-stone-900 text-sm">Lo porta il posatore</h4>
                                            <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                                                Servizio Posatore
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-500 leading-relaxed">
                                            Il posatore si occuperà di salire tutti i materiali dal {isStreet ? 'bordo strada' : 'box'} fino al piano di lavoro.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
                                    <span className="text-stone-700">In base al piano e ascensore</span>
                                    <span className="text-orange-700 font-black">
                                        {isGround ? '€ 0.00' : `+€ ${breakdown.floorCost.toFixed(2)}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. A QUALE PIANO SI TROVA L'IMMOBILE DOVE SI FA IL LAVORO (SEMPRE RICHIESTO) */}
                <div className="space-y-4 pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                            {(isStreet || isBox) ? '3.' : '2.'} A quale piano si svolgeranno i lavori di posa?
                        </label>
                        <span className="text-xs text-stone-400 font-medium">
                            Richiesto per pianificare l&apos;intervento
                        </span>
                    </div>

                    {/* Scelta Piano Terra vs Piano Superiore */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setDeliveryAccess({ floorType: 'ground', floorNumber: 0 })}
                            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                                isGround
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
                                !isGround
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                        >
                            <Building2 className="w-4 h-4" />
                            <span>Piano Superiore (1° o più)</span>
                        </button>
                    </div>

                    {/* Selettore Piano Specifico & Montacarichi (se Piano Superiore) */}
                    {!isGround && (
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
                            <div className="space-y-2 pt-2 border-t border-stone-200/60">
                                <label className="block text-xs font-medium text-stone-700">
                                    È presente un montacarichi o ascensore utilizzabile per le merci pesanti?
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                                            <p className="font-bold text-stone-900">Sì, montacarichi / ascensore idoneo</p>
                                            <p className="text-stone-500 text-[11px]">Tariffa ridotta (+€ {(logisticsSettings?.costPerFloorWithLift ?? 10).toFixed(0)}/piano)</p>
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
                                            <p className="text-stone-500 text-[11px]">Nessun ascensore idoneo ai carichi (+€ {(logisticsSettings?.costPerFloorNoLift ?? 25).toFixed(0)}/piano)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Sosta e Spazio di Scarico per il Furgone */}
                <div className="space-y-3 pt-2 border-t border-stone-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        {(isStreet || isBox) ? '4.' : '3.'} Sosta e Spazio di Scarico per il Furgone
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

                {/* 5. Note Logistiche */}
                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        {(isStreet || isBox) ? '5.' : '4.'} Note per il Trasportatore e il Posatore (Opzionale)
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
                            {isStreet ? (
                                handlingBy === 'client'
                                    ? `Scarico a bordo strada, movimentazione al ${isGround ? 'piano terra' : `${deliveryAccess.floorNumber}° piano`} a cura tua: nessun supplemento!`
                                    : `Scarico a bordo strada, salita al ${isGround ? 'piano terra' : `${deliveryAccess.floorNumber}° piano`} (${deliveryAccess.hasFreightElevator ? 'con montacarichi' : 'a piedi via scale'}) a cura del posatore.`
                            ) : isBox ? (
                                handlingBy === 'client'
                                    ? `Scarico nel box/garage, movimentazione al ${isGround ? 'piano terra' : `${deliveryAccess.floorNumber}° piano`} a cura tua: nessun supplemento piano!`
                                    : `Scarico nel box, salita al ${isGround ? 'piano terra' : `${deliveryAccess.floorNumber}° piano`} (${deliveryAccess.hasFreightElevator ? 'con montacarichi' : 'a piedi via scale'}) a cura del posatore.`
                            ) : (
                                isGround
                                    ? 'Consegna diretta al piano terra dai facchini del corriere.'
                                    : `Consegna diretta al ${deliveryAccess.floorNumber}° piano (${deliveryAccess.hasFreightElevator ? 'con montacarichi' : 'a piedi via scale'}) dai facchini del corriere.`
                            )}
                            {breakdown.parkingSurcharge > 0 ? ' (Include maggiorazione sosta distante).' : ''}
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
