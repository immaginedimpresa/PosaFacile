import { Sparkles } from 'lucide-react'
import { AIVisualizer } from '@/components/ai/AIVisualizer'
import { useConfiguratorStore, LAYING_TYPE_LABELS, LAYING_TYPE_SURCHARGE, type LayingType } from '@/store/configuratorStore'


const LAYING_TYPES: { value: LayingType; pattern: string }[] = [
    { value: 'dritta', pattern: '▢ ▢ ▢\n▢ ▢ ▢\n▢ ▢ ▢' },
    { value: 'diagonale', pattern: '◇ ◇ ◇\n ◇ ◇ \n◇ ◇ ◇' },
    { value: 'correre', pattern: '▢ ▢ ▢\n ▢ ▢ ▢\n▢ ▢ ▢' },
    { value: 'spina', pattern: '/ \\ / \\\n\\ / \\ /\n/ \\ / \\' },
    { value: 'mosaico', pattern: '▫▪▫▪\n▪▫▪▫\n▫▪▫▪' },
]

export function Step4LayingType() {
    const { layingType, setLayingType, getLayingCost, prevStep, nextStep, selectedProduct, setAiResultImage } = useConfiguratorStore()

    const layingCost = getLayingCost()

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Scegli il tipo di posa</h3>
                <p className="text-gray-500">Il tipo di posa influisce sulla complessità del lavoro e sul costo finale</p>
            </div>

            {/* Laying Types Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LAYING_TYPES.map(({ value, pattern }) => {
                    const isSelected = layingType === value
                    const surcharge = LAYING_TYPE_SURCHARGE[value]

                    return (
                        <button
                            key={value}
                            onClick={() => setLayingType(value)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            {/* Pattern Preview */}
                            <div className={`text-center font-mono text-lg mb-3 whitespace-pre leading-tight ${isSelected ? 'text-orange-600' : 'text-gray-400'
                                }`}>
                                {pattern}
                            </div>

                            {/* Label */}
                            <p className="font-medium text-gray-900">{LAYING_TYPE_LABELS[value]}</p>

                            {/* Surcharge */}
                            {surcharge > 0 ? (
                                <p className="text-sm text-orange-600">+{Math.round(surcharge * 100)}% sul costo posa</p>
                            ) : (
                                <p className="text-sm text-green-600">Nessun sovrapprezzo</p>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Cost Preview */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Costo posa stimato</span>
                    <span className="text-xl font-bold text-gray-900">€{layingCost.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    Basato sulla superficie e tipo di posa selezionato
                </p>
            </div>



            {/* Visualizzatore AI: richiede piastrella e tipo di posa, entrambi noti a questo punto */}
            {selectedProduct && selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">Visualizza nel tuo ambiente</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        Carica una foto della tua stanza per vedere l'effetto finale con la posa {LAYING_TYPE_LABELS[layingType].toLowerCase()}.
                    </p>
                    <AIVisualizer
                        productImageUrl={selectedProduct.images[0]}
                        productId={selectedProduct.id}
                        productName={selectedProduct.name}
                        initialLayingPattern={layingType}
                        onResultGenerated={(img) => setAiResultImage(img)}
                    />
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <button
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                    Indietro
                </button>
                <button
                    onClick={nextStep}
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                >
                    Continua
                </button>
            </div>
        </div>
    )
}
