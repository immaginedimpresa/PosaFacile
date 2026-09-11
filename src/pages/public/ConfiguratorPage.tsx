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
// 2. Professionista: Selezione del posatore locale (senza stima visibile)
// 3. Progetto: Ambiente e tipo di intervento
// 4. Piastrella: Selezione materiale dal catalogo
// 5. Dimensioni: Superfici e sfrido
// 6. Posa: Schema di posa (tariffe posatore + markup)
// 7. Anteprima: Simulazione fotorealistica AI nella stanza dell'utente
// 8. Servizi: Servizi accessori
// 9. Accesso e Scarico: Modalità di scarico (bordo strada, box, piano, montacarichi, sosta).
//    Sta qui perché il facchinaggio del posatore si calcola sui suoi prezzi e sui mq.
// 10. Data: Calendario e tempistiche
// 11. Riepilogo: Preventivo dettagliato e invio
const STEPS = [
    { num: 1, label: 'Luogo' },
    { num: 2, label: 'Professionista' },
    { num: 3, label: 'Progetto' },
    { num: 4, label: 'Piastrella' },
    { num: 5, label: 'Dimensioni' },
    { num: 6, label: 'Posa' },
    { num: 7, label: 'Anteprima' },
    { num: 8, label: 'Servizi' },
    { num: 9, label: 'Accesso e Scarico' },
    { num: 10, label: 'Data' },
    { num: 11, label: 'Riepilogo' },
]

