import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import type { Database } from '@/types/supabase'
import {
    Package,
    FileUp,
    Plus,
    Search,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    Edit3,
    Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { CreateProductModal } from '@/components/admin/CreateProductModal'
import { ImportProductsDialog } from '@/components/admin/ImportProductsDialog'


type Product = Database['public']['Tables']['products']['Row']
type ProductStatus = Exclude<Product['status'], null>
type ProductCategory = Product['category']

const STATUS_LABELS: Record<ProductStatus, { label: string; color: string; dotColor: string }> = {
    draft: { label: 'Bozza', color: 'bg-stone-100 text-stone-700 border-stone-300', dotColor: 'bg-stone-400' },
    active: { label: 'Attivo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
    out_of_stock: { label: 'Esaurito', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
    discontinued: { label: 'Sospeso', color: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
}

const CATEGORY_LABELS: Record<NonNullable<ProductCategory>, string> = {
    floor: 'Pavimento',
    wall: 'Rivestimento',
    outdoor: 'Esterno',
    mosaic: 'Mosaico',
}

export function AdminProductsPage() {
    const [createOpen, setCreateOpen] = useState(false)
    const [csvOpen, setCsvOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<ProductStatus | undefined>()
    const [categoryFilter, setCategoryFilter] = useState<ProductCategory | undefined>()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const { products, loading, error, total, deleteProduct, updateProduct, createProduct, refetch } = useProducts({
        search: search || undefined,
        status: statusFilter,
        category: categoryFilter,
    })

    const handleRefresh = async () => {
        setRefreshing(true)
        await refetch()
        setRefreshing(false)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Sei sicuro di voler eliminare definitivamente "${name}"?`)) {
            return
        }

        setDeletingId(id)
        const { error } = await deleteProduct(id)
        setDeletingId(null)

        if (error) {
            toast.error(`Errore eliminazione: ${error.message}`)
        } else {
            toast.success(`Prodotto "${name}" eliminato`)
            refetch()
        }
    }

    const handleDuplicate = async (product: Product) => {
        setDuplicatingId(product.id)
        try {
            const newSku = `${product.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`
            const { id, created_at, updated_at, ...rest } = product as any
            const { error } = await createProduct({
                ...rest,
                name: `${product.name} (Copia)`,
                sku: newSku,
                status: 'draft'
            })
            if (error) throw error
            toast.success(`Prodotto duplicato come bozza: SKU ${newSku}`)
            refetch()
        } catch (err: any) {
            toast.error(`Errore durante la duplicazione: ${err.message}`)
        } finally {
            setDuplicatingId(null)
        }
    }

    // KPI Metrics calculation
    const kpiMetrics = useMemo(() => {
        const totalCount = products.length
        const activeCount = products.filter(p => p.status === 'active').length
        const draftCount = products.filter(p => p.status === 'draft').length
        const outOfStockCount = products.filter(p => p.status === 'out_of_stock' || p.status === 'discontinued').length

        return {
            totalCount,
            activeCount,
            draftCount,
            outOfStockCount
        }
    }, [products])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Package className="w-8 h-8 text-orange-500" />
                        <span>Gestione Prodotti</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Catalogo pavimenti e rivestimenti, prezzi di acquisto e vendita al mq, disponibilità e schede tecniche.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setCsvOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                        <FileUp size={16} className="text-orange-500" />
                        <span>Carica CSV</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20"
                    >
                        <Plus size={16} />
                        <span>Nuovo Prodotto</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Ricarica prodotti"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Totale Prodotti */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Package size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Totale Catalogo
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {total}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                            {products.length} mostrati
                        </div>
                    </div>
                </div>

                {/* 2. Prodotti Attivi */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Prodotti Attivi
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.activeCount}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                            Visibili nello store
                        </div>
                    </div>
                </div>

                {/* 3. Bozze in Lavorazione */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Bozze / Lavorazione
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.draftCount}
                        </div>
                        <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                            In attesa di pubblicazione
                        </div>
                    </div>
                </div>

                {/* 4. Esauriti o Sospesi */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Esauriti / Sospesi
                        </div>
                        <div className="text-2xl font-black text-stone-900 mt-0.5">
                            {kpiMetrics.outOfStockCount}
                        </div>
                        <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                            Da riassortire
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter / Search Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Cerca */}
                    <div className="sm:col-span-6 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
                        <input
                            type="text"
                            placeholder="Cerca per nome, SKU o colore..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50"
                        />
                    </div>

                    {/* Filtro Stato */}
                    <div className="sm:col-span-3">
                        <select
                            value={statusFilter || ''}
                            onChange={(e) => setStatusFilter(e.target.value as ProductStatus || undefined)}
                            className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50"
                        >
                            <option value="">Tutti gli stati</option>
                            <option value="active">Attivi</option>
                            <option value="draft">Bozze</option>
                            <option value="out_of_stock">Esauriti</option>
                            <option value="discontinued">Sospesi</option>
                        </select>
                    </div>

                    {/* Filtro Categoria */}
                    <div className="sm:col-span-3">
                        <select
                            value={categoryFilter || ''}
                            onChange={(e) => setCategoryFilter(e.target.value as ProductCategory || undefined)}
                            className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50"
                        >
                            <option value="">Tutte le categorie</option>
                            <option value="floor">Pavimento</option>
                            <option value="wall">Rivestimento</option>
                            <option value="outdoor">Esterno</option>
                            <option value="mosaic">Mosaico</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                    <p className="text-rose-800 text-sm font-medium">Errore di caricamento: {error.message}</p>
                    <button onClick={handleRefresh} className="text-rose-600 font-bold text-xs underline cursor-pointer">
                        Riprova
                    </button>
                </div>
            )}

            {/* Content Table / Loading / Empty */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-16 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold text-stone-500 mt-4">Caricamento catalogo in corso...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
                        <Package size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1">Nessun prodotto trovato</h3>
                    <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
                        {search || statusFilter || categoryFilter
                            ? 'Nessun articolo corrisponde ai filtri selezionati. Prova a reimpostarli.'
                            : 'Inizia creando il tuo primo articolo a catalogo con prezzi e specifiche tecniche.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-500/20"
                    >
                        <Plus size={16} />
                        <span>Aggiungi Prodotto</span>
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50/80 border-b border-stone-200">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        Prodotto
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        SKU
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        Categoria
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        Prezzo Vendita
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        Giacenza Stock
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        Stato
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-stone-500 text-right">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-sm">
                                {products.map((product) => {
                                    const images = product.images as string[] | null
                                    const firstImage = images?.[0]
                                    const statusInfo = STATUS_LABELS[product.status as ProductStatus] || {
                                        label: product.status,
                                        color: 'bg-stone-100 text-stone-700 border-stone-200',
                                        dotColor: 'bg-stone-400'
                                    }

                                    return (
                                        <tr key={product.id} className="hover:bg-stone-50/70 transition-colors">
                                            {/* Prodotto & Thumb */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {firstImage ? (
                                                        <img
                                                            src={firstImage}
                                                            alt={product.name}
                                                            className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                                            <Package size={20} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-stone-900 leading-snug">{product.name}</p>
                                                        {product.color_name && (
                                                            <p className="text-xs text-stone-500 mt-0.5">{product.color_name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* SKU */}
                                            <td className="px-6 py-4 text-xs font-mono font-medium text-stone-600">
                                                {product.sku}
                                            </td>

                                            {/* Categoria */}
                                            <td className="px-6 py-4">
                                                {product.category ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-100 text-stone-700">
                                                        {CATEGORY_LABELS[product.category]}
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-400">—</span>
                                                )}
                                            </td>

                                            {/* Prezzo */}
                                            <td className="px-6 py-4 font-bold text-stone-900">
                                                € {product.price_per_sqm.toFixed(2)}
                                                <span className="text-xs font-normal text-stone-500 ml-1">/mq</span>
                                            </td>

                                            {/* Stock */}
                                            <td className="px-6 py-4 text-stone-600">
                                                {product.stock_qty != null ? (
                                                    <span className={`font-semibold ${product.stock_qty <= 10 ? 'text-amber-600' : 'text-stone-800'}`}>
                                                        {product.stock_qty} mq
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-400">—</span>
                                                )}
                                            </td>

                                            {/* Stato con inline quick change */}
                                            <td className="px-6 py-4">
                                                <select
                                                    value={product.status || 'draft'}
                                                    onChange={async (e) => {
                                                        const newStatus = e.target.value as ProductStatus
                                                        await updateProduct(product.id, { status: newStatus })
                                                        toast.success(`Stato aggiornato a ${newStatus}`)
                                                        refetch()
                                                    }}
                                                    className={`px-3 py-1 text-xs font-bold rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${statusInfo.color}`}
                                                >
                                                    <option value="active">Attivo</option>
                                                    <option value="draft">Bozza</option>
                                                    <option value="out_of_stock">Esaurito</option>
                                                    <option value="discontinued">Sospeso</option>
                                                </select>
                                            </td>

                                            {/* Azioni */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Duplica */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDuplicate(product)}
                                                        disabled={duplicatingId === product.id}
                                                        className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                                                        title="Duplica prodotto"
                                                    >
                                                        {duplicatingId === product.id ? (
                                                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Copy size={16} />
                                                        )}
                                                    </button>

                                                    {/* Modifica */}
                                                    <Link
                                                        to={`/admin/products/${product.id}`}
                                                        className="p-2 text-stone-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                                                        title="Modifica scheda prodotto"
                                                    >
                                                        <Edit3 size={16} />
                                                    </Link>

                                                    {/* Elimina */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        disabled={deletingId === product.id}
                                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                                                        title="Elimina prodotto"
                                                    >
                                                        {deletingId === product.id ? (
                                                            <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Trash2 size={16} />
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
            <CreateProductModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleRefresh}
            />
            {csvOpen && (
                <ImportProductsDialog
                    onClose={() => setCsvOpen(false)}
                    onImported={handleRefresh}
                />
            )}

        </div>
    )
}
