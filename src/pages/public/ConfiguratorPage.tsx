import { useEffect } from 'react'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useSearchParams, Link } from 'react-router-dom'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { useUserStore } from '@/store/userStore'
import { Step1ProjectType } from '@/components/configurator/Step1ProjectType'
import { Step2ProductSelect } from '@/components/configurator/Step2ProductSelect'
import { Step3Dimensions } from '@/components/configurator/Step3Dimensions'
import { Step4LayingType } from '@/components/configurator/Step4LayingType'
import { StepVisualizer } from '@/components/configurator/StepVisualizer'
import { Step5Services } from '@/components/configurator/Step5Services'
import { Step6Location } from '@/components/configurator/Step6Location'
import { StepDeliveryAccess } from '@/components/configurator/StepDeliveryAccess'
import { Step7ProfessionalSelect } from '@/components/configurator/Step7ProfessionalSelect'
import { Step8CalendarSelect } from '@/components/configurator/Step8CalendarSelect'
import { Step7Summary as Step10Summary } from '@/components/configurator/Step7Summary'
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Layers,
    Trash2,
    LogIn,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { toast } from 'sonner'
import './home.css'
import './storefront.css'
import { fetchSavedQuotes } from '@/lib/quotesService'
import { useSeo } from '@/hooks/useSeo'
import { STATIC_PAGES } from '@/lib/seo'

// Il flusso è strutturato in 11 passaggi logici:
// 1. Luogo: Indirizzo e provincia
// 2. Accesso e Scarico: Modalità di scarico (bordo strada, box, piano, montacarichi, sosta)
// 3. Professionista: Selezione del posatore locale (senza stima visibile)
// 4. Progetto: Ambiente e tipo di intervento
// 5. Piastrella: Selezione materiale dal catalogo
// 6. Dimensioni: Superfici e sfrido
// 7. Posa: Schema di posa (tariffe posatore + markup)
// 8. Anteprima: Simulazione fotorealistica AI nella stanza dell'utente
// 9. Servizi: Servizi accessori
// 10. Data: Calendario e tempistiche
// 11. Riepilogo: Preventivo dettagliato e invio
const STEPS = [
    { num: 1, label: 'Luogo' },
    { num: 2, label: 'Accesso e Scarico' },
    { num: 3, label: 'Professionista' },
    { num: 4, label: 'Progetto' },
    { num: 5, label: 'Piastrella' },
    { num: 6, label: 'Dimensioni' },
    { num: 7, label: 'Posa' },
    { num: 8, label: 'Anteprima' },
    { num: 9, label: 'Servizi' },
    { num: 10, label: 'Data' },
    { num: 11, label: 'Riepilogo' },
]

