import { Sparkles, Layers, CheckCircle2 } from 'lucide-react'
import { AIVisualizer } from '@/components/ai/AIVisualizer'
import { useConfiguratorStore, LAYING_TYPE_LABELS } from '@/store/configuratorStore'
import { tileSampleUrl, type RoomType, type Surface } from '@/lib/tileVisualizer'

export function StepVisualizer() {
    const {
        selectedProduct,
        layingType,
        dimensions,
        projectInfo,
        aiRoomImage,
        aiResultImage,
        setAiRoomImage,
        setAiResultImage,
        setCurrentStep,
    } = useConfiguratorStore()

    // Determinazione superficie e ambiente coerenti con le scelte dell'utente
    const superficie: Surface = dimensions.paretiMq > dimensions.pavimentoMq ? 'wall' : 'floor'
    const ambiente = projectInfo.ambiente && projectInfo.ambiente !== 'altro'
        ? (projectInfo.ambiente as RoomType)
        : undefined

    const formatoText = selectedProduct?.format_width && selectedProduct?.format_height
        ? `${selectedProduct.format_width / 10}×${selectedProduct.format_height / 10} cm`
        : null

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                        <Sparkles size={18} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Visualizza nel tuo ambiente</h3>
                </div>
                <p className="text-gray-500">
                    Carica una foto della tua stanza per simulare l'effetto finale con la piastrella e lo schema di posa selezionati.
                </p>
            </div>

            {/* Riassunto scelte attuali */}
            {selectedProduct ? (
                <div className="bg-gradient-to-r from-orange-50/70 to-amber-50/50 border border-orange-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3.5">
                        {selectedProduct.images?.[0] && (
                            <img
                                src={selectedProduct.images[0]}
                                alt={selectedProduct.name}
                                className="w-14 h-14 object-cover rounded-lg border border-orange-200 shadow-sm"
                            />
                        )}
                        <div>
                            <span className="text-xs uppercase tracking-wider text-orange-700 font-semibold">
                                Materiale & Posa configurati
                            </span>
                            <h4 className="font-semibold text-gray-900 leading-tight">
                                {selectedProduct.name}
                            </h4>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {formatoText ? `${formatoText} • ` : ''}
                                {selectedProduct.material || 'Gres porcellanato'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full font-medium text-gray-700 border border-orange-200/60 shadow-sm">
                            <Layers size={13} className="text-orange-500" />
                            Posa: <strong>{LAYING_TYPE_LABELS[layingType]}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full font-medium text-gray-700 border border-orange-200/60 shadow-sm">
                            Superficie: <strong>{superficie === 'wall' ? 'Parete' : 'Pavimento'}</strong>
                        </span>
                        {ambiente && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full font-medium text-gray-700 border border-orange-200/60 shadow-sm capitalize">
                                Stanza: <strong>{ambiente}</strong>
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center justify-between">
                    <span>Nessuna piastrella selezionata. Torna al passo precedente per scegliere un materiale.</span>
                    <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="font-medium text-amber-900 underline ml-2"
                    >
                        Scegli piastrella
                    </button>
                </div>
            )}

            {/* Simulatore AI */}
            {selectedProduct && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm space-y-4">
                    <AIVisualizer
                        productImageUrl={tileSampleUrl(selectedProduct)}
                        productId={selectedProduct.id}
                        productName={selectedProduct.name}
                        tileWidth={selectedProduct.format_width ?? undefined}
                        tileHeight={selectedProduct.format_height ?? undefined}
                        initialLayingPattern={layingType}
                        initialSurface={superficie}
                        initialRoomType={ambiente}
                        initialImage={aiRoomImage}
                        initialResultImage={aiResultImage}
                        onImageChange={(img) => setAiRoomImage(img)}
                        onResultGenerated={(img) => setAiResultImage(img)}
                    />
                </div>
            )}

            {/* Avviso opzionalità e guida */}
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-4 flex items-start gap-3">
                <span className="text-lg leading-none">💡</span>
                <div className="text-sm text-blue-900/90 leading-relaxed">
                    <strong>Questo passaggio è facoltativo:</strong> se non hai a disposizione una foto della stanza adesso,
                    puoi cliccare direttamente su <strong className="text-blue-950">"Continua"</strong> per selezionare i servizi accessori,
                    indicare la data e confermare il tuo preventivo.
                </div>
            </div>

            {aiResultImage && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-sm text-green-800">
                    <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                    <span>
                        <strong>Anteprima salvata!</strong> L'immagine generata rimarrà memorizzata e inclusa nel riepilogo del tuo preventivo.
                    </span>
                </div>
            )}
        </div>
    )
}
