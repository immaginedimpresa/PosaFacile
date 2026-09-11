import { useEffect, useState } from 'react'
import { useConfiguratorStore } from '@/store/configuratorStore'
import { fetchRates } from '@/services/ratesService'
import { supabase } from '@/lib/supabase'
import { Star, Briefcase, AlertCircle, MapPin, Check } from 'lucide-react'
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
    markup_overrides?: Record<string, number> | null
    coverage_mode: string
    /** Valorizzata solo per chi copre un raggio e se conosciamo le coordinate. */
    distance_km: number | null
}

import { toast } from 'sonner'
import { offersMaterialHandling } from '@/services/ratesService'

export function Step7ProfessionalSelect() {
    const {
        location,
        deliveryAccess,
        setDeliveryAccess,
        selectedProfessional,
        setSelectedProfessional,
        setProfessionalRates,
        prevStep,
    } = useConfiguratorStore()

    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [loading, setLoading] = useState(true)
    const [widenedToRegion, setWidenedToRegion] = useState(false)

    useEffect(() => {
        if (location.provincia) {
            fetchProfessionals()
        }
    }, [location.provincia, location.lat, location.lon])

    const fetchProfessionals = async () => {
        setLoading(true)
        setWidenedToRegion(false)
        try {
            const provinceCode = (location.provincia || '').trim().toUpperCase()

            // professionals_for_location unisce le due modalità di copertura:
            // chi ha scelto le province e chi ha scelto un raggio attorno a un punto.
            const { data, error } = await supabase.rpc('professionals_for_location', {
                p_province: provinceCode,
                p_lat: location.lat ?? undefined,
                p_lon: location.lon ?? undefined,
            })
            if (error) throw error

            if (data && data.length > 0) {
                setProfessionals(data as Professional[])
                return
            }

            // Provincia scoperta: si allarga alle altre province della stessa regione
            const comuni = await loadComuni()
            const regionCodes = provincesInSameRegion(comuni, provinceCode)
                .filter(code => code !== provinceCode)

            const perProvince = await Promise.all(
                regionCodes.map(code =>
                    supabase.rpc('professionals_for_location', {
                        p_province: code,
                        p_lat: location.lat ?? undefined,
                        p_lon: location.lon ?? undefined,
                    })
                )
            )

            const seen = new Set<string>()
            const inRegion: Professional[] = []
            for (const { data: rows } of perProvince) {
                for (const pro of (rows ?? []) as Professional[]) {
                    if (seen.has(pro.id)) continue
                    seen.add(pro.id)
                    inRegion.push(pro)
                }
            }

            setWidenedToRegion(inRegion.length > 0)
            setProfessionals(inRegion)
        } catch (error) {
            console.error('[Step7ProfessionalSelect] Errore nel recupero dei professionisti:', error)
            setProfessionals([])
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = async (pro: Professional) => {
        setSelectedProfessional({
            id: pro.id,
            full_name: pro.full_name,
            company_name: pro.company_name,
            rating: pro.rating,
            price_per_sqm: pro.price_per_sqm,
            markup_percent: pro.markup_percent ?? 0,
            markup_fixed: pro.markup_fixed ?? 0,
            markup_overrides: pro.markup_overrides ?? {},
        })
        const rates = await fetchRates(pro.id)
        setProfessionalRates(rates)

        // Se al passaggio precedente l'utente aveva scelto "Lo porta il posatore" ma questo posatore non offre il servizio:
        if (deliveryAccess.handlingBy === 'pro' && !offersMaterialHandling(rates)) {
            setDeliveryAccess({ handlingBy: 'client' })
            toast.info(
                `${pro.company_name || pro.full_name} non effettua il trasporto al piano: il materiale dovrà essere portato al piano a cura del cliente (o puoi scegliere la consegna al piano del corriere).`,
                { duration: 6000 }
            )
        }
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
                <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                    {professionals.map((pro, index) => {
                        const isSelected = selectedProfessional?.id === pro.id
                        return (
                            <motion.div
                                key={pro.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.06 }}
                                onClick={() => handleSelect(pro)}
                                className={`p-5 sm:p-6 rounded-2xl border-2 cursor-pointer transition-all ${isSelected
                                    ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/10 shadow-xs'
                                    : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0 shadow-xs">
                                            {pro.full_name?.charAt(0) || 'P'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base sm:text-lg font-bold text-stone-900 truncate">{pro.full_name}</h3>
                                                {isSelected && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md sm:hidden">
                                                        Selezionato
                                                    </span>
                                                )}
                                            </div>
                                            {pro.company_name && (
                                                <p className="text-stone-500 text-xs sm:text-sm truncate">{pro.company_name}</p>
                                            )}
                                            <div className="flex items-center gap-3 sm:gap-4 mt-2 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Star className="text-yellow-500 fill-yellow-500" size={15} />
                                                    <span className="font-bold text-xs sm:text-sm text-stone-800">{pro.rating.toFixed(1)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-stone-600">
                                                    <Briefcase size={15} className="text-stone-400" />
                                                    <span className="text-xs sm:text-sm">{pro.years_experience} anni</span>
                                                </div>
                                                {pro.distance_km !== null && (
                                                    <div className="flex items-center gap-1 text-stone-600">
                                                        <MapPin size={15} className="text-stone-400" />
                                                        <span className="text-xs sm:text-sm">
                                                            a {Math.round(pro.distance_km)} km
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {pro.bio && (
                                                <p className="text-stone-500 text-xs mt-2 line-clamp-2 leading-relaxed">{pro.bio}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action button: no price / estimate shown! */}
                                    <div className="text-right flex-shrink-0">
                                        {isSelected ? (
                                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs sm:text-sm font-bold shadow-xs">
                                                <Check size={16} />
                                                <span>Selezionato</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-4 py-2 rounded-xl border border-stone-200 text-stone-700 bg-white hover:bg-stone-100 text-xs sm:text-sm font-semibold transition-all">
                                                Seleziona
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
