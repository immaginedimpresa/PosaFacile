import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'
import {
    ROOM_PREP_NOTICE_DAYS,
    TIMELINE_STEPS,
    type OrderMilestone,
    type StepStatus,
    type TimelineStepKey,
} from '@/lib/orderTimeline'
import {
    estimateEndDate,
    type DurationEstimate,
} from '@/lib/layingDuration'

/** Tappe create per ogni ordine. `info_pending` e `closed` sono opzionali. */
const DEFAULT_STEPS: TimelineStepKey[] = TIMELINE_STEPS.filter(
    (s) => s !== 'info_pending' && s !== 'closed',
)

export async function fetchOrderMilestones(orderId: string): Promise<OrderMilestone[]> {
    const { data, error } = await supabase
        .from('order_milestones' as any)
        .select('*')
        .eq('order_id', orderId)

    if (error) {
        // La timeline è un arricchimento: se la tabella non è ancora migrata
        // la pagina dell'ordine deve continuare a funzionare.
        console.warn('Timeline non disponibile:', error.message)
        return []
    }
    return (data || []) as unknown as OrderMilestone[]
}

/**
 * Garantisce che le tappe standard esistano.
 * Il trigger sul database le crea alla nascita dell'ordine; questa funzione
 * copre gli ordini creati prima della migrazione.
 */
export async function ensureOrderMilestones(orderId: string): Promise<OrderMilestone[]> {
    const existing = await fetchOrderMilestones(orderId)
    const presenti = new Set(existing.map((m) => String(m.step)))
    const mancanti = DEFAULT_STEPS.filter((s) => !presenti.has(s))

    if (mancanti.length === 0) return existing

    const { error } = await supabase
        .from('order_milestones' as any)
        .upsert(
            mancanti.map((step) => ({ order_id: orderId, step, status: 'pending' as StepStatus })),
            { onConflict: 'order_id,step' },
        )

    if (error) {
        console.warn('Impossibile inizializzare la timeline:', error.message)
        return existing
    }
    return fetchOrderMilestones(orderId)
}

export interface MilestoneUpdate {
    status: StepStatus
    note?: string | null
    dueAt?: string | null
    occurredAt?: string | null
    payload?: Record<string, unknown>
}

/** Aggiorna (o crea) una tappa. Il timestamp di chiusura lo mette il trigger. */
export async function setOrderMilestone(
    orderId: string,
    step: TimelineStepKey,
    update: MilestoneUpdate,
    actorId?: string | null,
): Promise<void> {
    const row: Database['public']['Tables']['order_milestones']['Insert'] = {
        order_id: orderId,
        step,
        status: update.status,
        actor_id: actorId ?? null,
    }

    if (update.note !== undefined) row.note = update.note
    if (update.dueAt !== undefined) row.due_at = update.dueAt
    if (update.payload !== undefined) row.payload = update.payload as Json

    // Riaprire una tappa deve cancellare il timestamp, altrimenti la timeline
    // mostrerebbe una data di completamento per qualcosa che è tornato aperto.
    if (update.occurredAt !== undefined) {
        row.occurred_at = update.occurredAt
    } else if (update.status !== 'done') {
        row.occurred_at = null
    }

    const { error } = await supabase
        .from('order_milestones' as any)
        .upsert(row, { onConflict: 'order_id,step' })

    if (error) throw error
}

/** Apre la richiesta di informazioni al cliente: è la tappa che blocca il flusso. */
export async function requestCustomerInfo(
    orderId: string,
    note: string,
    actorId?: string | null,
): Promise<void> {
    await setOrderMilestone(orderId, 'info_pending', { status: 'blocked', note }, actorId)
}

export async function resolveCustomerInfo(
    orderId: string,
    note: string | null,
    actorId?: string | null,
): Promise<void> {
    await setOrderMilestone(orderId, 'info_pending', { status: 'done', note }, actorId)
}

/**
 * Fissa la data di inizio: chiude "data confermata", programma l'avviso
 * "prepara la stanza" e scrive la finestra di cantiere sull'ordine.
 */
export async function confirmWorkSchedule(
    orderId: string,
    startDate: string,
    estimate: DurationEstimate,
    actorId?: string | null,
): Promise<void> {
    const end = estimateEndDate(startDate, estimate)

    const noticeDate = new Date(startDate)
    noticeDate.setDate(noticeDate.getDate() - ROOM_PREP_NOTICE_DAYS)

    const { error } = await supabase
        .from('orders')
        .update({
            work_start_date: startDate,
            work_end_date: end ? end.toISOString().slice(0, 10) : null,
            scheduled_date: startDate,
            installation_date: startDate,
            updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

    if (error) throw error

    await setOrderMilestone(
        orderId,
        'date_confirmed',
        {
            status: 'done',
            note: end
                ? `Cantiere dal ${formatIt(startDate)} al ${formatIt(end)} (${estimate.calendarDays} giorni).`
                : `Inizio lavori il ${formatIt(startDate)}.`,
        },
        actorId,
    )

    await setOrderMilestone(
        orderId,
        'room_prep_notice',
        {
            status: 'pending',
            dueAt: noticeDate.toISOString(),
            note: `Avviso da inviare entro il ${formatIt(noticeDate)}.`,
        },
        actorId,
    )
}

/** Il professionista conferma o corregge le giornate stimate in preventivo. */
export async function confirmDuration(
    orderId: string,
    workDays: number,
    calendarDays: number,
    note: string | null,
    professionalId: string,
): Promise<void> {
    const { error } = await supabase
        .from('orders')
        .update({
            confirmed_work_days: workDays,
            confirmed_calendar_days: calendarDays,
            duration_confirmed_by: professionalId,
            duration_confirmed_at: new Date().toISOString(),
            duration_pro_note: note,
            updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

    if (error) throw error
}

const formatIt = (date: string | Date): string =>
    new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
