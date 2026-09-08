import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Layers } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']
const categories: Record<string, string> = {
    floor: 'Pavimento',
    wall: 'Rivestimento',
    outdoor: 'Esterno',
    mosaic: 'Mosaico',
}
const materials: Record<string, string> = {
    gres: 'Gres porcellanato',
    ceramic: 'Ceramica',
    cotto: 'Cotto',
    natural_stone: 'Pietra naturale',
}

export function ProductCard({ product }: { product: Product }) {
    const [imageError, setImageError] = useState(false)
    const images = Array.isArray(product.images) ? product.images : []
    const mainImage = typeof images[0] === 'string' ? images[0] : null
    return (
        <Link to={`/products/${product.slug}`} className="pf-product-card">
            <div className="pf-product-image">
                {mainImage && !imageError ? (
                    <img
                        src={mainImage}
                        alt={product.name}
                        loading="lazy"
                        width="600"
                        height="600"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="pf-product-placeholder">
                        <Layers size={42} strokeWidth={1} />
                        <span>Immagine in arrivo</span>
                    </div>
                )}
                {(product.stock_qty ?? 0) > 0 && (
                    <span className="pf-product-badge">Disponibile</span>
                )}
                <span className="pf-product-arrow">
                    <ArrowUpRight size={21} />
                </span>
            </div>
            <div className="pf-product-meta">
                <span>
                    {product.category
                        ? categories[product.category] || product.category
                        : 'Materiale'}
                </span>
                {product.format_width && product.format_height ? (
                    <span>
                        {product.format_width / 10} ×{' '}
                        {product.format_height / 10} cm
                    </span>
                ) : null}
            </div>
            <h3>{product.name}</h3>
            <p>
                {product.material
                    ? materials[product.material]
                    : 'Scopri tutti i dettagli'}
            </p>
            <div className="pf-product-price">
                <span>
                    {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR',
                    }).format(product.price_per_sqm)}
                    <small> / m²</small>
                </span>
                <span>
                    Scopri <ArrowUpRight size={13} />
                </span>
            </div>
        </Link>
    )
}
