import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfiguratorStore, LAYING_TYPE_LABELS } from '@/store/configuratorStore'
import { serviceRate, markupMultiplier } from '@/services/ratesService'
import { MapPin, Calendar, Package, Sparkles, AlertCircle, LogIn, Bookmark, CheckCircle2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { saveCurrentQuote } from '@/lib/quotesService'
import { DurationCard } from '@/components/orders/DurationCard'
import { estimateEndDate, formatDays } from '@/lib/layingDuration'

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
        getDurationEstimate,
        aiResultImage,
        selectedProfessional,
        selectedDate,
        activeQuoteId,
        setActiveQuoteId,
    } = useConfiguratorStore()

    const [submitting, setSubmitting] = useState(false)
    const [savingQuote, setSavingQuote] = useState(false)
    const [savedSuccess, setSavedSuccess] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const { user } = useAuth()

    const totalMq = getTotalMq()
    const materialCost = getMaterialCost()
    const layingCost = getLayingCost()
    const subtotal = getSubtotal()
    const vat = getVat()
    const total = getTotal()
    // Durata stimata del cantiere: entra nel preventivo e viene poi
    // confermata (o corretta) dal professionista che accetta l'incarico.
    const durata = getDurationEstimate()
    const { professionalRates } = useConfiguratorStore()
    // Le voci del riepilogo usano le tariffe del posatore scelto, come il
    // totale: mostrarle con valori diversi renderebbe il conto incoerente.
    const costoServizio = (chiave: string, quantita: number) =>
        serviceRate(professionalRates, chiave) *
        markupMultiplier(
            chiave,
            selectedProfessional?.markup_percent,
            selectedProfessional?.markup_overrides,
        ) *
        quantita

    // Determine the actual date to use (Calendar selection > Initial preference)
    const effectiveDate = selectedDate
        ? format(new Date(selectedDate), 'yyyy-MM-dd')
        : location.dataPreferita

    const fineLavoriDate = effectiveDate ? estimateEndDate(effectiveDate, durata) : null
    const fineLavori = fineLavoriDate ? format(fineLavoriDate, 'yyyy-MM-dd') : null

    const handleSubmit = async () => {
        if (!agreed) {
            const termsEl = document.getElementById('terms-agreement-box')
            if (termsEl) {
                termsEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                termsEl.classList.add('ring-2', 'ring-orange-500', 'bg-orange-50/50')
                setTimeout(() => termsEl.classList.remove('ring-2', 'ring-orange-500', 'bg-orange-50/50'), 2500)
            }
            alert('Per favore accetta i Termini e Condizioni e la Privacy Policy per procedere.')
            return
        }

        if (!user || !user.email) {
            // Se non è loggato, reindirizza al login mantenendo il preventivo
            navigate('/login?redirect=/configuratore')
            return
        }

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
                    useConfiguratorStore.getState().setCurrentStep(2) // Go back to Pro selection
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
                        scheduled_time_slot: effectiveDate,
                        estimated_work_days: durata.workDays,
                        estimated_calendar_days: durata.calendarDays,
                        // Congelata: una futura taratura delle rese non deve
                        // cambiare la durata già promessa a questo cliente.
                        duration_breakdown: durata,
                        work_start_date: effectiveDate,
                        work_end_date: fineLavori,
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
                            scheduled_time_slot: effectiveDate,
                            estimated_work_days: durata.workDays,
                            estimated_calendar_days: durata.calendarDays,
                            duration_breakdown: durata,
                            work_start_date: effectiveDate,
                            work_end_date: fineLavori,
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

    const handleSaveQuote = async () => {
        if (!user) {
            navigate('/login?redirect=/configuratore')
            return
        }

        setSavingQuote(true)
        const storeState = useConfiguratorStore.getState()
        const { data, error } = await saveCurrentQuote(storeState, user.id, activeQuoteId || undefined)
        setSavingQuote(false)

        if (error) {
            console.error('Error saving quote:', error)
            alert('Errore durante il salvataggio del preventivo. Riprova.')
        } else if (data) {
            setActiveQuoteId(data.id)
            setSavedSuccess(true)
        }
    }

    useEffect(() => {
        const handleTriggerSubmit = () => {
            handleSubmit()
        }
        const handleTriggerSave = () => {
            handleSaveQuote()
        }
        window.addEventListener('posafacile-submit-quote', handleTriggerSubmit)
        window.addEventListener('posafacile-save-quote', handleTriggerSave)
        return () => {
            window.removeEventListener('posafacile-submit-quote', handleTriggerSubmit)
            window.removeEventListener('posafacile-save-quote', handleTriggerSave)
        }
    }, [handleSubmit, handleSaveQuote])

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
            {submitting && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white">
                    <div className="w-9 h-9 border-3 border-white border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-semibold text-sm">Creazione del preventivo in corso...</p>
                </div>
            )}
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
                        {fineLavoriDate && ` → ${format(fineLavoriDate, 'dd/MM/yyyy')}`}
                    </span>
                </div>
                {durata.calendarDays > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                        Cantiere di {formatDays(durata.calendarDays)}, da confermare con il posatore.
                    </p>
                )}
            </div>

            {/* Durata stimata del cantiere */}
            <DurationCard estimate={durata} showPhases />

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
                            <span>€{costoServizio('demolizione', dimensions.pavimentoMq + dimensions.paretiMq).toFixed(2)}</span>
                        </div>
                    )}
                    {services.massetto && (
                        <div className="flex justify-between text-gray-600">
                            <span>Massetto</span>
                            <span>€{costoServizio('massetto', dimensions.pavimentoMq + dimensions.paretiMq).toFixed(2)}</span>
                        </div>
                    )}
                    {services.impermeabilizzazione && (
                        <div className="flex justify-between text-gray-600">
                            <span>Impermeabilizzazione</span>
                            <span>€{costoServizio('impermeabilizzazione', dimensions.pavimentoMq + dimensions.paretiMq).toFixed(2)}</span>
                        </div>
                    )}
                    {services.smaltimento && (
                        <div className="flex justify-between text-gray-600">
                            <span>Smaltimento</span>
                            <span>€{costoServizio('smaltimento', dimensions.pavimentoMq + dimensions.paretiMq).toFixed(2)}</span>
                        </div>
                    )}
                    {services.battiscopa && services.battiscopaMetri > 0 && (
                        <div className="flex justify-between text-gray-600">
                            <span>Battiscopa ({services.battiscopaMetri}m)</span>
                            <span>€{costoServizio('battiscopa', services.battiscopaMetri).toFixed(2)}</span>
                        </div>
                    )}
                    {services.soglie && services.soglieQty > 0 && (
                        <div className="flex justify-between text-gray-600">
                            <span>Soglie ({services.soglieQty} pz)</span>
                            <span>€{costoServizio('soglie', services.soglieQty).toFixed(2)}</span>
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

            {/* Guest / Session Info Banner */}
            {!user && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-stone-900 text-sm">Sessione preventivo non salvata</p>
                            <p className="text-xs text-stone-600 mt-0.5">
                                Sei in modalità ospite. Se abbandoni la pagina, la configurazione andrà persa. Accedi o registrati per salvare la sessione nel tuo profilo.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/login?redirect=/configuratore')}
                        className="w-full sm:w-auto px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                        <LogIn className="w-3.5 h-3.5" />
                        Accedi per salvare
                    </button>
                </div>
            )}

            {/* Saved Success Notification */}
            {savedSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-emerald-950 text-sm sm:text-base">
                                🎉 Preventivo salvato con successo nei tuoi Preventivi!
                            </p>
                            <p className="text-xs text-emerald-800/90 mt-0.5">
                                Il prezzo è bloccato per 30 giorni. Puoi ritrovarlo e gestirlo nella tua area personale.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard?tab=quotes')}
                            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <span>I Miei Preventivi</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Terms Agreement */}
            <label
                id="terms-agreement-box"
                className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl transition-all border border-gray-200"
            >
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700">
                    Ho letto e accetto i <a href="/termini" className="text-orange-600 underline font-medium">Termini e Condizioni</a> e la <a href="/privacy" className="text-orange-600 underline font-medium">Privacy Policy</a>
                </span>
            </label>

            {/* In-Page Action Buttons for Quotes & Ordering */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left w-full sm:w-auto">
                    <p className="text-xs text-stone-500 uppercase font-semibold">Vuoi pensarci su?</p>
                    <p className="text-xs text-stone-700 mt-0.5">
                        Salva questo preventivo nella tua area personale per ritrovarlo in qualsiasi momento.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                        type="button"
                        disabled={savingQuote}
                        onClick={handleSaveQuote}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100/80 text-stone-800 text-xs sm:text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        <Bookmark size={16} className={savedSuccess ? "text-emerald-600 fill-emerald-600" : "text-orange-500"} />
                        <span>{savingQuote ? 'Salvataggio...' : savedSuccess ? 'Preventivo Salvato ✓' : 'Salva nei miei Preventivi'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
