import { useConfiguratorStore } from '@/store/configuratorStore'
import { Calculator } from 'lucide-react'

export function Step3Dimensions() {
    const { dimensions, setDimensions, selectedProduct, getTotalMq, getMaterialCost, prevStep, nextStep } = useConfiguratorStore()

    const totalMq = getTotalMq()
    const materialCost = getMaterialCost()
    const canProceed = dimensions.pavimentoMq > 0 || dimensions.paretiMq > 0

    return (
        <div className="space-y-6">
            {/* Metratura Input */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Inserisci le dimensioni</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Pavimento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Superficie pavimento
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={dimensions.pavimentoMq || ''}
                                onChange={(e) => setDimensions({ pavimentoMq: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">mq</span>
                        </div>
                    </div>

                    {/* Pareti */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Superficie pareti (opzionale)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={dimensions.paretiMq || ''}
                                onChange={(e) => setDimensions({ paretiMq: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">mq</span>
                        </div>
                    </div>
                </div>

                {/* Sfrido */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sfrido (materiale extra per tagli e scarti)
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="5"
                            max="20"
                            value={dimensions.sfridoPercent}
                            onChange={(e) => setDimensions({ sfridoPercent: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <span className="w-16 text-center font-medium text-gray-900">{dimensions.sfridoPercent}%</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Consigliato: 10% per pose standard, 15-20% per mosaici o pose complesse
                    </p>
                </div>
            </div>

            {/* Calculator Helper */}
            <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-blue-900">Calcola la metratura</p>
                        <p className="text-blue-700">
                            Moltiplica lunghezza × larghezza della stanza. Per le pareti: altezza × larghezza di ogni parete da piastrellare.
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            {canProceed && (
                <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Riepilogo materiale</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Superficie base</span>
                            <span>{(dimensions.pavimentoMq + dimensions.paretiMq).toFixed(1)} mq</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Sfrido ({dimensions.sfridoPercent}%)</span>
                            <span>+{((dimensions.pavimentoMq + dimensions.paretiMq) * dimensions.sfridoPercent / 100).toFixed(1)} mq</span>
                        </div>
                        <div className="flex justify-between font-medium text-base pt-2 border-t border-gray-200">
                            <span>Totale materiale</span>
                            <span>{totalMq.toFixed(1)} mq</span>
                        </div>
                        {selectedProduct && (
                            <div className="flex justify-between text-orange-600 font-semibold">
                                <span>Costo materiale</span>
                                <span>€{materialCost.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
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
                    disabled={!canProceed}
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continua
                </button>
            </div>
        </div>
    )
}