export function ConfiguratorPage() {
    useSeo(STATIC_PAGES.configurator)
    useAuthSession()
    const [searchParams] = useSearchParams()
    const {
        currentStep,
        setCurrentStep,
        nextStep,
        prevStep,
        selectedProduct,
        location,
        deliveryAccess,
        projectInfo,
        dimensions,
        layingType,
        selectedProfessional,
        selectedDate,
        getTotal,
        reset,
    } = useConfiguratorStore()
    const { user } = useUserStore()

    // Regola: se abbandoni la pagina preventivo e NON sei loggato, cancella il preventivo.
    // Se sei loggato, la sessione resta salvata in memoria persistente.
    useEffect(() => {
        const handleBeforeUnload = () => {
            const currentUser = useUserStore.getState().user
            if (!currentUser) {
                localStorage.removeItem('posafacile-configurator')
                useConfiguratorStore.getState().reset()
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            const currentUser = useUserStore.getState().user
            const currentPath = window.location.pathname
            const isGoingToAuth =
                currentPath.includes('/login') ||
                currentPath.includes('/register')

            // Se l'utente non è autenticato e lascia la pagina (senza andare al login per autenticarsi), azzera
            if (
                !currentUser &&
                !isGoingToAuth &&
                currentPath !== '/configuratore'
            ) {
                localStorage.removeItem('posafacile-configurator')
                useConfiguratorStore.getState().reset()
            }
        }
    }, [])

    // If coming from product page with product info
    useEffect(() => {
        const productParam = searchParams.get('product')
        if (productParam) {
            try {
                const product = JSON.parse(decodeURIComponent(productParam))
                const store = useConfiguratorStore.getState()
                store.setSelectedProduct(product)
                if (store.currentStep < 2) {
                    store.setCurrentStep(1) // Start at step 1 but product is pre-selected
                }
            } catch (e) {
                console.error('Failed to parse product from URL', e)
            }
        }

        const quoteIdParam = searchParams.get('quote')
        if (quoteIdParam && user?.id) {
            fetchSavedQuotes(user.id).then((quotes) => {
                const found = quotes.find((q) => q.id === quoteIdParam)
                if (found) {
                    useConfiguratorStore.getState().loadFromSavedQuote(found)
                }
            })
        }
    }, [searchParams, user])

    const total = getTotal()

    const canProceed = (() => {
        switch (currentStep) {
            case 1: // Luogo
                return Boolean(
                    location.indirizzo &&
                    location.citta &&
                    location.provincia &&
                    location.cap,
                )
            case 2: // Accesso e Scarico
                return Boolean(deliveryAccess.destination)
            case 3: // Professionista
                return Boolean(selectedProfessional)
            case 4: // Progetto
                return Boolean(projectInfo.ambiente && projectInfo.intervento)
            case 5: // Piastrella
                return Boolean(selectedProduct)
            case 6: // Dimensioni
                return Boolean(
                    dimensions.pavimentoMq > 0 || dimensions.paretiMq > 0,
                )
            case 7: // Posa
                return Boolean(layingType)
            case 8: // Anteprima
                return true
            case 9: // Servizi
                return true
            case 10: // Data
                return Boolean(selectedDate || location.dataPreferita)
            case 11: // Riepilogo
                return true
            default:
                return true
        }
    })()

    const handleNext = () => {
        if (!canProceed) return
        if (currentStep < STEPS.length) {
            nextStep()
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'instant'
                    : 'smooth',
            })
        } else {
            window.dispatchEvent(new CustomEvent('posafacile-submit-quote'))
        }
    }

    const handlePrev = () => {
        if (currentStep > 1) {
            prevStep()
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'instant'
                    : 'smooth',
            })
        }
    }

    const handleJumpToStep = (targetStep: number) => {
        if (targetStep < currentStep) {
            setCurrentStep(targetStep)
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'instant'
                    : 'smooth',
            })
        }
    }

    const handleClearQuote = () => {
        toast('Vuoi ricominciare il preventivo?', {
            description:
                'Le scelte di questa sessione saranno azzerate. I preventivi già salvati restano nella tua area.',
            action: {
                label: 'Ricomincia',
                onClick: () => {
                    reset()
                    window.scrollTo(0, 0)
                },
            },
            cancel: { label: 'Annulla', onClick: () => { } },
            duration: 10000,
        })
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step6Location />
            case 2:
                return <StepDeliveryAccess />
            case 3:
                return <Step7ProfessionalSelect />
            case 4:
                return <Step1ProjectType />
            case 5:
                return <Step2ProductSelect />
            case 6:
                return <Step3Dimensions />
            case 7:
                return <Step4LayingType />
            case 8:
                return <StepVisualizer />
            case 9:
                return <Step5Services />
            case 10:
                return <Step8CalendarSelect />
            case 11:
                return <Step10Summary />
            default:
                return <Step6Location />
        }
    }

    const stepDescriptions = [
        'Partiamo da casa tua.',
        'Accesso al cantiere e consegna dei materiali.',
        'Scegli il tuo professionista.',
        'Che cosa immagini?',
        'La materia del tuo progetto.',
        'Diamo spazio alle tue idee.',
        'Il dettaglio che cambia tutto.',
        'Guarda il risultato nella tua stanza.',
        'A ogni progetto, i suoi servizi.',
        'Troviamo il momento giusto.',
        'Il tuo progetto, in ogni dettaglio.',
    ]
    const formattedTotal = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
    }).format(total)

    return (
        <div className="pf-configurator">
            <Header />
            <main id="main-content" tabIndex={-1}>
                <div className="pf-container pf-config-intro">
                    <nav aria-label="Percorso" className="pf-breadcrumb">
                        <Link to="/">Home</Link>
                        <span>/</span>
                        <span>Il tuo preventivo</span>
                    </nav>
                    <div>
                        <div>
                            <p className="pf-eyebrow">
                                LA TUA IDEA, IL NOSTRO PROSSIMO PROGETTO
                            </p>
                            <h1>
                                Facciamo spazio
                                <br />
                                <span>alla tua nuova casa.</span>
                            </h1>
                        </div>
                        <p>
                            Un passo alla volta, tutte le scelte al posto
                            giusto.
                            <br />
                            Costruiamo insieme il tuo preventivo personalizzato.
                        </p>
                    </div>
                </div>
                <div className="pf-container pf-config-layout">
                    <aside className="pf-config-sidebar">
                        <div className="pf-config-progress">
                            <span>IL TUO PREVENTIVO</span>
                            <span>{currentStep} / {STEPS.length}</span>
                        </div>
                        <nav aria-label="Passaggi del preventivo">
                            <ol>
                                {STEPS.map(({ num, label }) => (
                                    <li key={num}>
                                        <button
                                            aria-current={
                                                currentStep === num
                                                    ? 'step'
                                                    : undefined
                                            }
                                            disabled={num >= currentStep}
                                            onClick={() =>
                                                handleJumpToStep(num)
                                            }
                                            className={
                                                num === currentStep
                                                    ? 'is-current'
                                                    : num < currentStep
                                                        ? 'is-complete'
                                                        : ''
                                            }
                                        >
                                            <span>
                                                {num < currentStep ? (
                                                    <Check size={13} />
                                                ) : (
                                                    String(num).padStart(2, '0')
                                                )}
                                            </span>
                                            {label}
                                            {num === currentStep && (
                                                <span className="pf-step-dot" />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                        <div className="pf-config-sidebar-note">
                            <Layers size={24} strokeWidth={1.4} />
                            <h3>La tua casa, le tue scelte.</h3>
                            <p>
                                Puoi tornare ai passaggi precedenti e rivedere
                                ogni dettaglio prima di confermare.
                            </p>
                        </div>
                    </aside>
                    <div className="pf-config-workspace">
                        <div className="pf-config-form-heading">
                            <div>
                                <p className="pf-eyebrow">
                                    PASSO {String(currentStep).padStart(2, '0')}{' '}
                                    ·{' '}
                                    {STEPS[
                                        currentStep - 1
                                    ]?.label.toUpperCase()}
                                </p>
                                <h2>{stepDescriptions[currentStep - 1]}</h2>
                            </div>
                            <button
                                onClick={handleClearQuote}
                                aria-label="Ricomincia il preventivo"
                                title="Ricomincia il preventivo"
                            >
                                <Trash2 size={17} />
                            </button>
                        </div>
                        <div className="pf-config-session">
                            {user ? (
                                <>
                                    <span>
                                        <Check size={20} /> Le tue scelte
                                        restano memorizzate.
                                    </span>
                                    <Link to="/dashboard?tab=quotes">
                                        I tuoi preventivi →
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <span>
                                        Stai progettando come ospite. Accedi per
                                        conservare le tue scelte quando esci.
                                    </span>
                                    <Link to="/login?redirect=/configuratore">
                                        Accedi per salvare →
                                    </Link>
                                </>
                            )}
                        </div>
                        {selectedProduct && currentStep > 5 && (
                            <div className="pf-config-selected">
                                {selectedProduct.images[0] && (
                                    <img
                                        src={selectedProduct.images[0]}
                                        alt={selectedProduct.name}
                                        width="64"
                                        height="64"
                                    />
                                )}
                                <div>
                                    <small>IL MATERIALE CHE HAI SCELTO</small>
                                    <strong>{selectedProduct.name}</strong>
                                </div>
                                <span>
                                    {new Intl.NumberFormat('it-IT', {
                                        style: 'currency',
                                        currency: 'EUR',
                                    }).format(selectedProduct.price_per_sqm)}
                                    <small> / m²</small>
                                </span>
                            </div>
                        )}
                        <div className="pf-config-step" key={currentStep}>
                            {renderStep()}
                        </div>
                    </div>
                </div>
            </main>
            <div className="pf-config-bottom">
                <div className="pf-container">
                    {currentStep > 1 ? (
                        <button
                            className="pf-config-back"
                            aria-label="Passaggio precedente"
                            onClick={handlePrev}
                        >
                            <ArrowLeft size={17} />
                            <span>Indietro</span>
                        </button>
                    ) : (
                        <Link
                            to="/catalog"
                            className="pf-config-back"
                            aria-label="Torna al catalogo"
                        >
                            <ArrowLeft size={17} />
                            <span>Catalogo</span>
                        </Link>
                    )}
                    <div className="pf-config-bottom-progress">
                        <span>
                            Passo {currentStep} di {STEPS.length}{' '}
                            <strong>{STEPS[currentStep - 1]?.label}</strong>
                        </span>
                        <div
                            role="progressbar"
                            aria-label="Avanzamento del preventivo"
                            aria-valuemin={1}
                            aria-valuemax={STEPS.length}
                            aria-valuenow={currentStep}
                        >
                            <span
                                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                            />
                        </div>
                    </div>
                    {total > 0 && (
                        <div className="pf-config-total">
                            <small>Totale stimato · IVA inclusa</small>
                            <strong>{formattedTotal}</strong>
                        </div>
                    )}
                    <button
                        className="pf-button pf-button-orange"
                        onClick={handleNext}
                        disabled={!canProceed}
                    >
                        {currentStep < STEPS.length ? (
                            <>
                                Continua <ArrowRight size={17} />
                            </>
                        ) : !user ? (
                            <>
                                <LogIn size={17} />
                                <span>Accedi e conferma</span>
                            </>
                        ) : (
                            <>
                                Conferma <Check size={17} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
