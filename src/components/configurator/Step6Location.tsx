import { useState } from 'react'
import { useConfiguratorStore, LAYING_TYPE_LABELS } from '@/store/configuratorStore'
import { MapPin, Sparkles } from 'lucide-react'
import { AIVisualizer } from '@/components/ai/AIVisualizer'
import { useAuth } from '@/hooks/useAuth'
import { AuthDialog } from '@/components/auth/AuthDialog'

export function Step6Location() {
    const { location, setLocation, prevStep, nextStep, selectedProduct, layingType, setAiResultImage } = useConfiguratorStore()
    const { user } = useAuth()
    const [showAuthDialog, setShowAuthDialog] = useState(false)

    const canProceed = location.indirizzo && location.citta && location.provincia && location.cap

    const handleNext = () => {
        if (user) {
            nextStep()
        } else {
            setShowAuthDialog(true)
        }
    }

    return (
        <div className="space-y-6">
            <AuthDialog
                open={showAuthDialog}
                onOpenChange={setShowAuthDialog}
                onSuccess={() => {
                    setShowAuthDialog(false)
                    nextStep()
                }}
            />

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dove vuoi eseguire i lavori?</h3>
                <p className="text-gray-500">Inserisci l'indirizzo dove verranno consegnati i materiali e eseguita la posa</p>
            </div>

            {/* Address Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">Indirizzo di lavoro</span>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Indirizzo <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={location.indirizzo}
                        onChange={(e) => setLocation({ indirizzo: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Via Roma, 1"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Città <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={location.citta}
                            onChange={(e) => setLocation({ citta: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Milano"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            CAP <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            maxLength={5}
                            value={location.cap}
                            onChange={(e) => setLocation({ cap: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="20100"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provincia <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        maxLength={2}
                        value={location.provincia}
                        onChange={(e) => setLocation({ provincia: e.target.value.toUpperCase().slice(0, 2) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="MI"
                    />
                </div>
            </div>

            {/* AI Visualizer Integration */}
            {selectedProduct && selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">Visualizza nel tuo ambiente</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        Prima di concludere, prova a caricare una foto della tua stanza per vedere l'effetto finale con la posa {LAYING_TYPE_LABELS[layingType].toLowerCase()}.
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
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Scegli Professionista
                </button>
            </div>
        </div>
    )
}
