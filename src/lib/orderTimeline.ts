/**
 * Barra di stato dell'ordine.
 *
 * Il ciclo di vita di un ordine PosaFacile non è una sequenza lineare di stati
 * dell'enum `order_status`: fra "ordine pagato" e "posa iniziata" ci sono
 * verifiche che avvengono in parallelo (magazzino, professionista, documenti)
 * e almeno un punto di attesa in cui la palla torna al cliente.
 *
 * Per questo la timeline vive in una tabella dedicata (`order_milestones`):
 * ogni tappa ha uno stato proprio, un timestamp, un responsabile e una nota.
 * `order_status` resta il riassunto di alto livello usato in elenchi e filtri;
 * qui c'è il dettaglio che il cliente vede nella pagina dell'ordine.
 */

import type { OrderStatus } from '@/lib/orderStatus'

export const TIMELINE_STEPS = [
    'order_placed',
    'payment_confirmed',
    'material_check',
    'professional_confirmed',
    'info_pending',
    'green_light',
    'date_confirmed',
    'material_shipped',
    'material_delivered',
    'room_prep_notice',
    'work_started',
    'work_completed',
    'closed',
] as const

export type TimelineStepKey = (typeof TIMELINE_STEPS)[number]

/** Chi deve muoversi perché la tappa si chiuda. */
export type StepOwner = 'cliente' | 'admin' | 'professionista' | 'sistema'

/**
 * Stato di una singola tappa.
 * `blocked` è il vero motivo per cui serve questa struttura: un ordine può
 * essere fermo in attesa di informazioni senza essere "indietro" di stato.
 */
export type StepStatus = 'pending' | 'active' | 'blocked' | 'done' | 'skipped'

export interface TimelineStepDefinition {
    key: TimelineStepKey
    /** Nome sintetico della tappa */
    label: string
    /** Nome specifico quando la tappa è in corso/in attesa */
    activeLabel?: string
    /** Nome specifico quando la tappa è completata */
    doneLabel?: string
    /** Testo mostrato al cliente quando la tappa non è ancora chiusa. */
    description: string
    /** Testo mostrato al cliente a tappa conclusa. */
    doneDescription: string
    owner: StepOwner
    /** Le tappe interne non compaiono nella timeline del cliente. */
    customerVisible: boolean
    /** Una tappa opzionale può essere saltata senza bloccare il flusso. */
    optional: boolean
}

