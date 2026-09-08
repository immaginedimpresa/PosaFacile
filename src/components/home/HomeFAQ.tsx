import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

interface FAQItem {
    question: string
    answer: string
}

const FAQS: FAQItem[] = [
    {
        question: 'Come funziona la garanzia di 10 anni sulla posa?',
        answer: 'Tutti i posatori partner di PosaFacile sono maestri artigiani certificati e assicurati con polizza RC fino a 1.000.000€. La posa viene eseguita secondo le norme UNI 11493 per la ceramica e UNI 11296 per il legno. In caso di qualsiasi anomalia di posa o distacco nei 10 anni successivi, interveniamo a nostre spese per il ripristino immediato.'
    },
    {
        question: 'I materiali vengono consegnati direttamente al piano?',
        answer: 'Sì, offriamo il servizio di consegna al piano con facchinaggio qualificato e sponda idraulica. Durante la configurazione puoi specificare il piano della tua abitazione e la presenza o meno di ascensore per includere il servizio nel preventivo.'
    },
    {
        question: 'Cosa succede se il sottofondo/massetto è irregolare?',
        answer: 'Nel configuratore puoi selezionare l\'opzione "Verifica & Ripristino Massetto" o "Autolivellante". Il posatore effettuerà comunque un controllo preliminare con staggia laser prima di posare la prima piastrella.'
    },
    {
        question: 'Come posso ordinare i campioni reali a casa prima di decidere?',
        answer: 'Puoi ordinare il cofanetto PosaFacile contenente fino a 3 campioni reali di piastrelle o listoni di parquet. La spedizione è espressa in 24/48h e il costo dei campioni ti viene interamente rimborsato se procedi con l\'ordine del preventivo.'
    },
    {
        question: 'Quando viene pagato il posatore?',
        answer: 'Utilizziamo un sistema escrow sicuro: il tuo pagamento è congelato su un conto di garanzia. Il posatore viene liquidato solo dopo il collaudo finale e la tua approvazione scritta che il lavoro è conforme e a regola d\'arte.'
    }
]

export function HomeFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    const toggle = (idx: number) => {
        setOpenIndex(openIndex === idx ? null : idx)
    }

    return (
        <section className="bg-white py-28 text-stone-900">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-50 px-4 py-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-4">
                        <HelpCircle size={14} />
                        Domande Frequenti
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900">
                        Tutto quello che vuoi sapere
                    </h2>
                    <p className="mt-3 text-base sm:text-lg text-stone-600">
                        Chiarezza e trasparenza totale su prezzi, tempi, garanzie e posatori.
                    </p>
                </div>

                {/* FAQ List */}
                <div className="space-y-4">
                    {FAQS.map((faq, idx) => {
                        const isOpen = openIndex === idx

                        return (
                            <div
                                key={idx}
                                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                    isOpen
                                        ? 'border-orange-500 bg-orange-50/20 shadow-md'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggle(idx)}
                                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-display text-lg font-bold text-stone-900"
                                >
                                    <span>{faq.question}</span>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                                        isOpen ? 'bg-orange-500 text-white rotate-180' : 'bg-stone-100 text-stone-600'
                                    }`}>
                                        <ChevronDown size={18} />
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="px-6 pb-6 pt-1 text-stone-600 text-base leading-relaxed border-t border-orange-200/50">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
