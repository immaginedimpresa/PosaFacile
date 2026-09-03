import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeIn, StaggerContainer } from '@/components/ui/motion'
import { TileFloorHero } from '@/components/home/TileFloorHero'

export default function HomePage() {
    return (
        <div className="bg-background min-h-screen font-sans">

            <TileFloorHero />

            {/* Prove: numeri sotto la hero, su fondo scuro continuo */}
            <section className="bg-[#f5f2ec] pb-24 pt-4">
                <div className="mx-auto max-w-6xl px-6">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-[#14171a]/10 pt-12 md:grid-cols-4">
                        {[
                            { valore: '10k+', voce: 'Progetti completati' },
                            { valore: '500+', voce: 'Posatori verificati' },
                            { valore: '4,9/5', voce: 'Recensioni clienti' },
                            { valore: '100%', voce: 'Garanzia soddisfatti' },
                        ].map(({ valore, voce }) => (
                            <div key={voce}>
                                <dt className="font-display text-3xl font-bold tracking-tight text-[#14171a] md:text-4xl">
                                    {valore}
                                </dt>
                                <dd className="mt-1.5 text-sm text-[#6b7178]">{voce}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* 2. BENTO GRID FEATURES: Modern & Clean */}
            <section className="py-32 bg-gray-50">
                <div className="container px-4 mx-auto">
                    <FadeIn className="mb-16 md:flex justify-between items-end">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4">Perché PosaFacile?</h2>
                            <p className="text-xl text-gray-500 max-w-lg">Abbiamo ridisegnato l'esperienza di ristrutturazione per darti il controllo totale, senza lo stress.</p>
                        </div>
                        <div className="hidden md:block">
                            <Link to="/catalog">
                                <Button variant="outline" className="rounded-full">Scopri tutti i vantaggi</Button>
                            </Link>
                        </div>
                    </FadeIn>

                    <StaggerContainer className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto">

                        {/* Card 1: AI Visualizer (Span 8) */}
                        <Link to="/catalog" className="md:col-span-8 group relative h-[500px] overflow-hidden rounded-3xl bg-black text-white p-8 md:p-12 hover:shadow-2xl transition-all duration-500">
                            <div className="absolute inset-0 z-0">
                                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2670" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Room" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
                            </div>
                            <div className="relative z-10 h-full flex flex-col justify-end items-start max-w-lg">
                                <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl mb-4 text-xs font-bold uppercase tracking-wider border border-white/20">Esclusiva PosaFacile AI</div>
                                <h3 className="text-4xl font-bold mb-4 font-display">Non immaginare.<br />Guardalo a casa tua.</h3>
                                <p className="text-lg text-gray-300 mb-8">Carica una foto della tua stanza e la nostra AI ti mostrerà il risultato finale in pochi secondi. Cambia pavimento con un click.</p>
                                <span className="inline-flex items-center gap-2 text-white border border-white px-6 py-3 rounded-full hover:bg-white hover:text-black transition-colors">
                                    Prova l'AI Visualizer Live
                                    <ArrowRight size={16} />
                                </span>
                            </div>
                        </Link>

                        {/* Card 2: Catalog (Span 4) */}
                        <Link to="/catalog" className="md:col-span-4 h-[500px] bg-white rounded-3xl p-8 md:p-12 border hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden">
                            <div>
                                <h3 className="text-3xl font-bold mb-4 font-display text-gray-900">Catalogo Premium</h3>
                                <p className="text-gray-500">Oltre 5.000 referenze di gres, parquet e ceramica dei migliori brand italiani.</p>
                            </div>

                            {/* Visual Stack Effect */}
                            <div className="relative h-48 w-full mt-8">
                                <img src="https://images.unsplash.com/photo-1510414842594-a61c69b5ae57" className="absolute top-0 left-0 w-32 h-32 object-cover rounded-2xl shadow-lg transform -rotate-12 z-10 border-4 border-white" />
                                <img src="https://images.unsplash.com/photo-1596429388107-742a781b4904" className="absolute top-4 left-16 w-32 h-32 object-cover rounded-2xl shadow-lg transform rotate-6 z-20 border-4 border-white" />
                            </div>

                            <div className="flex justify-end">
                                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </Link>

                        {/* Card 3: Certified Pros (Span 6) */}
                        <div className="md:col-span-6 h-[400px] bg-indigo-900 rounded-3xl p-10 text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-purple-500/30 to-transparent rounded-full blur-3xl" />
                            <div className="relative z-10">
                                <ShieldCheck className="w-12 h-12 mb-6 text-indigo-300" />
                                <h3 className="text-3xl font-bold mb-4 font-display">Posa Certificata e Garantita</h3>
                                <p className="text-indigo-200 text-lg mb-8 max-w-sm">
                                    Non impazzire cercando un posatore. Te lo assegniamo noi: verificato, assicurato e con recensioni reali.
                                </p>

                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-4">
                                        <img src="https://i.pravatar.cc/100?img=33" className="w-12 h-12 rounded-full border-2 border-indigo-900" />
                                        <img src="https://i.pravatar.cc/100?img=68" className="w-12 h-12 rounded-full border-2 border-indigo-900" />
                                        <img src="https://i.pravatar.cc/100?img=12" className="w-12 h-12 rounded-full border-2 border-indigo-900" />
                                    </div>
                                    <div className="text-sm font-medium">
                                        <span className="block text-white">Roberto, Marco, +400 altri</span>
                                        <span className="text-indigo-300">Pronti nella tua zona</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 4: Preventivo Wizard (Span 6) */}
                        <Link to="/configuratore" className="md:col-span-6 h-[400px] bg-white rounded-3xl border p-10 relative overflow-hidden group hover:border-orange-500 transition-colors">
                            <div className="absolute right-[-20%] top-[-20%] opacity-5 group-hover:opacity-10 transition-opacity">
                                <h1 className="text-[300px] font-bold">€</h1>
                            </div>
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-6">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h3 className="text-3xl font-bold mb-4 font-display text-gray-900">Preventivo Completo</h3>
                                    <p className="text-gray-500 text-lg max-w-sm">
                                        Configura il tuo progetto in 7 step. Ottieni subito il prezzo finito: materiale + posa + servizi.
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-2 w-fit px-6 py-3 bg-orange-500 text-white rounded-full font-medium group-hover:bg-orange-600 transition-colors">
                                    Calcola Ora
                                    <ArrowRight size={16} />
                                </span>
                            </div>
                        </Link>

                    </StaggerContainer>
                </div>
            </section>

            {/* 3. SHOWCASE / SLIDER */}
            <section className="py-24 overflow-hidden bg-black text-white">
                <div className="container px-4 text-center mb-12">
                    <h2 className="text-3xl font-bold font-display mb-4">Ispirazioni dal vivo</h2>
                    <Link to="/catalog" className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                        Scopri tutti i prodotti
                        <ArrowRight size={16} />
                    </Link>
                </div>
                {/* Infinite Scroll Marquee effect simulation */}
                <div className="flex gap-4 overflow-hidden relative opacity-60 hover:opacity-100 transition-opacity duration-500">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Link key={i} to="/catalog" className="flex-shrink-0 w-[300px] h-[400px] bg-gray-800 rounded-xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-500">
                            <img src={`https://source.unsplash.com/random/300x400?interior,${i}`} className="w-full h-full object-cover" alt="Interior" />
                        </Link>
                    ))}
                </div>
            </section>

            {/* 4. CTA SECTION */}
            <section className="py-24 bg-orange-500">
                <div className="container px-4 mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold font-display text-white mb-6">
                        Pronto a trasformare i tuoi spazi?
                    </h2>
                    <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto">
                        Configura il tuo preventivo gratuito in pochi minuti. Nessun impegno, solo il prezzo chiaro per il tuo progetto.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/configuratore">
                            <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-white text-orange-600 hover:bg-orange-50 font-semibold">
                                Inizia Ora - È Gratis
                            </Button>
                        </Link>
                        <Link to="/catalog">
                            <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full border-white text-white hover:bg-white/10">
                                Esplora il Catalogo
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    )
}
