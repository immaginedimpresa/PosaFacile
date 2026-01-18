import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfiguratorStore, LAYING_TYPE_LABELS, SERVICE_PRICES } from '@/store/configuratorStore'
import { Check, MapPin, Calendar, Package, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'

export function Step7Summary() {
    const navigate = useNavigate()
    const {
        projectInfo,
        selectedProduct,
        dimensions,
        layingType,
        services,
        location,
        getTotalMq,
        getMaterialCost,
        getLayingCost,
        getSubtotal,
        getVat,
        getTotal,
        prevStep,
        aiResultImage,
        selectedProfessional,
        selectedDate,
    } = useConfiguratorStore()

    const [submitting, setSubmitting] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const { user } = useAuth()

    const totalMq = getTotalMq()
    const materialCost = getMaterialCost()
    const layingCost = getLayingCost()
    const subtotal = getSubtotal()
    const vat = getVat()
    const total = getTotal()

    // Determine the actual date to use (Calendar selection > Initial preference)
    const effectiveDate = selectedDate
        ? format(new Date(selectedDate), 'yyyy-MM-dd')
        : location.dataPreferita

    const handleSubmit = async () => {
        if (!agreed || !user || !user.email) return

        if (!effectiveDate) {
            alert('Per favore seleziona una data preferita per i lavori prima di procedere.')
            return
        }

        setSubmitting(true)
        try {
            // 1. Ensure user profile exists in public schema (fixes FK error)
            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle()

            if (!profile) {
                // Profile missing, create it manually (sync issue fix)
                const { error: userError } = await supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email!,
                        first_name: user.user_metadata?.firstName || user.user_metadata?.first_name || '',
                        last_name: user.user_metadata?.lastName || user.user_metadata?.last_name || '',
                        role: 'customer'
                    } as any)

                if (userError) {
                    console.warn('User upsert warning:', userError)
                }

                // Also ensure customer record exists
                await supabase
                    .from('customers')
                    .upsert({ id: user.id })
            }

            // CRITICAL FIX: Verify selectedProfessional exists in professional_profiles table
            // We check professional_profiles instead of users to avoid RLS blocking
            if (selectedProfessional?.id) {
                const { data: proExists, error: _proCheckError } = await supabase
                    .from('professional_profiles')
                    .select('id')
                    .eq('id', selectedProfessional.id)
                    .maybeSingle()

                if (!proExists) {
                    alert('Il professionista selezionato non è più disponibile. Per favore selezionane un altro.')
                    // Reset stale data
                    useConfiguratorStore.getState().setSelectedProfessional(null)
                    useConfiguratorStore.getState().setCurrentStep(7) // Go back to Pro selection
                    setSubmitting(false)
                    return
                }
            }

            // Create initial draft order
            let orderData;
            try {
                // Try to link both User and Profile (Best effort)
                const { data, error } = await supabase
                    .from('orders')
                    .insert({
                        user_id: user.id,
                        customer_id: user.id,
                        order_number: `PREV-${Date.now()}`,
                        status: 'draft' as any,
                        total: total,
                        subtotal: subtotal,
                        vat_amount: vat,
                        items: [{
                            product: selectedProduct,
                            projectInfo,
                            dimensions,
                            services,
                            layingType
                        }],
                        installation_address: {
                            street: location.indirizzo,
                            city: location.citta,
                            province: location.provincia,
                            postal_code: location.cap
                        },
                        installation_date: effectiveDate,
                        professional_id: selectedProfessional?.id, // Legacy link (User)
                        installation_professional_id: selectedProfessional?.id, // Correct link (Profile)
                        project_type: projectInfo.ambiente,
                        laying_type: LAYING_TYPE_LABELS[layingType],
                        floor_sqm: dimensions.pavimentoMq,
                        wall_sqm: dimensions.paretiMq,
                        material_total: materialCost,
                        laying_total: layingCost,
                        services_total: total - materialCost - layingCost,
                        scheduled_time_slot: effectiveDate
                    } as any)
                    .select()
                    .single()

                if (error) throw error
                orderData = data
            } catch (err: any) {
                // Handle Zombie Professional Case (Profile exists, User missing)
                // We silently fall back to linking only via installation_professional_id
                if (err.code === '23503' && err.message?.includes('orders_professional_id_fkey')) {
                    console.warn('⚠️ Professional User missing, falling back to Profile link only.')

                    const { data: retryData, error: retryError } = await supabase
                        .from('orders')
                        .insert({
                            user_id: user.id,
                            customer_id: user.id,
                            order_number: `PREV-${Date.now()}`,
                            status: 'draft' as any,
                            total: total,
                            subtotal: subtotal,
                            vat_amount: vat,
                            items: [{
                                product: selectedProduct,
                                projectInfo,
                                dimensions,
                                services,
                                layingType
                            }],
                            installation_address: {
                                street: location.indirizzo,
                                city: location.citta,
                                province: location.provincia,
                                postal_code: location.cap
                            },
                            installation_date: effectiveDate,
                            professional_id: null, // Skip legacy link
                            installation_professional_id: selectedProfessional?.id, // Keep Profile link
                            admin_notes: `Auto-corrected: Linked via installation_professional_id (Profile) due to missing User record.`,
                            project_type: projectInfo.ambiente,
                            laying_type: LAYING_TYPE_LABELS[layingType],
                            floor_sqm: dimensions.pavimentoMq,
                            wall_sqm: dimensions.paretiMq,
                            material_total: materialCost,
                            laying_total: layingCost,
                            services_total: total - materialCost - layingCost,
                            scheduled_time_slot: effectiveDate
                        } as any)
                        .select()
                        .single()

                    if (retryError) throw retryError
                    orderData = retryData
                } else {
                    throw err
                }
            }

            if (orderData) {
                navigate(`/checkout/pay/${orderData.id}`)
            }
        } catch (error) {
            console.error('Error creating draft order:', error)
            alert('Errore durante la creazione del preventivo. Riprova.')
        } finally {
            setSubmitting(false)
        }
    }

    const AMBIENTE_LABELS = {
        bagno: 'Bagno',
        cucina: 'Cucina',
        soggiorno: 'Soggiorno',
        camera: 'Camera',
        esterno: 'Esterno',
        altro: 'Altro',
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Riepilogo del tuo preventivo</h3>
                <p className="text-gray-500">Verifica i dettagli prima di confermare</p>
            </div>

            {/* Project Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-500" />
                    Dettagli progetto
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Ambiente:</span>
                        <p className="font-medium">{projectInfo.ambiente ? AMBIENTE_LABELS[projectInfo.ambiente] : '-'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Tipo posa:</span>
                        <p className="font-medium">{LAYING_TYPE_LABELS[layingType]}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Superficie:</span>
                        <p className="font-medium">{totalMq.toFixed(1)} mq (incl. sfrido)</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Piastrella:</span>
                        <p className="font-medium">{selectedProduct?.name || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Location Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Luogo di lavoro
                </h4>
                <p className="text-sm">{location.indirizzo}</p>
                <p className="text-sm text-gray-500">{location.cap} {location.citta} ({location.provincia})</p>

                <div className="flex items-center gap-2 mt-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                        {effectiveDate || 'Da definire'}
                    </span>
                </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Dettaglio costi</h4>

                <div className="space-y-3 text-sm">
                    {/* Material */}
                    <div className="flex justify-between">
                        <span className="text-gray-600">
                            Materiale ({selectedProduct?.name})
                            <span className="text-gray-400 ml-1">({totalMq.toFixed(1)} mq × €{selectedProduct?.price_per_sqm.toFixed(2)})</span>
                        </span>
                        <span className="font-medium">€{materialCost.toFixed(2)}</span>
                    </div>

                    {/* Laying */}
                    <div className="flex justify-between">
                        <span className="text-gray-600">
                            Posa {LAYING_TYPE_LABELS[layingType]}
                        </span>
                        <span className="font-medium">€{layingCost.toFixed(2)}</span>
                    </div>

                    {/* Services */}
                    {services.demolizione && (
                        <div className="flex justify-between text-gray-600">
                            <span>Demolizione</span>
                            <span>€{((dimensions.pavimentoMq + dimensions.paretiMq) * SERVICE_PRICES.demolizione).toFixed(2)}</span>
                        </div>
                    )}
                    {services.massetto && (
                        <div className="flex justify-between text-gray-600">
                            <span>Massetto</span>
                            <span>€{((dimensions.pavimentoMq + dimensions.paretiMq) * SERVICE_PRICES.massetto).toFixed(2)}</span>
                        </div>
                    )}
                    {services.impermeabilizzazione && (
                        <div className="flex justify-between text-gray-600">
                            <span>Impermeabilizzazione</span>
                            <span>€{((dimensions.pavimentoMq + dimensions.paretiMq) * SERVICE_PRICES.impermeabilizzazione).toFixed(2)}</span>
                        </div>
                    )}
                    {services.smaltimento && (
                        <div className="flex justify-between text-gray-600">
                            <span>Smaltimento</span>
                            <span>€{((dimensions.pavimentoMq + dimensions.paretiMq) * SERVICE_PRICES.smaltimento).toFixed(2)}</span>
                        </div>
                    )}
                    {services.battiscopa && services.battiscopaMetri > 0 && (
                        <div className="flex justify-between text-gray-600">
                            <span>Battiscopa ({services.battiscopaMetri}m)</span>
                            <span>€{(services.battiscopaMetri * SERVICE_PRICES.battiscopa).toFixed(2)}</span>
                        </div>
                    )}
                    {services.soglie && services.soglieQty > 0 && (
                        <div className="flex justify-between text-gray-600">
                            <span>Soglie ({services.soglieQty} pz)</span>
                            <span>€{(services.soglieQty * SERVICE_PRICES.soglie).toFixed(2)}</span>
                        </div>
                    )}

                    <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Subtotale</span>
                            <span className="font-medium">€{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-gray-600">IVA (22%)</span>
                            <span className="font-medium">€{vat.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between text-lg">
                            <span className="font-bold">TOTALE</span>
                            <span className="font-bold text-orange-600">€{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* AI Visualizer Result */}
                {aiResultImage && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-hidden">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            Anteprima nel tuo ambiente
                        </h4>
                        <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 border relative">
                            <img
                                src={aiResultImage}
                                alt="Visualizzazione AI"
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                Generato con PosaFacile AI
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Terms Agreement */}
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl">
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-600">
                    Ho letto e accetto i <a href="/termini" className="text-orange-600 underline">Termini e Condizioni</a> e la <a href="/privacy" className="text-orange-600 underline">Privacy Policy</a>
                </span>
            </label>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <button
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                    Indietro
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!agreed || submitting}
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Invio in corso...
                        </>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            Conferma preventivo
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
