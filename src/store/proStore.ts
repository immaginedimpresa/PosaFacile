import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { confirmDuration, setOrderMilestone } from '@/services/orderTimelineService'
import type { TimelineStepKey } from '@/lib/orderTimeline'

export type JobStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'draft' | 'pending'

export interface Job {
    id: string
    order_id: string
    status: JobStatus
    scheduled_date: string | null
    /** Del cliente il posatore riceve solo nome e telefono, dopo l'accettazione. */
    customer_name?: string
    customer_phone?: string | null
    address?: string
    city?: string
    province?: string
    cap?: string
    order_number?: string
    payout?: number
    laying_total?: number
    services_total?: number
    notes?: string
    created_at: string
    /** Dati completi dell'ordine necessari per stima durata, scheda tecnica, materiali, metrature */
    order?: any
}

export interface Availability {
    id: string
    date: string
    status: 'busy' | 'vacation'
    note?: string
}

interface ProState {
    jobs: Job[]
    availability: Availability[]
    loading: boolean
    error: string | null
    fetchJobs: () => Promise<void>
    fetchAvailability: (start: Date, end: Date) => Promise<void>
    updateJobStatus: (jobId: string, status: JobStatus) => Promise<void>
    confirmJobDuration: (jobId: string, workDays: number, calendarDays: number, note: string | null) => Promise<void>
    toggleAvailability: (date: string, status: 'busy' | 'vacation') => Promise<void>
    bulkUpdateAvailability: (dates: string[], status: 'busy' | 'available') => Promise<void>
}

/** Cambio di stato del lavoro → tappa da chiudere sulla timeline dell'ordine. */
const JOB_STATUS_MILESTONE: Partial<Record<JobStatus, TimelineStepKey>> = {
    accepted: 'professional_confirmed',
    in_progress: 'work_started',
    completed: 'work_completed',
}

/**
 * Dati del lavoro che il posatore vede, letti dalla vista pro_orders.
 * Del cliente arrivano solo nome e telefono, e solo dopo l'accettazione:
 * email, anagrafica e dati fiscali non escono dal database.
 */
export function jobInfoFromOrder(order: any) {
    const addr = order?.installation_address && typeof order.installation_address === 'object'
        ? order.installation_address
        : {}
    const city = addr.city || ''
    return {
        customer_name: order?.customer_name || (city ? `Cliente (${city})` : 'Cliente'),
        customer_phone: order?.customer_phone || null,
        address: addr.street || addr.address || '',
        city,
        province: addr.province || '',
        cap: addr.cap || addr.postal_code || '',
        payout: Number(order?.professional_payout) || ((Number(order?.laying_total) || 0) + (Number(order?.services_total) || 0)),
        laying_total: Number(order?.laying_total) || 0,
        services_total: Number(order?.services_total) || 0,
        order_number: order?.order_number || (order?.id ? String(order.id).slice(0, 8) : undefined),
    }
}

