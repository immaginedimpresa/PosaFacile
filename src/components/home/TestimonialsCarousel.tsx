import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Star, ShieldCheck, MapPin } from 'lucide-react'

interface Testimonial {
    id: string
    name: string
    city: string
    role: string
    avatar: string
    workImage: string
    rating: number
    title: string
    content: string
    projectDetails: string
    installerName: string
}

const TESTIMONIALS: Testimonial[] = [
    {
        id: '1',
        name: 'Chiara & Federico V.',
        city: 'Monza (MB)',
        role: 'Proprietari di Casa',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
        workImage: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?q=80&w=600&auto=format&fit=crop',
        rating: 5,
        title: 'Zero stress, prezzo finale identico al preventivo!',
        content: 'Avevamo paura dei soliti imprevisti durante la posa del parquet a spina. Con PosaFacile il prezzo calcolato online è stato esattamente quello pagato, senza un euro in più. Posatore bravissimo e puntualissimo.',
        projectDetails: '85 m² Parquet Rovere a Spina',
        installerName: 'Marco R. (Posatore Certificato)'
    },
    {
        id: '2',
        name: 'Matteo G.',
        city: 'Milano (MI)',
        role: 'Architetto / Privato',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
        workImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop',
        rating: 5,
        title: 'Il visualizzatore AI ha convinto subito mia moglie.',
        content: 'Poter vedere la piastrella effetto marmo direttamente nella nostra camera con la luce naturale della finestra ci ha fatto scegliere in 10 minuti anziché girare 5 showroom. Consegna al piano e posa a regola d\'arte.',
        projectDetails: '120 m² Gres Effetto Marmo 120×120',
        installerName: 'Giuseppe B. (Gold Partner)'
    },
    {
        id: '3',
        name: 'Elena & Roberto B.',
        city: 'Bologna (BO)',
        role: 'Ristrutturazione Totale',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop',
        workImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=600&auto=format&fit=crop',
        rating: 5,
        title: 'Pagamento sbloccato solo dopo il collaudo.',
        content: 'La cosa che mi ha dato più fiducia in assoluto è stata la formula escrow: il posatore sapeva che i soldi erano pronti, e noi avevamo la certezza di dare l\'ok solo a lavoro finito e controllato col cantiere pulito.',
        projectDetails: '95 m² Gres Cemento Rettificato',
        installerName: 'Andrea V. (Posatore Selezionato)'
    }
]

export function TestimonialsCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isHovered, setIsHovered] = useState(false)

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }, [])

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
    }, [])

    useEffect(() => {
        if (isHovered) return
        const timer = setInterval(() => {
            handleNext()
        }, 5500)
        return () => clearInterval(timer)
    }, [isHovered, handleNext])

    const active = TESTIMONIALS[currentIndex]

    return (
        <section className="bg-stone-100 py-28 text-stone-900 overflow-hidden relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-2 block">
                            Recensioni Verificate
                        </span>
                        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900">
                            Cosa dicono di noi <span className="text-orange-500">i nostri clienti</span>
                        </h2>
                        <p className="mt-3 text-base sm:text-lg text-stone-600 max-w-xl">
                            Oltre 1.800 recensioni certificate con un punteggio medio di 4.9 su 5.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrev}
                            aria-label="Recensione precedente"
                            className="h-12 w-12 rounded-full border border-stone-300 bg-white text-stone-800 hover:bg-orange-500 hover:text-white hover:border-orange-500 flex items-center justify-center transition-all shadow-md active:scale-95"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <button
                            onClick={handleNext}
                            aria-label="Recensione successiva"
                            className="h-12 w-12 rounded-full border border-stone-300 bg-white text-stone-800 hover:bg-orange-500 hover:text-white hover:border-orange-500 flex items-center justify-center transition-all shadow-md active:scale-95"
                        >
                            <ChevronRight size={22} />
                        </button>
                    </div>
                </div>

                {/* Testimonial Active Slide Card */}
                <div
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[440px]"
                >
                    {/* Left: Text & Quote (Span 7) */}
                    <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
                        <div>
                            {/* Stars & Verified Badge */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-1 text-amber-500">
                                    {Array.from({ length: active.rating }).map((_, i) => (
                                        <Star key={i} size={18} fill="currentColor" stroke="none" />
                                    ))}
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                    <ShieldCheck size={14} />
                                    Acquisto e Posa Verificata
                                </span>
                            </div>

                            <h3 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-4 leading-snug">
                                "{active.title}"
                            </h3>
                            <p className="text-stone-600 text-base sm:text-lg leading-relaxed mb-8">
                                {active.content}
                            </p>
                        </div>

                        {/* Customer Info Footer */}
                        <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <img
                                    src={active.avatar}
                                    alt={active.name}
                                    className="h-12 w-12 rounded-full object-cover border-2 border-orange-200"
                                />
                                <div>
                                    <h4 className="font-bold text-stone-900 text-base">{active.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-stone-600">
                                        <MapPin size={12} className="text-orange-500" />
                                        <span>{active.city}</span>
                                        <span>•</span>
                                        <span>{active.role}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-left sm:text-right">
                                <span className="text-[11px] uppercase tracking-wider text-stone-600 block">Progetto</span>
                                <span className="text-xs font-bold text-stone-800 block">{active.projectDetails}</span>
                                <span className="text-[11px] text-stone-600">Posato da: {active.installerName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Photo of the finished job (Span 5) */}
                    <div className="lg:col-span-5 relative h-64 sm:h-80 lg:h-full overflow-hidden bg-stone-900">
                        <img
                            key={active.id}
                            src={active.workImage}
                            alt={active.projectDetails}
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6">
                            <span className="text-xs font-bold uppercase tracking-wider text-white/80 block mb-1">
                                Foto Reale a Fine Cantiere
                            </span>
                            <span className="text-sm font-semibold text-white">
                                {active.projectDetails}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Dot Pagination */}
                <div className="flex justify-center items-center gap-2 mt-8">
                    {TESTIMONIALS.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Testimonial ${idx + 1}`}
                            className={`h-2.5 rounded-full transition-all duration-300 ${
                                currentIndex === idx
                                    ? 'w-10 bg-orange-500'
                                    : 'w-2.5 bg-stone-300 hover:bg-stone-400'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
