import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { useUserStore } from '@/store/userStore'
import { Step1ProjectType } from '@/components/configurator/Step1ProjectType'
import { Step2ProductSelect } from '@/components/configurator/Step2ProductSelect'
import { Step3Dimensions } from '@/components/configurator/Step3Dimensions'
import { Step4LayingType } from '@/components/configurator/Step4LayingType'
import { Step5Services } from '@/components/configurator/Step5Services'
import { Step6Location } from '@/components/configurator/Step6Location'
import { Step7ProfessionalSelect } from '@/components/configurator/Step7ProfessionalSelect'
import { Step8CalendarSelect } from '@/components/configurator/Step8CalendarSelect'
import { Step7Summary as Step9Summary } from '@/components/configurator/Step7Summary'
import { ArrowLeft, ArrowRight, Check, ShieldCheck, AlertCircle, Trash2, LogIn } from 'lucide-react'
import { fetchSavedQuotes } from '@/lib/quotesService'

// Il luogo viene chiesto per primo: conoscendo la provincia si può usare la
// tariffa del professionista che copre quella zona invece di una stima generica.
const STEPS = [
    { num: 1, label: 'Luogo' },
    { num: 2, label: 'Progetto' },
    { num: 3, label: 'Piastrella' },
    { num: 4, label: 'Dimensioni' },
    { num: 5, label: 'Posa' },
    { num: 6, label: 'Servizi' },
    { num: 7, label: 'Professionista' },
    { num: 8, label: 'Data' },
    { num: 9, label: 'Riepilogo' },
]

