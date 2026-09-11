import { useConfiguratorStore, LAYING_TYPE_LABELS, type LayingType } from '@/store/configuratorStore'
import { layingRate, markupMultiplier, campoPosa } from '@/services/ratesService'

const LAYING_TYPES: { value: LayingType; pattern: string }[] = [
    { value: 'dritta', pattern: '▢ ▢ ▢\n▢ ▢ ▢\n▢ ▢ ▢' },
    { value: 'diagonale', pattern: '◇ ◇ ◇\n ◇ ◇ \n◇ ◇ ◇' },
    { value: 'correre', pattern: '▢ ▢ ▢\n ▢ ▢ ▢\n▢ ▢ ▢' },
    { value: 'spina', pattern: '/ \\ / \\\n\\ / \\ /\n/ \\ / \\' },
    { value: 'mosaico', pattern: '▫▪▫▪\n▪▫▪▫\n▫▪▫▪' },
]

export function Step4LayingType() {
    const {
        layingType,
        setLayingType,
        getLayingCost,
        professionalRates,
        selectedProfessional,
        dimensions,
    } = useConfiguratorStore()

    const layingCost = getLayingCost()
    const baseMq = dimensions.pavimentoMq + dimensions.paretiMq

    const multiplierFor = (type: LayingType) =>
        markupMultiplier(
            campoPosa(type),
            selectedProfessional?.markup_percent,
            selectedProfessional?.markup_overrides,
        )
    // Riferimento per il confronto: lo schema piu' semplice.
    const costoDritta = layingRate(professionalRates, 'dritta') * multiplierFor('dritta') * baseMq

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
                    // Costo della posa con questo schema su questa superficie:
                    // il confronto utile e' fra importi, non fra percentuali.
                    const costo = layingRate(professionalRates, value) * multiplierFor(value) * baseMq
                    const differenza = costo - costoDritta

                    return (
                        <button
                            key={value}
                            type="button"
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

                            {/* Costo della posa con questo schema */}
                            {baseMq > 0 ? (
                                <>
                                    <p className="text-sm font-bold text-gray-900">
                                        €{costo.toFixed(0)}
                                    </p>
                                    <p className={`text-xs ${differenza > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {differenza > 0
                                            ? `+€${differenza.toFixed(0)} rispetto alla posa dritta`
                                            : 'Lo schema più economico'}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-gray-500">Indica prima la superficie</p>
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
        </div>
    )
}
