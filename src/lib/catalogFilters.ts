export interface CatalogFilters {
    search: string
    category: 'floor' | 'wall' | 'outdoor' | 'mosaic' | null
    minPrice: string
    maxPrice: string
    availableOnly: boolean
    sort: 'newest' | 'price_asc' | 'price_desc' | 'name_asc'
}
export const initialCatalogFilters: CatalogFilters = {
    search: '',
    category: null,
    minPrice: '',
    maxPrice: '',
    availableOnly: false,
    sort: 'newest',
}
export const catalogCategories = [
    { id: null, label: 'Tutti i materiali' },
    { id: 'floor', label: 'Pavimenti' },
    { id: 'wall', label: 'Rivestimenti' },
    { id: 'outdoor', label: 'Esterni' },
    { id: 'mosaic', label: 'Mosaici' },
] as const
