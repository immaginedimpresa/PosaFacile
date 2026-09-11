import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowUpRight,
    Check,
    ImagePlus,
    Loader2,
    RotateCcw,
    Sparkles,
} from 'lucide-react'
import { readPhoto, tileSampleUrl, visualizeTile, type LayingPattern, type RoomType, type Surface } from '@/lib/tileVisualizer'
import type { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']

const AMBIENTI: { value: RoomType; label: string }[] = [
    { value: 'soggiorno', label: 'Soggiorno' },
    { value: 'bagno', label: 'Bagno' },
    { value: 'cucina', label: 'Cucina' },
    { value: 'camera', label: 'Camera' },
    { value: 'esterno', label: 'Esterno' },
]

const POSE: { value: LayingPattern; label: string }[] = [
    { value: 'dritta', label: 'Dritta' },
    { value: 'correre', label: 'A correre' },
    { value: 'diagonale', label: 'Diagonale' },
    { value: 'spina', label: 'Spina' },
]

interface HeroTileStudioProps {
    /** Piastrella selezionata nel carosello sotto la foto. */
    tile: Product | null
    /** Foto caricata: vive nella home perché il flusso prosegue da lì. */
    photo: string | null
    onPhotoChange: (photo: string | null) => void
    result: string | null
    onResultChange: (result: string | null) => void
}

/**
 * Il riquadro della hero.
 *
 * Prende il posto del carosello di ispirazione: invece di mostrare ambienti
 * altrui, mostra il tuo. È lo stesso percorso della pagina dedicata — carica
 * la foto, scegli la piastrella, guarda il risultato — ma senza uscire dalla
 * home, perché è qui che l'utente arriva ed è qui che va convinto.
 */
export function HeroTileStudio({
    tile,
    photo,
    onPhotoChange,
    result,
    onResultChange,
}: HeroTileStudioProps) {
    const requestId = useRef(0)
    const fileRef = useRef<HTMLInputElement>(null)
    const [pending, setPending] = useState<{ tileId?: string; photo: string | null } | null>(null)
    const generating = pending !== null && pending.tileId === tile?.id && pending.photo === photo
    const setGenerating = (value: boolean) => setPending(value ? { tileId: tile?.id, photo } : null)
    const [error, setError] = useState<string | null>(null)
    const [dragging, setDragging] = useState(false)
    const [ambiente, setAmbiente] = useState<RoomType>('soggiorno')
    const [superficie, setSuperficie] = useState<Surface>('floor')
    const [posa, setPosa] = useState<LayingPattern>('dritta')
    const [mostraOriginale, setMostraOriginale] = useState(false)

    useEffect(() => {
        const counter = requestId
        counter.current++
        return () => { counter.current++ }
    }, [tile?.id, photo])

    const accettaFile = async (file: File | undefined | null) => {
        if (!file) return
        const { dataUrl, error: readError } = await readPhoto(file)
        if (readError || !dataUrl) {
            setError(readError)
            return
        }
        setError(null)
        onResultChange(null)
        onPhotoChange(dataUrl)
    }

    const genera = async () => {
        const tileImage = tileSampleUrl(tile)
        if (!photo || !tileImage) return

        const currentRequest = ++requestId.current
        setGenerating(true)
        setError(null)
        const { image, error: genError } = await visualizeTile({
            roomImage: photo,
            tileImage,
            productId: tile?.id,
            layingPattern: posa,
            roomType: ambiente,
            surface: superficie,
            tileWidth: tile?.format_width,
            tileHeight: tile?.format_height,
        })
        if (currentRequest !== requestId.current) return
        setGenerating(false)

        if (genError || !image) {
            setError(genError ?? 'Generazione non riuscita.')
            return
        }
        onResultChange(image)
        setMostraOriginale(false)
    }

    const visibile = result && !mostraOriginale ? result : photo

    return (
        <div className="pf-studio">
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="pf-visually-hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    accettaFile(file)
                }}
            />

            <div
                className={`pf-studio-stage ${dragging ? 'is-dragging' : ''} ${photo ? 'has-photo' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    accettaFile(e.dataTransfer.files?.[0])
                }}
            >
                {visibile ? (
                    <img src={visibile} alt={result ? 'Anteprima con la piastrella scelta' : 'La tua stanza'} />
                ) : (
                    // Stato iniziale: l'invito a caricare è l'intera superficie,
                    // non un pulsante piccolo in un angolo.
                    <button type="button" className="pf-studio-empty" onClick={() => fileRef.current?.click()}>
                        <span className="pf-studio-empty-icon">
                            <ImagePlus size={26} />
                        </span>
                        <strong>Carica la foto della tua stanza</strong>
                        <small>Pavimento o parete · trascina qui o scegli un file</small>
                    </button>
                )}

                <div className="pf-studio-top">
                    <span>
                        <Sparkles size={14} /> {result ? 'ANTEPRIMA GENERATA' : 'PROVA LA TUA PIASTRELLA'}
                    </span>
                    {photo && (
                        <button type="button" onClick={() => fileRef.current?.click()}>
                            <RotateCcw size={12} /> Cambia foto
                        </button>
                    )}
                </div>

                {generating && (
                    <div className="pf-studio-loading">
                        <Loader2 size={30} className="pf-spin" />
                        <p>Sto posando {tile?.name ?? 'la piastrella'}…</p>
                        <small>Riconosco la superficie e applico il campione</small>
                    </div>
                )}

                {/* Confronto prima/dopo: senza l'originale sotto mano il
                    risultato non si sa valutare. */}
                {result && !generating && (
                    <button
                        type="button"
                        className="pf-studio-compare"
                        onMouseDown={() => setMostraOriginale(true)}
                        onMouseUp={() => setMostraOriginale(false)}
                        onMouseLeave={() => setMostraOriginale(false)}
                        onTouchStart={() => setMostraOriginale(true)}
                        onTouchEnd={() => setMostraOriginale(false)}
                    >
                        {mostraOriginale ? 'Originale' : 'Tieni premuto per il prima'}
                    </button>
                )}

                {photo && !result && !generating && (
                    <div className="pf-studio-controls">
                        <div className="pf-studio-selects">
                            <label>
                                <span>Ambiente</span>
                                <select value={ambiente} onChange={(e) => setAmbiente(e.target.value as RoomType)}>
                                    {AMBIENTI.map((a) => (
                                        <option key={a.value} value={a.value}>{a.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>Superficie</span>
                                <select
                                    value={superficie}
                                    onChange={(e) => setSuperficie(e.target.value as Surface)}
                                >
                                    <option value="floor">Pavimento</option>
                                    <option value="wall">Parete</option>
                                </select>
                            </label>
                            <label>
                                <span>Posa</span>
                                <select value={posa} onChange={(e) => setPosa(e.target.value as LayingPattern)}>
                                    {POSE.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <button
                            type="button"
                            className="pf-studio-generate"
                            onClick={genera}
                            disabled={!tile}
                        >
                            <Sparkles size={16} />
                            {tile ? `Posa ${tile.name}` : 'Scegli una piastrella'}
                        </button>
                    </div>
                )}

                {/* A risultato ottenuto l'unica cosa che conta è il passo dopo. */}
                {result && !generating && (
                    <div className="pf-studio-done">
                        <div>
                            <strong>{tile?.name}</strong>
                            <small>
                                {tile ? `€ ${Number(tile.price_per_sqm).toFixed(2)}/mq` : ''} · posa inclusa nel preventivo
                            </small>
                        </div>
                        <div className="pf-studio-done-actions">
                            <button type="button" onClick={genera} title="Rigenera l’anteprima">
                                <RotateCcw size={15} />
                            </button>
                            <Link to="/configuratore" className="pf-studio-cta">
                                Calcola il preventivo <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {result && <p className="pf-studio-hint">Scala della stanza stimata dalla foto. Per regolarla, apri <Link to="/prova-ai" state={{ photo, productId: tile?.id }}>Prova con AI</Link>.</p>}

            {error && (
                <p className="pf-studio-error" role="alert">
                    {error}
                </p>
            )}

            {!photo && !error && (
                <p className="pf-studio-hint">
                    <Check size={13} /> Gratis, senza registrarti. La foto resta sul tuo dispositivo
                    finché non generi l’anteprima.
                </p>
            )}
        </div>
    )
}
