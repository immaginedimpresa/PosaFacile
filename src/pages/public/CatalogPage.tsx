import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { ProductCard } from '@/components/catalog/ProductCard'
import { FilterSidebar } from '@/components/catalog/FilterSidebar'
import {
    catalogCategories,
    initialCatalogFilters,
    type CatalogFilters,
} from '@/lib/catalogFilters'
import {
    ArrowUpRight,
    Search,
    SlidersHorizontal,
    X,
    ArrowUpDown,
    Layers,
    RotateCcw,
} from 'lucide-react'
import './home.css'
import './storefront.css'
import { useSeo } from '@/hooks/useSeo'
import { STATIC_PAGES, breadcrumbJsonLd } from '@/lib/seo'


type Product = Database['public']['Tables']['products']['Row']

export function CatalogPage() {
    useSeo({
        ...STATIC_PAGES.catalog,
        jsonLd: [breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Catalogo piastrelle', path: '/catalog' },
        ])],
    })
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [retry, setRetry] = useState(0)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const [filters, setFilters] = useState<CatalogFilters>(
        initialCatalogFilters,
    )

    useEffect(() => {
        let mounted = true
        async function fetchProducts() {
            setLoading(true)
            setError(false)
            try {
                let query = supabase
                    .from('products')
                    .select('*')
                    .eq('status', 'active')
                if (filters.search.trim())
                    query = query.ilike('name', `%${filters.search.trim()}%`)
                if (filters.category)
                    query = query.eq('category', filters.category)
                if (filters.minPrice)
                    query = query.gte(
                        'price_per_sqm',
                        Math.max(0, Number(filters.minPrice)),
                    )
                if (filters.maxPrice)
                    query = query.lte(
                        'price_per_sqm',
                        Math.max(0, Number(filters.maxPrice)),
                    )
                if (filters.availableOnly) query = query.gt('stock_qty', 0)
                switch (filters.sort) {
                    case 'price_asc':
                        query = query.order('price_per_sqm', {
                            ascending: true,
                        })
                        break
                    case 'price_desc':
                        query = query.order('price_per_sqm', {
                            ascending: false,
                        })
                        break
                    case 'name_asc':
                        query = query.order('name', { ascending: true })
                        break
                    default:
                        query = query.order('created_at', { ascending: false })
                }
                const { data, error: queryError } = await query
                if (queryError) throw queryError
                if (mounted) setProducts(data || [])
            } catch {
                if (mounted) {
                    setError(true)
                    setProducts([])
                }
            } finally {
                if (mounted) setLoading(false)
            }
        }
        const timer = setTimeout(fetchProducts, 300)
        return () => {
            mounted = false
            clearTimeout(timer)
        }
    }, [filters, retry])

    const filterCount =
        Number(Boolean(filters.category)) +
        Number(Boolean(filters.minPrice || filters.maxPrice)) +
        Number(filters.availableOnly)

    return (
        <div className="pf-storefront">
            <section className="pf-catalog-intro">
                <div className="pf-container pf-catalog-intro-grid">
                    <div>
                        <nav aria-label="Percorso" className="pf-breadcrumb">
                            <Link to="/">Home</Link>
                            <span>/</span>
                            <span>Materiali</span>
                        </nav>
                        <p className="pf-eyebrow">
                            LA MATERIA DEI TUOI DESIDERI
                        </p>
                        <h1>
                            Il tuo stile.
                            <br />
                            <span>La superficie giusta.</span>
                        </h1>
                        <p>
                            Texture, colori e possibilità. Trova il materiale
                            che parla di te e trasformalo in un progetto, posa
                            inclusa.
                        </p>
                    </div>
                    <div className="pf-catalog-intro-photo">
                        <img
                            src="/images/living-contemporaneo.jpg"
                            alt="Ambiente contemporaneo dai toni caldi e dalle superfici naturali"
                            width="800"
                            height="500"
                        />
                        <span>
                            <Layers size={15} /> Ogni bella casa inizia da qui.
                        </span>
                    </div>
                </div>
            </section>
            <section
                className="pf-container pf-catalog-main"
                aria-label="Catalogo materiali"
            >
                <div className="pf-catalog-toolbar">
                    <div className="pf-catalog-search">
                        <Search size={19} />
                        <input
                            aria-label="Cerca un materiale"
                            placeholder="Cerca il tuo prossimo pavimento…"
                            value={filters.search}
                            onChange={(event) =>
                                setFilters((previous) => ({
                                    ...previous,
                                    search: event.target.value,
                                }))
                            }
                        />
                        {filters.search && (
                            <button
                                aria-label="Cancella ricerca"
                                onClick={() =>
                                    setFilters((previous) => ({
                                        ...previous,
                                        search: '',
                                    }))
                                }
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <Link to="/configuratore" className="pf-text-link">
                        Hai già un’idea? Crea il preventivo{' '}
                        <ArrowUpRight size={17} />
                    </Link>
                </div>
                <div
                    className="pf-category-tabs"
                    aria-label="Categorie materiali"
                >
                    {catalogCategories.map((category) => (
                        <button
                            key={category.label}
                            aria-pressed={filters.category === category.id}
                            className={
                                filters.category === category.id
                                    ? 'is-active'
                                    : ''
                            }
                            onClick={() =>
                                setFilters((previous) => ({
                                    ...previous,
                                    category: category.id,
                                }))
                            }
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
                <div className="pf-catalog-layout">
                    <aside
                        className={
                            mobileFiltersOpen
                                ? 'pf-filter-panel is-open'
                                : 'pf-filter-panel'
                        }
                        id="catalog-filters"
                    >
                        <FilterSidebar
                            filters={filters}
                            setFilters={setFilters}
                        />
                    </aside>
                    <div className="pf-catalog-results">
                        <div className="pf-results-toolbar">
                            <span role="status">
                                {loading
                                    ? 'Cerchiamo la tua prossima ispirazione…'
                                    : error
                                      ? 'Catalogo non disponibile'
                                      : `${products.length} ${products.length === 1 ? 'materiale da scoprire' : 'materiali da scoprire'}`}
                            </span>
                            <div>
                                <button
                                    className="pf-mobile-filter-toggle"
                                    aria-expanded={mobileFiltersOpen}
                                    aria-controls="catalog-filters"
                                    onClick={() =>
                                        setMobileFiltersOpen(!mobileFiltersOpen)
                                    }
                                >
                                    <SlidersHorizontal size={16} /> Filtri
                                    {filterCount > 0 && ` (${filterCount})`}
                                </button>
                                <div className="pf-sort">
                                    <ArrowUpDown size={14} />
                                    <select
                                        aria-label="Ordina materiali"
                                        value={filters.sort}
                                        onChange={(event) =>
                                            setFilters((previous) => ({
                                                ...previous,
                                                sort: event.target
                                                    .value as CatalogFilters['sort'],
                                            }))
                                        }
                                    >
                                        <option value="newest">Novità</option>
                                        <option value="price_asc">
                                            Prezzo crescente
                                        </option>
                                        <option value="price_desc">
                                            Prezzo decrescente
                                        </option>
                                        <option value="name_asc">
                                            Nome A–Z
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        {loading ? (
                            <div
                                className="pf-product-grid"
                                aria-busy="true"
                                aria-label="Caricamento materiali"
                            >
                                {Array.from({ length: 6 }, (_, index) => (
                                    <div
                                        className="pf-product-skeleton"
                                        key={index}
                                    >
                                        <div />
                                        <span />
                                        <span />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="pf-catalog-empty">
                                <Layers size={34} />
                                <h2>Un attimo, torniamo subito.</h2>
                                <p>
                                    Non riusciamo a caricare i materiali.
                                    Riprova tra poco.
                                </p>
                                <button
                                    className="pf-button pf-button-dark"
                                    onClick={() =>
                                        setRetry((previous) => previous + 1)
                                    }
                                >
                                    Riprova <RotateCcw size={16} />
                                </button>
                            </div>
                        ) : products.length > 0 ? (
                            <div className="pf-product-grid">
                                {products.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="pf-catalog-empty">
                                <Search size={34} />
                                <h2>Facciamo spazio ad altre possibilità.</h2>
                                <p>
                                    Nessun materiale corrisponde alla tua
                                    ricerca. Prova una categoria diversa o
                                    modifica il budget.
                                </p>
                                <button
                                    className="pf-button pf-button-dark"
                                    onClick={() =>
                                        setFilters(initialCatalogFilters)
                                    }
                                >
                                    Azzera i filtri <RotateCcw size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="pf-catalog-bottom">
                    <div>
                        <p className="pf-eyebrow">
                            IL MATERIALE È SOLO L’INIZIO
                        </p>
                        <h2>Immaginalo già a casa tua.</h2>
                        <p>
                            Aggiungi metratura, servizi e professionista al tuo
                            progetto.
                        </p>
                    </div>
                    <Link
                        to="/configuratore"
                        className="pf-button pf-button-orange"
                    >
                        Calcola il tuo preventivo <ArrowUpRight size={18} />
                    </Link>
                </div>
            </section>
        </div>
    )
}
