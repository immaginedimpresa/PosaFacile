import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { Step1ProjectType } from '@/components/configurator/Step1ProjectType'
import { Step2ProductSelect } from '@/components/configurator/Step2ProductSelect'
import { Step3Dimensions } from '@/components/configurator/Step3Dimensions'
import { Step4LayingType } from '@/components/configurator/Step4LayingType'
import { Step5Services } from '@/components/configurator/Step5Services'
import { Step6Location } from '@/components/configurator/Step6Location'
import { Step7ProfessionalSelect } from '@/components/configurator/Step7ProfessionalSelect'
import { Step8CalendarSelect } from '@/components/configurator/Step8CalendarSelect'
import { Step7Summary as Step9Summary } from '@/components/configurator/Step7Summary'
import { ArrowLeft, Check } from 'lucide-react'

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
    const { currentStep, setCurrentStep, setSelectedProduct, selectedProduct, getTotal } = useConfiguratorStore()

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
    }, [searchParams])

    const total = getTotal()

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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/catalog" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline">Torna al catalogo</span>
                        </Link>

                        <h1 className="text-lg font-bold text-gray-900">Configura il tuo preventivo</h1>

                        {total > 0 && (
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Totale stimato</p>
                                <p className="text-lg font-bold text-orange-600">€{total.toFixed(2)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="border-t border-gray-100">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between overflow-x-auto pb-2">
                            {STEPS.map(({ num, label }) => {
                                const isActive = currentStep === num
                                const isCompleted = currentStep > num

                                return (
                                    <button
                                        key={num}
                                        onClick={() => isCompleted && setCurrentStep(num)}
                                        disabled={!isCompleted}
                                        className={`flex flex-col items-center min-w-[70px] ${isCompleted ? 'cursor-pointer' : 'cursor-default'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isActive
                                            ? 'bg-orange-500 text-white'
                                            : isCompleted
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {isCompleted ? <Check className="w-4 h-4" /> : num}
                                        </div>
                                        <span className={`text-xs mt-1 ${isActive ? 'text-orange-600 font-medium' : 'text-gray-500'
                                            }`}>
                                            {label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {selectedProduct && currentStep > 1 && (
                    <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 flex items-center gap-4">
                        {selectedProduct.images[0] && (
                            <img src={selectedProduct.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium">{selectedProduct.name}</p>
                            <p className="text-sm text-orange-600">€{selectedProduct.price_per_sqm.toFixed(2)}/mq</p>
                        </div>
                    </div>
                )}

                {renderStep()}
            </div>
        </div>
    )
}
