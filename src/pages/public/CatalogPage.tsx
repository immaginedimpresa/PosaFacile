import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { ProductCard } from '@/components/catalog/ProductCard'
import { FilterSidebar } from '@/components/catalog/FilterSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/spinner'
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react'

type Product = Database['public']['Tables']['products']['Row']

export function CatalogPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    // Unified Filter State
    const [filters, setFilters] = useState({
        search: '',
        category: null as string | null,
        minPrice: '',
        maxPrice: '',
        availableOnly: false,
        sort: 'newest' as 'newest' | 'price_asc' | 'price_desc' | 'name_asc'
    })

    useEffect(() => {
        let mounted = true

        async function fetchProducts() {
            setLoading(true)
            let query = supabase.from('products').select('*').eq('status', 'active')

            // 1. Text Search
            if (filters.search) {
                query = query.ilike('name', `%${filters.search}%`)
            }

            // 2. Category Filter
            if (filters.category) {
                query = query.eq('category', filters.category as any)
            }

            // 3. Price Range
            if (filters.minPrice) {
                query = query.gte('price', parseFloat(filters.minPrice))
            }
            if (filters.maxPrice) {
                query = query.lte('price', parseFloat(filters.maxPrice))
            }

            // 4. Availability
            if (filters.availableOnly) {
                query = query.gt('stock_quantity', 0)
            }

            // 5. Sorting
            switch (filters.sort) {
                case 'price_asc':
                    query = query.order('price', { ascending: true })
                    break
                case 'price_desc':
                    query = query.order('price', { ascending: false })
                    break
                case 'name_asc':
                    query = query.order('name', { ascending: true })
                    break
                case 'newest':
                default:
                    query = query.order('created_at', { ascending: false })
                    break
            }

            const { data, error } = await query

            if (mounted && !error && data) {
                setProducts(data)
            }
            if (mounted) setLoading(false)
        }

        const timer = setTimeout(() => {
            fetchProducts()
        }, 300)

        return () => {
            mounted = false
            clearTimeout(timer)
        }
    }, [filters])

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display text-gray-900">Catalogo</h1>
                    <p className="text-gray-500 mt-1">Esplora la nostra collezione esclusiva</p>
                </div>

                {/* Mobile Filter Toggle */}
                <Button
                    variant="outline"
                    className="lg:hidden w-full flex gap-2"
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                >
                    <SlidersHorizontal size={16} /> Filtri e Ricerca
                </Button>
            </div>

            {/* Mobile Filters Drawer (Simple overlay implementation) */}
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
                    <div
                        className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 shadow-xl overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <FilterSidebar
                            filters={filters}
                            setFilters={setFilters}
                            onClose={() => setMobileFiltersOpen(false)}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Desktop Filters Sidebar */}
                <div className="hidden lg:block">
                    <div className="sticky top-24">
                        <div className="mb-6 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cerca prodotto..."
                                className="pl-9 h-10 border-gray-200 focus:border-primary focus:ring-primary"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                        <FilterSidebar filters={filters} setFilters={setFilters} className="border rounded-xl p-6 bg-white shadow-sm" />
                    </div>
                </div>

                {/* Product Grid */}
                <div className="lg:col-span-3">
                    {/* Top Bar: Sort & Count */}
                    <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="text-sm text-gray-500 font-medium">
                            {products.length} {products.length === 1 ? 'prodotto' : 'prodotti'} trovati
                        </span>

                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-gray-400" />
                            <label className="text-sm text-gray-500 hidden sm:block">Ordina per:</label>
                            <select
                                className="text-sm border-gray-200 rounded-md focus:border-primary focus:ring-primary bg-white py-1.5 pl-3 pr-8 shadow-sm cursor-pointer"
                                value={filters.sort}
                                onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
                            >
                                <option value="newest">Novità</option>
                                <option value="price_asc">Prezzo: Basso → Alto</option>
                                <option value="price_desc">Prezzo: Alto → Basso</option>
                                <option value="name_asc">Nome: A → Z</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <LoadingSpinner className="h-10 w-10 text-primary" />
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                            <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Search className="text-gray-300 h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Nessun prodotto trovato</h3>
                            <p className="text-gray-500 mt-1 max-w-xs mx-auto">Prova a modificare i filtri o cerca un altro termine.</p>
                            <Button
                                variant="outline"
                                onClick={() => setFilters({
                                    search: '',
                                    category: null,
                                    minPrice: '',
                                    maxPrice: '',
                                    availableOnly: false,
                                    sort: 'newest'
                                })}
                                className="mt-6"
                            >
                                Rimuovi tutti i filtri
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
