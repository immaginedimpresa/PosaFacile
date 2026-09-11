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

/** Spunta di presa visione: finché non è data, il configuratore non va avanti. */
function AckCheckbox({
    checked,
    onChange,
    children,
}: {
    checked: boolean
    onChange: (checked: boolean) => void
    children: React.ReactNode
}) {
    return (
        <div className="pt-2 space-y-1">
            <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border-2 bg-white cursor-pointer transition-all ${checked ? 'border-emerald-500' : 'border-amber-400'
                    }`}
            >
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-stone-900 leading-relaxed">{children}</span>
            </label>
            {!checked && (
                <p className="text-[11px] font-semibold text-amber-700">
                    Spunta la conferma per andare avanti.
                </p>
            )}
        </div>
    )
}

export function StepDeliveryAccess() {
    const {
        deliveryAccess,
        setDeliveryAccess,
        deliverySubStep,
        getDeliveryBreakdown,
        loadLogisticsSettings,
        logisticsSettings,
        selectedProfessional,
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
    // Il costo base di scarico si paga con qualunque destinazione: le schede lo devono mostrare.
    const groundUnloadLabel = breakdown.base > 0 ? 'Scarico base' : 'Nessun costo scarico'
    const groundUnloadPrice = `€ ${breakdown.base.toFixed(2)}`
    const floorDeliveryPrice = `€ ${(breakdown.base + (isFloorDirect && !isGround ? breakdown.floorCost : 0)).toFixed(2)}`

    return (
        <div className="space-y-4">
            {/* Barra di avanzamento guidata (senza tab cliccabili che creano confusione) */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                    <span className="font-semibold text-stone-700">Passaggio {deliverySubStep} di 4</span>
                    <span className="text-orange-600 font-bold">
                        {deliverySubStep === 1 && 'Punto di scarico merci'}
                        {deliverySubStep === 2 && 'Piano dell\'immobile'}
                        {deliverySubStep === 3 && 'Movimentazione al piano'}
                        {deliverySubStep === 4 && 'Sosta furgone e note'}
                    </span>
                </div>
                <div className="w-full h-1.5 bg-stone-200/70 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${(deliverySubStep / 4) * 100}%` }}
                    />
                </div>
            </div>

            {/* Contenuto del passaggio attivo */}
            {deliverySubStep === 1 && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                <Truck className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-stone-900 text-base">
                                Dove desideri che scarichi il corriere?
                            </h3>
                        </div>
                        <span className="text-xs font-bold text-stone-500">
                            {breakdown.total > 0 ? `+€ ${breakdown.total.toFixed(2)} + IVA` : '€ 0.00'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {/* A Bordo Strada */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'street', handlingBy: deliveryAccess.handlingBy || 'client' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isStreet
                                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isStreet ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'
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
                                    <ShieldCheck className="w-3.5 h-3.5" /> {groundUnloadLabel}
                                </span>
                                <span className="font-bold text-emerald-700">{groundUnloadPrice}</span>
                            </div>
                        </div>

                        {/* Box / Garage */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'box', handlingBy: deliveryAccess.handlingBy || 'client' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isBox
                                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isBox ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'
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
                                    <ShieldCheck className="w-3.5 h-3.5" /> {groundUnloadLabel}
                                </span>
                                <span className="font-bold text-emerald-700">{groundUnloadPrice}</span>
                            </div>
                        </div>

                        {/* Consegna Diretta al Piano */}
                        <div
                            onClick={() => setDeliveryAccess({ destination: 'floor', handlingBy: 'carrier' })}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isFloorDirect
                                ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10'
                                : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isFloorDirect ? 'bg-blue-500 text-white' : 'bg-stone-200 text-stone-600'
                                    }`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-stone-900 text-sm">Consegna al Piano</h4>
                                        <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                            Facchini Corriere
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-500 leading-relaxed">
                                        I facchini del fornitore portano subito i pacchi fin dentro l&apos;abitazione / cantiere al piano.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold">
                                <span className="text-blue-700 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" /> Servizio facchini corriere
                                </span>
                                <span className="font-bold text-stone-700">
                                    {floorDeliveryPrice}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Nota di chiarezza */}
                    {(isStreet || isBox) ? (
                        <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-950">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold">
                                    Nota importante: lo scarico a bordo strada o nel box lascia i bancali a terra.
                                </p>
                                <p className="text-amber-800 text-xs leading-relaxed">
                                    I bancali vengono lasciati {isStreet ? 'sul ciglio della strada a livello terra' : 'dentro il garage/box'}. Nel passaggio successivo indicheremo il piano dell&apos;immobile e chi effettuerà la salita.
                                </p>
                                <AckCheckbox
                                    checked={Boolean(deliveryAccess.groundUnloadAcknowledged)}
                                    onChange={(checked) => setDeliveryAccess({ groundUnloadAcknowledged: checked })}
                                >
                                    Ho capito: i bancali verranno lasciati a terra {isStreet ? 'a bordo strada' : 'nel box/garage'}.
                                </AckCheckbox>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 flex items-start gap-3 text-xs sm:text-sm text-blue-950">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold">
                                    Consegna diretta nell&apos;immobile selezionata.
                                </p>
                                <p className="text-blue-800 text-xs leading-relaxed">
                                    I facchini del fornitore porteranno i colli fin dentro l&apos;abitazione. Nel prossimo passaggio indicheremo il piano esatto.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PASSO 2: PIANO DELL'IMMOBILE                                  */}
            {/* ------------------------------------------------------------- */}
            {deliverySubStep === 2 && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-stone-900 text-base">
                                A quale piano si trova l&apos;immobile?
                            </h3>
                        </div>
                        <span className="text-xs text-stone-400 font-medium hidden sm:inline">
                            Richiesto per pianificare l&apos;intervento
                        </span>
                    </div>

                    {/* Scelta Piano Terra vs Piano Superiore con card grafiche */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <button
                            type="button"
                            onClick={() => setDeliveryAccess({ floorType: 'ground', floorNumber: 0 })}
                            className={`flex items-center gap-3.5 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${isGround
                                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                                }`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isGround ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 border border-stone-200'
                                }`}>
                                <Home className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Piano Terra / Rialzato</p>
                                <p className={`text-xs mt-0.5 ${isGround ? 'text-stone-300' : 'text-stone-500'}`}>
                                    Accesso a livello terra, nessuna rampa principale
                                </p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setDeliveryAccess({
                                floorType: 'upper',
                                floorNumber: deliveryAccess.floorNumber > 0 ? deliveryAccess.floorNumber : 1,
                            })}
                            className={`flex items-center gap-3.5 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${!isGround
                                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                                }`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!isGround ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 border border-stone-200'
                                }`}>
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Piano Superiore (1° o più)</p>
                                <p className={`text-xs mt-0.5 ${!isGround ? 'text-stone-300' : 'text-stone-500'}`}>
                                    Condominio o edificio con rampe di scale o montacarichi
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* Dettagli Piano Superiore */}
                    {!isGround && (
                        <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                                    A quale piano si trova l&apos;appartamento / cantiere?
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[1, 2, 3, 4, 5, 6].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setDeliveryAccess({ floorNumber: num })}
                                            className={`w-12 h-10 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border ${deliveryAccess.floorNumber === num
                                                ? 'bg-orange-500 text-white border-orange-500 shadow-xs ring-2 ring-orange-500/20'
                                                : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                                                }`}
                                        >
                                            {num}° {num >= 6 ? '+' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ascensore / Montacarichi Toggle con card ricche */}
                            <div className="space-y-2 pt-3 border-t border-stone-200/80">
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                    È presente un montacarichi o ascensore utilizzabile per le merci pesanti?
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div
                                        onClick={() => setDeliveryAccess({ hasFreightElevator: true })}
                                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${deliveryAccess.hasFreightElevator
                                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                                            }`}
                                    >
                                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${deliveryAccess.hasFreightElevator ? 'text-emerald-600' : 'text-stone-300'
                                            }`} />
                                        <div className="text-xs">
                                            <p className="font-bold text-stone-900">Sì, montacarichi / ascensore idoneo</p>
                                            <p className="text-stone-500 text-[11px]">Tariffa ridotta (+€ {(logisticsSettings?.costPerFloorWithLift ?? 10).toFixed(0)}/piano)</p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setDeliveryAccess({ hasFreightElevator: false })}
                                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${!deliveryAccess.hasFreightElevator
                                            ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-semibold'
                                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                                            }`}
                                    >
                                        <AlertCircle className={`w-5 h-5 shrink-0 ${!deliveryAccess.hasFreightElevator ? 'text-amber-600' : 'text-stone-300'
                                            }`} />
                                        <div className="text-xs">
                                            <p className="font-bold text-stone-900">Solo scale (a piedi)</p>
                                            <p className="text-stone-500 text-[11px]">Salita manuale a piedi (+€ {(logisticsSettings?.costPerFloorNoLift ?? 25).toFixed(0)}/piano)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PASSO 3: MOVIMENTAZIONE DEI MATERIALI AL PIANO                 */}
            {/* ------------------------------------------------------------- */}
            {deliverySubStep === 3 && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                <HardHat className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-stone-900 text-base">
                                Chi porterà il materiale al piano di lavoro?
                            </h3>
                        </div>
                        <span className="text-xs text-stone-400 font-medium hidden sm:inline">
                            Salita colli al piano
                        </span>
                    </div>

                    {/* Caso 1: Consegna al Piano già inclusa con il corriere */}
                    {isFloorDirect ? (
                        <div className="p-5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-950 text-sm sm:text-base">
                                        Salita già inclusa con i facchini del corriere
                                    </h4>
                                    <span className="text-[10px] uppercase font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                                        Servizio Trasportatore
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                                Avendo scelto la <strong>Consegna al Piano</strong>, i facchini del fornitore recapiteranno tutti i colli direttamente all&apos;interno dell&apos;immobile al {isGround ? 'piano terra' : `${deliveryAccess.floorNumber}° piano`} ({deliveryAccess.hasFreightElevator ? 'con montacarichi' : 'a piedi via scale'}). Non occorre alcun intervento di facchinaggio aggiuntivo.
                            </p>
                        </div>
                    ) : isGround ? (
                        /* Caso 2: Piano Terra */
                        <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                    <Home className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-950 text-sm sm:text-base">
                                        L&apos;immobile si trova a Piano Terra
                                    </h4>
                                    <p className="text-xs text-emerald-800">
                                        Lo scarico avviene a piano terra: non ci sono scale o rampe da superare.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div
                                    onClick={() => setDeliveryAccess({ handlingBy: 'client' })}
                                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${handlingBy === 'client'
                                        ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/10'
                                        : 'border-stone-200 bg-white/70 hover:border-stone-300'
                                        }`}
                                >
                                    <p className="font-bold text-xs text-stone-900">Ci penso io (cliente)</p>
                                    <p className="text-[11px] text-stone-500 mt-0.5">Nessun costo aggiuntivo (€ 0.00)</p>
                                </div>

                                <div
                                    onClick={() => setDeliveryAccess({ handlingBy: 'pro' })}
                                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${handlingBy === 'pro'
                                        ? 'border-orange-500 bg-white ring-2 ring-orange-500/10'
                                        : 'border-stone-200 bg-white/70 hover:border-stone-300'
                                        }`}
                                >
                                    <p className="font-bold text-xs text-stone-900">Lo sposta il posatore</p>
                                    <p className="text-[11px] text-stone-500 mt-0.5">Il posatore sposta i colli all&apos;interno (€ 0.00)</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Caso 3: Bordo Strada o Box con Piano Superiore */
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">
                                        I materiali verranno scaricati {isStreet ? 'sul ciglio della strada' : 'nel box al piano terra'}.
                                    </p>
                                    <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                                        I bancali dovranno essere saliti al <strong>{deliveryAccess.floorNumber}° piano</strong> prima dell&apos;inizio della posa.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* Opzione 1: Ci pensa il cliente */}
                                <div
                                    onClick={() => setDeliveryAccess({ handlingBy: 'client' })}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${handlingBy === 'client'
                                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${handlingBy === 'client' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500'
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

                                {/* Opzione 2: Lo porta il posatore */}
                                {selectedProfessional && breakdown.proOffersHandling === false ? (
                                    <div className="p-4 rounded-xl border-2 border-stone-200 bg-stone-50/70 opacity-60 flex flex-col justify-between cursor-not-allowed">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-400 flex items-center justify-center shrink-0">
                                                <HardHat className="w-4 h-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="font-bold text-stone-600 text-sm">Lo porta il posatore</h4>
                                                    <span className="text-[10px] uppercase font-bold bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                                                        Non offerto
                                                    </span>
                                                </div>
                                                <p className="text-xs text-stone-500 leading-relaxed">
                                                    {selectedProfessional.company_name || selectedProfessional.full_name} non esegue il servizio di trasporto al piano.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-400">
                                            <span>Servizio non disponibile</span>
                                            <span>—</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setDeliveryAccess({ handlingBy: 'pro' })}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${handlingBy === 'pro'
                                            ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/10'
                                            : 'border-stone-200 hover:border-stone-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${handlingBy === 'pro' ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'
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
                                            <span className="text-stone-700">
                                                {breakdown.proRatePerMqFloor && breakdown.proRatePerMqFloor > 0
                                                    ? `€ ${breakdown.proRatePerMqFloor.toFixed(2)}/mq per piano`
                                                    : 'A tariffa posatore per piano'}
                                            </span>
                                            <span className="text-orange-700 font-black">
                                                {breakdown.floorCost > 0 ? `+€ ${breakdown.floorCost.toFixed(2)}` : 'Calcolato sui mq'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {handlingBy === 'client' && (
                                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-950">
                                    <AckCheckbox
                                        checked={Boolean(deliveryAccess.carryUpAcknowledged)}
                                        onChange={(checked) => setDeliveryAccess({ carryUpAcknowledged: checked })}
                                    >
                                        Mi impegno a portare io il materiale al {deliveryAccess.floorNumber}° piano prima dell&apos;inizio della posa.
                                    </AckCheckbox>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PASSO 4: SOSTA DEL MEZZO, NOTE E RIEPILOGO FINALE             */}
            {/* ------------------------------------------------------------- */}
            {deliverySubStep === 4 && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-stone-900 text-base">
                                Com&apos;è la sosta davanti all&apos;ingresso?
                            </h3>
                        </div>
                        <span className="text-xs text-stone-400 font-medium hidden sm:inline">
                            Accesso mezzo e riepilogo
                        </span>
                    </div>

                    {/* Scelta Sosta con card ricche */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div
                            onClick={() => setDeliveryAccess({ hasUnloadingZone: true })}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${deliveryAccess.hasUnloadingZone
                                ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900/10'
                                : 'border-stone-200 bg-white hover:border-stone-300'
                                }`}
                        >
                            <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${deliveryAccess.hasUnloadingZone ? 'text-emerald-600' : 'text-stone-300'
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
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${!deliveryAccess.hasUnloadingZone
                                ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/10'
                                : 'border-stone-200 bg-white hover:border-stone-300'
                                }`}
                        >
                            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${!deliveryAccess.hasUnloadingZone ? 'text-amber-600' : 'text-stone-300'
                                }`} />
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm">Sosta distante / ZTL (&gt; 50m)</h4>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                        +€ {(logisticsSettings?.noUnloadingZoneSurcharge ?? 35).toFixed(0)}
                                    </span>
                                </div>
                                <p className="text-stone-500 text-xs mt-0.5">
                                    ZTL, via pedonale o divieto che richiede trasbordo manuale prolungato.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Note Opzionali */}
                    <div className="space-y-1.5 pt-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                            Note per il Trasportatore e il Posatore (Opzionale)
                        </label>
                        <textarea
                            rows={2}
                            value={deliveryAccess.logisticsNotes}
                            onChange={(e) => setDeliveryAccess({ logisticsNotes: e.target.value })}
                            placeholder="Es. citofono Rossi scala B, cancello carrabile con larghezza 2.2m, orari cortile 8:30-12:30..."
                            className="w-full text-xs sm:text-sm p-3 bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-stone-900 transition-all resize-none"
                        />
                    </div>

                    {/* Economic Transparency Callout originale ricco */}
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
                            {breakdown.total > 0 ? `+€ ${breakdown.total.toFixed(2)} + IVA` : 'Incluso'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
