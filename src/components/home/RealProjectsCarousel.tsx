import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, Sparkles, ArrowRight, Play, Pause, CheckCircle2 } from 'lucide-react'

export interface ProjectItem {
    id: string
    title: string
    city: string
    category: 'parquet' | 'gres' | 'marmo' | 'grandi-formati'
    categoryLabel: string
    surface: string
    duration: string
    priceTotal: string
    materialName: string
    layingType: string
    image: string
    installer: string
    rating: number
    review: string
}

const PROJECTS: ProjectItem[] = [
    {
        id: '1',
        title: 'Attico Panoramico Isola',
        city: 'Milano (MI)',
        category: 'parquet',
        categoryLabel: 'Parquet a Spina',
        surface: '95 m²',
        duration: '4 giorni',
        priceTotal: '€ 6.250',
        materialName: 'Rovere Naturale Spina Ungherese',
        layingType: 'Posa a spina con colla ecologica',
        image: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?q=80&w=1000&auto=format&fit=crop',
        installer: 'Marco R. (Mastro Posatore Gold)',
        rating: 5,
        review: 'Precisione millimetrica sul taglio delle spine e pulizia impeccabile.'
    },
    {
        id: '2',
        title: 'Villa Moderna Lago',
        city: 'Como (CO)',
        category: 'marmo',
        categoryLabel: 'Marmo & Luxury',
        surface: '130 m²',
        duration: '5 giorni',
        priceTotal: '€ 9.400',
        materialName: 'Gres Statuario Lucidato 120×120',
        layingType: 'Posa continua a fuga minima 1mm',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
        installer: 'Giuseppe B. (Specialista Grandi Formati)',
        rating: 5,
        review: 'Effetto specchio sensazionale. Fuga invisibile e rispetto dei tempi.'
    },
    {
        id: '3',
        title: 'Open Space Industriale',
        city: 'Bologna (BO)',
        category: 'gres',
        categoryLabel: 'Gres Cemento',
        surface: '110 m²',
        duration: '3 giorni',
        priceTotal: '€ 4.950',
        materialName: 'Gres Porcellanato Cemento Smoke 60×120',
        layingType: 'Posa a correre sfalsata 1/3',
        image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1000&auto=format&fit=crop',
        installer: 'Andrea V. (Posatore Certificato)',
        rating: 5,
        review: 'Preventivo trasparente rispettato al centesimo. Ottima esperienza.'
    },
    {
        id: '4',
        title: 'Bagno Master & Zona SPA',
        city: 'Firenze (FI)',
        category: 'grandi-formati',
        categoryLabel: 'Grandi Lastre',
        surface: '32 m²',
        duration: '2 giorni',
        priceTotal: '€ 3.100',
        materialName: 'Lastre Calacatta 120×278 cm',
        layingType: 'Rivestimento parete + pavimento continuo',
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop',
        installer: 'Domenico T. (Specialista Bagni & Resine)',
        rating: 5,
        review: 'Zero sfridi visibili, tagli sulle prese perfetti.'
    },
    {
        id: '5',
        title: 'Ristrutturazione Appartamento',
        city: 'Torino (TO)',
        category: 'parquet',
        categoryLabel: 'Parquet Rovere',
        surface: '78 m²',
        duration: '3 giorni',
        priceTotal: '€ 5.200',
        materialName: 'Rovere Termotrattato 20×140',
        layingType: 'Posa flottante con materassino acustico',
        image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1000&auto=format&fit=crop',
        installer: 'Luigi S. (Esperto Parquettista)',
        rating: 5,
        review: 'Incredibile come abbiano gestito il vecchio dislivello tra le stanze.'
    },
    {
        id: '6',
        title: 'Cucina & Living Contemporaneo',
        city: 'Verona (VR)',
        category: 'gres',
        categoryLabel: 'Gres Effetto Legno',
        surface: '65 m²',
        duration: '2 giorni',
        priceTotal: '€ 3.850',
        materialName: 'Gres Rovere Miele 20×120 cm',
        layingType: 'Posa dritta a correre con cunei livellanti',
        image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1000&auto=format&fit=crop',
        installer: 'Davide P. (Posatore Certificato)',
        rating: 5,
        review: 'Resistente ai graffi e posato in due giorni senza polvere.'
    }
]

const CATEGORIES = [
    { id: 'all', label: 'Tutti i Progetti' },
    { id: 'parquet', label: 'Parquet & Legno' },
    { id: 'gres', label: 'Gres Porcellanato' },
    { id: 'marmo', label: 'Marmo & Pietra' },
    { id: 'grandi-formati', label: 'Grandi Lastre' }
]

