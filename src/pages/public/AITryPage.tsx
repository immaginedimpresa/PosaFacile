import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Check, Ruler, Sparkles } from 'lucide-react'
import { AIVisualizer } from '@/components/ai/AIVisualizer'
import { useProducts } from '@/hooks/useProducts'
import { useConfiguratorStore, type SelectedProduct } from '@/store/configuratorStore'
import type { Database } from '@/types/supabase'
import './home.css'

type Product = Database['public']['Tables']['products']['Row']

/** Dalla riga a catalogo alla forma che il configuratore si aspetta. */
const toSelectedProduct = (product: Product): SelectedProduct => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price_per_sqm: Number(product.price_per_sqm) || 0,
    images: (product.images as string[]) || [],
    category: product.category,
    material: product.material,
    format_width: product.format_width,
    format_height: product.format_height,
    lead_time_days: product.lead_time_days,
})

const formatoLeggibile = (w?: number | null, h?: number | null): string | null =>
    w && h ? `${Math.round(w / 10)}×${Math.round(h / 10)} cm` : null

/**
 * Prova dell'AI prima del preventivo.
 *
 * È il primo passo del funnel: si sceglie una piastrella, si carica la foto
 * della propria stanza e si vede il risultato. Da lì il preventivo parte già
 * con il prodotto scelto e l'anteprima generata, senza rifare nulla.
 */
export function AITryPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { products, loading } = useProducts({ status: 'active', limit: 12 })
    const { setSelectedProduct, setAiResultImage, setCurrentStep } = useConfiguratorStore()

    const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('product'))
    const [risultato, setRisultato] = useState<string | null>(null)

    // Il prodotto mostrato si deriva dalla selezione: se l'id nell'indirizzo
    // non corrisponde a niente si parte dal primo del catalogo.
    const prodotto = useMemo(() => {
        if (products.length === 0) return null
        return products.find((p) => p.id === selectedId) ?? products[0]
    }, [products, selectedId])

    /** Porta nel configuratore quello che è già stato deciso qui. */
    const continuaAlPreventivo = () => {
        if (!prodotto) return
        setSelectedProduct(toSelectedProduct(prodotto))
        if (risultato) setAiResultImage(risultato)
        // Il prodotto è scelto: si riparte dal luogo di posa, non dal catalogo.
        setCurrentStep(1)
        navigate('/configuratore')
    }

    const formato = formatoLeggibile(prodotto?.format_width, prodotto?.format_height)

    return (
        <div className="pf-home pf-aitry">
            <section className="pf-container pf-section">
                <Link to="/" className="pf-text-link" style={{ marginBottom: 24 }}>
                    <ArrowLeft size={16} /> Torna alla home
                </Link>

                <div className="pf-section-heading">
                    <div>
                        <p className="pf-eyebrow">
                            <span className="pf-status-dot" /> ANTEPRIMA CON INTELLIGENZA ARTIFICIALE
                        </p>
                        <h2>
                            La tua stanza,
                            <br />
                            con il pavimento che stai pensando.
                        </h2>
                    </div>
                    <p>
                        Scegli una piastrella, carica una foto
                        <br />
                        e guarda il risultato prima di decidere.
                    </p>
                </div>

                <div className="pf-aitry-grid">
                    {/* Scelta della piastrella */}
                    <aside className="pf-aitry-picker">
                        <h3>Scegli la piastrella</h3>
                        {loading ? (
                            <p className="pf-aitry-empty">Carico il catalogo…</p>
                        ) : products.length === 0 ? (
                            <p className="pf-aitry-empty">Nessun prodotto disponibile al momento.</p>
                        ) : (
                            <div className="pf-aitry-thumbs">
                                {products.map((p) => {
                                    const img = ((p.images as string[]) || [])[0]
                                    const attiva = p.id === prodotto?.id
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            aria-pressed={attiva}
                                            onClick={() => {
                                                setSelectedId(p.id)
                                                setRisultato(null)
                                            }}
                                            className={`pf-aitry-thumb ${attiva ? 'is-selected' : ''}`}
                                        >
                                            {img ? (
                                                <img src={img} alt={p.name} loading="lazy" />
                                            ) : (
                                                <span className="pf-aitry-noimg" />
                                            )}
                                            {attiva && (
                                                <span className="pf-aitry-check">
                                                    <Check size={14} />
                                                </span>
                                            )}
                                            <small>{p.name}</small>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {prodotto && (
                            <div className="pf-aitry-detail">
                                <p className="pf-aitry-name">{prodotto.name}</p>
                                <p className="pf-aitry-meta">
                                    {prodotto.color_name}
                                    {formato && (
                                        <>
                                            {' · '}
                                            <Ruler size={12} /> {formato}
                                        </>
                                    )}
                                </p>
                                <p className="pf-aitry-price">
                                    € {Number(prodotto.price_per_sqm).toFixed(2)}
                                    <small> / mq</small>
                                </p>
                                <Link to={`/products/${prodotto.slug}`} className="pf-text-link">
                                    Scheda prodotto <ArrowUpRight size={15} />
                                </Link>
                            </div>
                        )}
                    </aside>

                    {/* Visualizzatore */}
                    <div className="pf-aitry-stage">
                        {prodotto ? (
                            <AIVisualizer
                                key={prodotto.id}
                                productImageUrl={((prodotto.images as string[]) || [])[0] ?? null}
                                productId={prodotto.id}
                                productName={prodotto.name}
                                tileWidth={prodotto.format_width ?? undefined}
                                tileHeight={prodotto.format_height ?? undefined}
                                onResultGenerated={setRisultato}
                            />
                        ) : (
                            <p className="pf-aitry-empty">Seleziona una piastrella per iniziare.</p>
                        )}

                        {/* Il passo successivo è sempre visibile: provare l'AI non è
                            il traguardo, è il modo di arrivare al preventivo. */}
                        <div className="pf-aitry-next">
                            <div>
                                <p className="pf-aitry-next-title">
                                    {risultato ? 'Ti piace il risultato?' : 'Quando hai deciso'}
                                </p>
                                <p className="pf-aitry-next-text">
                                    {prodotto
                                        ? `Continuiamo con ${prodotto.name}: calcoliamo materiale, posa e data di inizio.`
                                        : 'Scegli una piastrella per continuare.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={continuaAlPreventivo}
                                disabled={!prodotto}
                                className="pf-button pf-button-orange"
                            >
                                Calcola il preventivo <ArrowUpRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <p className="pf-image-disclaimer">
                    <Sparkles size={13} /> L’anteprima è una simulazione: colori e fughe reali
                    possono variare secondo luce e posa.
                </p>
            </section>
        </div>
    )
}
