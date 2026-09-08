import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2, Lock, Package, HeartHandshake } from 'lucide-react'

export function BentoFeatures() {
    return (
        <section className="bg-stone-50 py-28 text-stone-900 relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div className="max-w-2xl">
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-2 block">
                            La Rivoluzione della Posa
                        </span>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900">
                            Perché scegliere <span className="text-orange-500">PosaFacile</span>
                        </h2>
                        <p className="mt-3 text-base sm:text-lg text-stone-600">
                            Abbiamo eliminato preventivi vaghi, ritardi inspiegabili e artigiani introvabili.
                            Ecco come funziona il nuovo standard.
                        </p>
                    </div>

                    <Link
                        to="/configuratore"
                        className="inline-flex items-center gap-2 text-sm font-bold text-stone-900 hover:text-orange-500 transition-colors group"
                    >
                        Configura il tuo lavoro in 7 step
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* Card 1: AI Room Visualizer (Span 8) */}
                    <div className="md:col-span-8 group relative min-h-[460px] rounded-3xl overflow-hidden bg-stone-950 text-white p-8 sm:p-12 flex flex-col justify-between border border-stone-800 shadow-xl">
                        <div className="absolute inset-0 z-0">
                            <img
                                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop"
                                alt="Modern Room"
                                className="w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
                        </div>

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/20 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-400 mb-4">
                                <Sparkles size={14} />
                                Esclusiva PosaFacile AI
                            </div>
                            <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-white max-w-lg leading-tight">
                                Non immaginare il risultato. <br />
                                Guardalo nella tua stanza reale.
                            </h3>
                        </div>

                        <div className="relative z-10 max-w-xl">
                            <p className="text-stone-300 text-sm sm:text-base mb-6 leading-relaxed">
                                Scatta una foto col telefono o carica un'immagine: l'AI mappa la prospettiva e ti mostra la resa dei pavimenti con fughe realistiche e riflessi di luce prima ancora di ordinare.
                            </p>
                            <Link
                                to="/catalog"
                                className="inline-flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-400 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-105"
                            >
                                Prova l'AI sul Catalogo
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>

                    {/* Card 2: Cofanetto Campioni a Casa (Span 4) */}
                    <div className="md:col-span-4 rounded-3xl bg-white border border-stone-200/90 p-8 sm:p-10 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-100 rounded-full blur-2xl group-hover:bg-orange-200/60 transition-colors" />

                        <div>
                            <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mb-6">
                                <Package size={24} />
                            </div>
                            <h3 className="font-display text-2xl font-bold text-stone-900 mb-3">
                                Campioni Reali a Domicilio in 48h
                            </h3>
                            <p className="text-stone-600 text-sm leading-relaxed">
                                Tocca con mano le texture, le venature del legno e i riflessi del marmo direttamente con la luce di casa tua.
                            </p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-stone-100">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                    ✓ Gratuito con preventivo
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Posatori Verificati e Assicurati (Span 4) */}
                    <div className="md:col-span-4 rounded-3xl bg-white border border-stone-200/90 p-8 sm:p-10 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow group">
                        <div>
                            <div className="h-12 w-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center mb-6">
                                <ShieldCheck size={24} className="text-orange-400" />
                            </div>
                            <h3 className="font-display text-2xl font-bold text-stone-900 mb-3">
                                Posatori Certificati & Assicurati
                            </h3>
                            <p className="text-stone-600 text-sm leading-relaxed mb-6">
                                Accettiamo solo il top 8% dei posatori candidati. Tutti con DURC verificato, assicurazione RC cantiere fino a 1.000.000€ e collaudo finale.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                            <div className="flex -space-x-2">
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" className="w-8 h-8 rounded-full border-2 border-white object-cover" alt="Pro" />
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" className="w-8 h-8 rounded-full border-2 border-white object-cover" alt="Pro" />
                                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop" className="w-8 h-8 rounded-full border-2 border-white object-cover" alt="Pro" />
                            </div>
                            <span className="text-xs font-semibold text-stone-700">
                                500+ maestri posatori in tutta Italia
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Prezzo Chiavi in Mano Senza Sorprese (Span 4) */}
                    <div className="md:col-span-4 rounded-3xl bg-stone-900 text-white p-8 sm:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-full blur-2xl" />

                        <div className="relative z-10">
                            <div className="h-12 w-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-orange-400 mb-6">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3 className="font-display text-2xl font-bold text-white mb-3">
                                Prezzo Finito e Bloccato
                            </h3>
                            <p className="text-stone-300 text-sm leading-relaxed">
                                Il preventivo online include tutto: piastrelle, sfrido calcolato, colla e stucco ad alte prestazioni, posa in opera e pulizia fine cantiere.
                            </p>
                        </div>

                        <div className="relative z-10 mt-6 pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                            <span>Zero costi nascosti</span>
                            <span className="text-orange-400 font-bold">100% Trasparente</span>
                        </div>
                    </div>

                    {/* Card 5: Pagamento Sicuro in Escrow (Span 4) */}
                    <div className="md:col-span-4 rounded-3xl bg-white border border-stone-200/90 p-8 sm:p-10 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow group">
                        <div>
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-6">
                                <Lock size={24} />
                            </div>
                            <h3 className="font-display text-2xl font-bold text-stone-900 mb-3">
                                Pagamento Tutelato (Escrow)
                            </h3>
                            <p className="text-stone-600 text-sm leading-relaxed">
                                Il saldo finale resta custodito al sicuro sul conto escrow PosaFacile. Viene rilasciato al posatore solo quando hai approvato la perfetta esecuzione del lavoro.
                            </p>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-stone-700">
                            <HeartHandshake size={16} className="text-orange-500" />
                            <span>Garanzia Soddisfatto o Rifatto</span>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
