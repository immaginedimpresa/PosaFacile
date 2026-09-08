import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, ArrowRight, Check, Sparkles, Clock, ShieldCheck, Layers } from 'lucide-react'
import { useConfiguratorStore } from '@/store/configuratorStore'

interface FloorOption {
    id: string
    name: string
    material: string
    format: string
    materialPriceSqm: number
    layingPriceSqm: number
    image: string
}

const FLOOR_OPTIONS: FloorOption[] = [
    {
        id: 'gres-legno',
        name: 'Gres Effetto Legno',
        material: 'gres',
        format: '20×120 cm',
        materialPriceSqm: 28,
        layingPriceSqm: 25,
        image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=400&auto=format&fit=crop'
    },
    {
        id: 'parquet-spina',
        name: 'Parquet Rovere Spina',
        material: 'parquet',
        format: '15×90 cm',
        materialPriceSqm: 49,
        layingPriceSqm: 35,
        image: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?q=80&w=400&auto=format&fit=crop'
    },
    {
        id: 'marmo-lucido',
        name: 'Gres Effetto Marmo',
        material: 'marmo',
        format: '120×120 cm',
        materialPriceSqm: 42,
        layingPriceSqm: 32,
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400&auto=format&fit=crop'
    },
    {
        id: 'gres-cemento',
        name: 'Grandi Formati Cemento',
        material: 'grandi-formati',
        format: '120×278 cm',
        materialPriceSqm: 55,
        layingPriceSqm: 38,
        image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=400&auto=format&fit=crop'
    }
]

