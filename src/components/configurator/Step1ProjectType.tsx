import { useConfiguratorStore } from '@/store/configuratorStore'
import { Bath, UtensilsCrossed, Sofa, Bed, TreePine, LayoutGrid } from 'lucide-react'

const AMBIENTI = [
    { value: 'bagno', label: 'Bagno', icon: Bath },
    { value: 'cucina', label: 'Cucina', icon: UtensilsCrossed },
    { value: 'soggiorno', label: 'Soggiorno', icon: Sofa },
    { value: 'camera', label: 'Camera', icon: Bed },
    { value: 'esterno', label: 'Esterno', icon: TreePine },
    { value: 'altro', label: 'Altro', icon: LayoutGrid },
] as const

const INTERVENTI = [
    { value: 'nuova_costruzione', label: 'Nuova costruzione', desc: 'Posa su superficie nuova' },
    { value: 'ristrutturazione', label: 'Ristrutturazione', desc: 'Rimozione e sostituzione esistente' },
    { value: 'sostituzione', label: 'Sostituzione parziale', desc: 'Solo alcune zone' },
] as const

export function Step1ProjectType() {
    const { projectInfo, setProjectInfo, nextStep } = useConfiguratorStore()

    const canProceed = projectInfo.ambiente && projectInfo.intervento

    return (
        <div className="space-y-8">
            {/* Ambiente */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quale ambiente vuoi piastrellare?</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {AMBIENTI.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            onClick={() => setProjectInfo({ ambiente: value })}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${projectInfo.ambiente === value
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Icon className={`w-6 h-6 mb-2 ${projectInfo.ambiente === value ? 'text-orange-500' : 'text-gray-400'}`} />
                            <span className="font-medium">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tipo intervento */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipo di intervento</h3>
                <div className="space-y-3">
                    {INTERVENTI.map(({ value, label, desc }) => (
                        <button
                            key={value}
                            onClick={() => setProjectInfo({ intervento: value })}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${projectInfo.intervento === value
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <span className="font-medium">{label}</span>
                            <p className="text-sm text-gray-500">{desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Opzioni aggiuntive */}
            {projectInfo.intervento === 'ristrutturazione' && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={projectInfo.rimuoverePavimento}
                            onChange={(e) => setProjectInfo({ rimuoverePavimento: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span>È necessario rimuovere il pavimento esistente?</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={projectInfo.fareMassetto}
                            onChange={(e) => setProjectInfo({ fareMassetto: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span>È necessario preparare il massetto?</span>
                    </label>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-end pt-4">
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