export const useProStore = create<ProState>((set, get) => ({
    jobs: [],
    availability: [],
    loading: false,
    error: null,

    fetchAvailability: async (start, end) => {
        set({ loading: true, error: null })
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            const { data, error } = await supabase
                .from('professional_availability')
                .select('*')
                .eq('professional_id', user.id)
                .gte('date', format(start, 'yyyy-MM-dd'))
                .lte('date', format(end, 'yyyy-MM-dd'))

            if (error) throw error
            set({ availability: data as Availability[] })
        } catch (err: any) {
            console.error('Error fetching availability:', err)
        } finally {
            set({ loading: false })
        }
    },

    toggleAvailability: async (date, status) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const existing = get().availability.find(a => a.date === date)

            if (existing) {
                // Remove if exists (toggle off)
                const { error } = await supabase
                    .from('professional_availability')
                    .delete()
                    .eq('id', existing.id)

                if (error) throw error

                set(state => ({
                    availability: state.availability.filter(a => a.id !== existing.id)
                }))
            } else {
                // Add if not exists (toggle on)
                const { data, error } = await supabase
                    .from('professional_availability')
                    .insert({
                        professional_id: user.id,
                        date,
                        status
                    })
                    .select()
                    .single()

                if (error) throw error

                set(state => ({
                    availability: [...state.availability, data as Availability]
                }))
            }
        } catch (err: any) {
            set({ error: err.message })
        }
    },

    bulkUpdateAvailability: async (dates: string[], status: 'busy' | 'available') => {
        set({ loading: true })
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user')

            if (status === 'available') {
                // DELETE logic
                const { error } = await supabase
                    .from('professional_availability')
                    .delete()
                    .eq('professional_id', user.id)
                    .in('date', dates)

                if (error) throw error

                set(state => ({
                    availability: state.availability.filter(a => !dates.includes(a.date))
                }))
            } else {
                // UPSERT logic (insert if not exists)
                // First find which ones already exist to avoid duplicates if just inserting
                // But upsert with unique key? We don't have a unique constraint on (prof_id, date) in the schema seen? 
                // Let's check schema... usually better to fetch existing, filter, then insert new.

                // Fetch existing for these dates
                const { data: existing, error: fetchError } = await supabase
                    .from('professional_availability')
                    .select('date')
                    .eq('professional_id', user.id)
                    .in('date', dates)

                if (fetchError) throw fetchError

                const existingSet = new Set(existing?.map(e => e.date))
                const toInsert = dates
                    .filter(d => !existingSet.has(d))
                    .map(d => ({
                        professional_id: user.id,
                        date: d,
                        status: 'busy' // Only 'busy' supported for now
                    }))

                if (toInsert.length > 0) {
                    const { data: inserted, error: insertError } = await supabase
                        .from('professional_availability')
                        .insert(toInsert)
                        .select()

                    if (insertError) throw insertError

                    set(state => ({
                        availability: [...state.availability, ...(inserted as Availability[])]
                    }))
                }
            }
        } catch (err: any) {
            console.error(err)
            set({ error: err.message })
        } finally {
            set({ loading: false })
        }
    },

    fetchJobs: async () => {
        set({ loading: true, error: null })
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            console.log('👷‍♂️ [Professional] Fetching jobs for User ID:', user.id)

            // DEBUG: Check if this user has a professional profile
            const { data: profileCheck } = await supabase
                .from('professional_profiles')
                .select('id, full_name')
                .eq('id', user.id)
                .maybeSingle()

            console.log('🔍 [DEBUG] Professional Profile for user:', profileCheck)

            // DEBUG: Get ALL draft/pending orders to see what exists
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            // Il posatore non legge la tabella orders: i dati del lavoro arrivano
            // dalla vista pro_orders, che non contiene anagrafica, email e dati
            // fiscali del cliente (solo nome, telefono e indirizzo, dopo l'accettazione).
            const { data: assignedJobs, error: jobsError } = await supabase
                .from('jobs')
                .select('*')
                .eq('professional_id', user.id)
                .order('created_at', { ascending: false })

            if (jobsError) throw jobsError

            const orderIds = (assignedJobs || []).map((j: any) => j.order_id).filter(Boolean)
            let ordersById: Record<string, any> = {}
            if (orderIds.length > 0) {
                const { data: jobOrders, error: ordersError } = await supabase
                    .from('pro_orders' as any)
                    .select('*')
                    .in('id', orderIds)
                if (ordersError) throw ordersError
                ordersById = Object.fromEntries((jobOrders || []).map((o: any) => [o.id, o]))
            }

            // Fetch DRAFT orders assigned to this professional (for slot reservation)
            // Only fetch drafts from last 24h as per requirement
            // La vista contiene già solo gli ordini assegnati a questo posatore
            const { data: draftOrders, error: draftsError } = await supabase
                .from('pro_orders' as any)
                .select('*')
                .in('status', ['draft', 'pending'])
                .gte('created_at', yesterday) // Auto-expire check
                .order('created_at', { ascending: false })

            if (draftsError) console.error('Error fetching drafts:', draftsError)

            // Map jobs
            const mappedJobs: Job[] = (assignedJobs || []).map((j: any) => {
                const order = ordersById[j.order_id] || null
                return {
                    id: j.id,
                    order_id: j.order_id,
                    status: j.status as JobStatus,
                    scheduled_date: j.scheduled_date || order?.installation_date || order?.work_start_date || null,
                    notes: j.notes || order?.notes || '',
                    created_at: j.created_at,
                    order,
                    ...jobInfoFromOrder(order),
                }
            })

            // Map drafts to jobs structure
            const mappedDrafts: Job[] = (draftOrders || []).map((o: any) => {
                const info = jobInfoFromOrder(o)
                return {
                    id: o.id, // Using order ID as job ID for drafts
                    order_id: o.id,
                    status: 'draft' as any, // Pseudo-status
                    scheduled_date: o.installation_date,
                    notes: o.notes || 'In attesa di pagamento',
                    created_at: o.created_at,
                    order: o,
                    ...info,
                }
            })

            set({ jobs: [...mappedDrafts, ...mappedJobs] })
        } catch (err: any) {
            console.error('Error fetching jobs:', err)
            set({ error: err.message })
        } finally {
            set({ loading: false })
        }
    },

    updateJobStatus: async (jobId, status) => {
        set({ loading: true })
        try {
            const { error } = await supabase
                .from('jobs')
                .update({ status })
                .eq('id', jobId)

            if (error) throw error

            // La barra di stato che il cliente vede deve muoversi quando il
            // posatore accetta, apre o chiude il cantiere.
            const orderId = get().jobs.find(j => j.id === jobId)?.order_id
            const step = JOB_STATUS_MILESTONE[status]
            if (orderId && step) {
                const { data: { user } } = await supabase.auth.getUser()
                setOrderMilestone(orderId, step, { status: 'done' }, user?.id)
                    .catch(err => console.warn('Timeline non aggiornata:', err.message))
            }

            // Optimistic update
            set(state => ({
                jobs: state.jobs.map(j => j.id === jobId ? { ...j, status } : j)
            }))

            // Con l'accettazione la vista pro_orders sblocca nome, telefono e via
            // del cliente: vanno ricaricati, lo stato ottimistico non li ha.
            if (status === 'accepted') {
                void get().fetchJobs()
            }

            // Log activity (fire and forget)
            supabase.from('job_logs').insert({
                job_id: jobId,
                action: 'status_change',
                details: { new_status: status }
            }).then()

        } catch (err: any) {
            set({ error: err.message })
        } finally {
            set({ loading: false })
        }
    },

    /**
     * Il posatore conferma (o corregge) le giornate stimate in preventivo.
     * Da qui in poi la pianificazione usa questo numero, non la stima.
     */
    confirmJobDuration: async (jobId, workDays, calendarDays, note) => {
        const job = get().jobs.find(j => j.id === jobId)
        if (!job?.order_id) throw new Error('Cantiere senza ordine collegato')

        await confirmDuration(job.order_id, workDays, calendarDays, note)

        set(state => ({
            jobs: state.jobs.map(j => j.id === jobId
                ? {
                    ...j,
                    order: {
                        ...(j.order || {}),
                        confirmed_work_days: workDays,
                        confirmed_calendar_days: calendarDays,
                        duration_pro_note: note,
                    },
                }
                : j),
        }))
    }
}))
