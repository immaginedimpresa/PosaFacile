import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Truck, Shield, Calculator } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/spinner'

import { useConfiguratorStore } from '@/store/configuratorStore'

type Product = Database['public']['Tables']['products']['Row']

export function ProductDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const { setSelectedProduct, setCurrentStep } = useConfiguratorStore()

    useEffect(() => {
        async function fetchProduct() {
            if (!slug) return
            setLoading(true)
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('slug', slug)
                .single()

            if (!error) {
                setProduct(data)
            }
            setLoading(false)
        }
        fetchProduct()
    }, [slug])

    const handleRequestQuote = () => {
        if (!product) return

        // Pre-select product in configurator store
        const images = Array.isArray(product.images) ? product.images as string[] : []
        setSelectedProduct({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price_per_sqm: product.price_per_sqm,
            images: images,
            category: product.category,
            material: product.material,
        })

        // Skip to step 1 (project type) since product is already selected
        setCurrentStep(1)

        // Navigate to configurator
        navigate('/configuratore')
    }

    if (loading) return (
        <div className="container mx-auto py-32 flex justify-center">
            <LoadingSpinner className="w-10 h-10" />
        </div>
    )

    if (!product) return (
        <div className="container mx-auto py-32 text-center">
            <h1 className="text-2xl font-bold mb-4">Prodotto non trovato</h1>
            <Link to="/catalog">
                <Button>Torna al Catalogo</Button>
            </Link>
        </div>
    )

    const images = Array.isArray(product.images) ? product.images : []
    const mainImage = images.length > 0 ? (images[0] as string) : 'https://placehold.co/600x600?text=No+Image'

    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/catalog" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8">
                <ArrowLeft size={16} className="mr-2" /> Torna al catalogo
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Gallery Section */}
                <div className="space-y-6">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                        <img src={mainImage} className="w-full h-full object-cover" alt={product.name} />
                    </div>
                    {/* AI Visualizer Integration */}

                </div>

                {/* Product Info */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                        <span className="capitalize px-3 py-1 bg-gray-100 rounded-full">{product.category}</span>
                        <span className="capitalize px-3 py-1 bg-gray-100 rounded-full">{product.material}</span>
                        <span>SKU: {product.sku}</span>
                    </div>

                    <div className="text-4xl font-bold text-gray-900 mb-2">€ {product.price_per_sqm.toFixed(2)} <span className="text-lg font-normal text-gray-500">/ mq</span></div>
                    <p className="text-sm text-green-600 font-medium mb-8">Disponibile (Consegna in {product.lead_time_days} giorni)</p>

                    <div className="prose prose-sm text-gray-600 mb-8">
                        <p>{product.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="block text-gray-500">Dimensioni</span>
                            <span className="font-medium">{product.format_width}x{product.format_height} cm</span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="block text-gray-500">Spessore</span>
                            <span className="font-medium">{product.thickness} mm</span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="block text-gray-500">Finitura</span>
                            <span className="font-medium capitalize">{product.finish}</span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="block text-gray-500">Ordine Minimo</span>
                            <span className="font-medium">{product.min_order_sqm} mq</span>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <Button
                            size="lg"
                            className="w-full text-lg h-14 bg-orange-500 hover:bg-orange-600"
                            onClick={handleRequestQuote}
                        >
                            <Calculator className="w-5 h-5 mr-2" />
                            Configura Preventivo Gratuito
                        </Button>
                        <p className="text-xs text-center text-gray-500">
                            Calcola in pochi step il costo completo di materiale e posa.
                        </p>
                    </div>

                    <div className="border-t pt-6 space-y-3">
                        <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 mt-0.5" />
                            <p className="text-sm text-gray-600">Qualità garantita PosaFacile</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-600">Spedizione assicurata in tutta Italia</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-600">Garanzia soddisfatti o rimborsati sul materiale</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