export const TIMELINE_STEP_DEFINITIONS: Record<TimelineStepKey, TimelineStepDefinition> = {
    order_placed: {
        key: 'order_placed',
        label: 'Ricezione ordine',
        activeLabel: 'Registrazione ordine',
        doneLabel: 'Ordine ricevuto',
        description: 'Stiamo registrando il tuo ordine.',
        doneDescription: 'Ordine registrato e preso in carico.',
        owner: 'sistema',
        customerVisible: true,
        optional: false,
    },
    payment_confirmed: {
        key: 'payment_confirmed',
        label: 'Pagamento acconto',
        activeLabel: 'In attesa di pagamento',
        doneLabel: 'Pagamento confermato',
        description: 'In attesa del pagamento dell’acconto per confermare la prenotazione.',
        doneDescription: 'Pagamento ricevuto correttamente.',
        owner: 'cliente',
        customerVisible: true,
        optional: false,
    },
    material_check: {
        key: 'material_check',
        label: 'Verifica materiale',
        activeLabel: 'Verifica disponibilità in magazzino',
        doneLabel: 'Materiale confermato in magazzino',
        description: 'Stiamo verificando la disponibilità delle piastrelle e dei materiali di posa.',
        doneDescription: 'Materiale disponibile e riservato per il tuo cantiere.',
        owner: 'admin',
        customerVisible: true,
        optional: false,
    },
    professional_confirmed: {
        key: 'professional_confirmed',
        label: 'Assegnazione posatore',
        activeLabel: 'Conferma posatore in corso',
        doneLabel: 'Professionista confermato',
        description: 'Il posatore selezionato deve confermare l’incarico.',
        doneDescription: 'Il posatore ha accettato l’incarico.',
        owner: 'professionista',
        customerVisible: true,
        optional: false,
    },
    info_pending: {
        key: 'info_pending',
        label: 'Informazioni aggiuntive',
        activeLabel: 'Informazioni richieste',
        doneLabel: 'Informazioni ricevute',
        description: 'Ci servono alcune informazioni o documenti per procedere.',
        doneDescription: 'Abbiamo ricevuto tutte le informazioni necessarie.',
        owner: 'cliente',
        customerVisible: true,
        optional: true,
    },
    green_light: {
        key: 'green_light',
        label: 'Approvazione cantiere',
        activeLabel: 'Verifica pre-cantiere in corso',
        doneLabel: 'OK, si parte',
        description: 'Ultima verifica prima di fissare il cantiere.',
        doneDescription: 'Tutte le verifiche sono chiuse: il cantiere è approvato.',
        owner: 'admin',
        customerVisible: true,
        optional: false,
    },
    date_confirmed: {
        key: 'date_confirmed',
        label: 'Data di inizio',
        activeLabel: 'Definizione data inizio',
        doneLabel: 'Data confermata',
        description: 'Stiamo concordando la data di inizio con il posatore.',
        doneDescription: 'Data di inizio lavori confermata.',
        owner: 'admin',
        customerVisible: true,
        optional: false,
    },
    material_shipped: {
        key: 'material_shipped',
        label: 'Spedizione materiale',
        activeLabel: 'Preparazione spedizione',
        doneLabel: 'Materiale spedito',
        description: 'Stiamo preparando la spedizione delle piastrelle e dei materiali di posa.',
        doneDescription: 'Materiale partito dal magazzino verso l’indirizzo di posa.',
        owner: 'admin',
        customerVisible: true,
        optional: false,
    },
    material_delivered: {
        key: 'material_delivered',
        label: 'Consegna materiale',
        activeLabel: 'Materiale in consegna',
        doneLabel: 'Materiale ricevuto in cantiere',
        description: 'Il materiale è in viaggio verso l’indirizzo di posa.',
        doneDescription: 'Materiale consegnato e verificato all’indirizzo di posa.',
        owner: 'cliente',
        customerVisible: true,
        optional: false,
    },
    room_prep_notice: {
        key: 'room_prep_notice',
        label: 'Preparazione stanza',
        activeLabel: 'Prepara la stanza',
        doneLabel: 'Stanza predisposta',
        description: 'Ti avviseremo qualche giorno prima con le istruzioni per liberare l’ambiente.',
        doneDescription: 'Avviso inviato: la stanza va liberata prima dell’arrivo della squadra.',
        owner: 'cliente',
        customerVisible: true,
        optional: false,
    },
    work_started: {
        key: 'work_started',
        label: 'Apertura cantiere',
        activeLabel: 'Avvio cantiere in corso',
        doneLabel: 'Attività iniziata',
        description: 'La squadra inizierà nella data confermata.',
        doneDescription: 'Il cantiere è aperto e i lavori sono in corso.',
        owner: 'professionista',
        customerVisible: true,
        optional: false,
    },
    work_completed: {
        key: 'work_completed',
        label: 'Esecuzione posa',
        activeLabel: 'Lavori in corso',
        doneLabel: 'Lavori completati',
        description: 'Posa, stuccatura e finiture in corso.',
        doneDescription: 'Lavori completati e cantiere consegnato.',
        owner: 'professionista',
        customerVisible: true,
        optional: false,
    },
    closed: {
        key: 'closed',
        label: 'Chiusura ordine',
        activeLabel: 'Chiusura amministrativa',
        doneLabel: 'Ordine chiuso',
        description: 'Ultimi controlli e chiusura amministrativa.',
        doneDescription: 'Ordine chiuso. Grazie!',
        owner: 'admin',
        customerVisible: true,
        optional: true,
    },
}

