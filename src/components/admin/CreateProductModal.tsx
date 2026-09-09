import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { useProducts } from '@/hooks/useProducts'
import { ImageUpload } from '@/components/admin/ImageUpload'
import type { Database } from '@/types/supabase'

type ProductInsert = Database['public']['Tables']['products']['Insert']

interface CreateProductModalProps {
    isOpen: boolean
    onClose: () => void
    onCreated?: () => void
}

const generaSlug = (nome: string) =>
    nome.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

const CAMPI_INIZIALI = {
    sku: '',
    name: '',
    slug: '',
    category: 'floor' as const,
    material: 'gres' as const,
    price_per_sqm: 0,
    format_width: 600,
    format_height: 600,
    images: [] as string[],
}

/**
 * Creazione rapida di un prodotto.
 *
 * Chiede solo quello che serve per esistere a catalogo: identificativo,
 * nome, categoria, formato, prezzo e almeno un'immagine. Il resto della
 * scheda — finitura, spessore, scorte, SEO — si compila dopo, nella pagina
 * di modifica, dove c'e' lo spazio per farlo bene. Una modale con trenta
 * campi non sarebbe piu' comoda di una pagina.
 */
export function CreateProductModal({ isOpen, onClose, onCreated }: CreateProductModalProps) {
    const navigate = useNavigate()
    const { createProduct } = useProducts()
    const [dati, setDati] = useState(CAMPI_INIZIALI)
    const [saving, setSaving] = useState(false)
    const [errore, setErrore] = useState<string | null>(null)

    // Riaprendo la modale non devono restare i dati del tentativo precedente.
    useEffect(() => {
        if (isOpen) {
            setDati(CAMPI_INIZIALI)
            setErrore(null)
        }
    }, [isOpen])

    if (!isOpen) return null

    const aggiorna = (campo: string, valore: unknown) =>
        setDati((prev) => ({ ...prev, [campo]: valore }))

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setErrore(null)

        if (!dati.name.trim()) return setErrore('Il nome del prodotto è obbligatorio')
        if (!dati.sku.trim()) return setErrore('Lo SKU è obbligatorio')
        if (dati.price_per_sqm <= 0) return setErrore('Il prezzo al mq deve essere maggiore di zero')
        if (dati.images.length === 0) {
            return setErrore('Serve almeno un’immagine: è quella che il visualizzatore usa come materiale')
        }

        setSaving(true)
        try {
            const payload: ProductInsert = {
                ...dati,
                slug: dati.slug || generaSlug(dati.name),
                // Nasce come bozza: si pubblica dalla scheda completa, dopo
                // aver verificato il resto dei dati.
                status: 'draft',
                tileable_image_url: dati.images[0],
            }
            const { data, error } = await createProduct(payload)
            if (error) throw error

            toast.success('Prodotto creato come bozza')
            onCreated?.()
            onClose()
            // Si prosegue sulla scheda completa: la creazione è solo il primo passo.
            if (data?.id) navigate(`/admin/products/${data.id}`)
        } catch (err: any) {
            setErrore(err.message || 'Errore durante la creazione')
            toast.error(err.message || 'Errore durante la creazione')
        } finally {
            setSaving(false)
        }
    }

    const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 '
        + 'focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 '
        + 'text-sm font-medium transition-all outline-none'
    const labelClass = 'block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5'

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-stone-100"
                >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                <Package size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-stone-900">Nuovo Prodotto</h2>
                                <p className="text-xs text-stone-500">Dati essenziali: il resto si completa dopo</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        {errore && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800 font-medium">
                                {errore}
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>Immagine del materiale *</label>
                            <ImageUpload
                                images={dati.images}
                                onImagesChange={(images) => aggiorna('images', images)}
                            />
                            <p className="text-xs text-stone-400 mt-1.5 font-medium">
                                La prima immagine è quella che il visualizzatore usa come campione:
                                deve mostrare il materiale, non un ambiente arredato.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Nome *</label>
                                <input
                                    type="text"
                                    value={dati.name}
                                    onChange={(e) => {
                                        aggiorna('name', e.target.value)
                                        aggiorna('slug', generaSlug(e.target.value))
                                    }}
                                    className={inputClass}
                                    placeholder="Es. Gres Rovere Naturale"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>SKU *</label>
                                <input
                                    type="text"
                                    value={dati.sku}
                                    onChange={(e) => aggiorna('sku', e.target.value)}
                                    className={inputClass}
                                    placeholder="Es. GRE-ROV-001"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Categoria</label>
                                <select
                                    value={dati.category}
                                    onChange={(e) => aggiorna('category', e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="floor">Pavimento</option>
                                    <option value="wall">Rivestimento</option>
                                    <option value="outdoor">Esterno</option>
                                    <option value="mosaic">Mosaico</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Materiale</label>
                                <select
                                    value={dati.material}
                                    onChange={(e) => aggiorna('material', e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="gres">Gres porcellanato</option>
                                    <option value="ceramic">Ceramica</option>
                                    <option value="cotto">Cotto</option>
                                    <option value="natural_stone">Pietra naturale</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Base (mm)</label>
                                <input
                                    type="number"
                                    value={dati.format_width}
                                    onChange={(e) => aggiorna('format_width', parseInt(e.target.value, 10) || 0)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Altezza (mm)</label>
                                <input
                                    type="number"
                                    value={dati.format_height}
                                    onChange={(e) => aggiorna('format_height', parseInt(e.target.value, 10) || 0)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>€ / mq *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={dati.price_per_sqm || ''}
                                    onChange={(e) => aggiorna('price_per_sqm', parseFloat(e.target.value) || 0)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-stone-400 font-medium">
                            Il formato determina la resa di posa, quindi i giorni di cantiere stimati
                            nel preventivo.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                <Save size={15} />
                                <span>{saving ? 'Creazione...' : 'Crea e completa scheda'}</span>
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
