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
    const isEditing = id && id !== 'new'

    const { product, loading: productLoading, error: productError } = useProduct(id || '')
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
            if (isEditing && id) {
                const { error: updateErr } = await updateProduct(id, formData as ProductUpdate)
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
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to="/admin/products"
                    className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors mb-3 group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Torna al catalogo prodotti</span>
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Package className="w-8 h-8 text-orange-500" />
                        <span>{isEditing ? `Modifica: ${formData.name || 'Prodotto'}` : 'Nuovo Prodotto a Catalogo'}</span>
                    </h1>
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Prodotto</h2>
                    <ImageUpload
                        images={formData.images as string[]}
                        onImagesChange={handleImagesChange}
                    />

                    {/* AI Texture Selection (NEW) */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="p-1 bg-purple-100 text-purple-600 rounded">✨</span>
                            Texture per Visualizzatore IA
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Scegli quale immagine usare per il rendering 3D/IA. Deve essere una foto piatta del materiale.
                        </p>

                        <div className="flex items-center gap-4">
                            {formData.tileable_image_url ? (
                                <div className="relative w-20 h-20 group">
                                    <img
                                        src={formData.tileable_image_url}
                                        className="w-full h-full object-cover rounded-lg border-2 border-purple-500"
                                        alt="Texture IA"
                                    />
                                    <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        ACTIVE
                                    </div>
                                </div>
                            ) : (
                                <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-2">
                                    Nessuna texture
                                </div>
                            )}

                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">URL Texture Manuale</label>
                                <input
                                    type="text"
                                    name="tileable_image_url"
                                    value={formData.tileable_image_url || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>

                        {/* Quick selector from gallery */}
                        {(formData.images as string[]).length > 0 && (
                            <div className="mt-4">
                                <span className="text-xs font-medium text-gray-500 block mb-2 uppercase tracking-wider">Scegli dalla gallery:</span>
                                <div className="flex flex-wrap gap-2">
                                    {(formData.images as string[]).map((url, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, tileable_image_url: url }))}
                                            className={`px-3 py-1 text-xs rounded-full border transition-all ${formData.tileable_image_url === url
                                                ? 'bg-purple-500 text-white border-purple-500'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Base</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SKU <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="ES: POR-GRE-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleNameChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Gres Porcellanato Bianco"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Slug <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="gres-porcellanato-bianco"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                            <select
                                name="status"
                                value={formData.status || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="draft">Bozza</option>
                                <option value="active">Attivo</option>
                                <option value="out_of_stock">Esaurito</option>
                                <option value="discontinued">Sospeso</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Descrizione dettagliata del prodotto..."
                        />
                    </div>
                </div>

                {/* Technical Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Dettagli Tecnici</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <select
                                name="category"
                                value={formData.category || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="">Seleziona...</option>
                                <option value="floor">Pavimento</option>
                                <option value="wall">Rivestimento</option>
                                <option value="outdoor">Esterno</option>
                                <option value="mosaic">Mosaico</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Materiale</label>
                            <select
                                name="material"
                                value={formData.material || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="">Seleziona...</option>
                                <option value="gres">Gres Porcellanato</option>
                                <option value="ceramic">Ceramica</option>
                                <option value="cotto">Cotto</option>
                                <option value="natural_stone">Pietra Naturale</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Finitura</label>
                            <select
                                name="finish"
                                value={formData.finish || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="">Seleziona...</option>
                                <option value="matt">Opaco</option>
                                <option value="glossy">Lucido</option>
                                <option value="textured">Strutturato</option>
                                <option value="lappato">Lappato</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Larghezza (mm)</label>
                            <input
                                type="number"
                                name="format_width"
                                value={formData.format_width || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Altezza (mm)</label>
                            <input
                                type="number"
                                name="format_height"
                                value={formData.format_height || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spessore (mm)</label>
                            <input
                                type="number"
                                step="0.1"
                                name="thickness"
                                value={formData.thickness || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="9.5"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Colore</label>
                            <input
                                type="text"
                                name="color_name"
                                value={formData.color_name || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Bianco Carrara"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Colore HEX</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    name="color_hex"
                                    value={formData.color_hex || '#ffffff'}
                                    onChange={handleChange}
                                    className="h-10 w-14 border border-gray-300 rounded-lg"
                                />
                                <input
                                    type="text"
                                    value={formData.color_hex || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, color_hex: e.target.value }))}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="#FFFFFF"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing & Stock */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Prezzi e Magazzino</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prezzo Vendita (€/mq) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="price_per_sqm"
                                value={formData.price_per_sqm}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="35.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Costo (€/mq)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="cost_per_sqm"
                                value={formData.cost_per_sqm || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="20.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ordine Minimo (mq)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="min_order_sqm"
                                value={formData.min_order_sqm || 1}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock (mq)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="stock_qty"
                                value={formData.stock_qty || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (giorni)</label>
                            <input
                                type="number"
                                name="lead_time_days"
                                value={formData.lead_time_days || 7}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="7"
                            />
                        </div>
                    </div>
                </div>

                {/* SEO */}
                <div className="bg-white rounded-2xl shadow-xs border border-stone-200/90 p-6">
                    <h2 className="text-base font-bold text-stone-900 mb-4">Ottimizzazione SEO</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Titolo SEO</label>
                            <input
                                type="text"
                                name="seo_title"
                                value={formData.seo_title || ''}
                                onChange={handleChange}
                                maxLength={70}
                                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50 focus:bg-white text-sm"
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
                                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-stone-50/50 focus:bg-white text-sm"
                                placeholder="Descrizione per i motori di ricerca"
                            />
                            <p className="text-xs text-stone-400 mt-1 font-medium">{(formData.seo_description || '').length}/160 caratteri</p>
                        </div>
                    </div>
                </div>

                {/* Submit Bar */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Link
                        to="/admin/products"
                        className="px-5 py-2.5 border border-stone-200 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors shadow-xs"
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
