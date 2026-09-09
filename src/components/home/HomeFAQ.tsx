import { ArrowUpRight, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export const HOME_FAQ = [
    {
        question: 'Da dove comincio per avere un preventivo?',
        answer: 'Apri il configuratore e indica dove si trova il tuo progetto. Potrai scegliere ambiente, piastrelle, metratura, tipo di posa e servizi aggiuntivi, poi selezionare un professionista e una data tra le disponibilità proposte.',
    },
    {
        question: 'Il preventivo include sia il materiale sia la posa?',
        answer: 'Il riepilogo del configuratore distingue materiale, posa, servizi selezionati e IVA. Il materiale comprende lo sfrido impostato, cioè la quantità aggiuntiva per tagli e adattamenti. Controlla tutte le voci nel riepilogo prima di procedere.',
    },
    {
        question: 'La stima in questa pagina è il prezzo definitivo?',
        answer: 'No, è un primo orientamento basato su prezzi di esempio per i materiali e sulla tariffa base di posa. Il preventivo personalizzato usa invece il prodotto scelto, la tariffa del professionista, il tipo di posa e i servizi necessari al tuo progetto.',
    },
    {
        question: 'Come verifico se il servizio è disponibile nella mia zona?',
        answer: 'Inserisci il luogo di posa nel configuratore. La selezione dei professionisti tiene conto della copertura della zona del progetto; le date proposte dipendono dalle loro disponibilità e dai tempi previsti per il lavoro.',
    },
    {
        question: 'Posso includere la rimozione del vecchio pavimento?',
        answer: 'Sì. Nel configuratore puoi aggiungere demolizione, smaltimento e, se necessari, massetto, impermeabilizzazione, battiscopa e soglie. Le lavorazioni selezionate vengono riportate nel riepilogo dei costi.',
    },
    {
        question: 'Dove ritrovo il preventivo e gli aggiornamenti?',
        answer: 'Accedi alla tua area personale per ritrovare i preventivi salvati e i tuoi ordini. Nella pagina del progetto puoi consultare i dettagli, seguire l’avanzamento e comunicare con il professionista attraverso la chat.',
    },
]

export function HomeFAQ() {
    const [open, setOpen] = useState<number | null>(0)
    return (
        <section id="domande" className="pf-section pf-container pf-faq">
            <div>
                <p className="pf-eyebrow">FACCIAMO CHIAREZZA</p>
                <h2>
                    Le risposte,
                    <br />
                    prima di iniziare.
                </h2>
                <p>
                    Ogni progetto parte da una domanda.
                    <br />
                    Qui trovi le più frequenti.
                </p>
                <Link to="/configuratore" className="pf-text-link">
                    Passiamo al tuo progetto <ArrowUpRight size={18} />
                </Link>
            </div>
            <div className="pf-faq-list">
                {HOME_FAQ.map((item, index) => (
                    <div
                        className={open === index ? 'is-open' : ''}
                        key={item.question}
                    >
                        <h3>
                            <button
                                id={`faq-question-${index}`}
                                aria-expanded={open === index}
                                aria-controls={`faq-answer-${index}`}
                                onClick={() =>
                                    setOpen(open === index ? null : index)
                                }
                            >
                                <span>{item.question}</span>
                                {open === index ? (
                                    <Minus size={20} />
                                ) : (
                                    <Plus size={20} />
                                )}
                            </button>
                        </h3>
                        <div
                            role="region"
                            aria-labelledby={`faq-question-${index}`}
                            id={`faq-answer-${index}`}
                            hidden={open !== index}
                        >
                            <p>{item.answer}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
