import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { useState } from "react"

interface FilterSidebarProps {
    filters: {
        category: string | null
        minPrice: string
        maxPrice: string
        availableOnly: boolean
    }
    setFilters: (filters: any) => void
    className?: string
    onClose?: () => void // For mobile drawer
}

export function FilterSidebar({ filters, setFilters, className, onClose }: FilterSidebarProps) {
    // Local state for price inputs to avoid excessive rerenders/fetches
    const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice)
    const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice)

    const categories = [
        { id: 'floor', label: 'Pavimenti' },
        { id: 'wall', label: 'Rivestimenti' },
        { id: 'outdoor', label: 'Esterni' },
        { id: 'mosaic', label: 'Mosaici' },
    ]

    const updateFilter = (key: string, value: any) => {
        setFilters((prev: any) => ({ ...prev, [key]: value }))
    }

    const applyPriceFilter = () => {
        setFilters((prev: any) => ({ ...prev, minPrice: localMinPrice, maxPrice: localMaxPrice }))
    }

    const clearFilters = () => {
        const reset = { category: null, minPrice: '', maxPrice: '', availableOnly: false }
        setFilters(reset)
        setLocalMinPrice('')
        setLocalMaxPrice('')
    }

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex items-center justify-between lg:hidden mb-4">
                <h3 className="font-bold text-lg">Filtri</h3>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={20} />
                    </Button>
                )}
            </div>

            {/* Active Filters Summary */}
            {(filters.category || filters.minPrice || filters.maxPrice || filters.availableOnly) && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">Attivi:</span>
                        <button onClick={clearFilters} className="text-xs text-primary underline">
                            Resetta tutto
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {filters.category && (
                            <span className="bg-white border rounded px-2 py-1 text-xs">{categories.find(c => c.id === filters.category)?.label}</span>
                        )}
                        {(filters.minPrice || filters.maxPrice) && (
                            <span className="bg-white border rounded px-2 py-1 text-xs">
                                €{filters.minPrice || '0'} - €{filters.maxPrice || '∞'}
                            </span>
                        )}
                        {filters.availableOnly && (
                            <span className="bg-white border rounded px-2 py-1 text-xs">Disp. immediata</span>
                        )}
                    </div>
                </div>
            )}

            {/* Availability */}
            <div className="border-b pb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={filters.availableOnly}
                        onChange={(e) => updateFilter('availableOnly', e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Solo Disponibili</span>
                </label>
            </div>

            {/* Categories */}
            <div className="border-b pb-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Categorie</h4>
                <div className="space-y-2">
                    {categories.map((cat) => (
                        <label key={cat.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                            <input
                                type="radio"
                                name="category"
                                checked={filters.category === cat.id}
                                onChange={() => updateFilter('category', filters.category === cat.id ? null : cat.id)}
                                className="w-4 h-4 border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-gray-600 text-sm">{cat.label}</span>
                        </label>
                    ))}
                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                        <input
                            type="radio"
                            name="category"
                            checked={filters.category === null}
                            onChange={() => updateFilter('category', null)}
                            className="w-4 h-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-gray-500 text-sm italic">Tutte le categorie</span>
                    </label>
                </div>
            </div>

            {/* Price Range */}
            <div className="border-b pb-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Prezzo al mq</h4>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <span className="absolute left-2 top-2.5 text-gray-400 text-xs">€</span>
                        <Input
                            type="number"
                            placeholder="Min"
                            className="pl-5 h-9 text-sm"
                            value={localMinPrice}
                            onChange={(e) => setLocalMinPrice(e.target.value)}
                        />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="relative">
                        <span className="absolute left-2 top-2.5 text-gray-400 text-xs">€</span>
                        <Input
                            type="number"
                            placeholder="Max"
                            className="pl-5 h-9 text-sm"
                            value={localMaxPrice}
                            onChange={(e) => setLocalMaxPrice(e.target.value)}
                        />
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 h-8 text-xs bg-gray-50"
                    onClick={applyPriceFilter}
                >
                    Applica Prezzo
                </Button>
            </div>
        </div>
    )
}
