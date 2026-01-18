import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import type { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']
type ProductStatus = Exclude<Product['status'], null>
type ProductCategory = Product['category']

const STATUS_LABELS: Record<ProductStatus, { label: string; color: string }> = {
    draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-700' },
    active: { label: 'Attivo', color: 'bg-green-100 text-green-700' },
    out_of_stock: { label: 'Esaurito', color: 'bg-yellow-100 text-yellow-700' },
    discontinued: { label: 'Sospeso', color: 'bg-red-100 text-red-700' },
}

const CATEGORY_LABELS: Record<NonNullable<ProductCategory>, string> = {
    floor: 'Pavimento',
    wall: 'Rivestimento',
    outdoor: 'Esterno',
    mosaic: 'Mosaico',
}

export function AdminProductsPage() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<ProductStatus | undefined>()
    const [categoryFilter, setCategoryFilter] = useState<ProductCategory | undefined>()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const { products, loading, error, total, deleteProduct, refetch } = useProducts({
        search: search || undefined,
        status: statusFilter,
        category: categoryFilter,
    })

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Sei sicuro di voler eliminare "${name}"?`)) {
            return
        }

        setDeletingId(id)
        const { error } = await deleteProduct(id)
        setDeletingId(null)

        if (error) {
            alert(`Errore durante l'eliminazione: ${error.message}`)
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestione Prodotti</h1>
                    <p className="text-gray-500 mt-1">{total} prodotti totali</p>
                </div>
                <Link
                    to="/admin/products/new"
                    className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuovo Prodotto
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cerca per nome o SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter || ''}
                        onChange={(e) => setStatusFilter(e.target.value as ProductStatus || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="">Tutti gli stati</option>
                        <option value="active">Attivi</option>
                        <option value="draft">Bozze</option>
                        <option value="out_of_stock">Esauriti</option>
                        <option value="discontinued">Sospesi</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter || ''}
                        onChange={(e) => setCategoryFilter(e.target.value as ProductCategory || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                        <option value="">Tutte le categorie</option>
                        <option value="floor">Pavimento</option>
                        <option value="wall">Rivestimento</option>
                        <option value="outdoor">Esterno</option>
                        <option value="mosaic">Mosaico</option>
                    </select>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <p className="text-red-700">Errore: {error.message}</p>
                    <button onClick={refetch} className="text-red-600 underline mt-2">
                        Riprova
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun prodotto trovato</h3>
                    <p className="text-gray-500 mb-4">
                        {search || statusFilter || categoryFilter
                            ? 'Prova a modificare i filtri di ricerca'
                            : 'Inizia aggiungendo il tuo primo prodotto'}
                    </p>
                    <Link
                        to="/admin/products/new"
                        className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                        Aggiungi Prodotto
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Prodotto
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        SKU
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Categoria
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Prezzo
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stock
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stato
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {products.map((product) => {
                                    const images = product.images as string[] | null
                                    const firstImage = images?.[0]
                                    const statusInfo = STATUS_LABELS[product.status as ProductStatus] || { label: product.status, color: 'bg-gray-100' }

                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {firstImage ? (
                                                        <img
                                                            src={firstImage}
                                                            alt={product.name}
                                                            className="w-12 h-12 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900">{product.name}</p>
                                                        {product.color_name && (
                                                            <p className="text-sm text-gray-500">{product.color_name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                                {product.sku}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {product.category ? CATEGORY_LABELS[product.category] : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                €{product.price_per_sqm.toFixed(2)}/mq
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {product.stock_qty != null ? `${product.stock_qty} mq` : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        to={`/admin/products/${product.id}`}
                                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Modifica"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        disabled={deletingId === product.id}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Elimina"
                                                    >
                                                        {deletingId === product.id ? (
                                                            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
