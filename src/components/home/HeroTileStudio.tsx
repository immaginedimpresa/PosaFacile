import { useRef, useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
    ArrowUpRight,
    Battery,
    Camera,
    Loader2,
    QrCode,
    RotateCcw,
    Smartphone,
    Sparkles,
    Wifi,
    X,
} from 'lucide-react'
import {
    readPhoto,
    tileSampleUrl,
    visualizeTile,
    type LayingPattern,
    type RoomType,
    type Surface,
} from '@/lib/tileVisualizer'
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
    /** Slider verticale delle piastrelle a sinistra dello smartphone */
    tileSlider?: ReactNode
}

/**
 * Il visualizzatore AI a forma di smartphone nella hero.
 *
 * Formato verticale smartphone (9:16 / 9:19): rispecchia esattamente lo scatto da
 * cellulare e chiarisce immediatamente che l'utente può fotografare la propria stanza
 * sul posto per testare le piastrelle senza distorsioni o tagli forzati.
 */
export function HeroTileStudio({
    tile,
    photo,
    onPhotoChange,
    result,
    onResultChange,
    tileSlider,
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
    const [showQrModal, setShowQrModal] = useState(false)

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
    const qrTargetUrl = 'https://posafacile.com'
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTargetUrl)}`

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

            {/* Sezione Superiore: Slider Piastrelle + Mockup Smartphone */}
            <div className="pf-studio-duo">
                {tileSlider}

                {/* Showcase dello smartphone pulito e minimale */}
                <div className="pf-phone-showcase">
                    {/* Scocca dello Smartphone */}
                    <div className="pf-phone-frame">
                        {/* Dynamic Island / fotocamera frontale */}
                        <div className="pf-phone-island" aria-hidden="true">
                            <span className="pf-phone-sensor" />
                            <span className="pf-phone-lens" />
                        </div>

                        {/* Status bar smartphone */}
                        <div className="pf-phone-statusbar" aria-hidden="true">
                            <span className="pf-phone-time">09:41</span>
                            <div className="pf-phone-icons">
                                <Wifi size={11} />
                                <Battery size={13} />
                            </div>
                        </div>

                        {/* Schermo interno dello smartphone */}
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
                                <img
                                    src={visibile}
                                    alt={result ? 'Anteprima con la piastrella scelta' : 'La tua stanza'}
                                    className="pf-studio-img"
                                />
                            ) : (
                                /* Stato iniziale: interfaccia fotocamera smartphone */
                                <div className="pf-studio-empty">
                                    <button
                                        type="button"
                                        className="pf-studio-camera-trigger"
                                        onClick={() => fileRef.current?.click()}
                                        title="Apri fotocamera o rullino dello smartphone"
                                    >
                                        {/* Mirino fotocamera */}
                                        <div className="pf-phone-viewfinder">
                                            <span className="pf-vf-corner pf-vf-tl" />
                                            <span className="pf-vf-corner pf-vf-tr" />
                                            <span className="pf-vf-corner pf-vf-bl" />
                                            <span className="pf-vf-corner pf-vf-br" />
                                            <div className="pf-phone-icon-center">
                                                <Smartphone size={32} className="pf-phone-glyph" />
                                                <span className="pf-camera-badge">
                                                    <Camera size={14} />
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pf-phone-text-block">
                                            <span className="pf-phone-pill-tag">
                                                <Camera size={11} /> FOTO DA SMARTPHONE
                                            </span>
                                        </div>

                                        <div className="pf-phone-action-btn">
                                            <Camera size={15} />
                                            <span>Scatta o scegli foto</span>
                                        </div>

                                    </button>

                                    {/* Trigger QR code per utenti da PC desktop */}
                                    <button
                                        type="button"
                                        className="pf-studio-qr-trigger"
                                        onClick={() => setShowQrModal(true)}
                                    >
                                        <QrCode size={13} />
                                        <span>Sei al PC? Scatta da smartphone</span>
                                    </button>
                                </div>
                            )}

                            {/* Top bar interna allo schermo quando c'è una foto */}
                            {photo && (
                                <div className="pf-studio-top">
                                    <span>
                                        <Sparkles size={13} />{' '}
                                        {result ? 'ANTEPRIMA GENERATA' : 'FOTO CARICATA'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="pf-studio-btn-change"
                                    >
                                        <RotateCcw size={11} /> Cambia
                                    </button>
                                </div>
                            )}

                            {/* Stato di caricamento AI */}
                            {generating && (
                                <div className="pf-studio-loading">
                                    <Loader2 size={32} className="pf-spin" />
                                    <p>Sto posando {tile?.name ?? 'la piastrella'}…</p>
                                    <small>Elaborazione AI della tua stanza</small>
                                </div>
                            )}

                            {/* Pulsante di confronto prima/dopo */}
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
                                    {mostraOriginale ? 'Originale' : 'Tieni premuto: prima'}
                                </button>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* SEZIONE INFERIORE: SEMPRE VISIBILE, SOTTO SIA ALLO SLIDER CHE ALLO SMARTPHONE */}
            <div className="pf-studio-bottom-bar">
                {/* Quando c'è un risultato generato, mostra la scheda di completamento */}
                {result && !generating && (
                    <div className="pf-studio-done-banner">
                        <div className="pf-studio-done-info">
                            <span className="pf-done-badge">
                                <Sparkles size={11} /> Anteprima completata
                            </span>
                            <strong>{tile?.name}</strong>
                            <small>
                                {tile ? `€ ${Number(tile.price_per_sqm).toFixed(2)}/mq` : ''} · posa inclusa nel preventivo
                            </small>
                        </div>
                    </div>
                )}

                {/* Riga unica con tutti i campi e il pulsante Genera sulla stessa riga */}
                <div className="pf-studio-inline-bar">
                    <select
                        aria-label="Ambiente"
                        className="pf-studio-select"
                        value={ambiente}
                        onChange={(e) => setAmbiente(e.target.value as RoomType)}
                    >
                        {AMBIENTI.map((a) => (
                            <option key={a.value} value={a.value}>
                                {a.label}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Superficie"
                        className="pf-studio-select"
                        value={superficie}
                        onChange={(e) => setSuperficie(e.target.value as Surface)}
                    >
                        <option value="floor">Pavimento</option>
                        <option value="wall">Parete</option>
                    </select>

                    <select
                        aria-label="Tipo di posa"
                        className="pf-studio-select"
                        value={posa}
                        onChange={(e) => setPosa(e.target.value as LayingPattern)}
                    >
                        {POSE.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>

                    {!result ? (
                        <button
                            type="button"
                            className="pf-studio-generate"
                            onClick={genera}
                            disabled={!photo || !tile || generating}
                            title={!photo ? 'Carica prima una foto della stanza dallo smartphone' : undefined}
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={14} className="pf-spin" />
                                    <span>Genero…</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} />
                                    <span>Genera</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="pf-studio-done-inline">
                            <button
                                type="button"
                                onClick={genera}
                                className="pf-studio-btn-retry"
                                title="Rigenera l'anteprima"
                                aria-label="Rigenera"
                            >
                                <RotateCcw size={14} />
                            </button>
                            <Link to="/configuratore" className="pf-studio-cta">
                                <span>Preventivo</span> <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>

                {result && (
                    <p className="pf-studio-hint">
                        Scala della stanza stimata dalla foto. Per regolarla, apri{' '}
                        <Link to="/prova-ai" state={{ photo, productId: tile?.id }}>
                            Prova con AI
                        </Link>.
                    </p>
                )}

                {error && (
                    <p className="pf-studio-error" role="alert">
                        {error}
                    </p>
                )}
            </div>

            {/* Modal QR Code per aprire la pagina da smartphone e scattare la foto */}
            {showQrModal &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="pf-qr-modal-backdrop"
                        onClick={() => setShowQrModal(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="qr-modal-title"
                    >
                        <div
                            className="pf-qr-modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="pf-qr-modal-close"
                                onClick={() => setShowQrModal(false)}
                                aria-label="Chiudi"
                            >
                                <X size={18} />
                            </button>
                            <div className="pf-qr-modal-header">
                                <div className="pf-qr-icon-wrap">
                                    <Smartphone size={24} />
                                </div>
                                <h3 id="qr-modal-title">Fotografa dal tuo smartphone</h3>
                                <p>
                                    Inquadra questo codice con la fotocamera del tuo cellulare per aprire <strong>posafacile.com</strong> e scattare la foto della stanza direttamente sul posto.
                                </p>
                            </div>
                            <div className="pf-qr-code-box">
                                <img
                                    src={qrCodeUrl}
                                    alt="Codice QR per posafacile.com"
                                    width={180}
                                    height={180}
                                    loading="lazy"
                                />
                            </div>
                            <span className="pf-qr-modal-sub">
                                Inquadra con iPhone o Android per aprire <strong>posafacile.com</strong>
                            </span>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    )
}
