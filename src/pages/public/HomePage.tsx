import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowDown,
    ArrowUpRight,
    Award,
    Building2,
    Calculator,
    Check,
    CheckCheck,
    ChevronDown,
    ChevronUp,
    Layers,
    MapPin,
    MessageCircle,
    PackageCheck,
    Ruler,
    Sparkles,
    Truck,
} from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { InstantEstimator } from '@/components/home/InstantEstimator'
import { HeroTileStudio } from '@/components/home/HeroTileStudio'
import { HomeFAQ, HOME_FAQ } from '@/components/home/HomeFAQ'
import { useSeo } from '@/hooks/useSeo'
import {
    STATIC_PAGES,
    faqJsonLd,
    organizationJsonLd,
    serviceJsonLd,
    websiteJsonLd,
} from '@/lib/seo'
import './home.css'

const environments = [
    {
        name: 'Naturale, come te.',
        mood: 'Caldo & naturale',
        image: '/images/living-naturale.jpg',
        alt: 'Soggiorno luminoso con pavimento effetto legno, poltrone chiare e dettagli naturali',
        swatch: 'wood',
        detail: 'Toni caldi. Texture da vivere.',
        number: '01',
    },
    {
        name: 'Spazio all’essenziale.',
        mood: 'Minimal & contemporaneo',
        image: '/images/living-contemporaneo.jpg',
        alt: 'Interno contemporaneo con superfici neutre e arredi essenziali',
        swatch: 'stone',
        detail: 'Linee pulite. Nuove prospettive.',
        number: '02',
    },
    {
        name: 'Il tuo lato elegante.',
        mood: 'Morbido & sofisticato',
        image: '/images/living-elegante.jpg',
        alt: 'Living elegante con divano chiaro, materiali caldi e luce naturale',
        swatch: 'marble',
        detail: 'Luce, materia e carattere.',
        number: '03',
    },
]

const HOME_SEO = {
    ...STATIC_PAGES.home,
    jsonLd: [
        organizationJsonLd(),
        websiteJsonLd(),
        serviceJsonLd(),
        faqJsonLd(HOME_FAQ.map((q) => ({ question: q.question, answer: q.answer }))),
    ],
}