/** Il passo Accesso e Scarico, diviso in quattro sottopassi. */
const DELIVERY_STEP = 9
/** Il passo in cui si sceglie la piastrella: da lì in poi la si mostra in testata. */
const PRODUCT_STEP = 4

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
        deliverySubStep,
        setDeliverySubStep,
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
                    location.indirizzo?.trim() &&
                    location.civico?.trim() &&
                    location.citta?.trim() &&
                    location.provincia?.trim() &&
                    location.cap?.trim(),
                )
            case 2: // Professionista
                return Boolean(selectedProfessional)
            case DELIVERY_STEP: { // Accesso e Scarico
                if (!deliveryAccess.destination) return false
                // Le note di avviso vanno confermate con la spunta, nel sottopasso in cui compaiono.
                const leftAtGround = deliveryAccess.destination !== 'floor'
                if (deliverySubStep === 1 && leftAtGround) {
                    return Boolean(deliveryAccess.groundUnloadAcknowledged)
                }
                if (
                    deliverySubStep === 3 &&
                    leftAtGround &&
                    deliveryAccess.floorType === 'upper' &&
                    deliveryAccess.handlingBy === 'client'
                ) {
                    return Boolean(deliveryAccess.carryUpAcknowledged)
                }
                return true
            }
            case 3: // Progetto
                return Boolean(projectInfo.ambiente && projectInfo.intervento)
            case PRODUCT_STEP: // Piastrella
                return Boolean(selectedProduct)
            case 5: // Dimensioni
                return Boolean(
                    dimensions.pavimentoMq > 0 || dimensions.paretiMq > 0,
                )
            case 6: // Posa
                return Boolean(layingType)
            case 7: // Anteprima
                return true
            case 8: // Servizi
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
        if (currentStep === DELIVERY_STEP && deliverySubStep < 4) {
            setDeliverySubStep(deliverySubStep + 1)
            const stepEl = document.querySelector('.pf-config-step')
            if (stepEl) {
                stepEl.scrollTo({ top: 0, behavior: 'smooth' })
            }
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'instant'
                    : 'smooth',
            })
            return
        }
        if (currentStep < STEPS.length) {
            nextStep()
            const stepEl = document.querySelector('.pf-config-step')
            if (stepEl) {
                stepEl.scrollTo({ top: 0, behavior: 'smooth' })
            }
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
        if (currentStep === DELIVERY_STEP && deliverySubStep > 1) {
            setDeliverySubStep(deliverySubStep - 1)
            const stepEl = document.querySelector('.pf-config-step')
            if (stepEl) {
                stepEl.scrollTo({ top: 0, behavior: 'smooth' })
            }
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'instant'
                    : 'smooth',
            })
            return
        }
        if (currentStep > 1) {
            prevStep()
            const stepEl = document.querySelector('.pf-config-step')
            if (stepEl) {
                stepEl.scrollTo({ top: 0, behavior: 'smooth' })
            }
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
                return <Step7ProfessionalSelect />
            case 3:
                return <Step1ProjectType />
            case PRODUCT_STEP:
                return <Step2ProductSelect />
            case 5:
                return <Step3Dimensions />
            case 6:
                return <Step4LayingType />
            case 7:
                return <StepVisualizer />
            case 8:
                return <Step5Services />
            case DELIVERY_STEP:
                return <StepDeliveryAccess />
            case 10:
                return <Step8CalendarSelect />
            case 11:
                return <Step10Summary />
            default:
                return <Step6Location />
        }
    }

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
                            <h1>
                                Facciamo spazio
                                <br />
                                <span>al tuo nuovo rivestimento.</span>
                            </h1>
                        </div>
                        <div className="pf-config-intro-actions">
                            {user ? (
                                <div className="pf-intro-user-pill">
                                    <span className="pf-intro-user-status">
                                        <Check size={14} className="text-emerald-600" />
                                        <span>Salvato</span>
                                    </span>
                                    <Link to="/dashboard?tab=quotes" className="pf-intro-user-link">
                                        I tuoi preventivi →
                                    </Link>
                                </div>
                            ) : (
                                <Link to="/login?redirect=/configuratore" className="pf-intro-auth-pill">
                                    <LogIn size={15} />
                                    <span>Accedi per salvare</span>
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handleClearQuote}
                                aria-label="Ricomincia il preventivo"
                                title="Ricomincia il preventivo"
                                className="pf-intro-trash-btn"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
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
                    </aside>
                    <div className="pf-config-workspace">
                        <div className="pf-config-form-heading">
                            <h2>
                                {currentStep} - {STEPS[currentStep - 1]?.label}
                            </h2>
                        </div>
                        {selectedProduct && currentStep > PRODUCT_STEP && (
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

                        {/* Footer con pulsanti Indietro e Avanti FISSI rispetto a pf-config-workspace */}
                        <div className="pf-config-workspace-footer">
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    className="pf-config-back"
                                    aria-label="Passaggio precedente"
                                    onClick={handlePrev}
                                >
                                    <ArrowLeft size={16} />
                                    <span>Indietro</span>
                                </button>
                            ) : (
                                <Link
                                    to="/catalog"
                                    className="pf-config-back"
                                    aria-label="Torna al catalogo"
                                >
                                    <ArrowLeft size={16} />
                                    <span>Catalogo</span>
                                </Link>
                            )}

                            <div className="pf-config-workspace-footer-center">
                                {currentStep === DELIVERY_STEP ? (
                                    <div className="pf-config-workspace-phase-badge">
                                        <span>Fase <strong>{deliverySubStep}</strong> di 4</span>
                                        <span className="text-stone-300">·</span>
                                        <span className="font-semibold text-orange-600">
                                            {deliverySubStep === 1 && 'Scarico'}
                                            {deliverySubStep === 2 && 'Piano'}
                                            {deliverySubStep === 3 && 'Movimentazione'}
                                            {deliverySubStep === 4 && 'Sosta e note'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="pf-config-workspace-step-badge">
                                        <span>Passo <strong>{currentStep}</strong> di {STEPS.length}</span>
                                    </div>
                                )}
                                {total > 0 && (
                                    <div className="pf-config-workspace-total">
                                        <small>Totale stimato (IVA incl.):</small>
                                        <strong>{formattedTotal}</strong>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                className="pf-button pf-button-orange"
                                onClick={handleNext}
                                disabled={!canProceed}
                            >
                                {currentStep === DELIVERY_STEP && deliverySubStep < 4 ? (
                                    <>
                                        <span>Avanti</span>
                                        <ArrowRight size={16} />
                                    </>
                                ) : currentStep < STEPS.length ? (
                                    <>
                                        <span>Continua</span>
                                        <ArrowRight size={16} />
                                    </>
                                ) : !user ? (
                                    <>
                                        <LogIn size={16} />
                                        <span>Accedi e conferma</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Conferma</span>
                                        <Check size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
