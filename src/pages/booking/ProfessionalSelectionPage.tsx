import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useBookingStore } from '@/store/bookingStore'
import { useSyncBookingOnAuth } from '@/hooks/useSyncBookingOnAuth'
import { Star, Briefcase, ArrowRight, AlertCircle } from 'lucide-react'

interface Professional {
    id: string
    full_name: string
    company_name: string
    rating: number
    years_experience: number
    bio: string
}

export function ProfessionalSelectionPage() {
    const navigate = useNavigate()
    const { installationAddress, setSelectedProfessional } = useBookingStore()
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [loading, setLoading] = useState(true)

    // Sync booking data if user just logged in
    useSyncBookingOnAuth()

    useEffect(() => {
        if (!installationAddress) {
            navigate('/cart')
            return
        }
        fetchProfessionals()
    }, [installationAddress])

    const fetchProfessionals = async () => {
        if (!installationAddress) return

        setLoading(true)
        try {
            // Query professionisti nella provincia scelta
            const { data, error } = await supabase
                .from('professional_profiles')
                .select(`
                    id,
                    full_name,
                    company_name,
                    rating,
                    years_experience,
                    bio,
                    professional_zones!inner(province_code)
                `)
                .eq('professional_zones.province_code', installationAddress.province)
                .eq('verified', true)
                .order('rating', { ascending: false })

            if (error) throw error

            // Rimuovi duplicati (join potrebbe crearne)
            const uniquePros = data?.filter((pro, index, self) =>
                index === self.findIndex(p => p.id === pro.id)
            ) || []

            setProfessionals(uniquePros as any)
        } catch (error) {
            console.error('Error fetching professionals:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectProfessional = (pro: Professional) => {
        setSelectedProfessional(pro)
        navigate(`/booking/calendar/${pro.id}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Cerco professionisti disponibili...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Scegli il tuo Professionista</h1>
                    <p className="text-gray-600">
                        Professionisti disponibili in provincia di <strong>{installationAddress?.province}</strong> ({installationAddress?.city})
                    </p>
                </div>

                {/* Empty State */}
                {professionals.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center"
                    >
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="text-amber-600" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Nessun professionista disponibile</h3>
                        <p className="text-gray-600 mb-6">
                            Non ci sono professionisti disponibili nella tua zona al momento.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => navigate('/cart')}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                Torna Indietro
                            </button>
                            <a
                                href="mailto:info@posafacile.it"
                                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                            >
                                Contattaci
                            </a>
                        </div>
                    </motion.div>
                )}

                {/* Professionals List */}
                <div className="space-y-4">
                    {professionals.map((pro, index) => (
                        <motion.div
                            key={pro.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-start gap-4 mb-3">
                                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                                            {pro.full_name?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{pro.full_name}</h3>
                                            {pro.company_name && (
                                                <p className="text-gray-600">{pro.company_name}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2">
                                                {/* Rating */}
                                                <div className="flex items-center gap-1">
                                                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                                                    <span className="font-semibold text-gray-900">{pro.rating.toFixed(1)}</span>
                                                </div>
                                                {/* Experience */}
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Briefcase size={16} />
                                                    <span className="text-sm">{pro.years_experience} anni</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Bio */}
                                    {pro.bio && (
                                        <p className="text-gray-600 text-sm line-clamp-2">{pro.bio}</p>
                                    )}
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => handleSelectProfessional(pro)}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors whitespace-nowrap"
                                >
                                    Scegli
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
