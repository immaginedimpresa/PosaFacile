import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useProducts, useProduct } from '@/hooks/useProducts'
import { ImageUpload } from '@/components/admin/ImageUpload'
import type { Database } from '@/types/supabase'
import { Package, ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

export function AdminProductFormPage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    // La creazione avviene in modale dal catalogo: questa pagina modifica una
    // scheda esistente. Il valore 'new' resta gestito per i vecchi segnalibri.
    const isEditing = Boolean(id && id !== 'new')
    const productId = isEditing ? (id as string) : ''

    const { product, loading: productLoading, error: productError } = useProduct(productId)
    const { createProduct, updateProduct } = useProducts()

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState<ProductInsert>({
        sku: '',
        name: '',
        slug: '',
        description: '',
        category: null,
        material: null,
        format_width: null,
        format_height: null,
        thickness: null,
        finish: null,
        color_name: '',
        color_hex: '',
        style_tags: [],
        price_per_sqm: 0,
        cost_per_sqm: null,
        min_order_sqm: 1,
        stock_qty: 0,
        lead_time_days: 7,
        images: [],
        tileable_image_url: '',
        datasheet_url: '',
        certifications: [],
        status: 'draft',
        seo_title: '',
        seo_description: '',
    })

    // Load existing product data
    useEffect(() => {
        if (product) {
            setFormData({
                sku: product.sku,
                name: product.name,
                slug: product.slug,
                description: product.description || '',
                category: product.category,
                material: product.material,
                format_width: product.format_width,
                format_height: product.format_height,
                thickness: product.thickness,
                finish: product.finish,
                color_name: product.color_name || '',
                color_hex: product.color_hex || '',
                style_tags: product.style_tags || [],
                price_per_sqm: product.price_per_sqm,
                cost_per_sqm: product.cost_per_sqm,
                min_order_sqm: product.min_order_sqm || 1,
                stock_qty: product.stock_qty || 0,
                lead_time_days: product.lead_time_days || 7,
                images: (product.images as string[]) || [],
                tileable_image_url: product.tileable_image_url || '',
                datasheet_url: product.datasheet_url || '',
                certifications: (product.certifications as string[]) || [],
                status: product.status || 'draft',
                seo_title: product.seo_title || '',
                seo_description: product.seo_description || '',
            })
        }
    }, [product])

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value
        setFormData((prev) => ({
            ...prev,
            name,
            slug: !isEditing ? generateSlug(name) : prev.slug,
        }))
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]:
                type === 'number'
                    ? value === '' ? null : parseFloat(value)
                    : value === '' ? null : value,
        }))
    }

    const handleImagesChange = (images: string[]) => {
        setFormData((prev) => ({
            ...prev,
            images,
            // If no AI texture is selected yet, use the first image as fallback
            tileable_image_url: prev.tileable_image_url || images[0] || ''
        }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaving(true)

        // Validation
        if (!formData.name.trim()) {
            setError('Il nome del prodotto è obbligatorio')
            setSaving(false)
            return
        }

        if (!formData.sku.trim()) {
            setError('Lo SKU è obbligatorio')
            setSaving(false)
            return
        }

        if (formData.price_per_sqm <= 0) {
            setError('Il prezzo al mq deve essere maggiore di zero')
            setSaving(false)
            return
        }

        try {
            if (isEditing && productId) {
                const { error: updateErr } = await updateProduct(productId, formData as ProductUpdate)
                if (updateErr) throw updateErr
                toast.success('Prodotto aggiornato con successo')
            } else {
                const { error: createErr } = await createProduct(formData)
                if (createErr) throw createErr
                toast.success('Prodotto creato con successo')
            }

            navigate('/admin/products')
        } catch (err: any) {
            setError(err.message || 'Errore durante il salvataggio')
            toast.error(err.message || 'Errore durante il salvataggio')
        } finally {
            setSaving(false)
        }
    }

    if (productLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-96">
                <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-stone-500 mt-4">Caricamento scheda prodotto...</p>
            </div>
        )
    }

    if (productError) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-rose-900">Errore nel caricamento</h3>
                    <p className="text-rose-700 text-sm mt-1">{productError.message}</p>
                    <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-sm mt-4 hover:underline">
                        <ArrowLeft size={16} /> Torna alla lista
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
            {/* Intestazione standard: badge icona, titolo, azioni a destra */}
            <div className="space-y-4">
                <Link
                    to="/admin/products"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 rounded-xl border border-stone-200/90 shadow-2xs transition-all active:scale-95"
                >
                    <ArrowLeft size={16} className="text-stone-500" />
                    Torna al catalogo
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                                {isEditing ? formData.name || 'Modifica prodotto' : 'Nuovo prodotto'}
                            </h1>
                            <p className="text-stone-500 text-sm mt-0.5">
                                {isEditing
                                    ? 'Aggiorna scheda tecnica, prezzi e disponibilità'
                                    : 'Compila la scheda per pubblicare un articolo a catalogo'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                    <p className="text-rose-800 text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="text-rose-600 font-bold text-xs underline cursor-pointer">Chiudi</button>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Media Section */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6">
                    <div className="-mx-6 px-6 pb-4 mb-6 border-b border-stone-100">
                        <h2 className="text-base sm:text-lg font-bold text-stone-900">Immagini e texture</h2>
                        <p className="text-xs text-stone-500 mt-0.5">La prima immagine è quella che vede il cliente e che usa il visualizzatore</p>
                    </div>
                    <ImageUpload
                        images={formData.images as string[]}
                        onImagesChange={handleImagesChange}
                    />

                    {/* AI Texture Selection (NEW) */}
                    <div className="mt-6 pt-6 border-t border-stone-100">
                        <h3 className="text-sm sm:text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
                            <span className="p-1 bg-orange-50 text-orange-600 rounded">✨</span>
                            Texture per Visualizzatore IA
                        </h3>
                        <p className="text-sm text-stone-500 mb-4">
                            Scegli quale immagine usare per il rendering 3D/IA. Deve essere una foto piatta del materiale.
                        </p>

                        <div className="flex items-center gap-4">
                            {formData.tileable_image_url ? (
                                <div className="relative w-20 h-20 group">
                                    <img
                                        src={formData.tileable_image_url}
                                        className="w-full h-full object-cover rounded-lg border-2 border-orange-500"
                                        alt="Texture IA"
                                    />
                                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        ACTIVE
                                    </div>
                                </div>
                            ) : (
                                <div className="w-20 h-20 bg-stone-100 rounded-lg border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 text-xs text-center p-2">
                                    Nessuna texture
                                </div>
                            )}

                            <div className="flex-1">
                                <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wider">URL Texture Manuale</label>
                                <input
                                    type="text"
                                    name="tileable_image_url"
                                    value={formData.tileable_image_url || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Quick selector from gallery */}
                        {(formData.images as string[]).length > 0 && (
                            <div className="mt-4">
                                <span className="text-xs font-medium text-stone-500 block mb-2 uppercase tracking-wider">Scegli dalla gallery:</span>
                                <div className="flex flex-wrap gap-2">
                                    {(formData.images as string[]).map((url, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, tileable_image_url: url }))}
                                            className={`px-3 py-1 text-xs rounded-full border transition-all ${formData.tileable_image_url === url
                                                ? 'bg-orange-500 text-white border-orange-500'
                                                : 'bg-white text-stone-600 border-stone-200/90 hover:border-orange-300'
                                                }`}
                                        >
                                            Usa Foto {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6">
                    <div className="-mx-6 px-6 pb-4 mb-6 border-b border-stone-100">
                        <h2 className="text-base sm:text-lg font-bold text-stone-900">Informazioni base</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Codice, nome e descrizione commerciale</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                                SKU <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="ES: POR-GRE-001"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                                Nome <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleNameChange}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="Gres Porcellanato Bianco"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                                Slug <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="gres-porcellanato-bianco"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Stato</label>
                            <select
                                name="status"
                                value={formData.status || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            >
                                <option value="draft">Bozza</option>
                                <option value="active">Attivo</option>
                                <option value="out_of_stock">Esaurito</option>
                                <option value="discontinued">Sospeso</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Descrizione</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            placeholder="Descrizione dettagliata del prodotto..."
                        />
                    </div>
                </div>

                {/* Technical Details */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6">
                    <div className="-mx-6 px-6 pb-4 mb-6 border-b border-stone-100">
                        <h2 className="text-base sm:text-lg font-bold text-stone-900">Dettagli tecnici</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Formato, materiale e finitura: determinano la stima dei giorni di posa</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Categoria</label>
                            <select
                                name="category"
                                value={formData.category || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            >
                                <option value="">Seleziona...</option>
                                <option value="floor">Pavimento</option>
                                <option value="wall">Rivestimento</option>
                                <option value="outdoor">Esterno</option>
                                <option value="mosaic">Mosaico</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Materiale</label>
                            <select
                                name="material"
                                value={formData.material || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            >
                                <option value="">Seleziona...</option>
                                <option value="gres">Gres Porcellanato</option>
                                <option value="ceramic">Ceramica</option>
                                <option value="cotto">Cotto</option>
                                <option value="natural_stone">Pietra Naturale</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Finitura</label>
                            <select
                                name="finish"
                                value={formData.finish || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                            >
                                <option value="">Seleziona...</option>
                                <option value="matt">Opaco</option>
                                <option value="glossy">Lucido</option>
                                <option value="textured">Strutturato</option>
                                <option value="lappato">Lappato</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Larghezza (mm)</label>
                            <input
                                type="number"
                                name="format_width"
                                value={formData.format_width || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Altezza (mm)</label>
                            <input
                                type="number"
                                name="format_height"
                                value={formData.format_height || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Spessore (mm)</label>
                            <input
                                type="number"
                                step="0.1"
                                name="thickness"
                                value={formData.thickness || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="9.5"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Nome Colore</label>
                            <input
                                type="text"
                                name="color_name"
                                value={formData.color_name || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="Bianco Carrara"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Colore HEX</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    name="color_hex"
                                    value={formData.color_hex || '#ffffff'}
                                    onChange={handleChange}
                                    className="h-10 w-14 border border-stone-200 rounded-lg"
                                />
                                <input
                                    type="text"
                                    value={formData.color_hex || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, color_hex: e.target.value }))}
                                    className="flex-1 px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="#FFFFFF"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing & Stock */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6">
                    <div className="-mx-6 px-6 pb-4 mb-6 border-b border-stone-100">
                        <h2 className="text-base sm:text-lg font-bold text-stone-900">Prezzi e magazzino</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Prezzo al metro quadro, scorte e tempi di approvvigionamento</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                                Prezzo Vendita (€/mq) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="price_per_sqm"
                                value={formData.price_per_sqm}
                                onChange={handleChange}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="35.00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Costo (€/mq)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="cost_per_sqm"
                                value={formData.cost_per_sqm || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="20.00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Ordine Minimo (mq)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="min_order_sqm"
                                value={formData.min_order_sqm || 1}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="1"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Stock (mq)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="stock_qty"
                                value={formData.stock_qty || ''}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="100"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Lead Time (giorni)</label>
                            <input
                                type="number"
                                name="lead_time_days"
                                value={formData.lead_time_days || 7}
                                onChange={handleChange}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="7"
                            />
                        </div>
                    </div>
                </div>

                {/* SEO */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6">
                    <div className="-mx-6 px-6 pb-4 mb-6 border-b border-stone-100">
                        <h2 className="text-base sm:text-lg font-bold text-stone-900">Ottimizzazione SEO</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Titolo e descrizione mostrati nei risultati di ricerca</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Titolo SEO</label>
                            <input
                                type="text"
                                name="seo_title"
                                value={formData.seo_title || ''}
                                onChange={handleChange}
                                maxLength={70}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="Titolo per i motori di ricerca"
                            />
                            <p className="text-xs text-stone-400 mt-1 font-medium">{(formData.seo_title || '').length}/70 caratteri</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Descrizione SEO</label>
                            <textarea
                                name="seo_description"
                                value={formData.seo_description || ''}
                                onChange={handleChange}
                                maxLength={160}
                                rows={2}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
                                placeholder="Descrizione per i motori di ricerca"
                            />
                            <p className="text-xs text-stone-400 mt-1 font-medium">{(formData.seo_description || '').length}/160 caratteri</p>
                        </div>
                    </div>
                </div>

                {/* Barra azioni: resta raggiungibile senza tornare in fondo */}
                <div className="sticky bottom-4 flex items-center justify-end gap-3 bg-white/85 backdrop-blur-sm border border-stone-200/90 rounded-2xl shadow-xs p-3">
                    <Link
                        to="/admin/products"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200/90 text-sm font-bold shadow-2xs active:scale-95 transition-all"
                    >
                        Annulla
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 cursor-pointer"
                    >
                        {saving && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        <Save size={16} />
                        <span>{isEditing ? 'Salva Modifiche' : 'Crea Prodotto'}</span>
                    </button>
                </div>
            </form>
        </div>
    )
}
