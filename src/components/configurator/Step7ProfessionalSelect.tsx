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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[34rem] overflow-y-auto pr-1">
                    {professionals.map((pro, index) => {
                        const isSelected = selectedProfessional?.id === pro.id
                        return (
                            <motion.div
                                key={pro.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleSelect(pro)}
                                className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${isSelected
                                    ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/10 shadow-xs'
                                    : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/50'
                                    }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-xs">
                                                {pro.full_name?.charAt(0) || 'P'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-stone-900 truncate">{pro.full_name}</h3>
                                                {pro.company_name && (
                                                    <p className="text-stone-500 text-xs truncate">{pro.company_name}</p>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold shrink-0 shadow-xs">
                                                <Check size={14} />
                                                <span>Scelto</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 bg-white hover:bg-stone-100 text-xs font-semibold shrink-0 transition-all">
                                                Scegli
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 flex-wrap text-xs text-stone-600">
                                        <div className="flex items-center gap-1 font-semibold text-stone-800">
                                            <Star className="text-yellow-500 fill-yellow-500" size={14} />
                                            <span>{pro.rating.toFixed(1)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Briefcase size={14} className="text-stone-400" />
                                            <span>{pro.years_experience} anni</span>
                                        </div>
                                        {pro.distance_km !== null && (
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} className="text-stone-400" />
                                                <span>~{Math.round(pro.distance_km)} km</span>
                                            </div>
                                        )}
                                    </div>

                                    {pro.bio && (
                                        <p className="text-stone-500 text-xs mt-2.5 line-clamp-2 leading-relaxed">{pro.bio}</p>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