export function ConfiguratorPage() {
    const [searchParams] = useSearchParams()
    const {
        currentStep,
        setCurrentStep,
        nextStep,
        prevStep,
        setSelectedProduct,
        selectedProduct,
        location,
        projectInfo,
        dimensions,
        layingType,
        selectedProfessional,
        selectedDate,
        getTotal,
        reset
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
            const isGoingToAuth = currentPath.includes('/login') || currentPath.includes('/register')

            // Se l'utente non è autenticato e lascia la pagina (senza andare al login per autenticarsi), azzera
            if (!currentUser && !isGoingToAuth) {
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
                setSelectedProduct(product)
                if (currentStep < 2) {
                    setCurrentStep(1) // Start at step 1 but product is pre-selected
                }
            } catch (e) {
                console.error('Failed to parse product from URL', e)
            }
        }

        const quoteIdParam = searchParams.get('quote')
        if (quoteIdParam && user?.id) {
            fetchSavedQuotes(user.id).then(quotes => {
                const found = quotes.find(q => q.id === quoteIdParam)
                if (found) {
                    useConfiguratorStore.getState().loadFromSavedQuote(found)
                }
            })
        }
    }, [searchParams, user])

    const total = getTotal()

    const canProceed = (() => {
        switch (currentStep) {
            case 1:
                return Boolean(location.indirizzo && location.citta && location.provincia && location.cap)
            case 2:
                return Boolean(projectInfo.ambiente && projectInfo.intervento)
            case 3:
                return Boolean(selectedProduct)
            case 4:
                return Boolean(dimensions.pavimentoMq > 0 || dimensions.paretiMq > 0)
            case 5:
                return Boolean(layingType)
            case 6:
                return true
            case 7:
                return Boolean(selectedProfessional)
            case 8:
                return Boolean(selectedDate || location.dataPreferita)
            case 9:
                return true
            default:
                return true
        }
    })()

    const handleNext = () => {
        if (!canProceed) return
        if (currentStep < 9) {
            nextStep()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            window.dispatchEvent(new CustomEvent('posafacile-submit-quote'))
        }
    }

    const handlePrev = () => {
        if (currentStep > 1) {
            prevStep()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleJumpToStep = (targetStep: number) => {
        if (targetStep < currentStep) {
            setCurrentStep(targetStep)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleClearQuote = () => {
        if (window.confirm('Vuoi davvero azzerare tutte le scelte del preventivo?')) {
            localStorage.removeItem('posafacile-configurator')
            reset()
        }
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <Step6Location />
            case 2: return <Step1ProjectType />
            case 3: return <Step2ProductSelect />
            case 4: return <Step3Dimensions />
            case 5: return <Step4LayingType />
            case 6: return <Step5Services />
            case 7: return <Step7ProfessionalSelect />
            case 8: return <Step8CalendarSelect />
            case 9: return <Step9Summary />
            default: return <Step6Location />
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
                <div className="container mx-auto px-4 py-3.5">
                    <div className="flex items-center justify-between">
                        <Link to="/catalog" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-medium">Torna al catalogo</span>
                        </Link>

                        <div className="flex items-center gap-3">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900">Configura il tuo preventivo</h1>
                            <button
                                type="button"
                                onClick={handleClearQuote}
                                title="Azzera preventivo"
                                className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {total > 0 ? (
                            <div className="text-right">
                                <p className="text-xs text-gray-500 font-medium">Totale stimato</p>
                                <p className="text-base sm:text-lg font-bold text-orange-600">€{total.toFixed(2)}</p>
                            </div>
                        ) : (
                            <div className="w-12 sm:w-20" />
                        )}
                    </div>
                </div>

                {/* Session Persistence Info Strip */}
                <div className="border-t border-gray-100 bg-stone-50/90 py-1.5 px-4 text-[11px]">
                    <div className="container mx-auto max-w-3xl flex items-center justify-between">
                        {user ? (
                            <div className="flex items-center justify-between w-full text-emerald-700 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-600" />
                                    <span>Account attivo ({user.email}). Il tuo preventivo resta memorizzato.</span>
                                </span>
                                <Link to="/dashboard?tab=quotes" className="text-orange-600 font-bold hover:underline ml-2 flex-shrink-0">
                                    I Miei Preventivi Salvati →
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full text-stone-600">
                                <span className="flex items-center gap-1.5">
                                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                                    <span>Modalità ospite: se abbandoni la pagina il preventivo viene cancellato.</span>
                                </span>
                                <Link to="/login?redirect=/configuratore" className="text-orange-600 font-bold hover:underline ml-2">
                                    Accedi per salvare
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area with Bottom Padding for Fixed Bar */}
            <div className="container mx-auto px-4 pt-6 pb-28 sm:pb-32 max-w-3xl flex-1">
                {selectedProduct && currentStep > 1 && (
                    <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 flex items-center gap-4 shadow-sm">
                        {selectedProduct.images[0] && (
                            <img src={selectedProduct.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium text-stone-900">{selectedProduct.name}</p>
                            <p className="text-sm font-bold text-orange-600">€{selectedProduct.price_per_sqm.toFixed(2)} / mq</p>
                        </div>
                    </div>
                )}

                {renderStep()}
            </div>

            {/* Fixed Bottom Navigation & Progress Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] py-3 px-4 sm:px-6">
                <div className="container mx-auto max-w-5xl flex items-center justify-between gap-3 sm:gap-6">
                    {/* Left: Tasto Indietro (o Torna al Catalogo allo Step 1) */}
                    <div className="flex-shrink-0">
                        {currentStep > 1 ? (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold transition-all text-xs sm:text-sm active:scale-95 cursor-pointer shadow-xs"
                            >
                                <ArrowLeft className="w-4 h-4 text-stone-500" />
                                <span className="hidden sm:inline">Indietro</span>
                            </button>
                        ) : (
                            <Link
                                to="/catalog"
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-medium transition-all text-xs sm:text-sm"
                            >
                                <ArrowLeft className="w-4 h-4 text-stone-400" />
                                <span className="hidden sm:inline">Catalogo</span>
                            </Link>
                        )}
                    </div>

                    {/* Center: Stepper & Progress Indicator */}
                    <div className="flex flex-col items-center justify-center flex-1 max-w-xl px-1 sm:px-4">
                        {/* Step Title, Counter and Running Total */}
                        <div className="flex items-center justify-between w-full mb-1.5">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 font-bold text-[11px] whitespace-nowrap">
                                    Passo {currentStep} di 9
                                </span>
                                <span className="font-bold text-stone-900 truncate max-w-[150px] sm:max-w-none text-xs sm:text-sm">
                                    {STEPS[currentStep - 1]?.label}
                                </span>
                            </div>

                            {total > 0 && (
                                <div className="text-xs font-semibold text-stone-600 hidden xs:flex items-center gap-1">
                                    <span className="text-stone-400">Totale:</span>
                                    <span className="font-bold text-orange-600 text-xs sm:text-sm">€{total.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {/* Segmented Progress Track with Tooltips */}
                        <div className="flex items-center gap-1.5 w-full">
                            {STEPS.map(({ num, label }) => {
                                const isCurrent = currentStep === num
                                const isCompleted = currentStep > num

                                return (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => isCompleted && handleJumpToStep(num)}
                                        disabled={!isCompleted}
                                        title={`Passo ${num}: ${label}${isCompleted ? ' (Clicca per tornare)' : ''}`}
                                        className={`group relative flex-1 h-2 rounded-full transition-all cursor-default ${
                                            isCurrent
                                                ? 'bg-orange-500 ring-2 ring-orange-200 ring-offset-1'
                                                : isCompleted
                                                    ? 'bg-emerald-500 hover:opacity-85 cursor-pointer'
                                                    : 'bg-stone-200/90'
                                        }`}
                                    >
                                        {/* Hover Tooltip (Desktop) */}
                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden md:group-hover:flex items-center gap-1 bg-stone-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap z-50">
                                            <span>{num}. {label}</span>
                                            {isCompleted && <span className="text-emerald-400">✓</span>}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: Tasto Continua / Conferma */}
                    <div className="flex-shrink-0">
                        {currentStep < 9 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canProceed}
                                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all text-xs sm:text-sm active:scale-95 cursor-pointer"
                            >
                                <span>Continua</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : !user ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-stone-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all text-xs sm:text-sm active:scale-95 cursor-pointer"
                            >
                                <LogIn className="w-4 h-4" />
                                <span className="hidden sm:inline">Accedi e conferma</span>
                                <span className="sm:hidden">Accedi</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all text-xs sm:text-sm active:scale-95 cursor-pointer"
                            >
                                <Check className="w-4 h-4" />
                                <span>Conferma</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
