import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Sparkles, PhoneCall, CheckCircle } from 'lucide-react'
import { TileFloorHero } from '@/components/home/TileFloorHero'
import { BrandPartners } from '@/components/home/BrandPartners'
import { HeroBeforeAfter } from '@/components/home/HeroBeforeAfter'
import { InstantEstimator } from '@/components/home/InstantEstimator'
import { BentoFeatures } from '@/components/home/BentoFeatures'
import { RealProjectsCarousel } from '@/components/home/RealProjectsCarousel'
import { HowItWorks } from '@/components/home/HowItWorks'
import { TestimonialsCarousel } from '@/components/home/TestimonialsCarousel'
import { HomeFAQ } from '@/components/home/HomeFAQ'

export default function HomePage() {
    return (
        <div className="bg-background min-h-screen font-sans">
            {/* 1. HERO 3D INTERACTIVE ROOM */}
            <TileFloorHero />

            {/* 2. LIVE STATS STRIP */}
            <section className="bg-[#f5f2ec] pb-16 pt-2 border-b border-stone-200/60">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[#14171a]/10 pt-10 md:grid-cols-4">
                        {[
                            { valore: '10.000+ m²', voce: 'Pavimenti posati con successo', icon: '✨' },
                            { valore: '500+', voce: 'Posatori certificati e assicurati', icon: '👷' },
                            { valore: '4,9 / 5', voce: 'Punteggio su oltre 1.800 recensioni', icon: '⭐' },
                            { valore: '10 Anni', voce: 'Garanzia su fornitura e posa', icon: '🛡️' },
                        ].map(({ valore, voce, icon }) => (
                            <div key={voce} className="flex flex-col">
                                <span className="text-2xl mb-1">{icon}</span>
                                <dt className="font-display text-3xl font-extrabold tracking-tight text-[#14171a] md:text-4xl">
                                    {valore}
                                </dt>
                                <dd className="mt-1 text-xs sm:text-sm text-[#6b7178] font-medium leading-relaxed">
                                    {voce}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* 3. PARTNER BRANDS TRUST TICKER */}
            <BrandPartners />

            {/* 4. BEFORE & AFTER INTERACTIVE AI SLIDER */}
            <HeroBeforeAfter />

            {/* 5. INSTANT ESTIMATOR / CALCOLATORE RAPIDO */}
            <InstantEstimator />

            {/* 6. BENTO GRID FEATURES */}
            <BentoFeatures />

            {/* 7. REAL PROJECTS SHOWCASE CAROUSEL */}
            <RealProjectsCarousel />

            {/* 8. HOW IT WORKS 4-STEP WORKFLOW */}
            <HowItWorks />

            {/* 9. TESTIMONIALS & REVIEWS CAROUSEL */}
            <TestimonialsCarousel />

            {/* 10. FAQ ACCORDION */}
            <HomeFAQ />

            {/* 11. ULTIMATE CTA BANNER */}
            <section className="py-24 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 rounded-full blur-3xl pointer-events-none" />

                <div className="container px-4 sm:px-6 mx-auto text-center relative z-10 max-w-4xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white mb-6 border border-white/30">
                        <Sparkles size={14} />
                        Preventivo Gratuito in 2 Minuti
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold font-display text-white mb-6 tracking-tight leading-tight">
                        Pronto a trasformare la tua casa?
                    </h2>

                    <p className="text-lg sm:text-xl text-orange-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Configura il tuo preventivo personalizzato: piastrelle, posa e trasporto inclusi al centesimo. Nessun vincolo, blocchi il prezzo per 30 giorni.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                        <Link
                            to="/configuratore"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 h-14 px-10 text-base sm:text-lg font-bold rounded-full bg-white text-orange-600 hover:bg-orange-50 transition-all shadow-2xl hover:scale-105"
                        >
                            Calcola il Preventivo Online
                            <ArrowRight size={20} />
                        </Link>
                        <Link
                            to="/catalog"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 text-base font-semibold rounded-full border-2 border-white/80 text-white hover:bg-white/15 transition-all"
                        >
                            Sfoglia il Catalogo Prodotti
                        </Link>
                    </div>

                    {/* Trust assurances footer */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-orange-100 font-medium">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={16} /> Garanzia 10 anni sulla posa
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle size={16} /> Posatori assicurati fino a 1M€
                        </span>
                        <span className="flex items-center gap-1.5">
                            <PhoneCall size={16} /> Supporto clienti dedicato 7/7
                        </span>
                    </div>
                </div>
            </section>
        </div>
    )
}
