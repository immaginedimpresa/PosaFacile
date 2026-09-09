import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ArrowDown,
    ArrowUpRight,
    Check,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    ImagePlus,
    Layers,
    MapPin,
    MessageCircle,
    PackageCheck,
    Ruler,
    Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { useProducts } from '@/hooks/useProducts'
import { InstantEstimator } from '@/components/home/InstantEstimator'
import { HomeFAQ } from '@/components/home/HomeFAQ'
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

export default function HomePage() {
    const [active, setActive] = useState(0)
    const environment = environments[active]

    // Le miniature della hero sono i prodotti reali a catalogo: la scelta
    // fatta qui entra nella prova AI e da li' nel preventivo.
    const { products } = useProducts({ status: 'active', limit: 12 })
    const [tileIndex, setTileIndex] = useState(0)
    const tile = products[tileIndex] ?? null
    const navigate = useNavigate()
    const stripRef = useRef<HTMLDivElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    /** Scorre il carosello di una schermata per volta. */
    const scorriMateriali = (verso: -1 | 1) => {
        const strip = stripRef.current
        if (!strip) return
        strip.scrollBy({
            left: verso * Math.max(strip.clientWidth * 0.8, 160),
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
        })
    }

    /**
     * La foto e' il vero inizio del percorso: si carica qui e viaggia in
     * memoria fino alla pagina di anteprima, insieme al materiale scelto.
     * Niente upload su server finche' l'utente non genera davvero.
     */
    const caricaFoto = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Serve un’immagine: JPG, PNG o HEIC.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La foto supera i 5 MB. Provane una più leggera.')
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            navigate('/prova-ai', {
                state: { photo: reader.result as string, productId: tile?.id ?? null },
            })
        }
        reader.onerror = () => toast.error('Non sono riuscito a leggere la foto. Riprova.')
        reader.readAsDataURL(file)
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
                        <br className="hidden sm:block" /> Materiali e
                        professionisti in un unico posto, con un preventivo
                        costruito intorno a te.
                    </p>
                    <div className="pf-hero-actions">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="pf-visually-hidden"
                            onChange={caricaFoto}
                        />
                        <button
                            type="button"
                            className="pf-button pf-button-orange"
                            onClick={() => fileRef.current?.click()}
                        >
                            <ImagePlus size={19} /> Carica la foto della tua stanza
                        </button>
                        <Link className="pf-text-link" to="/prova-ai">
                            Guarda un esempio <ArrowUpRight size={16} />
                        </Link>
                    </div>
                    <div className="pf-hero-assurances">
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
                    <div className="pf-hero-photo">
                        {environments.map((item, index) => (
                            <img
                                key={item.image}
                                src={item.image}
                                alt={item.alt}
                                className={active === index ? 'is-active' : ''}
                                fetchPriority={index === 0 ? 'high' : 'auto'}
                                loading={index === 0 ? 'eager' : 'lazy'}
                                aria-hidden={active !== index}
                                width="1600"
                                height="1200"
                            />
                        ))}
                        <div className="pf-photo-top">
                            <span>
                                <Sparkles size={14} /> LA TUA PROSSIMA
                                ISPIRAZIONE
                            </span>
                            <span>{environment.number} / 03</span>
                        </div>
                        <div className="pf-photo-caption" aria-live="polite">
                            <span>SPAZI DA IMMAGINARE</span>
                            <h2>{environment.name}</h2>
                            <p>{environment.detail}</p>
                        </div>
                        <div className="pf-photo-arrows">
                            <button
                                aria-label="Ambiente precedente"
                                onClick={() => setActive((active + 2) % 3)}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                aria-label="Ambiente successivo"
                                onClick={() => setActive((active + 1) % 3)}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                    {products.length > 0 && (
                        <div className="pf-tile-picker">
                            <span className="pf-tile-picker-label">
                                1. Scegli il materiale
                                <br />
                                <strong>2. Carica la tua foto</strong>
                            </span>
                            <button
                                type="button"
                                className="pf-tile-arrow"
                                aria-label="Materiali precedenti"
                                onClick={() => scorriMateriali(-1)}
                            >
                                <ChevronLeft size={17} />
                            </button>
                            <div className="pf-tile-thumbs" ref={stripRef}>
                                {products.map((product, index) => {
                                    const img = ((product.images as string[]) || [])[0]
                                    const attiva = tileIndex === index
                                    return (
                                        <button
                                            key={product.id}
                                            type="button"
                                            title={product.name}
                                            aria-label={product.name}
                                            aria-pressed={attiva}
                                            className={`pf-tile-thumb ${attiva ? 'is-selected' : ''}`}
                                            onClick={() => setTileIndex(index)}
                                        >
                                            {img && <img src={img} alt="" loading="lazy" />}
                                            {attiva && (
                                                <span className="pf-tile-check">
                                                    <Check size={13} />
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                            <button
                                type="button"
                                className="pf-tile-arrow"
                                aria-label="Materiali successivi"
                                onClick={() => scorriMateriali(1)}
                            >
                                <ChevronRight size={17} />
                            </button>
                            {tile && (
                                <button
                                    type="button"
                                    className="pf-tile-current"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <strong>{tile.name}</strong>
                                    <small>
                                        € {Number(tile.price_per_sqm).toFixed(2)}/mq · Provala ora
                                    </small>
                                </button>
                            )}
                        </div>
                    )}
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
                        <p className="pf-eyebrow">MENO PENSIERI, PIÙ CASA</p>
                        <h2>
                            Un bel risultato.
                            <br />
                            Un percorso semplice.
                        </h2>
                    </div>
                    <p>
                        Materiali, preventivo e posa: finalmente insieme.
                        <br />
                        Ogni scelta al posto giusto, dall’inizio alla fine.
                    </p>
                </div>
                <div className="pf-steps">
                    {[
                        {
                            number: '01',
                            icon: Layers,
                            title: 'Trova il tuo pavimento',
                            text: 'Esplora il catalogo e scegli il materiale che dà carattere ai tuoi spazi.',
                            link: '/catalog',
                            action: 'Esplora il catalogo',
                        },
                        {
                            number: '02',
                            icon: ClipboardList,
                            title: 'Dai forma al progetto',
                            text: 'Indica zona, superficie e servizi. Scopri le singole voci del tuo preventivo.',
                            link: '/configuratore',
                            action: 'Crea il preventivo',
                        },
                        {
                            number: '03',
                            icon: PackageCheck,
                            title: 'Facciamo spazio al nuovo',
                            text: 'Scegli il professionista e la data disponibile, poi segui il lavoro dalla tua area.',
                            link: '/configuratore',
                            action: 'Calcola il preventivo',
                        },
                    ].map(
                        ({ number, icon: Icon, title, text, link, action }) => (
                            <article key={number} className="pf-step">
                                <div className="pf-step-top">
                                    <span>{number}</span>
                                    <Icon size={28} strokeWidth={1.4} />
                                </div>
                                <h3>{title}</h3>
                                <p>{text}</p>
                                <Link to={link}>
                                    {action}
                                    <ArrowUpRight size={17} />
                                </Link>
                            </article>
                        ),
                    )}
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