/** Riga della tabella `order_milestones`. */
export interface OrderMilestone {
    id?: string
    order_id: string
    step: TimelineStepKey | string
    status: StepStatus
    occurred_at: string | null
    due_at: string | null
    note: string | null
    /** Chi ha toccato la tappa. NULL = riga creata dal seed, mai aggiornata. */
    actor_id?: string | null
    payload?: Record<string, unknown> | null
}

/**
 * Una tappa 'pending' creata dal seed e mai toccata da nessuno non porta
 * informazione: se lo stato dell'ordine dice che è già stata superata, vince
 * lo stato. Una tappa riaperta a mano (con actor_id) resta invece pending.
 */
const isUntouchedPending = (m: OrderMilestone | undefined): boolean =>
    !!m && m.status === 'pending' && !m.actor_id && !m.occurred_at

/** Tappa risolta, pronta da disegnare. */
export interface ResolvedStep extends TimelineStepDefinition {
    status: StepStatus
    occurredAt: string | null
    dueAt: string | null
    note: string | null
}

/**
 * Fino a dove è arrivato un ordine secondo il solo `order_status`.
 * Serve per gli ordini creati prima della timeline e come rete di sicurezza
 * se una milestone non è stata registrata.
 */
const STATUS_REACHED_STEPS: Record<OrderStatus, TimelineStepKey[]> = {
    draft: [],
    new: ['order_placed'],
    confirmed: ['order_placed', 'payment_confirmed'],
    assigned: ['order_placed', 'payment_confirmed', 'material_check', 'professional_confirmed'],
    material_shipped: [
        'order_placed', 'payment_confirmed', 'material_check', 'professional_confirmed',
        'green_light', 'date_confirmed', 'material_shipped',
    ],
    material_delivered: [
        'order_placed', 'payment_confirmed', 'material_check', 'professional_confirmed',
        'green_light', 'date_confirmed', 'material_shipped', 'material_delivered',
    ],
    in_progress: [
        'order_placed', 'payment_confirmed', 'material_check', 'professional_confirmed',
        'green_light', 'date_confirmed', 'material_shipped', 'material_delivered',
        'room_prep_notice', 'work_started',
    ],
    completed: [
        'order_placed', 'payment_confirmed', 'material_check', 'professional_confirmed',
        'green_light', 'date_confirmed', 'material_shipped', 'material_delivered',
        'room_prep_notice', 'work_started', 'work_completed',
    ],
    disputed: [
        'order_placed', 'payment_confirmed', 'material_check', 'professional_confirmed',
        'green_light', 'date_confirmed', 'material_shipped', 'material_delivered',
        'room_prep_notice', 'work_started', 'work_completed',
    ],
    refunded: ['order_placed'],
    cancelled: [],
}

const isTimelineStep = (value: string): value is TimelineStepKey =>
    (TIMELINE_STEPS as readonly string[]).includes(value)

/**
 * Costruisce la timeline unendo le milestone registrate a quanto si deduce
 * dallo stato dell'ordine. Le milestone esplicite vincono sempre: sono il
 * dato inserito da una persona, la derivazione è solo un ripiego.
 */
