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
    customer_name?: string
    customer_phone?: string | null
    customer_email?: string | null
    address?: string
    city?: string
    province?: string
    cap?: string
    order_number?: string
    payout?: number
    laying_total?: number
    services_total?: number
    customer_fiscal_code?: string | null
    customer_vat_number?: string | null
    customer_company_name?: string | null
    wants_invoice?: boolean
    invoice_details?: {
        fiscal_code?: string | null
        vat_number?: string | null
        company_name?: string | null
        sdi_code?: string | null
        pec?: string | null
        billing_address?: string | null
        customer_type?: 'private' | 'company' | string
    } | null
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
            const { data: allDrafts } = await supabase
                .from('orders')
                .select('id, professional_id, installation_professional_id, status, created_at')
                .in('status', ['draft', 'pending'] as any)
                .gte('created_at', yesterday)

            console.log('🔍 [DEBUG] ALL Draft/Pending Orders in DB:', allDrafts)

            // Fetch jobs with order details (proper join)
            const { data: assignedJobs, error: jobsError } = await supabase
                .from('jobs')
                .select(`
                    *,
                    orders (
                        id,
                        order_number,
                        status,
                        total,
                        subtotal,
                        material_total,
                        laying_total,
                        services_total,
                        professional_payout,
                        installation_address,
                        installation_date,
                        work_start_date,
                        work_end_date,
                        scheduled_time_slot,
                        floor_sqm,
                        wall_sqm,
                        laying_type,
                        project_type,
                        items,
                        notes,
                        admin_notes,
                        estimated_work_days,
                        estimated_calendar_days,
                        duration_breakdown,
                        confirmed_work_days,
                        confirmed_calendar_days,
                        duration_pro_note,
                        customer:users!orders_customer_id_fkey (
                            first_name,
                            last_name,
                            email,
                            phone
                        )
                    )
                `)
                .eq('professional_id', user.id)
                .order('created_at', { ascending: false })

            if (jobsError) throw jobsError
            console.log('👷‍♂️ [Professional] Assigned Jobs found:', assignedJobs?.length || 0)

            // Fetch DRAFT orders assigned to this professional (for slot reservation)
            // Only fetch drafts from last 24h as per requirement
            const { data: draftOrders, error: draftsError } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    status,
                    total,
                    subtotal,
                    material_total,
                    laying_total,
                    services_total,
                    professional_payout,
                    created_at,
                    installation_date,
                    scheduled_time_slot,
                    installation_address,
                    floor_sqm,
                    wall_sqm,
                    laying_type,
                    project_type,
                    items,
                    notes,
                    customer:users!orders_customer_id_fkey (
                        first_name,
                        last_name,
                        email,
                        phone
                    )
                `)
                .or(`professional_id.eq.${user.id},installation_professional_id.eq.${user.id}`) // Check both legacy and new field
                .in('status', ['draft', 'pending'] as any)
                .gte('created_at', yesterday) // Auto-expire check
                .order('created_at', { ascending: false })

            if (draftsError) console.error('Error fetching drafts:', draftsError)
            console.log('👷‍♂️ [Professional] Draft/Pending Orders found:', draftOrders?.length || 0, draftOrders)

            // Collect customer IDs for fiscal & invoice profile lookup
            const custIds = Array.from(new Set([
                ...(assignedJobs || []).map((j: any) => j.orders?.customer_id || j.orders?.user_id).filter(Boolean),
                ...(draftOrders || []).map((o: any) => o.customer_id || o.user_id).filter(Boolean),
            ]))

            let customersMap: Record<string, any> = {}
            if (custIds.length > 0) {
                try {
                    const { data: custRows } = await supabase
                        .from('customers')
                        .select('id, company_name, customer_type, fiscal_code, vat_number')
                        .in('id', custIds)
                    if (custRows) {
                        customersMap = Object.fromEntries(custRows.map((c: any) => [c.id, c]))
                    }
                } catch (e) {
                    console.warn('Could not fetch customers metadata:', e)
                }
            }

            const extractCustomerInfo = (order: any) => {
                const customer = order?.customer
                const addr = typeof order?.installation_address === 'object' ? order?.installation_address : {}
                const custProfile = customersMap[order?.customer_id || order?.user_id] || {}

                const fullName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : ''
                const customer_name = fullName 
                    || addr?.recipient_name 
                    || addr?.name 
                    || addr?.fullName 
                    || addr?.contact_name
                    || (addr?.first_name ? `${addr.first_name} ${addr.last_name || ''}`.trim() : '')
                    || custProfile?.company_name 
                    || custProfile?.full_name
                    || customer?.email 
                    || addr?.email
                    || (addr?.city ? `Cliente (${addr.city})` : 'Cliente Privato')
                const customer_phone = customer?.phone || addr?.phone || addr?.contact_phone || addr?.telephone || null
                const customer_email = customer?.email || addr?.email || null
                const address = addr?.street || addr?.address || (typeof order?.installation_address === 'string' ? order.installation_address : '')
                const city = addr?.city || ''
                const province = addr?.province || ''
                const cap = addr?.cap || addr?.postal_code || ''

                const proPayout = Number(order?.professional_payout) || ((Number(order?.laying_total) || 0) + (Number(order?.services_total) || 0))

                // Dati fiscali e fatturazione
                const fiscal_code = custProfile?.fiscal_code || addr?.fiscal_code || addr?.cf || (order as any)?.fiscal_code || null
                const vat_number = custProfile?.vat_number || addr?.vat_number || addr?.piva || addr?.partita_iva || (order as any)?.vat_number || null
                const company_name = custProfile?.company_name || addr?.company_name || addr?.ragione_sociale || null
                const customer_type = custProfile?.customer_type || (vat_number || company_name ? 'company' : 'private')

                // Se si vuole la fattura o meno
                const wants_invoice = Boolean(
                    addr?.wants_invoice === true ||
                    addr?.invoice_requested === true ||
                    addr?.richiede_fattura === true ||
                    (order as any)?.wants_invoice === true ||
                    (order as any)?.requires_invoice === true ||
                    (order as any)?.invoice_requested === true ||
                    vat_number ||
                    company_name
                )

                const invoice_details = {
                    fiscal_code,
                    vat_number,
                    company_name,
                    customer_type,
                    sdi_code: addr?.sdi_code || addr?.codice_destinatario || custProfile?.sdi_code || null,
                    pec: addr?.pec || custProfile?.pec || null,
                    billing_address: addr?.billing_address || (addr?.billing_city ? `${addr.billing_address || ''}, ${addr.billing_city} (${addr.billing_province || ''})` : null),
                }

                return {
                    customer_name,
                    customer_phone,
                    customer_email,
                    address,
                    city,
                    province,
                    cap,
                    payout: proPayout,
                    laying_total: Number(order?.laying_total) || 0,
                    services_total: Number(order?.services_total) || 0,
                    order_number: order?.order_number || (order?.id ? order.id.slice(0, 8) : undefined),
                    customer_fiscal_code: fiscal_code,
                    customer_vat_number: vat_number,
                    customer_company_name: company_name,
                    wants_invoice,
                    invoice_details,
                }
            }

            // Map jobs
            const mappedJobs: Job[] = assignedJobs.map((j: any) => {
                const info = extractCustomerInfo(j.orders)
                return {
                    id: j.id,
                    order_id: j.order_id,
                    status: j.status as JobStatus,
                    scheduled_date: j.scheduled_date || j.orders?.installation_date || j.orders?.work_start_date || null,
                    notes: j.notes || j.orders?.notes || '',
                    created_at: j.created_at,
                    order: j.orders || null,
                    ...info,
                }
            })

            // Map drafts to jobs structure
            const mappedDrafts: Job[] = (draftOrders || []).map((o: any) => {
                const info = extractCustomerInfo(o)
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