export default function HomePage() {
    useSeo(HOME_SEO)

    // Le miniature della hero sono i prodotti reali a catalogo: la scelta
    // fatta qui entra nella prova AI e da li' nel preventivo.
    const { products } = useProducts({ status: 'active', limit: 12 })
    const [tileIndex, setTileIndex] = useState(0)
    const tile = products[tileIndex] ?? null
    // Foto e risultato vivono nella home: il pannello laterale cambia la
    // piastrella senza far ricaricare la foto.
    const [photo, setPhoto] = useState<string | null>(null)
    const [aiResult, setAiResult] = useState<string | null>(null)
    const sliderRef = useRef<HTMLDivElement>(null)

    const scorriVerticale = (delta: -1 | 1) => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({
                top: delta * 82,
                behavior: 'smooth',
            })
        }
    }

    const selezionaPiastrella = (index: number) => {
        setTileIndex(index)
        setAiResult(null)
    }

    return (
        <div className="pf-home">
            <section
                className="pf-hero pf-container"
                aria-labelledby="hero-title"
            >
                <div className="pf-hero-copy">
                    <p className="pf-eyebrow">
                        <span className="pf-status-dot" /> DALL’IDEA ALL’ULTIMA
                        PIASTRELLA
                    </p>
                    <h1 id="hero-title">
                        Casa tua.
                        <br />
                        Un nuovo
                        <br />
                        <span>punto di vista.</span>
                    </h1>
                    <p className="pf-hero-description">
                        Il pavimento che immagini, la posa che ti serve.
                        <br className="hidden sm:block" /> Fotografa la stanza con lo smartphone,
                        prova i materiali con l'AI e ricevi un preventivo completo di posatori verificati.
                    </p>
                    <div className="pf-hero-actions">
                        <Link className="pf-button pf-button-orange" to="/configuratore">
                            Calcola il tuo preventivo <ArrowUpRight size={19} />
                        </Link>
                        <a className="pf-text-link" href="#come-funziona">
                            Come funziona <ArrowDown size={16} />
                        </a>
                    </div>
                    <div className="pf-hero-assurances">
                        <span>
                            <Check size={15} /> Foto dal tuo smartphone
                        </span>
                        <span>
                            <Check size={15} /> Pavimento o parete
                        </span>
                        <span>
                            <Check size={15} /> Gratis e senza registrarti
                        </span>
                    </div>
                    <a href="#come-funziona" className="pf-hero-note">
                        <span className="pf-note-icon">
                            <Layers size={21} />
                        </span>
                        <span>
                            Tu scegli come viverla.
                            <br />
                            <strong>Noi ti aiutiamo a realizzarla.</strong>
                        </span>
                        <ArrowDown size={17} />
                    </a>
                </div>
                <div className="pf-hero-visual">
                    {/* Visual Hero: Slider Piastrelle + Mockup Smartphone e Barra Controlli Inferiore */}
                    <HeroTileStudio
                        tile={tile}
                        photo={photo}
                        onPhotoChange={setPhoto}
                        result={aiResult}
                        onResultChange={setAiResult}
                        tileSlider={
                            products.length > 0 ? (
                                <aside className="pf-tile-vslider" aria-label="Scegli la finitura">
                                    <div className="pf-tile-vslider-head">
                                        <div className="pf-tile-vslider-badge-wrap">
                                            <span className="pf-step-badge">1. Scegli materiale</span>
                                            <span className="pf-tile-vslider-pos">
                                                <strong>{tileIndex + 1}</strong>/{products.length}
                                            </span>
                                        </div>
                                        <div className="pf-tile-vslider-nav">
                                            <button
                                                type="button"
                                                className="pf-vslider-nav-btn"
                                                onClick={() => scorriVerticale(-1)}
                                                title="Scorri su"
                                                aria-label="Scorri su"
                                            >
                                                <ChevronUp size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="pf-vslider-nav-btn"
                                                onClick={() => scorriVerticale(1)}
                                                title="Scorri giù"
                                                aria-label="Scorri giù"
                                            >
                                                <ChevronDown size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista a scorrimento verticale (1 piastrella per riga) */}
                                    <div
                                        className="pf-tile-vslider-list"
                                        ref={sliderRef}
                                        role="listbox"
                                        aria-label="Seleziona piastrella"
                                    >
                                        {products.map((product, index) => {
                                            const img = ((product.images as string[]) || [])[0]
                                            const attiva = tileIndex === index
                                            const formatText =
                                                product.format_width && product.format_height
                                                    ? `${Math.round(product.format_width / 10)}×${Math.round(product.format_height / 10)} cm`
                                                    : product.material
                                                      ? `${product.material}`
                                                      : 'Gres porcellanato'

                                            return (
                                                <button
                                                    key={product.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={attiva}
                                                    className={`pf-tile-vrow ${attiva ? 'is-active' : ''}`}
                                                    onClick={() => selezionaPiastrella(index)}
                                                    title={`${product.name} - € ${Number(product.price_per_sqm).toFixed(2)}/mq`}
                                                >
                                                    <div className="pf-tile-vrow-thumb">
                                                        {img && <img src={img} alt="" loading="lazy" />}
                                                        {attiva && (
                                                            <span className="pf-tile-vrow-badge">
                                                                <Check size={13} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="pf-tile-vrow-body">
                                                        <strong className="pf-tile-vrow-name">
                                                            {product.name}
                                                        </strong>
                                                        <span className="pf-tile-vrow-dim">
                                                            {formatText}
                                                        </span>
                                                        <span className="pf-tile-vrow-price">
                                                            € {Number(product.price_per_sqm).toFixed(2)}
                                                            <small>/mq</small>
                                                        </span>
                                                    </div>
                                                    <div className="pf-tile-vrow-status" aria-hidden="true">
                                                        <span
                                                            className={`pf-vrow-radio ${attiva ? 'is-checked' : ''}`}
                                                        />
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </aside>
                            ) : null
                        }
                    />
                </div>
            </section>
            <div className="pf-service-strip">
                <div className="pf-container">
                    {[
                        {
                            icon: Layers,
                            title: 'Materiali da scegliere',
                            text: 'Il tuo stile, dal catalogo',
                        },
                        {
                            icon: Ruler,
                            title: 'Costi da capire',
                            text: 'Un preventivo, voce per voce',
                        },
                        {
                            icon: MapPin,
                            title: 'Posatori da conoscere',
                            text: 'Professionisti nella tua zona',
                        },
                        {
                            icon: PackageCheck,
                            title: 'Un progetto da seguire',
                            text: 'Tutto nella tua area personale',
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
            <section id="come-funziona" className="pf-section pf-container">
                <div className="pf-section-heading">
                    <div>
                        <p className="pf-eyebrow">
                            <span className="pf-status-dot" /> IL SERVIZIO POSAFACILE
                        </p>
                        <h2>
                            Materiali, preventivo e posa.
                            <br />
                            In un unico posto, senza sorprese.
                        </h2>
                    </div>
                    <div>
                        <p>
                            Dalla scelta della piastrella al collaudo finale: gestiamo la fornitura
                            al piano, ti assegniamo posatori verificati e blocchiamo il prezzo al centesimo.
                        </p>
                        <Link className="pf-text-link mt-3" to="/come-funziona">
                            Scopri come funziona nel dettaglio <ArrowUpRight size={17} />
                        </Link>
                    </div>
                </div>
                <div className="pf-steps-4">
                    {[
                        {
                            number: '01',
                            icon: Sparkles,
                            title: 'Configura & Visualizza',
                            text: 'Scegli le piastrelle dal catalogo, calcola le metrature e guarda il risultato sulla tua stanza con l’anteprima AI o i campioni a casa.',
                            link: '/catalog',
                            action: 'Esplora i materiali',
                        },
                        {
                            number: '02',
                            icon: Calculator,
                            title: 'Preventivo Trasparente',
                            text: 'Prezzo bloccato al centesimo: materiale, sfrido geometrico esatto, colle H40 e manodopera inclusi voce per voce.',
                            link: '/configuratore',
                            action: 'Crea il preventivo',
                        },
                        {
                            number: '03',
                            icon: Truck,
                            title: 'Consegna al Piano',
                            text: 'Ricevi piastrelle, collanti e accessori direttamente al piano prima dell’avvio cantiere. Nessun magazzino da visitare.',
                            link: '/come-funziona',
                            action: 'Dettagli fornitura',
                        },
                        {
                            number: '04',
                            icon: Award,
                            title: 'Posa Certificata & Collaudo',
                            text: 'Posatori qualificati con DURC e assicurazione RC. Segui i lavori dall’area personale e collaudi a norma UNI 11493.',
                            link: '/come-funziona',
                            action: 'Garanzia e tutela',
                        },
                    ].map(
                        ({ number, icon: Icon, title, text, link, action }) => (
                            <article key={number} className="pf-step">
                                <div className="pf-step-top">
                                    <span>{number}</span>
                                    <Icon size={26} strokeWidth={1.5} />
                                </div>
                                <h3>{title}</h3>
                                <p>{text}</p>
                                <Link to={link}>
                                    {action}
                                    <ArrowUpRight size={16} />
                                </Link>
                            </article>
                        ),
                    )}
                </div>

                {/* Callout dedicato alle Imprese e ai Professionisti B2B */}
                <div className="pf-b2b-callout">
                    <div className="pf-b2b-callout-content">
                        <div className="pf-b2b-callout-icon">
                            <Building2 size={22} />
                        </div>
                        <div className="pf-b2b-callout-text">
                            <strong>Sei un’impresa edile, uno studio di progettazione o uno showroom?</strong>
                            <p>Mettiamo a disposizione squadre di posa su commessa, fatturazione unica B2B e rispetto dei cronoprogrammi.</p>
                        </div>
                    </div>
                    <Link
                        to="/come-funziona#imprese"
                        className="pf-text-link"
                        style={{ fontWeight: 700, color: '#1c1917', flexShrink: 0 }}
                    >
                        Vantaggi per le aziende <ArrowUpRight size={17} />
                    </Link>
                </div>
            </section>
            <section id="ispirazioni" className="pf-inspiration">
                <div className="pf-container pf-section">
                    <div className="pf-section-heading">
                        <div>
                            <p className="pf-eyebrow">
                                IL PROSSIMO PASSO PARTE DA UN’IDEA
                            </p>
                            <h2>
                                Spazi diversi.
                                <br />
                                La stessa voglia di casa.
                            </h2>
                        </div>
                        <Link className="pf-text-link" to="/catalog">
                            Scopri tutti i materiali <ArrowUpRight size={19} />
                        </Link>
                    </div>
                    <div className="pf-inspiration-grid">
                        {environments.map((item, index) => (
                            <Link
                                to="/catalog"
                                key={item.name}
                                className="pf-inspiration-card"
                            >
                                <div>
                                    <img
                                        src={item.image}
                                        alt={item.alt}
                                        loading="lazy"
                                        width="800"
                                        height="1000"
                                    />
                                    <span className="pf-image-tag">
                                        ISPIRAZIONE {item.number}
                                    </span>
                                    <span className="pf-round-arrow">
                                        <ArrowUpRight size={23} />
                                    </span>
                                </div>
                                <p>
                                    {
                                        [
                                            'IL CALORE DI OGNI GIORNO',
                                            'L’EQUILIBRIO DELLE FORME',
                                            'DETTAGLI CHE FANNO CASA',
                                        ][index]
                                    }
                                </p>
                                <h3>{item.mood}</h3>
                            </Link>
                        ))}
                    </div>
                    <p className="pf-image-disclaimer">
                        Ambienti di ispirazione. Scopri materiali e
                        disponibilità nel catalogo.
                    </p>
                </div>
            </section>
            <InstantEstimator />
            <section className="pf-project-section">
                <div className="pf-container pf-project-grid">
                    <div className="pf-project-copy">
                        <p className="pf-eyebrow">DAL PREVENTIVO ALLA POSA</p>
                        <h2>
                            Il progetto avanza.
                            <br />
                            Tu hai tutto
                            <br />
                            <span>sotto controllo.</span>
                        </h2>
                        <p>
                            Le informazioni che contano, in un unico spazio.
                            Ritrova i preventivi, consulta gli aggiornamenti e
                            resta in contatto con il tuo professionista.
                        </p>
                        <ul>
                            <li>
                                <CheckCheck size={20} /> Preventivi salvati e
                                dettagli dell’ordine
                            </li>
                            <li>
                                <CheckCheck size={20} /> Date e avanzamento dei
                                lavori
                            </li>
                            <li>
                                <CheckCheck size={20} /> Chat e foto del tuo
                                progetto
                            </li>
                        </ul>
                        <Link
                            to="/register"
                            className="pf-button pf-button-light"
                        >
                            Crea la tua area personale{' '}
                            <ArrowUpRight size={18} />
                        </Link>
                    </div>
                    <div className="pf-project-preview">
                        <div className="pf-preview-header">
                            <span>
                                <span className="pf-status-dot" /> IL TUO SPAZIO
                                PERSONALE
                            </span>
                            <span>Anteprima</span>
                        </div>
                        <div className="pf-preview-title">
                            <div>
                                <small>PROGETTO CASA</small>
                                <h3>Il tuo nuovo soggiorno</h3>
                            </div>
                            <span className="pf-preview-icon">
                                <Layers size={25} />
                            </span>
                        </div>
                        <div className="pf-preview-image">
                            <img
                                src="/images/living-naturale.jpg"
                                alt="Esempio di ambiente associato a un progetto"
                                loading="lazy"
                                width="800"
                                height="400"
                            />
                            <span>Ogni dettaglio, al suo posto.</span>
                        </div>
                        <ol className="pf-timeline">
                            <li className="is-complete">
                                <span>
                                    <Check size={14} />
                                </span>
                                <div>
                                    <strong>Il progetto prende forma</strong>
                                    <small>
                                        Materiali e servizi riepilogati
                                    </small>
                                </div>
                                <Check size={16} />
                            </li>
                            <li className="is-current">
                                <span>2</span>
                                <div>
                                    <strong>Prepariamo la posa</strong>
                                    <small>
                                        Professionista e calendario del lavoro
                                    </small>
                                </div>
                            </li>
                            <li>
                                <span>3</span>
                                <div>
                                    <strong>È il momento di viverlo</strong>
                                    <small>Avanzamento e completamento</small>
                                </div>
                            </li>
                        </ol>
                        <div className="pf-preview-message">
                            <MessageCircle size={19} />
                            <span>
                                Un filo diretto con chi realizza il tuo
                                progetto.
                            </span>
                        </div>
                    </div>
                </div>
            </section>
            <HomeFAQ />
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
                    <p className="pf-eyebrow">
                        LE BELLE IDEE MERITANO IL PRIMO PASSO
                    </p>
                    <h2>
                        Il prossimo cambiamento?
                        <br />
                        Comincia da casa tua.
                    </h2>
                    <p>
                        Raccontaci il tuo progetto. Al resto diamo forma
                        insieme.
                    </p>
                    <Link
                        to="/configuratore"
                        className="pf-button pf-button-dark"
                    >
                        Calcola il tuo preventivo <ArrowUpRight size={20} />
                    </Link>
                    <span className="pf-final-note">
                        Gratuito. Personalizzato. Senza impegno.
                    </span>
                </div>
            </section>
            <div className="pf-mobile-cta">
                <span>
                    Una nuova idea di casa.
                    <small>Il tuo preventivo, senza impegno.</small>
                </span>
                <Link to="/configuratore">
                    Preventivo <ArrowUpRight size={17} />
                </Link>
            </div>
        </div>
    )
}