export function InstantEstimator() {
    const [sqm, setSqm] = useState<number>(45)
    const [selectedFloor, setSelectedFloor] = useState<string>('gres-legno')
    const [removeOldFloor, setRemoveOldFloor] = useState<boolean>(false)
    const [includeSkirting, setIncludeSkirting] = useState<boolean>(true)
    const navigate = useNavigate()
    const { setDimensions, setServices } = useConfiguratorStore()

    const chosen = FLOOR_OPTIONS.find(f => f.id === selectedFloor) || FLOOR_OPTIONS[0]

    // Calculation logic
    const materialCost = sqm * chosen.materialPriceSqm
    const baseLayingCost = sqm * chosen.layingPriceSqm
    const removalCost = removeOldFloor ? sqm * 14 : 0
    const skirtingCost = includeSkirting ? Math.round(sqm * 0.8 * 8) : 0 // approx perimeter * price
    const glueAndConsumables = Math.round(sqm * 4.5)

    const totalEstimate = materialCost + baseLayingCost + removalCost + skirtingCost + glueAndConsumables
    const pricePerSqm = Math.round(totalEstimate / sqm)

    // Estimate working days
    const estimatedDays = sqm <= 30 ? '1-2 giorni' : sqm <= 65 ? '2-3 giorni' : sqm <= 120 ? '3-5 giorni' : '5-7 giorni'

    const handleProceed = () => {
        setDimensions({
            pavimentoMq: sqm,
            paretiMq: 0,
            sfridoPercent: 10
        })
        setServices({
            demolizione: removeOldFloor,
            massetto: false,
            impermeabilizzazione: false,
            smaltimento: removeOldFloor,
            battiscopa: includeSkirting,
            battiscopaMetri: Math.round(sqm * 0.8),
            soglie: true,
            soglieQty: 1
        })
        navigate('/configuratore')
    }

    return (
        <section className="bg-stone-100 py-24 text-stone-900 relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-50 px-4 py-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-4">
                        <Calculator size={14} />
                        Calcolatore Rapido di Spesa
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900">
                        Quanto costa il tuo nuovo pavimento?
                    </h2>
                    <p className="mt-3 text-base sm:text-lg text-stone-600">
                        Seleziona i metri quadri e il materiale per avere una stima reale e immediata con posa certificata inclusa.
                    </p>
                </div>

                {/* Calculator Widget Container */}
                <div className="bg-white rounded-3xl shadow-xl border border-stone-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    {/* Left: Interactive Controls (Span 7) */}
                    <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone-200/80">
                        <div>
                            {/* 1. Surface Slider */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                                        <Layers size={16} className="text-orange-500" />
                                        Superficie della stanza
                                    </label>
                                    <span className="font-display text-2xl sm:text-3xl font-extrabold text-orange-600 bg-orange-50 px-4 py-1 rounded-2xl border border-orange-200">
                                        {sqm} <span className="text-base font-semibold text-stone-600">m²</span>
                                    </span>
                                </div>

                                <input
                                    type="range"
                                    min="10"
                                    max="160"
                                    step="1"
                                    value={sqm}
                                    onChange={(e) => setSqm(Number(e.target.value))}
                                    className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />

                                <div className="flex justify-between text-xs text-stone-600 mt-2 font-medium">
                                    <span>Bagno (10 m²)</span>
                                    <span>Soggiorno (45 m²)</span>
                                    <span>Intero Appartamento (100+ m²)</span>
                                </div>
                            </div>

                            {/* 2. Material Selectors */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">
                                    Scegli la tipologia di finitura
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {FLOOR_OPTIONS.map((floor) => {
                                        const isSelected = selectedFloor === floor.id
                                        return (
                                            <button
                                                key={floor.id}
                                                type="button"
                                                onClick={() => setSelectedFloor(floor.id)}
                                                className={`p-3 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
                                                    isSelected
                                                        ? 'border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-500/20'
                                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                                }`}
                                            >
                                                <div className="h-16 w-full rounded-xl overflow-hidden mb-2 relative">
                                                    <img
                                                        src={floor.image}
                                                        alt={floor.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                    {isSelected && (
                                                        <div className="absolute top-1 right-1 h-5 w-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                                                            <Check size={12} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-bold text-stone-900 leading-tight">
                                                        {floor.name}
                                                    </span>
                                                    <span className="block text-[11px] text-stone-600 mt-0.5">
                                                        {floor.format}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* 3. Add-on Services Checkboxes */}
                            <div>
                                <label className="block text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">
                                    Servizi opzionali cantiere
                                </label>
                                <div className="space-y-2.5">
                                    <label className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={removeOldFloor}
                                                onChange={(e) => setRemoveOldFloor(e.target.checked)}
                                                className="h-4 w-4 rounded border-stone-300 text-orange-500 focus:ring-orange-400 accent-orange-500"
                                            />
                                            <div>
                                                <span className="text-sm font-semibold text-stone-900 block">
                                                    Demolizione e smaltimento vecchio pavimento
                                                </span>
                                                <span className="text-xs text-stone-600">
                                                    Include trasporto in discarica autorizzata e formulario rifiuti
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-stone-700">+14 €/m²</span>
                                    </label>

                                    <label className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={includeSkirting}
                                                onChange={(e) => setIncludeSkirting(e.target.checked)}
                                                className="h-4 w-4 rounded border-stone-300 text-orange-500 focus:ring-orange-400 accent-orange-500"
                                            />
                                            <div>
                                                <span className="text-sm font-semibold text-stone-900 block">
                                                    Fornitura e posa battiscopa coordinato
                                                </span>
                                                <span className="text-xs text-stone-600">
                                                    Battiscopa in tinta con posa a silicone acrilico
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-stone-700">Incluso</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Live Calculation & CTA (Span 5) */}
                    <div className="lg:col-span-5 p-6 sm:p-10 bg-stone-900 text-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-800">
                                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                                    Riepilogo Stimato
                                </span>
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                                    IVA 10% inclusa
                                </span>
                            </div>

                            {/* Breakdown Rows */}
                            <div className="space-y-3 mb-6 text-sm">
                                <div className="flex justify-between text-stone-300">
                                    <span>Materiale ({chosen.name})</span>
                                    <span className="font-semibold text-white">€ {materialCost.toLocaleString('it-IT')}</span>
                                </div>
                                <div className="flex justify-between text-stone-300">
                                    <span>Manodopera Posa Qualificata</span>
                                    <span className="font-semibold text-white">€ {baseLayingCost.toLocaleString('it-IT')}</span>
                                </div>
                                <div className="flex justify-between text-stone-300">
                                    <span>Colle e Stucchi Certificati</span>
                                    <span className="font-semibold text-white">€ {glueAndConsumables.toLocaleString('it-IT')}</span>
                                </div>
                                {removeOldFloor && (
                                    <div className="flex justify-between text-orange-400">
                                        <span>Demolizione & Smaltimento</span>
                                        <span className="font-semibold">€ {removalCost.toLocaleString('it-IT')}</span>
                                    </div>
                                )}
                                {includeSkirting && (
                                    <div className="flex justify-between text-stone-300">
                                        <span>Battiscopa e Finiture</span>
                                        <span className="font-semibold text-white">€ {skirtingCost.toLocaleString('it-IT')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Big Total Box */}
                            <div className="bg-stone-800/80 rounded-2xl p-5 border border-stone-700/80 mb-6">
                                <span className="text-xs uppercase tracking-wider text-stone-400 block mb-1">
                                    Totale Chiavi in Mano Stimato
                                </span>
                                <div className="flex items-baseline justify-between">
                                    <span className="font-display text-3xl sm:text-4xl font-extrabold text-orange-400">
                                        € {totalEstimate.toLocaleString('it-IT')}
                                    </span>
                                    <span className="text-xs text-stone-400 font-medium">
                                        circa <strong className="text-white">€ {pricePerSqm}</strong> / m²
                                    </span>
                                </div>
                            </div>

                            {/* Badges / Assurances */}
                            <div className="grid grid-cols-2 gap-3 mb-8 text-xs text-stone-300">
                                <div className="flex items-center gap-2 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
                                    <Clock size={16} className="text-orange-400 flex-shrink-0" />
                                    <span>Tempo: <strong>{estimatedDays}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
                                    <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                                    <span>Garanzia <strong>10 Anni</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* CTA button */}
                        <div>
                            <button
                                type="button"
                                onClick={handleProceed}
                                className="w-full flex items-center justify-center gap-2 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 text-base shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <Sparkles size={18} />
                                Personalizza nel Configuratore Completo
                                <ArrowRight size={18} />
                            </button>
                            <p className="text-[11px] text-stone-400 text-center mt-3">
                                Nessun vincolo o carta di credito richiesta. Preventivo bloccato per 30 giorni.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
