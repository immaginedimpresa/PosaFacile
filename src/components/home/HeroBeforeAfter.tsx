import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, Wand2, RefreshCw } from 'lucide-react'

interface PresetStyle {
    id: string
    name: string
    material: string
    afterImage: string
    badge: string
}

const PRESETS: PresetStyle[] = [
    {
        id: 'parquet-spina',
        name: 'Rovere Spina Francese',
        material: 'Parquet Spina 15×90 cm',
        afterImage: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?q=80&w=1200&auto=format&fit=crop',
        badge: 'Top Trend 2025'
    },
    {
        id: 'marmo-calacatta',
        name: 'Marmo Calacatta Gold',
        material: 'Gres Rettificato 120×120 cm',
        afterImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
        badge: 'Effetto Lusso'
    },
    {
        id: 'gres-cemento',
        name: 'Microcemento Grigio Caldo',
        material: 'Gres Spazzolato 60×120 cm',
        afterImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
        badge: 'Minimal Moderno'
    }
]

// Immagine prima: stanza datata con vecchie piastrelle
const BEFORE_IMAGE = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop'

export function HeroBeforeAfter() {
    const [sliderPosition, setSliderPosition] = useState(50)
    const [selectedPreset, setSelectedPreset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = clientX - rect.left
        const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100))
        setSliderPosition(percentage)
    }, [])

    const onTouchMove = useCallback((e: TouchEvent) => {
        if (!isDragging) return
        handleMove(e.touches[0].clientX)
    }, [isDragging, handleMove])

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (!isDragging) return
        handleMove(e.clientX)
    }, [isDragging, handleMove])

    const onPointerUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', onPointerMove)
            window.addEventListener('pointerup', onPointerUp)
            window.addEventListener('touchmove', onTouchMove)
            window.addEventListener('touchend', onPointerUp)
        }
        return () => {
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
            window.removeEventListener('touchmove', onTouchMove)
            window.removeEventListener('touchend', onPointerUp)
        }
    }, [isDragging, onPointerMove, onPointerUp, onTouchMove])

    const currentPreset = PRESETS[selectedPreset]

    return (
        <section className="bg-stone-900 py-24 text-white overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-orange-500/20 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/15 blur-[140px] pointer-events-none" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
                {/* Header info */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400 mb-4 backdrop-blur-md">
                            <Sparkles size={14} className="animate-pulse" />
                            Visualizzatore AI Interattivo
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                            Trascina per vedere <br className="hidden sm:inline" />
                            la trasformazione <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Prima & Dopo</span>
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-stone-300">
                            Con la nostra tecnologia AI proprietaria puoi caricare la foto di qualsiasi stanza e visualizzare all'istante centinaia di pavimenti con posa a regola d'arte.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map((preset, idx) => (
                            <button
                                key={preset.id}
                                onClick={() => setSelectedPreset(idx)}
                                className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-2 border ${
                                    selectedPreset === idx
                                        ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/25 scale-105'
                                        : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-white'
                                }`}
                            >
                                <span className={`h-2 w-2 rounded-full ${selectedPreset === idx ? 'bg-white animate-ping' : 'bg-stone-500'}`} />
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* The Interactive Slider Container */}
                <div className="relative rounded-3xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-950">
                    <div
                        ref={containerRef}
                        onPointerDown={(e) => {
                            setIsDragging(true)
                            handleMove(e.clientX)
                        }}
                        className="relative h-[380px] sm:h-[480px] md:h-[580px] w-full select-none cursor-ew-resize overflow-hidden"
                    >
                        {/* AFTER Image (Background full width) */}
                        <img
                            src={currentPreset.afterImage}
                            alt="Dopo la posa"
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                        />

                        {/* AFTER Label & Meta */}
                        <div className="absolute right-6 top-6 z-20 flex flex-col items-end gap-2 pointer-events-none">
                            <span className="rounded-full bg-orange-500/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                                DOPO: {currentPreset.name}
                            </span>
                            <span className="rounded-xl bg-black/60 backdrop-blur-md px-3 py-1 text-xs text-stone-300 border border-white/10">
                                {currentPreset.material}
                            </span>
                        </div>

                        {/* BEFORE Image (Clipped via width percentage) */}
                        <div
                            className="absolute inset-y-0 left-0 overflow-hidden"
                            style={{ width: `${sliderPosition}%` }}
                        >
                            <img
                                src={BEFORE_IMAGE}
                                alt="Prima della posa"
                                className="absolute inset-0 h-full max-w-none object-cover"
                                style={{
                                    width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100vw',
                                    height: '100%'
                                }}
                                loading="lazy"
                            />
                            {/* BEFORE Label */}
                            <div className="absolute left-6 top-6 z-20 pointer-events-none">
                                <span className="rounded-full bg-stone-900/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-stone-300 border border-stone-700 shadow-lg">
                                    PRIMA: Vecchio Pavimento
                                </span>
                            </div>
                            <div className="absolute inset-0 bg-stone-950/20" />
                        </div>

                        {/* Divider Line */}
                        <div
                            className="absolute inset-y-0 z-30 flex items-center justify-center pointer-events-none"
                            style={{ left: `${sliderPosition}%` }}
                        >
                            <div className="h-full w-[3px] bg-gradient-to-b from-orange-400 via-white to-orange-400 shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                            
                            {/* Handle Button */}
                            <div className="absolute h-12 w-12 -translate-x-1/2 rounded-full bg-white text-stone-900 shadow-2xl flex items-center justify-center border-4 border-orange-500 transition-transform hover:scale-110 active:scale-95">
                                <div className="flex items-center gap-0.5 text-orange-600">
                                    <span className="text-xs font-bold">◀</span>
                                    <span className="text-xs font-bold">▶</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Instruction Pill */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <span className="inline-flex items-center gap-2 rounded-full bg-black/75 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-stone-200 border border-white/10 shadow-lg">
                                <RefreshCw size={12} className="animate-spin text-orange-400" />
                                Trascina a destra e sinistra per confrontare
                            </span>
                        </div>
                    </div>

                    {/* Bottom Action Footer inside Card */}
                    <div className="bg-stone-950/90 border-t border-stone-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                Vuoi vedere come starebbe a casa tua?
                            </h4>
                            <p className="text-sm text-stone-400">
                                Carica una foto del tuo soggiorno o bagno e prova tutti i materiali in 10 secondi.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Link
                                to="/catalog"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400 transition-all hover:scale-105"
                            >
                                <Wand2 size={16} />
                                Prova l'AI sul Catalogo
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
