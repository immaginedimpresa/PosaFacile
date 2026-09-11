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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {professionals.map((pro, index) => (
                        <motion.div
                            key={pro.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.06 }}
                            className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-xs">
                                            {pro.full_name?.charAt(0) || 'P'}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold text-gray-900 truncate">{pro.full_name}</h3>
                                            {pro.company_name && (
                                                <p className="text-gray-500 text-xs truncate">{pro.company_name}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSelectProfessional(pro)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors shrink-0"
                                    >
                                        <span>Scegli</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap text-xs text-gray-600">
                                    <div className="flex items-center gap-1 font-semibold text-gray-900">
                                        <Star className="text-yellow-500 fill-yellow-500" size={14} />
                                        <span>{pro.rating.toFixed(1)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Briefcase size={14} className="text-gray-400" />
                                        <span>{pro.years_experience} anni</span>
                                    </div>
                                </div>

                                {pro.bio && (
                                    <p className="text-gray-600 text-xs mt-2.5 line-clamp-2 leading-relaxed">{pro.bio}</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
