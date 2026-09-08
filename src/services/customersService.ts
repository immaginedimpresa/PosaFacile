import { supabase } from '@/lib/supabase'

export interface CustomerSummary {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    created_at: string | null
    last_login: string | null
    avatar_url: string | null
    status: string | null

    // From customers table
    customer_type: 'private' | 'company'
    company_name: string | null
    vat_number: string | null
    fiscal_code: string | null
    marketing_consent: boolean | null
    newsletter_consent: boolean | null
    admin_notes: string | null
    is_active: boolean

    // Computed aggregates
    orders_count: number
    quotes_count: number
    total_spent: number
    last_activity: string | null
}

export interface CustomerOrder {
    id: string
    order_number?: string | null
    created_at: string
    status: string
    total: number
    payment_status?: string | null
    scheduled_date?: string | null
    installation_address?: string | null
    items_count?: number
}

export interface CustomerQuote {
    id: string
    name: string | null
    created_at: string
    project_type: string | null
    floor_sqm: number | null
    wall_sqm: number | null
    laying_type: string | null
    total: number | null
    status: string | null
    city: string | null
    provincia: string | null
}

export interface CustomerAddress {
    id: string
    street: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    country: string | null
    is_default: boolean | null
}

export interface FullCustomerDetails extends CustomerSummary {
    orders: CustomerOrder[]
    quotes: CustomerQuote[]
    addresses: CustomerAddress[]
}

/**
 * Recupera la lista di tutti i clienti con aggregati calcolati (ordini, preventivi, totale speso).
 */
export async function fetchCustomers(): Promise<CustomerSummary[]> {
    try {
        // 1. Recupera gli utenti con ruolo customer
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'customer')
            .order('created_at', { ascending: false })

        if (usersError) throw usersError
        if (!usersData || usersData.length === 0) return []

        const userIds = usersData.map(u => u.id)

        // 2. Recupera i dettagli anagrafici da customers
        const { data: customersData } = await supabase
            .from('customers')
            .select('*')
            .in('id', userIds)

        const customersMap = new Map((customersData || []).map(c => [c.id, c]))

        // 3. Recupera gli ordini per conteggio e totale speso
        const { data: ordersData } = await supabase
            .from('orders')
            .select('id, customer_id, total, status, created_at')
            .in('customer_id', userIds)

        // 4. Recupera i preventivi salvati
        const { data: quotesData } = await supabase
            .from('saved_quotes')
            .select('id, customer_id, created_at')
            .in('customer_id', userIds)

        // Aggrega i risultati
        const result: CustomerSummary[] = usersData.map(user => {
            const customer = customersMap.get(user.id)
            const userOrders = (ordersData || []).filter(o => o.customer_id === user.id)
            const userQuotes = (quotesData || []).filter(q => q.customer_id === user.id)

            // Calcola totale speso (ordini confermati o completati, o tutti tranne cancellati)
            const validOrders = userOrders.filter(o => o.status !== 'cancelled')
            const totalSpent = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

            // Determina data ultima attività
            const orderDates = userOrders.map(o => o.created_at).filter(Boolean) as string[]
            const quoteDates = userQuotes.map(q => q.created_at).filter(Boolean) as string[]
            const allDates = [...orderDates, ...quoteDates, user.last_login || '', user.created_at || ''].filter(Boolean)
            const lastActivity = allDates.length > 0
                ? allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
                : user.created_at

            return {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                created_at: user.created_at,
                last_login: user.last_login,
                avatar_url: user.avatar_url,
                status: user.status,

                customer_type: (customer?.customer_type as 'private' | 'company') || 'private',
                company_name: customer?.company_name || null,
                vat_number: customer?.vat_number || null,
                fiscal_code: customer?.fiscal_code || null,
                marketing_consent: customer?.marketing_consent ?? false,
                newsletter_consent: customer?.newsletter_consent ?? false,
                admin_notes: customer?.admin_notes || null,
                is_active: customer?.is_active ?? true,

                orders_count: userOrders.length,
                quotes_count: userQuotes.length,
                total_spent: totalSpent,
                last_activity: lastActivity || null
            }
        })

        return result
    } catch (err: any) {
        console.error('Error fetching customers:', err)
        throw new Error(err.message || 'Errore durante il recupero dei clienti')
    }
}

/**
 * Recupera i dettagli completi di un cliente (anagrafica, tutti gli ordini, preventivi e indirizzi).
 */