export function buildTimeline(
    orderStatus: string,
    milestones: OrderMilestone[] = [],
    options: { customerView?: boolean } = {},
): ResolvedStep[] {
    const byStep = new Map<TimelineStepKey, OrderMilestone>()
    for (const m of milestones) {
        if (isTimelineStep(String(m.step))) byStep.set(m.step as TimelineStepKey, m)
    }

    const derivedDone = new Set<TimelineStepKey>(
        STATUS_REACHED_STEPS[orderStatus as OrderStatus] ?? [],
    )
    const annullato = orderStatus === 'cancelled'

    // La prima tappa non ancora chiusa (e non opzionale) è quella "attiva".
    const resolved: ResolvedStep[] = TIMELINE_STEPS.map((key) => {
        const def = TIMELINE_STEP_DEFINITIONS[key]
        const milestone = byStep.get(key)

        let status: StepStatus
        if (milestone && !(isUntouchedPending(milestone) && derivedDone.has(key))) {
            status = milestone.status
        } else if (derivedDone.has(key)) {
            status = 'done'
        } else if (def.optional) {
            // Una tappa opzionale senza milestone non esiste per questo ordine.
            status = 'skipped'
        } else {
            status = 'pending'
        }

        return {
            ...def,
            status: annullato && status !== 'done' ? 'skipped' : status,
            occurredAt: milestone?.occurred_at ?? null,
            dueAt: milestone?.due_at ?? null,
            note: milestone?.note ?? null,
        }
    })

    // Marca come "in corso" la prima tappa aperta, se nessuna è già attiva o bloccata.
    if (!annullato && !resolved.some((s) => s.status === 'active' || s.status === 'blocked')) {
        const next = resolved.find((s) => s.status === 'pending')
        if (next) next.status = 'active'
    }

    // Risolvi label e descrizioni contestuali (es. "In attesa di pagamento" vs "Pagamento confermato")
    const isDraft = orderStatus === 'draft'

    for (const step of resolved) {
        if (isDraft && step.key === 'order_placed') {
            step.label = step.status === 'done' ? 'Preventivo registrato' : 'Registrazione preventivo'
            if (step.status === 'done') {
                step.doneDescription = 'Preventivo registrato e configurazione salvata.'
            }
        } else if (step.status === 'done' && step.doneLabel) {
            step.label = step.doneLabel
        } else if ((step.status === 'active' || step.status === 'blocked') && step.activeLabel) {
            step.label = step.activeLabel
        }
    }

    return options.customerView ? resolved.filter((s) => s.customerVisible) : resolved
}

/** Tappe visibili al cliente: le opzionali compaiono solo se realmente aperte. */
export function customerTimeline(
    orderStatus: string,
    milestones: OrderMilestone[] = [],
): ResolvedStep[] {
    return buildTimeline(orderStatus, milestones, { customerView: true })
        .filter((s) => !(s.optional && s.status === 'skipped'))
}

/** Percentuale di avanzamento, per la barra di stato compatta. */
export function timelineProgress(steps: ResolvedStep[]): number {
    const rilevanti = steps.filter((s) => s.status !== 'skipped')
    if (rilevanti.length === 0) return 0
    const done = rilevanti.filter((s) => s.status === 'done').length
    return Math.round((done / rilevanti.length) * 100)
}

/** Tappa da mostrare come "stato attuale" in elenchi e card riassuntive. */
export function currentStep(steps: ResolvedStep[]): ResolvedStep | null {
    return (
        steps.find((s) => s.status === 'blocked') ??
        steps.find((s) => s.status === 'active') ??
        [...steps].reverse().find((s) => s.status === 'done') ??
        null
    )
}

export const STEP_STATUS_STYLES: Record<StepStatus, { dot: string; text: string; badge: string; label: string }> = {
    done: {
        dot: 'bg-emerald-500 text-white border-emerald-500',
        text: 'text-stone-900',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        label: 'Completato',
    },
    active: {
        dot: 'bg-orange-500 text-white border-orange-500 ring-4 ring-orange-500/15',
        text: 'text-stone-900',
        badge: 'bg-orange-50 text-orange-700 border-orange-200/80',
        label: 'In corso',
    },
    blocked: {
        dot: 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-500/15',
        text: 'text-stone-900',
        badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
        label: 'In attesa',
    },
    pending: {
        dot: 'bg-white text-stone-400 border-stone-300',
        text: 'text-stone-500',
        badge: 'bg-stone-100/70 text-stone-500 border-stone-200/90',
        label: 'Da fare',
    },
    skipped: {
        dot: 'bg-stone-100 text-stone-400 border-stone-200',
        text: 'text-stone-400',
        badge: 'bg-stone-100/70 text-stone-400 border-stone-200/90',
        label: 'Non previsto',
    },
}

export const STEP_OWNER_LABELS: Record<StepOwner, string> = {
    cliente: 'Cliente',
    admin: 'PosaFacile',
    professionista: 'Posatore',
    sistema: 'Automatico',
}

/** Giorni di anticipo con cui parte l'avviso "prepara la stanza". */
export const ROOM_PREP_NOTICE_DAYS = 3
