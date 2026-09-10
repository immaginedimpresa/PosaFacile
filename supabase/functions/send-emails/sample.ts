// Dati finti per le anteprime.
//
// Servono a guardare un template senza aspettare che un ordine vero arrivi in
// quello stato. I valori sono deliberatamente pieni — indirizzo lungo, importi
// con le migliaia, note del cliente — perché i template si rompono sui casi
// pieni, non su quelli vuoti.

import type { OutboxRow } from './templates.ts'

const SAMPLE_ORDER = {
    id: '00000000-0000-4000-8000-000000000001',
    order_number: '2026-0184',
    status: 'in_progress',
    payment_status: 'paid',
    payment_method: 'Carta di credito',
    project_type: 'soggiorno',
    laying_type: 'spina_ungherese',
    floor_sqm: 42.5,
    wall_sqm: 8,
    material_total: 3187.5,
    laying_total: 2295,
    services_total: 430,
    subtotal: 5912.5,
    vat_amount: 1300.75,
    total: 7213.25,
    professional_payout: 1950,
    notes: 'Il sottofondo è in cemento, posato negli anni ’70. Nell’angolo verso il balcone c’è un dislivello di circa due centimetri.',
    items: [{ name: 'Gres porcellanato Rovere Naturale 20x120', quantity: 45 }],
    scheduled_date: '2026-10-05',
    installation_date: '2026-10-05',
    work_start_date: '2026-10-05',
    work_end_date: '2026-10-12',
    estimated_work_days: 5,
    confirmed_work_days: 6.5,
    duration_pro_note: 'Serve una giornata in più per la livellatura del sottofondo prima della posa.',
    created_at: '2026-09-01T09:12:00Z',
    installation_address: {
        address: 'Via Giuseppe Mazzini 118',
        cap: '20851',
        city: 'Lissone',
        provincia: 'MB',
    },
    customer: {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'cliente@esempio.it',
        first_name: 'Marco',
        last_name: 'Bianchi',
        full_name: 'Marco Bianchi',
        phone: '+39 340 1234567',
    },
    professional: {
        id: '00000000-0000-4000-8000-000000000003',
        email: 'posatore@esempio.it',
        full_name: 'Luigi Ferrari',
        company_name: 'Ferrari Posa Pavimenti',
        display_name: 'Ferrari Posa Pavimenti',
        phone: '+39 335 7654321',
        rating: 4.8,
    },
    milestones: [
        { step: 'order_placed', status: 'done', occurred_at: '2026-09-01T09:12:00Z', note: null },
        { step: 'payment_confirmed', status: 'done', occurred_at: '2026-09-01T09:14:00Z', note: null },
        { step: 'material_check', status: 'done', occurred_at: '2026-09-03T11:00:00Z', note: null },
        { step: 'professional_confirmed', status: 'done', occurred_at: '2026-09-04T08:30:00Z', note: null },
        { step: 'info_pending', status: 'done', occurred_at: '2026-09-05T16:00:00Z', note: null },
        { step: 'green_light', status: 'done', occurred_at: '2026-09-08T10:00:00Z', note: null },
        { step: 'date_confirmed', status: 'done', occurred_at: '2026-09-09T09:00:00Z', note: null },
        { step: 'material_shipped', status: 'pending', occurred_at: null, note: null },
        { step: 'material_delivered', status: 'pending', occurred_at: null, note: null },
        { step: 'room_prep_notice', status: 'pending', occurred_at: null, note: null },
        { step: 'work_started', status: 'pending', occurred_at: null, note: null },
        { step: 'work_completed', status: 'pending', occurred_at: null, note: null },
    ],
}

/** Metadati specifici dei template che non leggono l'ordine. */
const EXTRA_META: Record<string, Record<string, unknown>> = {
    'quote_created.customer': {
        product_name: 'Gres porcellanato Rovere Naturale 20x120',
        floor_sqm: 42.5, wall_sqm: 8, city: 'Lissone',
        material_total: 3187.5, laying_total: 2295, services_total: 430,
        total: 5912.5, estimated_work_days: 5,
    },
    'pro_registered.admin': {
        company_name: 'Ferrari Posa Pavimenti', vat_number: '02456780968',
        phone: '+39 335 7654321', billing_city: 'Lissone', billing_province: 'MB',
    },
    'duration_confirmed.admin': { estimated_work_days: 5, confirmed_work_days: 6.5 },
    'low_stock.admin': {
        product_name: 'Gres porcellanato Rovere Naturale 20x120',
        sku: 'GRS-RVN-20120', stock_qty: 12,
    },
    'info_pending.customer': {
        note: 'Ci servono due foto del sottofondo e la misura esatta del vano porta verso il corridoio.',
    },
}

/**
 * Costruisce una riga di coda finta per la chiave richiesta, deducendo ruolo,
 * evento e variante dalla chiave stessa.
 */
export function SAMPLE_CONTEXT(templateKey: string, toEmail: string): {
    row: OutboxRow
    order: Record<string, any> | null
} {
    const [event, role, variant] = templateKey.split('.')

    const meta: Record<string, unknown> = {
        order_id: SAMPLE_ORDER.id,
        ...(variant ? (variant === 'in_progress' || variant === 'completed' || variant === 'cancelled'
            ? { status: variant }
            : { step: variant }) : {}),
        ...(EXTRA_META[templateKey] ?? {}),
    }

    // I template che non parlano di un ordine non devono ricevere un ordine
    // finto: mostrerebbero una scheda che nella realtà non c'è.
    const withoutOrder = ['welcome', 'quote_created', 'pro_registered', 'pro_approved', 'low_stock']
    if (withoutOrder.includes(event)) delete meta.order_id

    const names: Record<string, string> = {
        customer: 'Marco Bianchi',
        professional: 'Luigi Ferrari',
        admin: 'Staff PosaFacile',
    }

    return {
        row: {
            id: '00000000-0000-4000-8000-0000000000ff',
            to_email: toEmail,
            to_name: names[role ?? 'customer'] ?? 'Marco Bianchi',
            to_role: role ?? 'customer',
            subject: 'Anteprima template',
            body: 'Questo è il testo generico accodato dal trigger, usato come ripiego.',
            link: role === 'professional' ? '/pro/jobs' : role === 'admin' ? '/admin/orders'
                : `/dashboard/orders/${SAMPLE_ORDER.id}`,
            event_type: event,
            template: templateKey,
            metadata: meta,
            attempts: 0,
        },
        order: meta.order_id ? SAMPLE_ORDER : null,
    }
}
