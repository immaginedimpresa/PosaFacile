import { supabase } from '@/lib/supabase'
import { LAYING_TYPE_LABELS, type ConfiguratorState } from '@/store/configuratorStore'

export interface SavedQuoteItem {
    id: string
    customer_id: string
    name: string | null
    project_type: string | null
    product_id: string | null
    floor_sqm: number | null
    wall_sqm: number | null
    laying_type: string | null
    services: any
    address: string | null
    city: string | null
    provincia: string | null
    cap: string | null
    professional_id: string | null
    scheduled_date: string | null
    material_total: number | null
    laying_total: number | null
    services_total: number | null
    total: number | null
    ai_result_image: string | null
    status: string | null
    converted_order_id: string | null
    created_at: string
    updated_at: string
    product?: {
        id: string
        name: string
        slug?: string
        price_per_sqm: number
        images: string[]
        category?: string
        material?: string
        format_width?: number | null
        format_height?: number | null
        lead_time_days?: number | null
    } | null
    professional?: {
        id: string
        first_name: string
        last_name: string
        full_name?: string
        company_name?: string
    } | null
}

const AMBIENTE_LABELS: Record<string, string> = {
    bagno: 'Bagno',
    cucina: 'Cucina',
    soggiorno: 'Soggiorno',
    camera: 'Camera da letto',
    esterno: 'Esterno / Terrazzo',
    altro: 'Altro ambiente',
}

/**
 * Salva la configurazione corrente nella tabella saved_quotes di Supabase
 */
export async function saveCurrentQuote(
    state: ConfiguratorState,
    userId: string,
    existingQuoteId?: string
): Promise<{ data: SavedQuoteItem | null; error: Error | null }> {
    try {
        const ambienteName = state.projectInfo.ambiente
            ? (AMBIENTE_LABELS[state.projectInfo.ambiente] || state.projectInfo.ambiente)
            : 'Pavimento'
        const productName = state.selectedProduct?.name || 'Materiale da selezionare'
        const quoteName = `Preventivo ${ambienteName} - ${productName}`

        const effectiveDate = state.selectedDate
            ? state.selectedDate.toISOString().split('T')[0]
            : state.location.dataPreferita || null

        const durata = state.getDurationEstimate()

        const quotePayload = {
            customer_id: userId,
            name: quoteName,
            project_type: state.projectInfo.ambiente || 'soggiorno',
            product_id: state.selectedProduct?.id || null,
            floor_sqm: state.dimensions.pavimentoMq || 0,
            wall_sqm: state.dimensions.paretiMq || 0,
            laying_type: state.layingType || 'dritta',
            services: {
                ...state.services,
                delivery_access: state.deliveryAccess,
                delivery_cost: state.getDeliveryCost(),
            },
            address: state.location.indirizzo || '',
            city: state.location.citta || '',
            provincia: state.location.provincia || '',
            cap: state.location.cap || '',
            professional_id: state.selectedProfessional?.id || null,
            scheduled_date: effectiveDate,
            material_total: state.getMaterialCost(),
            laying_total: state.getLayingCost(),
            services_total: state.getServicesCost(),
            total: state.getTotal(),
            ai_result_image: state.aiResultImage || null,
            status: 'draft',
            // La durata stimata viaggia con il preventivo: chi lo riapre dal
            // proprio account ritrova le stesse giornate di cantiere.
            estimated_work_days: durata.workDays,
            estimated_calendar_days: durata.calendarDays,
            duration_breakdown: durata,
            updated_at: new Date().toISOString()
        }

        if (existingQuoteId) {
            const { data, error } = await supabase
                .from('saved_quotes')
                .update(quotePayload as any)
                .eq('id', existingQuoteId)
                .eq('customer_id', userId)
                .select(`
                    *,
                    product:products(id, name, price_per_sqm, images, category, material, format_width, format_height, lead_time_days)
                `)
                .single()

            if (error) throw error
            return { data: data as unknown as SavedQuoteItem, error: null }
        } else {
            const { data, error } = await supabase
                .from('saved_quotes')
                .insert({
                    ...quotePayload,
                    created_at: new Date().toISOString()
                } as any)
                .select(`
                    *,
                    product:products(id, name, price_per_sqm, images, category, material, format_width, format_height, lead_time_days)
                `)
                .single()

            if (error) throw error
            return { data: data as unknown as SavedQuoteItem, error: null }
        }
    } catch (err: any) {
        console.error('Error saving quote to Supabase:', err)
        return { data: null, error: err }
    }
}

