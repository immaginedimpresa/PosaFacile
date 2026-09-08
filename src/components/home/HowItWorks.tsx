import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sliders, Wand2, CalendarCheck, CheckCircle2, ArrowRight } from 'lucide-react'

const STEPS = [
    {
        number: '01',
        icon: Sliders,
        title: 'Configura & Personalizza',
        description: 'Inserisci le dimensioni della stanza, seleziona il formato delle piastrelle e il tipo di posa (dritta, spina di pesce, a correre). Il nostro sistema calcola subito lo sfrido e il prezzo al centesimo.',
        tag: 'Tempo stimato: 2 minuti'
    },
    {
        number: '02',
        icon: Wand2,
        title: 'Visualizza con l\'AI o Prova i Campioni',
        description: 'Vedi il risultato sulla foto della tua stanza grazie al motore AI di rendering fotorealistico. Se vuoi, puoi anche ricevere il cofanetto di campioni a casa prima di confermare.',
        tag: 'Render istantaneo'
    },
    {
        number: '03',
        icon: CalendarCheck,
        title: 'Scegli il Posatore & Blocca la Data',
        description: 'Confronta i profili dei maestri posatori disponibili nella tua provincia, leggi le recensioni dei clienti passati e prenota direttamente la data di inizio posa.',
        tag: 'DURC & RC inclusi'
    },
    {
        number: '04',
        icon: CheckCircle2,
        title: 'Posa a Regola d\'Arte & Garanzia 10 Anni',
        description: 'Il posatore riceve i materiali direttamente al piano. Al termine esegui il collaudo insieme all\'artigiano e sblocchi il pagamento solo quando sei soddisfatto al 100%.',
        tag: 'Garanzia Collaudo'
    }
]

export function HowItWorks() {
    const [activeStep, setActiveStep] = useState(0)

    return (
        <section className="bg-stone-900 py-28 text-white relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2 block">
                        Semplicità Senza Sorprese
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                        Come Funziona PosaFacile
                    </h2>
                    <p className="mt-3 text-base sm:text-lg text-stone-300">
                        Dalla prima idea alla stanza finita in 4 semplici passaggi garantiti.
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon
                        const isCurrent = activeStep === idx

                        return (
                            <div
                                key={step.number}
                                onClick={() => setActiveStep(idx)}
                                className={`rounded-3xl p-8 cursor-pointer transition-all duration-300 border flex flex-col justify-between relative overflow-hidden ${
                                    isCurrent
                                        ? 'bg-stone-800 border-orange-500 shadow-xl shadow-orange-500/10 scale-[1.02]'
                                        : 'bg-stone-950/70 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <span className={`font-mono text-3xl font-extrabold ${isCurrent ? 'text-orange-400' : 'text-stone-700'}`}>
                                            {step.number}
                                        </span>
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${
                                            isCurrent ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-stone-900 text-stone-400'
                                        }`}>
                                            <Icon size={22} />
                                        </div>
                                    </div>

                                    <h3 className="font-display text-xl font-bold text-white mb-3 leading-snug">
                                        {step.title}
                                    </h3>
                                    <p className="text-stone-400 text-sm leading-relaxed mb-6">
                                        {step.description}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between">
                                    <span className="text-[11px] uppercase tracking-wider font-semibold text-orange-400/90">
                                        {step.tag}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Bottom Center CTA */}
                <div className="text-center">
                    <Link
                        to="/configuratore"
                        className="inline-flex items-center justify-center gap-3 rounded-full bg-orange-500 hover:bg-orange-400 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:scale-105"
                    >
                        Inizia la Configurazione del Tuo Pavimento
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </section>
    )
}
