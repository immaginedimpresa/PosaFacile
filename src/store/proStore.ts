import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export type JobStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'draft' | 'pending'

export interface Job {
    id: string
    order_id: string
    status: JobStatus
    scheduled_date: string | null
    customer_name?: string // Joined from order -> shipping_address (or user profile)
    address?: string
    city?: string
    notes?: string
    created_at: string
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
    toggleAvailability: (date: string, status: 'busy' | 'vacation') => Promise<void>
    bulkUpdateAvailability: (dates: string[], status: 'busy' | 'available') => Promise<void>
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
                        installation_address,
                        customer:users!orders_customer_id_fkey (
                            first_name,
                            last_name,
                            email
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
                    created_at,
                    installation_date,
                    scheduled_time_slot,
                    installation_address,
                    customer:users!orders_customer_id_fkey (
                        first_name,
                        last_name,
                        email
                    )
                `)
                .or(`professional_id.eq.${user.id},installation_professional_id.eq.${user.id}`) // Check both legacy and new field
                .in('status', ['draft', 'pending'] as any)
                .gte('created_at', yesterday) // Auto-expire check
                .order('created_at', { ascending: false })

            if (draftsError) console.error('Error fetching drafts:', draftsError)
            console.log('👷‍♂️ [Professional] Draft/Pending Orders found:', draftOrders?.length || 0, draftOrders)

            // Map jobs
            const mappedJobs: Job[] = assignedJobs.map((j: any) => ({
                id: j.id,
                order_id: j.order_id,
                status: j.status as JobStatus,
                scheduled_date: j.scheduled_date,
                notes: j.notes,
                created_at: j.created_at,
                customer_name: j.orders?.customer ? `${j.orders.customer.first_name || ''} ${j.orders.customer.last_name || ''}`.trim() : (j.orders?.customer?.email || 'Cliente'),
                address: j.orders?.installation_address?.street || j.orders?.installation_address?.address || '',
                city: j.orders?.installation_address?.city || ''
            }))

            // Map drafts to jobs structure
            const mappedDrafts: Job[] = (draftOrders || []).map((o: any) => ({
                id: o.id, // Using order ID as job ID for drafts
                order_id: o.id,
                status: 'draft' as any, // Pseudo-status
                scheduled_date: o.installation_date,
                notes: 'In attesa di pagamento',
                created_at: o.created_at,
                customer_name: o.customer ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim() : (o.customer?.email || 'Nuovo Cliente'),
                address: o.installation_address?.street || o.installation_address?.address || '',
                city: o.installation_address?.city || ''
            }))

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
    }
}))