export async function fetchCustomerDetails(customerId: string): Promise<FullCustomerDetails> {
    try {
        // 1. Dati utente
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', customerId)
            .single()

        if (userError) throw userError

        // 2. Dati anagrafici
        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle()

        // 3. Ordini
        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })

        // 4. Preventivi
        const { data: quotes } = await supabase
            .from('saved_quotes')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })

        // 5. Indirizzi
        const { data: addresses } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', customerId)
            .order('is_default', { ascending: false })

        const userOrders = orders || []
        const validOrders = userOrders.filter(o => o.status !== 'cancelled')
        const totalSpent = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

        return {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            created_at: user.created_at,
            last_login: user.last_login,
            avatar_url: user.avatar_url,
            status: user.status,

            customer_type: (customer?.customer_type as 'private' | 'company') || 'private',
            company_name: customer?.company_name || null,
            vat_number: customer?.vat_number || null,
            fiscal_code: customer?.fiscal_code || null,
            marketing_consent: customer?.marketing_consent ?? false,
            newsletter_consent: customer?.newsletter_consent ?? false,
            admin_notes: customer?.admin_notes || null,
            is_active: customer?.is_active ?? true,

            orders_count: userOrders.length,
            quotes_count: (quotes || []).length,
            total_spent: totalSpent,
            last_activity: userOrders[0]?.created_at || quotes?.[0]?.created_at || user.created_at,

            orders: userOrders.map(o => {
                let formattedAddress: string | null = null
                if (o.installation_address) {
                    if (typeof o.installation_address === 'string') {
                        formattedAddress = o.installation_address
                    } else if (typeof o.installation_address === 'object' && o.installation_address !== null) {
                        const a = o.installation_address as any
                        const parts = [a.street || a.address, a.postal_code || a.cap, a.city, a.province || a.provincia].filter(Boolean)
                        formattedAddress = parts.length > 0 ? parts.join(', ') : JSON.stringify(a)
                    }
                }

                return {
                    id: o.id,
                    order_number: o.order_number,
                    created_at: o.created_at || '',
                    status: o.status || 'draft',
                    total: Number(o.total) || 0,
                    payment_status: o.payment_status,
                    scheduled_date: o.scheduled_date,
                    installation_address: formattedAddress
                }
            }),
            quotes: (quotes || []).map(q => ({
                id: q.id,
                name: q.name,
                created_at: q.created_at || '',
                project_type: q.project_type,
                floor_sqm: q.floor_sqm,
                wall_sqm: q.wall_sqm,
                laying_type: q.laying_type,
                total: Number(q.total) || 0,
                status: q.status,
                city: q.city,
                provincia: q.provincia
            })),
            addresses: (addresses || []).map(a => ({
                id: a.id,
                street: a.street,
                city: a.city,
                province: a.province,
                postal_code: a.postal_code,
                country: a.country,
                is_default: a.is_default
            }))
        }
    } catch (err: any) {
        console.error('Error fetching customer details:', err)
        throw new Error(err.message || 'Errore durante il recupero dei dettagli cliente')
    }
}

/**
 * Salva le note interne riservate all'amministratore.
 */
export async function updateCustomerAdminNotes(customerId: string, notes: string): Promise<void> {
    // Assicura che esista il record in customers
    const { error } = await supabase
        .from('customers')
        .upsert({
            id: customerId,
            admin_notes: notes
        })

    if (error) throw error
}

/**
 * Aggiorna i dati anagrafici e fiscali del cliente.
 */
export async function updateCustomerProfile(
    customerId: string,
    data: {
        first_name?: string
        last_name?: string
        phone?: string
        customer_type?: 'private' | 'company'
        company_name?: string
        vat_number?: string
        fiscal_code?: string
        is_active?: boolean
        admin_notes?: string
    }
): Promise<void> {
    // 1. Aggiorna users (nome, cognome, telefono)
    if (data.first_name !== undefined || data.last_name !== undefined || data.phone !== undefined) {
        const { error: userError } = await supabase
            .from('users')
            .update({
                first_name: data.first_name,
                last_name: data.last_name,
                phone: data.phone,
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId)

        if (userError) throw userError
    }

    // 2. Aggiorna customers (dati aziendali/fiscali/note)
    const customerPayload: any = { id: customerId }
    if (data.customer_type !== undefined) customerPayload.customer_type = data.customer_type
    if (data.company_name !== undefined) customerPayload.company_name = data.company_name
    if (data.vat_number !== undefined) customerPayload.vat_number = data.vat_number
    if (data.fiscal_code !== undefined) customerPayload.fiscal_code = data.fiscal_code
    if (data.is_active !== undefined) customerPayload.is_active = data.is_active
    if (data.admin_notes !== undefined) customerPayload.admin_notes = data.admin_notes

    const { error: customerError } = await supabase
        .from('customers')
        .upsert(customerPayload)

    if (customerError) throw customerError
}
