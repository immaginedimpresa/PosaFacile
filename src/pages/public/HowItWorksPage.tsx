import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowDown,
    ArrowUpRight,
    Award,
    Building2,
    Calculator,
    Check,
    Clock,
    FileCheck2,
    HardHat,
    Minus,
    PackageCheck,
    Plus,
    Scale,
    ShieldCheck,
    Sparkles,
    Truck,
    Users,
    Wrench,
    X,
} from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { STATIC_PAGES, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo'
import './home.css'
import './professionals.css'
import './how-it-works.css'

/**
 * Le 5 tappe del servizio spiegate all'utente privato.
 * Il pannello sticky di destra segue il capitolo attivo durante lo scroll.
 */
const chapters = [
    {
        eyebrow: '01 · LA SCELTA & IL DESIGN',
        title: 'Scegli le superfici o visualizzale subito a casa tua.',
        text: 'Esplora il catalogo di gres porcellanato e ceramica di prima scelta italiana. Puoi caricare una foto della tua stanza per vedere il risultato con il visualizzatore AI fotorealistico, oppure ordinare il cofanetto campioni direttamente a casa per toccare texture e finiture con mano.',
        bullets: [
            'Gres porcellanato di prima scelta certificato e rettificato',
            'Simulatore AI istantaneo sulla foto reale della tua stanza',
            'Cofanetto campioni consegnato a domicilio senza impegno',
        ],
        icon: Sparkles,
        panelTitle: 'Vedi il risultato prima ancora di iniziare.',
        panelText:
            'Nessun dubbio sul colore o sulla resa della luce naturale nei tuoi spazi. Dalla foto al cantiere, sai già con esattezza come apparirà la tua casa finita.',
        figures: [
            { label: 'SIMULATORE AI', value: 'Istantaneo', note: 'Con la foto della tua stanza' },
            { label: 'CAMPIONI FISICI', value: 'A domicilio', note: 'Tocchi con mano le texture' },
        ],
    },
    {
        eyebrow: '02 · IL PREVENTIVO TRASPARENTE',
        title: 'Un calcolo chiaro: materiale, sfrido e manodopera.',
        text: 'Dimentica i preventivi generici a corpo scritti a penna. Il nostro configuratore calcola le quantità reali, lo sfrido geometrico esatto in base allo schema di posa (dritta, spina di pesce, a correre) e include ogni lavorazione accessoria necessaria: demolizione, massetto, impermeabilizzazione e battiscopa.',
        bullets: [
            'Prezzo bloccato al centesimo: quello che vedi è quello che paghi',
            'Sfrido calcolato in automatico in base al formato e alla geometria',
            'Dettaglio voce per voce di manodopera, colle professionali e accessori',
        ],
        icon: Calculator,
        panelTitle: 'Zero costi nascosti durante o dopo i lavori.',
        panelText:
            'Tutte le voci di spesa sono visibili e fisse fin dall’inizio. Nessun supplemento imprevisto per colle, distanziatori livellanti o profili scoperto a fine cantiere.',
        figures: [
            { label: 'PREZZO BLOCCATO', value: 'Al centesimo', note: 'Nessuna brutta sorpresa' },
            { label: 'DETTAGLIO VOCI', value: '100% chiaro', note: 'Materiali e posa separati' },
        ],
    },
    {
        eyebrow: '03 · IL MAESTRO POSATORE',
        title: 'I migliori artigiani della tua zona, con date certe.',
        text: 'Ti colleghiamo solo con artigiani e imprese selezionati che operano nella tua provincia, in possesso di Partita IVA attiva, regolarità contributiva DURC e polizza di Responsabilità Civile per danni a terzi. Visualizzi i profili con foto dei lavori e scegli la data di inizio posa sul calendario reale.',
        bullets: [
            'Solo posatori verificati con DURC aggiornato e assicurazione RC cantiere',
            'Recensioni autentiche e foto dei cantieri già conclusi nella tua zona',
            'Scelta della data di inizio lavori direttamente dal calendario online',
        ],
        icon: HardHat,
        panelTitle: 'Chi entra in casa tua è qualificato e protetto.',
        panelText:
            'Non affidiamo il lavoro a sconosciuti. Ogni professionista della rete supera una rigorosa verifica tecnica e documentale, lavorando secondo la norma UNI 11493.',
        figures: [
            { label: 'COPERTURA RC', value: 'Fino a 1M €', note: 'Massima serenità per la tua casa' },
            { label: 'VERIFICHE DURC', value: 'Regolari', note: 'Documenti controllati prima del via' },
        ],
    },
    {
        eyebrow: '04 · LA FORNITURA AL PIANO',
        title: 'Il materiale arriva a casa tua prima che il posatore inizi.',
        text: 'Non devi noleggiare furgoni, andare ai magazzini edili o caricare quintali di piastrelle e sacchi di colla nel bagagliaio. PosaFacile gestisce l’intera logistica: piastrelle, collanti professionali H40, fughe e profili arrivano al piano al tuo indirizzo prima della data concordata.',
        bullets: [
            'Consegna al piano concordata telefonicamente con preavviso',
            'Fornitura completa: piastrelle, colle deformabili H40, stucchi e profili',
            'Controllo integrità imballi prima dell’apertura del cantiere',
        ],
        icon: Truck,
        panelTitle: 'Zero fatica e zero fermi cantiere.',
        panelText:
            'Quando il posatore arriva la mattina, trova già tutti i materiali contati e pronti all’uso. I lavori partono subito, senza perdite di tempo o attese delle forniture.',
        figures: [
            { label: 'CONSEGNA AL PIANO', value: 'Inclusa', note: 'Con scarico e facchinaggio' },
            { label: 'COLLE E ACCESSORI', value: 'Completi', note: 'Prodotti professionali certificati' },
        ],
    },
    {
        eyebrow: '05 · ESECUZIONE & COLLAUDO',
        title: 'Segui i lavori dall’app e paghi solo dopo il collaudo.',
        text: 'Dalla tua area personale segui l’avanzamento del cantiere con le foto caricate dall’artigiano e disponi di una chat diretta con l’ufficio operativo. A fine lavori viene eseguito il collaudo insieme al posatore: il saldo viene confermato solo quando sei soddisfatto al 100%, con la garanzia PosaFacile.',
        bullets: [
            'Fotodiario di avanzamento e messaggistica diretta nella tua area personale',
            'Collaudo congiunto a fine lavori secondo standard qualitativi UNI 11493',
            'Tutela PosaFacile e assistenza dedicata per qualsiasi necessità futura',
        ],
        icon: Award,
        panelTitle: 'La tranquillità di non essere mai lasciato solo.',
        panelText:
            'PosaFacile è il committente responsabile del tuo progetto: rispondiamo noi della qualità finale, assistendoti passo dopo passo fino all’ultima fuga pulita.',
        figures: [
            { label: 'AGGIORNAMENTI LIVE', value: 'Foto e chat', note: 'Sempre informato dal telefono' },
            { label: 'GARANZIA POSA', value: 'A regola d’arte', note: 'Conforme alla norma UNI 11493' },
        ],
    },
]

const faq = [
    {
        question: 'Come viene calcolato il prezzo del preventivo?',
        answer: 'Il preventivo online calcola separatamente il costo del materiale (al metro quadro), lo sfrido necessario in base al tipo di posa, i collanti e gli stucchi professionali, la manodopera del posatore e tutti i servizi accessori richiesti (come demolizione del vecchio pavimento, preparazione massetto o posa battiscopa). Il totale è trasparente e bloccato prima di confermare.',
    },
    {
        question: 'Chi porta il materiale a casa mia?',
        answer: 'La fornitura viene gestita interamente da PosaFacile. Piastrelle, collanti e accessori vengono recapitati direttamente al piano concordando data e fascia oraria con congruo preavviso telefonico, prima dell’inizio effettivo dei lavori di posa.',
    },
    {
        question: 'Chi sono i posatori che lavorano con PosaFacile?',
        answer: 'I nostri posatori sono artigiani e imprese specializzati, selezionati dopo una scrupolosa verifica tecnica: controlliamo Partita IVA, regolarità contributiva DURC, polizza di Responsabilità Civile verso terzi (RC) e referenze di cantieri precedenti. Nel configuratore puoi consultare il profilo e le recensioni dei posatori disponibili nella tua provincia.',
    },
    {
        question: 'Cosa succede se durante i lavori emergono problemi al sottofondo?',
        answer: 'Il posatore documenta subito lo stato anomalo tramite foto sulla chat di cantiere. Il nostro ufficio tecnico interviene tempestivamente, concorda con te l’eventuale lavorazione correttiva (es. autolivellante supplementare o ripristino crepe) e aggiorna il preventivo solo con la tua approvazione scritta.',
    },
    {
        question: 'Quando e come si effettua il pagamento?',
        answer: 'Al momento dell’ordine confermi il preventivo bloccando il materiale e il calendario. Il saldo della manodopera viene liquidato solo dopo la fine del cantiere e l’esito positivo del collaudo congiunto, garantendo la tua totale serenità.',
    },
    {
        question: 'Siete un’impresa, uno studio di architettura o uno showroom? Come funziona per le aziende?',
        answer: 'Per le aziende offriamo accordi di fornitura e posa su commessa: assegnazione di squadre specializzate per cantieri di ogni dimensione, rispetto rigoroso del cronoprogramma, fatturazione elettronica unica B2B e formula "chiavi in mano" per showroom che vogliono offrire la posa ai propri clienti.',
    },
    {
        question: 'I lavori sono coperti da garanzia?',
        answer: 'Sì. Tutti i lavori sono eseguiti a regola d’arte secondo la norma tecnica UNI 11493 per la piastrellatura ceramica. Inoltre sei protetto sia dalla polizza assicurativa del professionista che dalla garanzia e assistenza diretta della piattaforma PosaFacile.',
    },
]

export function HowItWorksPage() {
    useSeo({
        ...STATIC_PAGES.howItWorks,
        jsonLd: [
            faqJsonLd(faq),
            breadcrumbJsonLd([
                { name: 'Home', path: '/' },
                { name: 'Come funziona', path: '/come-funziona' },
            ]),
        ],
    })

    const [activeChapter, setActiveChapter] = useState(0)
    const [openFaq, setOpenFaq] = useState<number | null>(0)
    const stepRefs = useRef<(HTMLElement | null)[]>([])

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
            { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
        )

        nodes.forEach((node) => observer.observe(node))
        return () => observer.disconnect()
    }, [])

    return (
        <div className="pf-home pf-how">
            {/* --- Hero --- */}
            <section className="pf-hero pf-container" aria-labelledby="how-hero-title">
                <div className="pf-hero-copy">
                    <p className="pf-eyebrow">
                        <span className="pf-status-dot" /> DALL’IDEA AL COLLAUDO · IL SERVIZIO POSAFACILE
                    </p>
                    <h1 id="how-hero-title">
                        Pavimenti e posa.
                        <br />
                        Senza stress,
                        <br />
                        <span>senza sorprese.</span>
                    </h1>
                    <p className="pf-hero-description">
                        Materiali di prima scelta consegnati al piano, calcolo dello sfrido al
                        centesimo, maestri posatori verificati e un unico committente responsabile.
                        Ecco come rinnovare casa con serenità assoluta.
                    </p>
                    <div className="pf-hero-actions">
                        <Link className="pf-button pf-button-orange" to="/configuratore">
                            Calcola il tuo preventivo <ArrowUpRight size={19} />
                        </Link>
                        <a className="pf-text-link" href="#come-funziona-dettaglio">
                            Come funziona passo dopo passo <ArrowDown size={16} />
                        </a>
                    </div>
                    <div className="pf-hero-assurances">
                        <span>
                            <Check size={15} /> Zero costi nascosti
                        </span>
                        <span>
                            <Check size={15} /> Posatori con DURC & RC
                        </span>
                        <span>
                            <Check size={15} /> Garanzia norma UNI
                        </span>
                    </div>
                </div>

                <div className="pf-hero-visual pf-how-hero-visual">
                    {/* Anteprima reale di un ordine cliente privato */}
                    <div className="pf-how-hero-card">
                        <header>
                            <span>
                                <span className="pf-status-dot" /> IL TUO PROGETTO
                            </span>
                            <span>PREVENTIVO BLOCCATO</span>
                        </header>
                        <div className="pf-how-project">
                            <div>
                                <small>ZONA GIORNO · RISTRUTTURAZIONE COMPLETA</small>
                                <h3>45 mq Gres Effetto Rovere 20×120</h3>
                                <p>Posa a correre, rimozione vecchio pavimento, massetto autolivellante, fornitura colle Kerakoll e battiscopa.</p>
                            </div>
                            <div className="pf-how-total">
                                <strong>€ 3.150</strong>
                                <small>materiale e posa compresi</small>
                            </div>
                        </div>
                        <div className="pf-how-meta">
                            <div>
                                <span>TEMPO DI POSA</span>
                                <strong>4 giornate</strong>
                            </div>
                            <div>
                                <span>POSATORE</span>
                                <strong>Marco R. (4.9 ★)</strong>
                            </div>
                            <div>
                                <span>MATERIALE</span>
                                <strong>Consegnato al piano</strong>
                            </div>
                        </div>
                        <div className="pf-how-hero-actions">
                            <span>
                                <Check size={16} /> Conferma e blocca le date
                            </span>
                            <span>Dettagli voci</span>
                        </div>
                    </div>

                    <div className="pf-pro-hero-strip">
                        <div>
                            <strong>0 €</strong>
                            <small>costi imprevisti a fine lavori</small>
                        </div>
                        <div>
                            <strong>100%</strong>
                            <small>posatori con DURC e RC cantiere</small>
                        </div>
                        <div>
                            <strong>1 solo</strong>
                            <small>referente per materiale e posa</small>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Strip 4 Pilastri del Servizio --- */}
            <div className="pf-service-strip">
                <div className="pf-container">
                    {[
                        {
                            icon: PackageCheck,
                            title: 'Materiale garantito al piano',
                            text: 'Piastrelle e colle prima dell’avvio',
                        },
                        {
                            icon: Calculator,
                            title: 'Preventivo fisso al centesimo',
                            text: 'Sfrido e manodopera inclusi',
                        },
                        {
                            icon: ShieldCheck,
                            title: 'Posatori qualificati e verificati',
                            text: 'Solo artigiani con DURC e polizza RC',
                        },
                        {
                            icon: Award,
                            title: 'Garanzia a norma UNI 11493',
                            text: 'Collaudo finale e tutela diretta',
                        },
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

            {/* --- Scrollytelling in 5 Fasi --- */}
            <section id="come-funziona-dettaglio" className="pf-section pf-container">
                <div className="pf-section-heading">
                    <div>
                        <p className="pf-eyebrow">DALLA SELEZIONE AL COLLAUDO</p>
                        <h2>
                            Cinque passaggi chiari.
                            <br />
                            Tutto sotto il tuo controllo.
                        </h2>
                    </div>
                    <p>
                        PosaFacile unisce fornitura materiali e manodopera certificata.
                        <br />
                        Nessun passaggio a vuoto, nessun fornitore da rincorrere.
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

                    {/* Colonna sticky destra che cambia con lo scroll */}
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

            {/* --- Confronto: Come funziona di solito vs con PosaFacile --- */}
            <section className="pf-inspiration">
                <div className="pf-container pf-section">
                    <div className="pf-section-heading">
                        <div>
                            <p className="pf-eyebrow">LA DIFFERENZA POSAFACILE</p>
                            <h2>
                                Il solito cantiere?
                                <br />
                                Oppure una scelta senza pensieri.
                            </h2>
                        </div>
                        <p>
                            La ristrutturazione di un pavimento non deve trasformarsi in una trafila.
                            <br />
                            Ecco perché abbiamo ripensato l’intero processo.
                        </p>
                    </div>
                    <div className="pf-compare">
                        <div>
                            <h3>Come funziona di solito</h3>
                            <ul>
                                {[
                                    'Preventivi a voce o su foglietti senza dettaglio dei materiali',
                                    'Devi andare tu al magazzino a caricare centinaia di chili di piastrelle e colla',
                                    'Posatori non assicurati o senza regolarità contributiva DURC',
                                    'Scarico di responsabilità tra rivenditore e posatore se si presentano difetti',
                                    'Prezzi che lievitano a fine cantiere per "imprevisti" mai concordati',
                                    'Acconti ingenti versati prima ancora di vedere un solo lavoro iniziato',
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
                                    'Preventivo bloccato al centesimo con sfrido esatto e manodopera',
                                    'Consegna diretta al piano di piastrelle, colle deformabili e stucchi',
                                    'Solo artigiani qualificati con DURC attivo e polizza RC cantiere',
                                    'Un solo interlocutore e committente responsabile di fornitura e posa',
                                    'Zero costi nascosti: quello che vedi nel configuratore è il saldo finale',
                                    'Pagamento protetto e collaudo finale secondo la norma tecnica UNI 11493',
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

            {/* --- I 3 Pilastri di Garanzia e Qualità --- */}
            <section className="pf-section pf-container">
                <div className="pf-section-heading">
                    <div>
                        <p className="pf-eyebrow">LA NOSTRA TUTELA</p>
                        <h2>
                            Standard elevati.
                            <br />
                            Garanzie scritte.
                        </h2>
                    </div>
                    <p>
                        Non promettiamo miracoli: applichiamo rigorosamente
                        <br />
                        le norme tecniche e le migliori pratiche del settore.
                    </p>
                </div>
                <div className="pf-payout-grid">
                    {[
                        {
                            icon: Scale,
                            title: 'Norma tecnica UNI 11493',
                            text: 'Tutte le pose rispettano la norma nazionale di riferimento: corretta stagionatura dei massetti, giunti di dilatazione e verifica della planarità superficiale.',
                        },
                        {
                            icon: ShieldCheck,
                            title: 'Polizza RC Cantiere',
                            text: 'Ogni artigiano della nostra rete opera con polizza assicurativa per la Responsabilità Civile verso terzi fino a 1.000.000 €, a protezione integrale del tuo immobile.',
                        },
                        {
                            icon: FileCheck2,
                            title: 'Collaudo & Assistenza Diretta',
                            text: 'A fine cantiere compili il collaudo con il posatore. PosaFacile resta al tuo fianco come unico garante contrattuale per qualsiasi segnalazione o dubbio futuro.',
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
                        <strong>Un solo referente legale e operativo.</strong>{' '}
                        Se qualcosa non va come previsto, non c’è nessun rimpallo di colpe tra chi ti
                        ha venduto le piastrelle e chi le ha incollate. PosaFacile è l’unico
                        committente che risponde della conformità di materiale e manodopera.
                    </p>
                </div>
            </section>

            {/* --- SEZIONE IMPRESE & B2B (Dedicata ad Aziende, General Contractor, Showroom) --- */}
            <section id="imprese" className="pf-container">
                <div className="pf-b2b-section">
                    <div className="pf-b2b-heading">
                        <div>
                            <p className="pf-eyebrow" style={{ color: '#fdba74' }}>
                                <span className="pf-status-dot" /> POSAFACILE PER LE AZIENDE & I PROFESSIONISTI
                            </p>
                            <h2>
                                Sei un’impresa, uno studio
                                <br />
                                o uno showroom?
                                <br />
                                <span>Squadre di posa su commessa.</span>
                            </h2>
                        </div>
                        <p>
                            Mettiamo a disposizione di General Contractor, Imprese Edili, Studi di
                            Architettura e Showroom squadre di posatori altamente qualificate, con
                            gestione operativa completa e fatturazione unica.
                        </p>
                    </div>

                    <div className="pf-b2b-grid">
                        {[
                            {
                                icon: Users,
                                title: 'Squadre pronte e scalabili',
                                desc: 'Artigiani specializzati per commesse residenziali e commerciali di ogni metratura, dai grandi formati alle pose a spina.',
                            },
                            {
                                icon: FileCheck2,
                                title: 'Fatturazione unica & DURC',
                                desc: 'Un solo interlocutore B2B: documenti di conformità, POS di cantiere e DURC costantemente aggiornato prima di ogni ingresso.',
                            },
                            {
                                icon: Clock,
                                title: 'Cronoprogramma garantito',
                                desc: 'Date certe di ingresso e rilascio cantiere concordate con la direzione lavori per non rallentare le altre maestranze.',
                            },
                            {
                                icon: Building2,
                                title: 'Formula Showroom chiavi in mano',
                                desc: 'Vendi le piastrelle nel tuo showroom e offri la posa garantita ai tuoi clienti privati: al cantiere ci pensa PosaFacile.',
                            },
                        ].map((item) => {
                            const Icon = item.icon
                            return (
                                <div key={item.title} className="pf-b2b-card">
                                    <div>
                                        <div className="pf-b2b-card-icon">
                                            <Icon size={24} strokeWidth={1.5} />
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="pf-b2b-footer">
                        <div className="pf-b2b-footer-info">
                            <Wrench size={26} />
                            <div>
                                <strong>Hai un cantiere da quotare o vuoi attivare una convenzione B2B?</strong>
                                <p>Inviaci il computo metrico estimativo o contattaci per una quotazione su misura per la tua impresa.</p>
                            </div>
                        </div>
                        <a
                            href="mailto:imprese@posafacile.com?subject=Richiesta%20Informazioni%20Servizio%20Imprese%20PosaFacile"
                            className="pf-button pf-button-orange"
                            style={{ paddingBlock: '12px', minHeight: '48px' }}
                        >
                            Contatta l’ufficio imprese <ArrowUpRight size={18} />
                        </a>
                    </div>
                </div>
            </section>

            {/* --- FAQ --- */}
            <section id="domande-servizio" className="pf-section pf-container pf-faq">
                <div>
                    <p className="pf-eyebrow">DUBBI E CHIARIMENTI</p>
                    <h2>
                        Le domande
                        <br />
                        frequenti sul servizio.
                    </h2>
                    <p>
                        Tutto ciò che serve sapere prima
                        <br />
                        di avviare il tuo preventivo.
                    </p>
                    <Link to="/configuratore" className="pf-text-link">
                        Inizia la configurazione <ArrowUpRight size={18} />
                    </Link>
                </div>
                <div className="pf-faq-list">
                    {faq.map((item, index) => (
                        <div className={openFaq === index ? 'is-open' : ''} key={item.question}>
                            <h3>
                                <button
                                    id={`how-faq-question-${index}`}
                                    aria-expanded={openFaq === index}
                                    aria-controls={`how-faq-answer-${index}`}
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                >
                                    <span>{item.question}</span>
                                    {openFaq === index ? <Minus size={20} /> : <Plus size={20} />}
                                </button>
                            </h3>
                            <div
                                role="region"
                                aria-labelledby={`how-faq-question-${index}`}
                                id={`how-faq-answer-${index}`}
                                hidden={openFaq !== index}
                            >
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- CTA Finale --- */}
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
                    <p className="pf-eyebrow">IL TUO PAVIMENTO IDEALE IN POCHI MINUTI</p>
                    <h2>
                        Pronto a rinnovare casa?
                        <br />
                        Configura il tuo progetto.
                    </h2>
                    <p>Scegli il materiale, scopri il prezzo al centesimo e seleziona il posatore nella tua zona.</p>
                    <Link to="/configuratore" className="pf-button pf-button-dark">
                        Crea il tuo preventivo <ArrowUpRight size={20} />
                    </Link>
                    <span className="pf-final-note">
                        Gratuito. Senza registrazione. Prezzo bloccato.
                    </span>
                </div>
            </section>

            {/* Mobile Sticky Bar */}
            <div className="pf-mobile-cta">
                <span>
                    Pavimenti e posa senza pensieri.
                    <small>Preventivo fisso al centesimo in 2 minuti.</small>
                </span>
                <Link to="/configuratore">
                    Preventivo <ArrowUpRight size={17} />
                </Link>
            </div>
        </div>
    )
}
