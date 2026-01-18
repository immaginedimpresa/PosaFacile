import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
    product: Product
}

export function ProductCard({ product }: ProductCardProps) {
    const images = Array.isArray(product.images) ? product.images : []
    const mainImage = images.length > 0 ? (images[0] as string) : 'https://placehold.co/400x400?text=No+Image'

    return (
        <Link to={`/products/${product.slug}`} className="group block h-full">
            <div className="relative h-full bg-white rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                {/* Image Container */}
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                    <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                    {/* Badge */}
                    {product.lead_time_days && product.lead_time_days <= 3 && (
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm">
                            Spedizione Rapida
                        </span>
                    )}

                    {/* Quick Action */}
                    <div className="absolute bottom-4 right-4 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="bg-white text-black p-3 rounded-full shadow-lg">
                            <ArrowRight size={20} />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">{product.category}</p>
                            <h3 className="font-display font-bold text-lg text-gray-900 leading-tight group-hover:text-primary transition-colors">
                                {product.name}
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                        <div>
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                € {product.price_per_sqm}
                            </span>
                            <span className="text-xs text-gray-400 font-medium ml-1">/ mq</span>
                        </div>

                        {product.tileable_image_url && (
                            <div className="flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                <Sparkles size={12} /> AI Ready
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}