/**
 * Recupera tutti i preventivi salvati dell'utente
 */
export async function fetchSavedQuotes(userId: string): Promise<SavedQuoteItem[]> {
    try {
        const { data, error } = await supabase
            .from('saved_quotes')
            .select(`
                *,
                product:products(id, name, price_per_sqm, images, category, material, format_width, format_height, lead_time_days)
            `)
            .eq('customer_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return (data || []).map((quote: any) => ({
            ...quote,
            product: Array.isArray(quote.product) ? quote.product[0] : quote.product
        })) as SavedQuoteItem[]
    } catch (err) {
        console.error('Error fetching saved quotes:', err)
        return []
    }
}

/**
 * Elimina un preventivo salvato
 */
export async function deleteSavedQuote(quoteId: string, userId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('saved_quotes')
            .delete()
            .eq('id', quoteId)
            .eq('customer_id', userId)

        if (error) throw error
        return true
    } catch (err) {
        console.error('Error deleting quote:', err)
        return false
    }
}

/**
 * Trasforma un preventivo salvato in un ordine bozza pronto per il checkout
 */
export async function convertSavedQuoteToOrder(
    quote: SavedQuoteItem,
    userId: string
): Promise<{ orderId: string | null; error: Error | null }> {
    try {
        const orderNumber = `PREV-${Date.now()}`

        const subtotal = (quote.material_total || 0) + (quote.laying_total || 0) + (quote.services_total || 0)
        const vat = subtotal * 0.22
        const total = quote.total || (subtotal + vat)

        const orderPayload: any = {
            user_id: userId,
            customer_id: userId,
            order_number: orderNumber,
            status: 'draft',
            total: total,
            subtotal: subtotal,
            vat_amount: vat,
            items: [{
                quote_id: quote.id,
                product: quote.product,
                floor_sqm: quote.floor_sqm,
                wall_sqm: quote.wall_sqm,
                layingType: quote.laying_type,
                services: quote.services
            }],
            installation_address: {
                street: quote.address,
                address: quote.address,
                city: quote.city,
                province: quote.provincia,
                postal_code: quote.cap,
                cap: quote.cap,
                delivery_access: (quote.services as any)?.delivery_access || null,
                delivery_cost: (quote.services as any)?.delivery_cost || 0,
            },
            notes: (quote.services as any)?.delivery_access?.logisticsNotes || null,
            installation_date: quote.scheduled_date,
            installation_professional_id: quote.professional_id || null,
            project_type: quote.project_type,
            laying_type: quote.laying_type ? LAYING_TYPE_LABELS[quote.laying_type as keyof typeof LAYING_TYPE_LABELS] || quote.laying_type : 'Standard',
            floor_sqm: quote.floor_sqm,
            wall_sqm: quote.wall_sqm,
            material_total: quote.material_total,
            laying_total: quote.laying_total,
            services_total: quote.services_total,
            scheduled_time_slot: quote.scheduled_date
        }

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert(orderPayload)
            .select('id')
            .single()

        if (orderError) throw orderError

        // Aggiorna lo stato del preventivo salvato
        if (orderData?.id) {
            await supabase
                .from('saved_quotes')
                .update({
                    status: 'converted',
                    converted_order_id: orderData.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', quote.id)

            return { orderId: orderData.id, error: null }
        }

        return { orderId: null, error: new Error('Impossibile creare l\'ordine') }
    } catch (err: any) {
        console.error('Error converting quote to order:', err)
        return { orderId: null, error: err }
    }
}
