import { useState } from 'react'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { useProducts } from '@/hooks/useProducts'
import { Search } from 'lucide-react'

export function Step2ProductSelect() {
    const { selectedProduct, setSelectedProduct, prevStep, nextStep } = useConfiguratorStore()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState<'floor' | 'wall' | 'outdoor' | 'mosaic' | undefined>()

    const { products, loading } = useProducts({
        status: 'active',
        category,
        search: search || undefined,
    })

    const handleSelect = (product: typeof products[0]) => {
        setSelectedProduct({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price_per_sqm: product.price_per_sqm,
            images: (product.images as string[]) || [],
            category: product.category,
            material: product.material,
        })
    }

    return (
        <div className="space-y-6">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca piastrella..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
                <select
                    value={category || ''}
                    onChange={(e) => setCategory(e.target.value as typeof category || undefined)}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                    <option value="">Tutte le categorie</option>
                    <option value="floor">Pavimento</option>
                    <option value="wall">Rivestimento</option>
                    <option value="outdoor">Esterno</option>
                    <option value="mosaic">Mosaico</option>
                </select>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Nessun prodotto trovato</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => {
                        const images = product.images as string[] | null
                        const isSelected = selectedProduct?.id === product.id

                        return (
                            <button
                                key={product.id}
                                onClick={() => handleSelect(product)}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="aspect-square rounded-lg bg-gray-100 mb-3 overflow-hidden">
                                    {images?.[0] ? (
                                        <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <span className="text-3xl">🏠</span>
                                        </div>
                                    )}
                                </div>
                                <p className="font-medium text-sm truncate">{product.name}</p>
                                <p className="text-orange-600 font-semibold text-sm">€{product.price_per_sqm.toFixed(2)}/mq</p>
                            </button>
                        )
                    })}
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
                    onClick={nextStep}
                    disabled={!selectedProduct}
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continua
                </button>
            </div>
        </div>
    )
}
