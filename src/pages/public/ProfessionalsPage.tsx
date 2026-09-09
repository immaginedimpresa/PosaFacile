import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowDown,
    ArrowUpRight,
    BadgeCheck,
    CalendarCheck,
    CalendarClock,
    Check,
    ClipboardList,
    Hammer,
    MapPin,
    MessageCircle,
    Minus,
    Package,
    Plus,
    Receipt,
    ShieldCheck,
    Star,
    Truck,
    Wallet,
    X,
} from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { STATIC_PAGES, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo'
import './home.css'
import './professionals.css'

/**
 * Le tappe del racconto. Ognuna ha un blocco di testo che scorre a sinistra e
 * un pannello che resta fermo a destra: è il pannello a cambiare mentre si
 * scorre, non la pagina a saltare da una sezione all'altra.
 */
const chapters = [
    {
        eyebrow: 'LA PROPOSTA',
        title: 'Il lavoro arriva già misurato.',
        text: 'Il cliente ha scelto materiale, metratura e tipo di posa prima ancora che tu lo senta. Ti arriva una proposta completa: superficie, formato, servizi richiesti, indirizzo e compenso. Decidi se accettarla.',
        bullets: [
            'Solo cantieri dentro la tua zona di copertura',
            'Compenso indicato prima di accettare',
            'Nessun obbligo: rifiuti e non succede nulla',
        ],
        icon: ClipboardList,
        panelTitle: 'Nessun preventivo da scrivere la sera.',
        panelText:
            'Il preventivo lo costruisce il configuratore con i dati del cliente. Tu ricevi un cantiere già definito, non una richiesta generica da rincorrere al telefono.',
        figures: [
            { label: 'DATI GIÀ RACCOLTI', value: 'Mq, formato, posa', note: 'Materiale e servizi inclusi' },
            { label: 'TEMPO PER DECIDERE', value: 'Nessuna fretta', note: 'Accetti o passi oltre' },
        ],
    },
    {
        eyebrow: 'LE GIORNATE',
        title: 'Le giornate le decidi tu.',
        text: 'La piattaforma stima i giorni di cantiere sulla base di formato, schema di posa, ambiente e lavorazioni. È una stima, non una regola: quando accetti, la correggi a mezze giornate e scrivi il perché.',
        bullets: [
            'La stima parte da rese reali, non da un prezzo al mq',
            'Correggi in su o in giù, con una nota all’ufficio',
            'Da lì in poi vale il tuo numero, non quello stimato',
        ],
        icon: CalendarClock,
        panelTitle: 'Chi posa sa quanto ci vuole.',
        panelText:
            'Il calcolo distingue le giornate di lavoro dalle attese tecniche: la maturazione del massetto occupa il cantiere ma non è tempo che lavori. Nessuno ti chiede di recuperare un ritardo che non hai causato.',
        figures: [
            { label: 'STIMA DI PARTENZA', value: 'Trasparente', note: 'Vedi le rese usate' },
            { label: 'ULTIMA PAROLA', value: 'Tua', note: 'Confermi o correggi' },
        ],
    },
    {
        eyebrow: 'IL MATERIALE',
        title: 'Le piastrelle sono già in cantiere.',
        text: 'Non ordini nulla, non anticipi nulla, non vai a ritirare nulla. Il materiale lo acquista PosaFacile e arriva all’indirizzo di posa prima che tu apra il cantiere.',
        bullets: [
            'Nessun capitale immobilizzato sul materiale',
            'Consegna verificata prima dell’inizio lavori',
            'Se manca qualcosa, il problema è nostro',
        ],
        icon: Truck,
        panelTitle: 'Zero anticipi. Zero magazzino.',
        panelText:
            'Il rischio di fornitura resta sulla piattaforma. Tu arrivi in un cantiere dove il materiale è già lì, contato e controllato, e il cliente sa che deve avere la stanza libera.',
        figures: [
            { label: 'ANTICIPO RICHIESTO', value: '€ 0', note: 'Il materiale lo compriamo noi' },
            { label: 'AVVISO AL CLIENTE', value: '3 giorni prima', note: '"Prepara la stanza"' },
        ],
    },
    {
        eyebrow: 'IL CANTIERE',
        title: 'Apri, lavori, documenti.',
        text: 'Dal telefono apri il cantiere, carichi le foto di avanzamento e lo chiudi. Ogni passaggio aggiorna la barra di stato che il cliente vede dalla sua area, senza che tu debba chiamarlo.',
        bullets: [
            'Chat diretta con l’ufficio operativo',
            'Foto di inizio, avanzamento e collaudo',
            'Il cliente segue tutto da solo, senza telefonate',
        ],
        icon: Hammer,
        panelTitle: 'Le foto valgono più di una discussione.',
        panelText:
            'Documentare lo stato di partenza e il risultato finale è la difesa migliore quando qualcuno ricorda le cose diversamente. Resta tutto agganciato all’ordine, con data e ora.',
        figures: [
            { label: 'AGGIORNAMENTI', value: 'Automatici', note: 'Il cliente vede lo stato' },
            { label: 'CONTESTAZIONI', value: 'Documentate', note: 'Foto e chat archiviate' },
        ],
    },
    {
        eyebrow: 'IL COMPENSO',
        title: 'Chiudi il cantiere, il resto è amministrazione nostra.',
        text: 'Il cliente paga PosaFacile, non te. Niente solleciti, niente acconti da inseguire, niente lavori consegnati e mai saldati: il tuo compenso matura alla chiusura del cantiere.',
        bullets: [
            'Un solo committente invece di venti clienti',
            'Compenso calcolato sulla tua tariffa al mq',
            'Recensioni e volume incidono sul tuo guadagno',
        ],
        icon: Wallet,
        panelTitle: 'Un committente solo. Che paga.',
        panelText:
            'La parte che manda in rovina gli artigiani bravi non è il lavoro: è l’incasso. Qui il rischio di credito è della piattaforma, e tu fatturi a un’azienda sola.',
        figures: [
            { label: 'CHI TI PAGA', value: 'PosaFacile', note: 'Non il cliente finale' },
            { label: 'SOLLECITI DA FARE', value: 'Nessuno', note: 'Non è il tuo mestiere' },
        ],
    },
]

const faq = [
    {
        question: 'Devo lavorare in esclusiva per PosaFacile?',
        answer: 'No. Accetti i cantieri che ti interessano e continui a lavorare con i tuoi clienti come hai sempre fatto. Le proposte che non ti convengono le rifiuti, senza doverti giustificare e senza penalità.',
    },
    {
        question: 'Chi decide la tariffa al metro quadro?',
        answer: 'La tariffa di posa è la tua e resta nella tua scheda professionista. Il prezzo che vede il cliente è la tua tariffa più il margine della piattaforma: quel margine copre acquisto del materiale, gestione dell’ordine e incasso, e non viene tolto dal tuo compenso.',
    },
    {
        question: 'Come vengono scelti i professionisti per un lavoro?',
        answer: 'Il cliente vede i professionisti che coprono la zona del cantiere e che risultano disponibili nel periodo indicato. Contano la copertura geografica che imposti tu, il calendario di disponibilità e la valutazione media ricevuta dai clienti.',
    },
    {
        question: 'Cosa succede se in cantiere trovo una situazione diversa?',
        answer: 'Segnali il problema dalla chat del cantiere, con le foto. L’ufficio blocca la lavorazione, chiede al cliente le informazioni mancanti e ricalcola giornate e compenso prima che tu vada avanti. Non ti viene chiesto di assorbire un lavoro che nessuno aveva previsto.',
    },
    {
        question: 'Quanti cantieri posso ricevere?',
        answer: 'Dipende dalla zona che copri, dalle giornate che lasci libere in calendario e dalle lavorazioni che dichiari di saper fare. Puoi anche sospendere le proposte per un periodo senza uscire dalla rete.',
    },
    {
        question: 'Serve una partita IVA?',
        answer: 'Sì. Collabori come impresa o artigiano con la tua partita IVA, e fatturi a PosaFacile. Al momento della candidatura ti chiediamo i dati fiscali, l’assicurazione di responsabilità civile e i documenti che verifichiamo prima di attivarti.',
    },
]

export function ProfessionalsPage() {
    useSeo({
        ...STATIC_PAGES.professionals,
        jsonLd: [
            faqJsonLd(faq),
            breadcrumbJsonLd([
                { name: 'Home', path: '/' },
                { name: 'Diventa posatore', path: '/professionisti' },
            ]),
        ],
    })
    const [activeChapter, setActiveChapter] = useState(0)
    const [openFaq, setOpenFaq] = useState<number | null>(0)
    const stepRefs = useRef<(HTMLElement | null)[]>([])

    /**
     * Il pannello di destra segue il capitolo che sta attraversando la fascia
     * centrale dello schermo. L'IntersectionObserver evita di ricalcolare
     * posizioni a ogni evento di scroll.
     */
    useEffect(() => {
        const nodes = stepRefs.current.filter(Boolean) as HTMLElement[]
        if (nodes.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    const index = Number((entry.target as HTMLElement).dataset.index)
                    if (Number.isFinite(index)) setActiveChapter(index)
                }
            },
            // Fascia stretta al centro: un solo capitolo per volta è quello attivo.
            { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
        )

        nodes.forEach((node) => observer.observe(node))
        return () => observer.disconnect()
    }, [])

    return (
        <div className="pf-home pf-pro">
            {/* --- Hero --- */}
            <section className="pf-hero pf-container" aria-labelledby="pro-hero-title">
                <div className="pf-hero-copy">
                    <p className="pf-eyebrow">
                        <span className="pf-status-dot" /> RETE POSATORI POSAFACILE
                    </p>
                    <h1 id="pro-hero-title">
                        Tu posi.
                        <br />
                        Al resto
                        <br />
                        <span>pensiamo noi.</span>
                    </h1>
                    <p className="pf-hero-description">
                        Cantieri già misurati, materiale già in posto, un solo committente che
                        paga. Tu fai il mestiere che sai fare, senza preventivi la sera e senza
                        rincorrere gli incassi.
                    </p>
                    <div className="pf-hero-actions">
                        <Link className="pf-button pf-button-orange" to="/register?role=professional">
                            Candidati come posatore <ArrowUpRight size={19} />
                        </Link>
                        <a className="pf-text-link" href="#come-lavori">
                            Come funziona davvero <ArrowDown size={16} />
                        </a>
                    </div>
                    <div className="pf-hero-assurances">
                        <span>
                            <Check size={15} /> Nessuna esclusiva
                        </span>
                        <span>
                            <Check size={15} /> Nessun costo di iscrizione
                        </span>
                    </div>
                </div>

                <div className="pf-hero-visual pf-pro-hero-visual">
                    {/* Anteprima di una proposta di lavoro, come la vede il posatore. */}
                    <div className="pf-pro-hero-card">
                        <header>
                            <span>
                                <span className="pf-status-dot" /> NUOVA PROPOSTA
                            </span>
                            <span>ANTEPRIMA</span>
                        </header>
                        <div className="pf-pro-job">
                            <div>
                                <small>BAGNO · RISTRUTTURAZIONE</small>
                                <h3>8 mq pavimento + 18 mq rivestimento</h3>
                                <p>Gres 30×60, posa dritta. Demolizione, impermeabilizzazione e soglie.</p>
                            </div>
                            <div className="pf-pro-payout">
                                <strong>€ 1.040</strong>
                                <small>compenso posa</small>
                            </div>
                        </div>
                        <div className="pf-pro-meta">
                            <div>
                                <span>DURATA</span>
                                <strong>6 giornate</strong>
                            </div>
                            <div>
                                <span>ZONA</span>
                                <strong>12 km da te</strong>
                            </div>
                            <div>
                                <span>MATERIALE</span>
                                <strong>Già ordinato</strong>
                            </div>
                        </div>
                        <div className="pf-pro-hero-actions">
                            <span>
                                <Check size={16} /> Accetta l’incarico
                            </span>
                            <span>Rifiuta</span>
                        </div>
                    </div>

                    <div className="pf-pro-hero-strip">
                        <div>
                            <strong>0 €</strong>
                            <small>anticipati sul materiale</small>
                        </div>
                        <div>
                            <strong>1</strong>
                            <small>committente che ti paga</small>
                        </div>
                        <div>
                            <strong>0</strong>
                            <small>preventivi da scrivere</small>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Strip valori --- */}
            <div className="pf-service-strip">
                <div className="pf-container">
                    {[
                        { icon: MapPin, title: 'Cantieri nella tua zona', text: 'Copertura decisa da te' },
                        { icon: CalendarCheck, title: 'Calendario tuo', text: 'Disponibilità che imposti tu' },
                        { icon: Package, title: 'Materiale incluso', text: 'Consegnato prima di iniziare' },
                        { icon: Receipt, title: 'Un solo committente', text: 'Fatturi a PosaFacile' },
                    ].map(({ icon: Icon, title, text }) => (
                        <div key={title}>
                            <Icon size={24} strokeWidth={1.5} />
                            <span>
                                <strong>{title}</strong>
                                <small>{text}</small>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- Scrollytelling --- */}
            <section id="come-lavori" className="pf-section pf-container">
                <div className="pf-section-heading">
                    <div>
                        <p className="pf-eyebrow">DALLA PROPOSTA AL PAGAMENTO</p>
                        <h2>
                            Cinque passaggi.
                            <br />
                            Nessuno di questi è vendere.
                        </h2>
                    </div>
                    <p>
                        Il lavoro di un posatore è posare.
                        <br />
                        Tutto quello che ci sta intorno lo togliamo di mezzo.
                    </p>
                </div>

                <div className="pf-scrolly">
                    <div className="pf-scrolly-steps">
                        {chapters.map((chapter, index) => (
                            <article
                                key={chapter.title}
                                data-index={index}
                                data-step={String(index + 1).padStart(2, '0')}
                                ref={(node) => {
                                    stepRefs.current[index] = node
                                }}
                                className={`pf-scrolly-step ${activeChapter === index ? 'is-active' : ''}`}
                            >
                                <p className="pf-eyebrow">{chapter.eyebrow}</p>
                                <h3>{chapter.title}</h3>
                                <p>{chapter.text}</p>
                                <ul>
                                    {chapter.bullets.map((bullet) => (
                                        <li key={bullet}>
                                            <Check size={16} />
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>

                    {/* Colonna ferma: cambia contenuto, non posizione. */}
                    <div className="pf-scrolly-visual" aria-hidden="true">
                        {chapters.map((chapter, index) => {
                            const Icon = chapter.icon
                            return (
                                <div
                                    key={chapter.panelTitle}
                                    className={`pf-scrolly-panel ${activeChapter === index ? 'is-active' : ''}`}
                                >
                                    <div>
                                        <header>
                                            <span>
                                                <span className="pf-status-dot" /> {chapter.eyebrow}
                                            </span>
                                            <span>
                                                {String(index + 1).padStart(2, '0')} / 05
                                            </span>
                                        </header>
                                        <div className="pf-scrolly-icon" style={{ marginTop: 30 }}>
                                            <Icon size={28} strokeWidth={1.5} />
                                        </div>
                                        <h4>{chapter.panelTitle}</h4>
                                        <p>{chapter.panelText}</p>
                                    </div>
                                    <div className="pf-scrolly-figures">
                                        {chapter.figures.map((figure) => (
                                            <div key={figure.label}>
                                                <span>{figure.label}</span>
                                                <strong>{figure.value}</strong>
                                                <small>{figure.note}</small>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* --- Confronto --- */}
            <section className="pf-inspiration">
                <div className="pf-container pf-section">
                    <div className="pf-section-heading">
                        <div>
                            <p className="pf-eyebrow">QUELLO CHE CAMBIA</p>
                            <h2>
                                Stesso mestiere.
                                <br />
                                Giornate diverse.
                            </h2>
                        </div>
                        <p>
                            Non ti promettiamo più lavoro.
                            <br />
                            Ti togliamo la parte che non hai scelto di fare.
                        </p>
                    </div>
                    <div className="pf-compare">
                        <div>
                            <h3>Come funziona di solito</h3>
                            <ul>
                                {[
                                    'Sopralluogo gratuito, preventivo scritto la sera, spesso per niente',
                                    'Il cliente sparisce, o ricompare tre mesi dopo',
                                    'Anticipi il materiale e aspetti il saldo',
                                    'Discussioni su cosa era compreso e cosa no',
                                    'Fatture da rincorrere, una per ogni cliente',
                                    'Le giornate perse a telefonare non le paga nessuno',
                                ].map((item) => (
                                    <li key={item}>
                                        <X size={17} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3>Come funziona qui</h3>
                            <ul>
                                {[
                                    'La proposta arriva già misurata e quotata',
                                    'Se accetti, il cantiere è confermato',
                                    'Il materiale lo compra e lo consegna PosaFacile',
                                    'Lavorazioni e servizi sono scritti nell’ordine',
                                    'Una sola fattura, a un solo committente',
                                    'Il tempo lo passi in cantiere, non al telefono',
                                ].map((item) => (
                                    <li key={item}>
                                        <Check size={17} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Compenso --- */}
            <section className="pf-section pf-container">
                <div className="pf-section-heading">
                    <div>
                        <p className="pf-eyebrow">COME SI COSTRUISCE IL TUO COMPENSO</p>
                        <h2>
                            La tua tariffa
                            <br />
                            resta la tua tariffa.
                        </h2>
                    </div>
                    <p>
                        Nessuna asta al ribasso, nessuna gara
                        <br />
                        per stare sotto al preventivo di un altro.
                    </p>
                </div>
                <div className="pf-payout-grid">
                    {[
                        {
                            icon: Hammer,
                            title: 'Tariffa base al mq',
                            text: 'La imposti tu nella tua scheda ed è la base di ogni compenso. Il margine della piattaforma si aggiunge sopra, verso il cliente: non viene sottratto a quello che prendi.',
                        },
                        {
                            icon: Star,
                            title: 'Bonus qualità',
                            text: 'Valutazioni alte e cantieri chiusi senza contestazioni pesano sul tuo compenso e su quante proposte ricevi. Lavorare bene si vede nei numeri, non solo nei complimenti.',
                        },
                        {
                            icon: BadgeCheck,
                            title: 'Bonus volume',
                            text: 'Chi porta a termine più cantieri nel mese accede a maggiorazioni. Cresce il volume, cresce la tariffa: non devi trattarla ogni volta da capo.',
                        },
                    ].map(({ icon: Icon, title, text }) => (
                        <article key={title} className="pf-payout-card">
                            <Icon size={28} strokeWidth={1.4} />
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
                <div className="pf-payout-note">
                    <ShieldCheck size={22} />
                    <p>
                        <strong>Sul preventivo del cliente c’è un margine di piattaforma.</strong>{' '}
                        Copre l’acquisto e la consegna del materiale, la gestione dell’ordine,
                        l’incasso e il rischio di mancato pagamento. È il motivo per cui tu non
                        anticipi niente e non solleciti nessuno — e non intacca la tariffa che hai
                        deciso per la tua manodopera.
                    </p>
                </div>
            </section>

            {/* --- Come si entra --- */}
            <section className="pf-project-section">
                <div className="pf-container pf-project-grid">
                    <div className="pf-project-copy">
                        <p className="pf-eyebrow">ENTRARE NELLA RETE</p>
                        <h2>
                            Tre passaggi,
                            <br />
                            poi il primo
                            <br />
                            <span>cantiere.</span>
                        </h2>
                        <p>
                            Non è un portale dove pubblichi un annuncio e aspetti. È una rete
                            selezionata: verifichiamo chi entra, perché al cliente rispondiamo noi.
                        </p>
                        <ul>
                            <li>
                                <Check size={20} /> Candidatura con dati fiscali e zone che copri
                            </li>
                            <li>
                                <Check size={20} /> Verifica di documenti, assicurazione e referenze
                            </li>
                            <li>
                                <Check size={20} /> Profilo attivo: imposti tariffa e disponibilità
                            </li>
                        </ul>
                        <Link to="/register?role=professional" className="pf-button pf-button-light">
                            Invia la candidatura <ArrowUpRight size={18} />
                        </Link>
                    </div>

                    <div className="pf-project-preview">
                        <div className="pf-preview-header">
                            <span>
                                <span className="pf-status-dot" /> LA TUA AREA POSATORE
                            </span>
                            <span>Anteprima</span>
                        </div>
                        <div className="pf-preview-title">
                            <div>
                                <small>PROSSIMO CANTIERE</small>
                                <h3>Bagno, ristrutturazione</h3>
                            </div>
                            <span className="pf-preview-icon">
                                <Hammer size={25} />
                            </span>
                        </div>
                        <ol className="pf-timeline">
                            <li className="is-complete">
                                <span>
                                    <Check size={14} />
                                </span>
                                <div>
                                    <strong>Incarico accettato</strong>
                                    <small>Giornate confermate da te</small>
                                </div>
                                <Check size={16} />
                            </li>
                            <li className="is-current">
                                <span>2</span>
                                <div>
                                    <strong>Materiale consegnato</strong>
                                    <small>Cliente avvisato di liberare la stanza</small>
                                </div>
                            </li>
                            <li>
                                <span>3</span>
                                <div>
                                    <strong>Cantiere chiuso</strong>
                                    <small>Foto di collaudo e compenso maturato</small>
                                </div>
                            </li>
                        </ol>
                        <div className="pf-preview-message">
                            <MessageCircle size={19} />
                            <span>Una chat diretta con l’ufficio, per ogni cantiere.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Requisiti --- */}
            <section className="pf-section pf-container">
                <div className="pf-section-heading">
                    <div>
                        <p className="pf-eyebrow">CHI CERCHIAMO</p>
                        <h2>
                            Poche cose,
                            <br />
                            ma non negoziabili.
                        </h2>
                    </div>
                    <p>
                        Al cliente garantiamo noi il risultato.
                        <br />
                        Per questo su chi entra siamo selettivi.
                    </p>
                </div>
                <ul className="pf-requirements">
                    {[
                        'Partita IVA attiva come impresa edile o artigiano posatore',
                        'Assicurazione di responsabilità civile in corso di validità',
                        'Esperienza documentabile nella posa di ceramica e gres',
                        'Attrezzatura propria, compresi taglio e livellamento',
                        'Disponibilità a lavorare sotto il marchio PosaFacile',
                        'Reperibilità sulla chat di cantiere nei giorni di lavoro',
                    ].map((item) => (
                        <li key={item}>
                            <Check size={17} />
                            {item}
                        </li>
                    ))}
                </ul>
            </section>

            {/* --- FAQ --- */}
            <section id="domande-pro" className="pf-section pf-container pf-faq">
                <div>
                    <p className="pf-eyebrow">PRIMA DI CANDIDARTI</p>
                    <h2>
                        Le domande
                        <br />
                        che fanno tutti.
                    </h2>
                    <p>
                        Meglio chiarirlo adesso
                        <br />
                        che al primo cantiere.
                    </p>
                    <Link to="/register?role=professional" className="pf-text-link">
                        Passiamo alla candidatura <ArrowUpRight size={18} />
                    </Link>
                </div>
                <div className="pf-faq-list">
                    {faq.map((item, index) => (
                        <div className={openFaq === index ? 'is-open' : ''} key={item.question}>
                            <h3>
                                <button
                                    id={`pro-faq-question-${index}`}
                                    aria-expanded={openFaq === index}
                                    aria-controls={`pro-faq-answer-${index}`}
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                >
                                    <span>{item.question}</span>
                                    {openFaq === index ? <Minus size={20} /> : <Plus size={20} />}
                                </button>
                            </h3>
                            <div
                                role="region"
                                aria-labelledby={`pro-faq-question-${index}`}
                                id={`pro-faq-answer-${index}`}
                                hidden={openFaq !== index}
                            >
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- CTA finale --- */}
            <section className="pf-final-cta pf-container">
                <div className="pf-final-grid" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                </div>
                <div>
                    <p className="pf-eyebrow">IL CANTIERE MIGLIORE È QUELLO GIÀ PRONTO</p>
                    <h2>
                        Il prossimo lavoro?
                        <br />
                        Ti aspetta già misurato.
                    </h2>
                    <p>Raccontaci chi sei e dove lavori. Al resto pensiamo noi.</p>
                    <Link to="/register?role=professional" className="pf-button pf-button-dark">
                        Candidati come posatore <ArrowUpRight size={20} />
                    </Link>
                    <span className="pf-final-note">
                        Nessun costo di iscrizione. Nessuna esclusiva.
                    </span>
                </div>
            </section>

            <div className="pf-mobile-cta">
                <span>
                    Entra nella rete posatori.
                    <small>Cantieri già misurati, materiale incluso.</small>
                </span>
                <Link to="/register?role=professional">
                    Candidati <ArrowUpRight size={17} />
                </Link>
            </div>
        </div>
    )
}
