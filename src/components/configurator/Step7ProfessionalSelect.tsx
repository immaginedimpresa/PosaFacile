import { useEffect, useState } from 'react'
import { useConfiguratorStore, layingRateFor } from '@/store/configuratorStore'
import { supabase } from '@/lib/supabase'
import { Star, Briefcase, ArrowRight, AlertCircle } from 'lucide-react'
import { loadComuni, provincesInSameRegion } from '@/lib/comuni'
import { motion } from 'framer-motion'

interface Professional {
    id: string
    full_name: string
    company_name: string
    rating: number
    years_experience: number
    bio: string
    price_per_sqm: number | null
    markup_percent: number | null
    markup_fixed: number | null
}

export function Step7ProfessionalSelect() {
    const { location, selectedProfessional, setSelectedProfessional, prevStep, nextStep } = useConfiguratorStore()
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [loading, setLoading] = useState(true)
    const [widenedToRegion, setWidenedToRegion] = useState(false)

    useEffect(() => {
        if (location.provincia) {
            fetchProfessionals()
        }
    }, [location.provincia])

    const fetchProfessionals = async () => {
        setLoading(true)
        setWidenedToRegion(false)
        try {
            // Normalize province code (uppercase + trim)
            const provinceCode = (location.provincia || '').trim().toUpperCase()
            console.log('🔎 [Step7] Fetching professionals for province:', provinceCode)

            const { data, error } = await supabase
                .from('professional_profiles')
                .select(`
                    id,
                    full_name,
                    company_name,
                    rating,
                    years_experience,
                    bio,
                    price_per_sqm,
                    markup_percent,
                    markup_fixed,
                    professional_zones!inner(province_code)
                `)
                .eq('professional_zones.province_code', provinceCode)
                .eq('verified', true)
                .order('rating', { ascending: false })

            if (error) throw error

            console.log('📊 [Step7] Query returned:', data?.length || 0, 'professionals')

            // If we got results, use them
            if (data && data.length > 0) {
                const uniquePros = data.filter((pro, index, self) =>
                    index === self.findIndex(p => p.id === pro.id)
                )

                // Verify existence in public.users to avoid FK errors
                // Verify existence in public.users can fail due to RLS. 
                // We assume professional_profiles is the source of truth for public display.
                // const proIds = uniquePros.map(p => p.id)
                // const { data: existingUsers, error: userCheckError } = await supabase.from('users').select('id').in('id', proIds)
                // if (userCheckError) console.error('❌ [Step7] User check error:', userCheckError)

                // Just use the profiles we found
                console.log('✅ [Step7] Setting', uniquePros.length, 'professionals')
                setProfessionals(uniquePros as any)
                return
            }

            // FALLBACK: Query all professionals and filter client-side
            console.warn('⚠️ [Step7] No results from join query, trying fallback...')
            const { data: allData, error: allError } = await supabase
                .from('professional_profiles')
                .select(`
                    id,
                    full_name,
                    company_name,
                    rating,
                    years_experience,
                    bio,
                    price_per_sqm,
                    markup_percent,
                    markup_fixed,
                    professional_zones!inner(province_code)
                `)
                .eq('verified', true)
                .order('rating', { ascending: false })

            if (allError) throw allError

            // Filter client-side by province
            const filtered = (allData || []).filter((pro: any) => {
                const zones = Array.isArray(pro.professional_zones) ? pro.professional_zones : []
                return zones.some((z: any) =>
                    (z.province_code || '').trim().toUpperCase() === provinceCode
                )
            })

            console.log('🔁 [Step7] Fallback found', filtered.length, 'professionals for', provinceCode)

            if (filtered.length > 0) {
                setProfessionals(filtered as any)
                return
            }

            // Provincia scoperta: si allarga alle altre province della stessa regione,
            // meglio proporre un posatore un po' più lontano che una lista vuota.
            const comuni = await loadComuni()
            const regionCodes = provincesInSameRegion(comuni, provinceCode)
            if (regionCodes.length === 0) {
                setProfessionals([])
                return
            }

            const inRegion = (allData || []).filter((pro: any) => {
                const zones = Array.isArray(pro.professional_zones) ? pro.professional_zones : []
                return zones.some((z: any) => regionCodes.includes((z.province_code || '').trim().toUpperCase()))
            })

            setWidenedToRegion(inRegion.length > 0)
            setProfessionals(inRegion as any)
        } catch (error) {
            console.error('❌ [Step7] Error fetching professionals:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = (pro: Professional) => {
        setSelectedProfessional({
            id: pro.id,
            full_name: pro.full_name,
            company_name: pro.company_name,
            rating: pro.rating,
            price_per_sqm: pro.price_per_sqm,
            markup_percent: pro.markup_percent ?? 0,
            markup_fixed: pro.markup_fixed ?? 0,
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Scegli il tuo Professionista</h2>
                <p className="text-gray-600">
                    {widenedToRegion
                        ? <>Nessun posatore copre <strong>{location.provincia}</strong>: ecco i disponibili nella stessa regione</>
                        : <>Professionisti disponibili in provincia di <strong>{location.provincia}</strong></>}
                </p>
            </div>

            {professionals.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center"
                >
                    <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Nessun professionista disponibile</h3>
                    <p className="text-gray-600 mb-6">
                        Non ci sono professionisti disponibili nella tua zona al momento.
                    </p>
                    <button
                        onClick={prevStep}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                    >
                        Torna Indietro
                    </button>
                </motion.div>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {professionals.map((pro, index) => {
                        const isSelected = selectedProfessional?.id === pro.id
                        return (
                            <motion.div
                                key={pro.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => handleSelect(pro)}
                                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                                        {pro.full_name?.charAt(0) || 'P'}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold">{pro.full_name}</h3>
                                        {pro.company_name && <p className="text-gray-600 text-sm">{pro.company_name}</p>}
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1">
                                                <Star className="text-yellow-500 fill-yellow-500" size={16} />
                                                <span className="font-semibold">{pro.rating.toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Briefcase size={16} />
                                                <span className="text-sm">{pro.years_experience} anni</span>
                                            </div>
                                        </div>
                                        {pro.bio && <p className="text-gray-600 text-sm mt-2 line-clamp-2">{pro.bio}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        {pro.price_per_sqm !== null && (
                                            <>
                                                <div className="text-xl font-bold text-gray-900">
                                                    € {layingRateFor({
                                                        id: pro.id, full_name: pro.full_name, company_name: pro.company_name,
                                                        rating: pro.rating, price_per_sqm: pro.price_per_sqm,
                                                        markup_percent: pro.markup_percent ?? 0,
                                                        markup_fixed: pro.markup_fixed ?? 0,
                                                    }).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-xs text-gray-500">al mq, posa</div>
                                            </>
                                        )}
                                        {isSelected && (
                                            <div className="text-orange-600 font-bold mt-2">✓ Selezionato</div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            <div className="flex justify-between pt-4">
                <button
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                    Indietro
                </button>
                <button
                    onClick={nextStep}
                    disabled={!selectedProfessional}
                    className="flex items-center gap-2 px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continua <ArrowRight size={20} />
                </button>
            </div>
        </div>
    )
}