export function RealProjectsCarousel() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [isHovered, setIsHovered] = useState(false)
    const sliderRef = useRef<HTMLDivElement>(null)

    const filteredProjects = selectedCategory === 'all'
        ? PROJECTS
        : PROJECTS.filter(p => p.category === selectedCategory)

    // Handle bounds when filtering
    useEffect(() => {
        setCurrentIndex(0)
    }, [selectedCategory])

    const totalSlides = filteredProjects.length

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % totalSlides)
    }, [totalSlides])

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
    }, [totalSlides])

    // Autoplay timer
    useEffect(() => {
        if (!isPlaying || isHovered || totalSlides <= 1) return

        const timer = setInterval(() => {
            handleNext()
        }, 4800)

        return () => clearInterval(timer)
    }, [isPlaying, isHovered, totalSlides, handleNext])

    const currentProject = filteredProjects[currentIndex] || filteredProjects[0]

    return (
        <section className="bg-stone-950 py-28 text-white relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-600/10 blur-[150px] pointer-events-none rounded-full" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
                {/* Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider mb-4">
                            <Sparkles size={14} />
                            Galleria Lavori Reali
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                            Ispirazioni reali posate <br />
                            <span className="text-stone-400">nelle case dei nostri clienti</span>
                        </h2>
                        <p className="mt-3 text-base sm:text-lg text-stone-400 max-w-xl">
                            Ogni progetto include materiale certificato, posa con maestri del territorio, garanzia 10 anni e prezzo trasparente chiavi in mano.
                        </p>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 border ${
                                    selectedCategory === cat.id
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25'
                                        : 'bg-stone-900/90 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-white'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Interactive Carousel Showcase */}
                <div
                    ref={sliderRef}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="relative rounded-3xl overflow-hidden border border-stone-800 bg-stone-900/60 backdrop-blur-xl shadow-2xl"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
                        {/* Image Left / Top Side (Span 7) */}
                        <div className="lg:col-span-7 relative h-[320px] sm:h-[420px] lg:h-full overflow-hidden group">
                            <img
                                key={currentProject.id}
                                src={currentProject.image}
                                alt={currentProject.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-stone-950/90" />

                            {/* City Badge */}
                            <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/10 shadow-lg">
                                <MapPin size={14} className="text-orange-400" />
                                {currentProject.city}
                            </div>

                            {/* Category Tag */}
                            <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                <span className="rounded-xl bg-orange-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                                    {currentProject.categoryLabel}
                                </span>
                            </div>
                        </div>

                        {/* Details Right Side (Span 5) */}
                        <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-4 mb-3">
                                    <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                                        Progetto #{currentProject.id}
                                    </span>
                                    <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                                        {'★'.repeat(currentProject.rating)}
                                        <span className="text-xs text-stone-400 ml-1">(5.0)</span>
                                    </div>
                                </div>

                                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
                                    {currentProject.title}
                                </h3>
                                <p className="text-stone-300 text-sm sm:text-base font-medium mb-6">
                                    {currentProject.materialName}
                                </p>

                                {/* Specs Matrix */}
                                <div className="grid grid-cols-3 gap-3 py-4 border-y border-stone-800 mb-6 bg-stone-900/40 rounded-2xl p-4">
                                    <div>
                                        <span className="text-[11px] uppercase tracking-wider text-stone-400 block">Superficie</span>
                                        <span className="text-base sm:text-lg font-bold text-white">{currentProject.surface}</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] uppercase tracking-wider text-stone-400 block">Tempistiche</span>
                                        <span className="text-base sm:text-lg font-bold text-white">{currentProject.duration}</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] uppercase tracking-wider text-stone-400 block">Prezzo Chiavi in Mano</span>
                                        <span className="text-base sm:text-lg font-extrabold text-orange-400">{currentProject.priceTotal}</span>
                                    </div>
                                </div>

                                {/* Review Box */}
                                <div className="bg-stone-900/90 rounded-2xl p-4 border border-stone-800 mb-6">
                                    <p className="text-xs sm:text-sm text-stone-300 italic mb-2">
                                        "{currentProject.review}"
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-400">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                        <span>Posato da: <strong className="text-stone-200">{currentProject.installer}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* Action & Configuration link */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                                <Link
                                    to="/configuratore"
                                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-orange-400 shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]"
                                >
                                    Preventivo Simile a Questo
                                    <ArrowRight size={16} />
                                </Link>
                                <Link
                                    to="/catalog"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-stone-700 bg-stone-900 px-5 py-3.5 text-sm font-medium text-stone-300 hover:text-white hover:border-stone-600 transition-colors"
                                >
                                    Catalogo
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Carousel Bottom Control Bar */}
                    <div className="bg-stone-950/95 border-t border-stone-800/80 px-6 py-4 flex items-center justify-between">
                        {/* Slide counter & Progress */}
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-orange-400">
                                {String(currentIndex + 1).padStart(2, '0')}
                            </span>
                            <span className="text-stone-600 text-sm">/</span>
                            <span className="font-mono text-sm font-medium text-stone-500">
                                {String(totalSlides).padStart(2, '0')}
                            </span>

                            {/* Indicator dots */}
                            <div className="hidden sm:flex items-center gap-1.5 ml-4">
                                {filteredProjects.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        aria-label={`Vai al progetto ${idx + 1}`}
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                            currentIndex === idx
                                                ? 'w-8 bg-orange-500'
                                                : 'w-2 bg-stone-700 hover:bg-stone-500'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Prev / Play / Next Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                title={isPlaying ? 'Pausa autoplay' : 'Avvia autoplay'}
                                className="h-9 w-9 rounded-full border border-stone-800 bg-stone-900 text-stone-400 hover:text-white hover:border-stone-700 flex items-center justify-center transition-colors mr-1"
                            >
                                {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                            </button>

                            <button
                                onClick={handlePrev}
                                aria-label="Progetto precedente"
                                className="h-10 w-10 rounded-full border border-stone-800 bg-stone-900 text-white hover:bg-orange-500 hover:border-orange-500 flex items-center justify-center transition-all shadow-md active:scale-95"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <button
                                onClick={handleNext}
                                aria-label="Progetto successivo"
                                className="h-10 w-10 rounded-full border border-stone-800 bg-stone-900 text-white hover:bg-orange-500 hover:border-orange-500 flex items-center justify-center transition-all shadow-md active:scale-95"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
