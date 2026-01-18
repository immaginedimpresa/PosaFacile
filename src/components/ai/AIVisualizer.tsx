import { useState, useEffect } from 'react'
import { Upload, Camera, Sparkles, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface AIVisualizerProps {
    productImageUrl: string | null
    productName?: string
    tileWidth?: number
    tileHeight?: number
    initialLayingPattern?: LayingPattern
    onResultGenerated?: (imageUrl: string) => void
}

type LayingPattern = 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'
type RoomType = 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno'

// Pattern with visual representations
const LAYING_PATTERNS: { value: LayingPattern; label: string; pattern: string }[] = [
    { value: 'dritta', label: 'Dritta', pattern: '▢▢▢\n▢▢▢' },
    { value: 'diagonale', label: 'Diagonale', pattern: '◇◇◇\n◇◇◇' },
    { value: 'correre', label: 'A Correre', pattern: '▢▢▢\n ▢▢▢' },
    { value: 'spina', label: 'Spina', pattern: '/\\/\\\n\\//' },
    { value: 'mosaico', label: 'Mosaico', pattern: '▫▪▫\n▪▫▪' },
]

const ROOM_TYPES: { value: RoomType; label: string }[] = [
    { value: 'bagno', label: 'Bagno' },
    { value: 'cucina', label: 'Cucina' },
    { value: 'soggiorno', label: 'Soggiorno' },
    { value: 'camera', label: 'Camera' },
    { value: 'esterno', label: 'Esterno' },
]

export function AIVisualizer({ productImageUrl, productName = 'piastrella selezionata', tileWidth, tileHeight, initialLayingPattern = 'dritta', onResultGenerated }: AIVisualizerProps) {
    const [image, setImage] = useState<string | null>(null)
    const [resultImage, setResultImage] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [layingPattern, setLayingPattern] = useState<LayingPattern>(initialLayingPattern)
    const [roomType, setRoomType] = useState<RoomType>('soggiorno')

    useEffect(() => {
        setLayingPattern(initialLayingPattern)
    }, [initialLayingPattern])

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Immagine troppo grande. Max 5MB.')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                setImage(reader.result as string)
                setResultImage(null)
                setError(null)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleVisualize = async () => {
        if (!image || !productImageUrl) return

        setProcessing(true)
        setError(null)

        try {
            const { data, error: fnError } = await supabase.functions.invoke('visualize-tile', {
                body: {
                    roomImage: image,
                    tileImage: productImageUrl,
                    tileName: productName,
                    layingPattern,
                    roomType,
                    tileWidth,
                    tileHeight,
                },
            })

            if (fnError) {
                throw fnError
            }

            if (data?.success && data?.image) {
                const imageResult = data.image.startsWith('data:')
                    ? data.image
                    : data.image.startsWith('http')
                        ? data.image
                        : `data:image/jpeg;base64,${data.image}`
                setResultImage(imageResult)
                if (onResultGenerated) onResultGenerated(imageResult)
            } else {
                throw new Error(data?.error || 'Errore nella generazione')
            }
        } catch (err: any) {
            console.error('AI visualization error:', err)
            // Se l'errore è un oggetto con un messaggio specifico dalla funzione
            const msg = err.context?.message || err.message || 'Errore durante l\'elaborazione.'
            setError(`Errore: ${msg}`)
        } finally {
            setProcessing(false)
        }
    }

    const handleDownload = () => {
        if (!resultImage) return

        const link = document.createElement('a')
        link.href = resultImage
        link.download = `posafacile-visualizzazione-${Date.now()}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleReset = () => {
        setImage(null)
        setResultImage(null)
        setError(null)
    }

    return (
        <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            {!image ? (
                <div className="space-y-4 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Visualizza a casa tua</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        Carica una foto del tuo ambiente e vedi come starà questa piastrella grazie all'IA.
                    </p>
                    <div className="flex justify-center">
                        <label className="cursor-pointer group">
                            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2">
                                <Upload size={16} /> Carica Foto
                            </div>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleUpload}
                            />
                        </label>
                    </div>
                    <p className="text-xs text-gray-400">Formati: JPG, PNG, WebP • Max 5MB</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Image Display */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black/5">
                        <img
                            src={resultImage || image}
                            alt={resultImage ? "Visualizzazione AI" : "La tua stanza"}
                            className="w-full h-full object-contain"
                        />

                        {/* Tile preview thumbnail */}
                        {productImageUrl && !resultImage && (
                            <div className="absolute bottom-4 right-4 w-20 h-20 border-2 border-white shadow-lg rounded overflow-hidden">
                                <img src={productImageUrl} className="w-full h-full object-cover" alt="Piastrella" />
                            </div>
                        )}

                        {/* Processing overlay */}
                        {processing && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                <div className="text-white flex flex-col items-center">
                                    <Sparkles className="w-12 h-12 animate-pulse mb-3 text-yellow-400" />
                                    <p className="font-semibold text-lg">L'IA sta elaborando...</p>
                                    <p className="text-sm text-gray-300">Attendere 15-30 secondi</p>
                                </div>
                            </div>
                        )}

                        {/* Result badge */}
                        {resultImage && !processing && (
                            <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                <Sparkles size={14} />
                                Generato con AI
                            </div>
                        )}
                    </div>

                    {/* Controls - visible when image uploaded but not result */}
                    {!resultImage && !processing && (
                        <div className="space-y-4">
                            {/* Laying Pattern Selection - Only show if not pre-selected */}
                            {initialLayingPattern === 'dritta' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo di posa
                                    </label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {LAYING_PATTERNS.map((p) => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setLayingPattern(p.value)}
                                                className={`p-3 rounded-lg border-2 text-center transition-all ${layingPattern === p.value
                                                    ? 'border-orange-500 bg-orange-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="text-xl font-mono mb-1 whitespace-pre leading-tight">{p.pattern}</div>
                                                <span className={`text-xs ${layingPattern === p.value ? 'font-medium text-orange-700' : 'text-gray-500'
                                                    }`}>
                                                    {p.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Room Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo stanza
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {ROOM_TYPES.map((r) => (
                                        <button
                                            key={r.value}
                                            onClick={() => setRoomType(r.value)}
                                            className={`px-4 py-2 rounded-full text-sm transition-all ${roomType === r.value
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-3 pt-2">
                        <Button onClick={handleReset} variant="ghost" disabled={processing}>
                            <RotateCcw size={16} className="mr-2" />
                            {resultImage ? 'Nuova Foto' : 'Cambia Foto'}
                        </Button>

                        {resultImage ? (
                            <Button onClick={handleDownload} className="gap-2 bg-green-600 hover:bg-green-700">
                                <Download size={16} />
                                Scarica Immagine
                            </Button>
                        ) : (
                            <Button
                                onClick={handleVisualize}
                                disabled={processing || !productImageUrl}
                                className="gap-2 bg-orange-500 hover:bg-orange-600"
                            >
                                <Sparkles size={16} />
                                {processing ? 'Elaborazione...' : 'Genera Visualizzazione'}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
