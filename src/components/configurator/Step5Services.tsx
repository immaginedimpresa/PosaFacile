import { useConfiguratorStore, SERVICE_PRICES } from '@/store/configuratorStore'
import { Trash2, Layers, Droplets, Truck, Square, DoorOpen } from 'lucide-react'

const SERVICES = [
    { key: 'demolizione', label: 'Demolizione pavimento esistente', icon: Trash2, price: SERVICE_PRICES.demolizione, unit: '€/mq' },
    { key: 'massetto', label: 'Preparazione massetto', icon: Layers, price: SERVICE_PRICES.massetto, unit: '€/mq' },
    { key: 'impermeabilizzazione', label: 'Impermeabilizzazione', icon: Droplets, price: SERVICE_PRICES.impermeabilizzazione, unit: '€/mq' },
    { key: 'smaltimento', label: 'Smaltimento materiale', icon: Truck, price: SERVICE_PRICES.smaltimento, unit: '€/mq' },
] as const

export function Step5Services() {
    const { services, setServices, dimensions, getServicesCost, prevStep, nextStep } = useConfiguratorStore()

    const baseMq = dimensions.pavimentoMq + dimensions.paretiMq
    const servicesCost = getServicesCost()

    // Pre-check services based on project info
    const handleServiceToggle = (key: keyof typeof services) => {
        if (key === 'battiscopa' || key === 'soglie') return
        setServices({ [key]: !services[key as 'demolizione' | 'massetto' | 'impermeabilizzazione' | 'smaltimento'] })
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Servizi aggiuntivi</h3>
                <p className="text-gray-500">Seleziona i servizi extra di cui hai bisogno</p>
            </div>

            {/* Main Services */}
            <div className="space-y-3">
                {SERVICES.map(({ key, label, icon: Icon, price, unit }) => {
                    const isChecked = services[key as keyof typeof services] as boolean
                    const estimatedCost = price * baseMq

                    return (
                        <label
                            key={key}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleServiceToggle(key as keyof typeof services)}
                                    className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                />
                                <Icon className={`w-5 h-5 ${isChecked ? 'text-orange-500' : 'text-gray-400'}`} />
                                <div>
                                    <p className="font-medium">{label}</p>
                                    <p className="text-sm text-gray-500">{price} {unit}</p>
                                </div>
                            </div>
                            {isChecked && (
                                <span className="text-orange-600 font-medium">+€{estimatedCost.toFixed(2)}</span>
                            )}
                        </label>
                    )
                })}
            </div>

            {/* Battiscopa */}
            <div className={`p-4 rounded-xl border-2 transition-all ${services.battiscopa ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`}>
                <label className="flex items-center gap-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={services.battiscopa}
                        onChange={(e) => setServices({ battiscopa: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <Square className={`w-5 h-5 ${services.battiscopa ? 'text-orange-500' : 'text-gray-400'}`} />
                    <div>
                        <p className="font-medium">Battiscopa</p>
                        <p className="text-sm text-gray-500">{SERVICE_PRICES.battiscopa} €/metro lineare</p>
                    </div>
                </label>
                {services.battiscopa && (
                    <div className="mt-4 ml-9">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Metri lineari</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                value={services.battiscopaMetri || ''}
                                onChange={(e) => setServices({ battiscopaMetri: parseFloat(e.target.value) || 0 })}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="0"
                            />
                            <span className="text-gray-500">m</span>
                            {services.battiscopaMetri > 0 && (
                                <span className="text-orange-600 font-medium">
                                    +€{(services.battiscopaMetri * SERVICE_PRICES.battiscopa).toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Soglie */}
            <div className={`p-4 rounded-xl border-2 transition-all ${services.soglie ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`}>
                <label className="flex items-center gap-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={services.soglie}
                        onChange={(e) => setServices({ soglie: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <DoorOpen className={`w-5 h-5 ${services.soglie ? 'text-orange-500' : 'text-gray-400'}`} />
                    <div>
                        <p className="font-medium">Soglie e profili</p>
                        <p className="text-sm text-gray-500">{SERVICE_PRICES.soglie} €/pezzo</p>
                    </div>
                </label>
                {services.soglie && (
                    <div className="mt-4 ml-9">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantità</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                value={services.soglieQty || ''}
                                onChange={(e) => setServices({ soglieQty: parseInt(e.target.value) || 0 })}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="0"
                            />
                            <span className="text-gray-500">pezzi</span>
                            {services.soglieQty > 0 && (
                                <span className="text-orange-600 font-medium">
                                    +€{(services.soglieQty * SERVICE_PRICES.soglie).toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Services Total */}
            {servicesCost > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Totale servizi aggiuntivi</span>
                        <span className="text-xl font-bold text-gray-900">€{servicesCost.toFixed(2)}</span>
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
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                >
                    Continua
                </button>
            </div>
        </div>
    )
}
