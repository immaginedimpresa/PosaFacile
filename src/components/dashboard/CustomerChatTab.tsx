import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { JobChat } from '@/components/chat/JobChat'
import {
    MessageSquare,
    User,
    Phone,
    Calendar,
    MapPin,
    Clock,
    ShieldCheck,
    Package,
    ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Order {
    id: string
    created_at: string
    order_number: string
    status: string
    total: number
    installation_address: any
    installation_professional_id?: string
    professional_id?: string
    installation_date?: string
    scheduled_time_slot?: string
    professional?: {
        full_name: string
        company_name?: string
        phone?: string
        verified?: boolean
    }
}

interface CustomerChatTabProps {
    orders: Order[]
    initialOrderId?: string | null
}

export function CustomerChatTab({ orders, initialOrderId }: CustomerChatTabProps) {
    const { user } = useAuth()
    const activeOrders = orders.filter(o => o.status !== 'draft')
    const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
        if (initialOrderId && activeOrders.some(o => o.id === initialOrderId)) {
            return initialOrderId
        }
        return activeOrders[0]?.id || ''
    })

    const [jobId, setJobId] = useState<string | null>(null)
    const [jobStatus, setJobStatus] = useState<string | null>(null)
    const [loadingJob, setLoadingJob] = useState(false)
    const [proDetails, setProDetails] = useState<{
        full_name: string
        company_name?: string | null
        phone?: string | null
        verified?: boolean
    } | null>(null)

    const selectedOrder = activeOrders.find(o => o.id === selectedOrderId) || activeOrders[0]

    useEffect(() => {
        if (!selectedOrder?.id) {
            setJobId(null)
            setJobStatus(null)
            setProDetails(null)
            return
        }

        let isMounted = true
        setLoadingJob(true)

        async function resolveJob() {
            try {
                let resolvedJobId: string | null = null
                let resolvedJobStatus: string | null = null

                // 1. Verifica se ci sono milestone di cantiere già raggiunte (es. posatore confermato o lavoro avviato)
                try {
                    const { data: milestones } = await supabase
                        .from('order_milestones')
                        .select('step, status')
                        .eq('order_id', selectedOrder.id)

                    const isStarted = milestones?.some(m => m.step === 'work_started' && m.status === 'done')
                    const isConfirmed = milestones?.some(m => 
                        (m.step === 'professional_confirmed' || m.step === 'green_light' || m.step === 'date_confirmed') && 
                        (m.status === 'done' || m.status === 'active')
                    )

                    if (isStarted) {
                        resolvedJobStatus = 'in_progress'
                    } else if (isConfirmed) {
                        resolvedJobStatus = 'accepted'
                    }
                } catch {
                    // ignore milestone check
                }

                // 2. Cerca nella tabella jobs
                try {
                    const { data: jobData } = await supabase
                        .from('jobs')
                        .select('id, status')
                        .eq('order_id', selectedOrder.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    if (jobData?.id) {
                        resolvedJobId = jobData.id
                        if (jobData.status) resolvedJobStatus = jobData.status
                    }
                } catch {
                    // ignore jobs RLS
                }

                // 3. Cerca nelle notifiche metadati con job_id
                if (!resolvedJobId) {
                    try {
                        const { data: notifData } = await supabase
                            .from('notifications' as any)
                            .select('metadata')
                            .not('metadata', 'is', null)
                            .order('created_at', { ascending: false })
                            .limit(30)

                        if (notifData && notifData.length > 0) {
                            for (const row of notifData) {
                                const meta = (row as any).metadata
                                if (meta?.job_id && (meta?.order_id === selectedOrder.id || !meta?.order_id)) {
                                    resolvedJobId = meta.job_id
                                    resolvedJobStatus = resolvedJobStatus || 'accepted'
                                    break
                                }
                            }
                        }
                    } catch {
                        // ignore notifications check
                    }
                }

                // 4. Prova RPC get_or_create_order_job se disponibile
                if (!resolvedJobId) {
                    try {
                        const { data: rpcJobId } = await (supabase.rpc as any)('get_or_create_order_job', {
                            p_order_id: selectedOrder.id
                        })

                        if (rpcJobId && typeof rpcJobId === 'string') {
                            resolvedJobId = rpcJobId
                            resolvedJobStatus = resolvedJobStatus || 'accepted'
                        }
                    } catch {
                        // ignore rpc
                    }
                }

                // 5. Arricchisci il profilo del posatore da professional_profiles per telefono e whatsapp
                const proId = (selectedOrder as any).installation_professional_id || selectedOrder.professional_id
                if (proId) {
                    try {
                        const { data: profile } = await supabase
                            .from('professional_profiles')
                            .select('full_name, company_name, phone, verified')
                            .eq('id', proId)
                            .maybeSingle()

                        if (profile && isMounted) {
                            setProDetails(profile)
                        }
                    } catch {
                        // ignore
                    }
                }

                // 6. Garanzia canale: se l'ordine è confermato/attivo o il posatore è incaricato, non bloccare MAI la chat
                const hasProOrActive = Boolean(
                    selectedOrder.professional || 
                    proId || 
                    selectedOrder.status !== 'draft'
                )

                if (!resolvedJobId && hasProOrActive) {
                    resolvedJobId = selectedOrder.id
                    resolvedJobStatus = resolvedJobStatus || 'accepted'
                }

                if (isMounted) {
                    setJobId(resolvedJobId)
                    setJobStatus(resolvedJobStatus || (hasProOrActive ? 'accepted' : 'assigned'))
                }
            } catch (err) {
                console.warn('Could not resolve job for chat:', err)
                if (isMounted) {
                    setJobId(selectedOrder.id)
                    setJobStatus('accepted')
                }
            } finally {
                if (isMounted) setLoadingJob(false)
            }
        }

        resolveJob()

        return () => {
            isMounted = false
        }
    }, [selectedOrder?.id])

    if (activeOrders.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-100">
                    <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">Nessun cantiere attivo per la chat</h3>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mb-6 leading-relaxed">
                    La chat diretta si attiva automaticamente non appena confermi un ordine di posa.
                    Potrai scambiare messaggi in tempo reale con il posatore incaricato e con il supporto operativo PosaFacile.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-50 text-xs font-semibold text-stone-600 border border-stone-200/70">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Conversazioni salvate e tracciate per ogni cantiere
                </div>
            </div>
        )
    }

    const pro = proDetails || selectedOrder?.professional
    const proPhone = pro?.phone || (typeof selectedOrder?.installation_address === 'object' ? selectedOrder.installation_address?.pro_phone : null)
    const cleanPhone = proPhone ? proPhone.replace(/\D/g, '') : null
    const waNumber = cleanPhone ? (cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`) : null
    const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Buongiorno, ti contatto in merito all'ordine PosaFacile #${selectedOrder.order_number || selectedOrder.id.slice(0, 8)}.`)}` : null

    return (
        <div className="space-y-6">
            {/* Header del Centro Messaggi */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20">
                            <MessageSquare size={20} />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-stone-900">Chat di cantiere con il posatore</h2>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Canale ufficiale per accordi su inizio lavori, logistica materiali e finiture
                            </p>
                        </div>
                    </div>
                </div>

                {/* Selettore Cantiere se ci sono più ordini */}
                {activeOrders.length > 1 && (
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cantiere:</label>
                        <select
                            value={selectedOrderId}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                            className="text-xs font-bold text-stone-800 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {activeOrders.map(ord => (
                                <option key={ord.id} value={ord.id}>
                                    Ordine #{ord.order_number} {ord.professional?.full_name ? `(${ord.professional.full_name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Layout Principale Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Scheda Sintetica del Cantiere & Contatto Posatore (Colonna sinistra) */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Card Posatore Assegnato */}
                    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-black text-base flex-shrink-0">
                                {pro?.full_name ? pro.full_name.charAt(0).toUpperCase() : <User size={20} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-extrabold text-stone-900 text-sm truncate">
                                        {pro?.full_name || 'Assegnazione in corso'}
                                    </p>
                                    {pro?.verified && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                            Certificato
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
                                    {pro?.company_name || 'Posatore certificato PosaFacile'}
                                </p>
                            </div>
                        </div>

                        {proPhone && (
                            <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                                {waUrl && (
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                                    >
                                        <MessageSquare size={13} />
                                        WhatsApp
                                    </a>
                                )}
                                <a
                                    href={`tel:${proPhone}`}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs border border-stone-200 transition-all active:scale-95"
                                >
                                    <Phone size={13} />
                                    Chiama
                                </a>
                            </div>
                        )}

                        {/* Coordinate Cantiere */}
                        <div className="pt-3 border-t border-stone-100 space-y-2 text-xs text-stone-600">
                            <div className="flex items-center gap-2">
                                <Package size={14} className="text-stone-400 flex-shrink-0" />
                                <span className="truncate">Ordine #{selectedOrder.order_number}</span>
                            </div>
                            {selectedOrder.installation_date && (
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-stone-400 flex-shrink-0" />
                                    <span>Inizio: {format(new Date(selectedOrder.installation_date), 'd MMMM yyyy', { locale: it })}</span>
                                </div>
                            )}
                            {selectedOrder.installation_address && (
                                <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-stone-400 flex-shrink-0 mt-0.5" />
                                    <span className="truncate">
                                        {typeof selectedOrder.installation_address === 'string'
                                            ? selectedOrder.installation_address
                                            : `${selectedOrder.installation_address.street || selectedOrder.installation_address.address || ''}, ${selectedOrder.installation_address.city || ''}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Link all'ordine completo */}
                        <div className="pt-2">
                            <a
                                href={`/dashboard/orders/${selectedOrder.id}`}
                                className="w-full inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all border border-stone-200/60"
                            >
                                Scheda Completa Ordine <ChevronRight size={14} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Box Chat in Tempo Reale (Colonna destra) */}
                <div className="lg:col-span-2">
                    {loadingJob ? (
                        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-3" />
                            <p className="text-xs font-semibold text-stone-500">Connessione al canale di cantiere...</p>
                        </div>
                    ) : user?.id && selectedOrder ? (
                        <div className="space-y-3">
                            {jobStatus === 'assigned' && !pro && (
                                <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
                                    <div className="p-1.5 rounded-xl bg-amber-200/60 text-amber-800 shrink-0 mt-0.5">
                                        <Clock size={16} />
                                    </div>
                                    <div className="leading-relaxed">
                                        <p className="font-bold">In attesa di conferma accettazione del posatore</p>
                                        <p className="text-amber-800/90 mt-0.5">
                                            Il posatore è stato designato per il cantiere e sta confermando l'incarico. Puoi già inviare messaggi qui: verranno recapitati al posatore e all'ufficio operativo PosaFacile.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <JobChat
                                jobId={jobId || selectedOrder.id}
                                currentUserId={user.id}
                                proUserId={selectedOrder.professional_id || selectedOrder.installation_professional_id || null}
                                customerUserId={user.id}
                                title={`Chat Cantiere #${selectedOrder.order_number}`}
                                subtitle={`Conversazione con ${pro?.full_name || 'il posatore incaricato'}`}
                                className="min-h-[500px]"
                            />
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-stone-200/90 p-8 text-center shadow-xs">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/80">
                                <Clock size={26} />
                            </div>
                            <h4 className="text-base font-bold text-stone-900 mb-1">
                                Assegnazione posatore in corso
                            </h4>
                            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                                Stiamo verificando la disponibilità del posatore certificato ideale per le date richieste.
                                La chat live si abiliterà automaticamente non appena il professionista confermerà la presa in carico.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
