export type NotificationTargetRole = 'admin' | 'professional' | 'customer' | 'all'

export type NotificationChannel = 'in_app' | 'email' | 'both'

export type NotificationEventType =
    | 'order_created'
    | 'job_assigned'
    | 'status_changed'
    | 'message_received'
    | 'pro_registered'
    | 'pro_approved'
    | 'low_stock'
    | 'room_prep_reminder'
    | 'info_pending'
    | 'info_resolved'
    | 'quote_created'
    | 'system_alert'

export interface NotificationItem {
    id: string
    user_id: string | null
    target_role: NotificationTargetRole
    title: string
    message: string
    type: NotificationEventType | string
    link: string | null
    read: boolean
    read_at: string | null
    channel: NotificationChannel
    metadata: Record<string, any>
    created_at: string
}

export interface NotificationPreference {
    id?: string
    user_id?: string | null
    event_type: NotificationEventType | string
    role: 'admin' | 'professional' | 'customer'
    platform_enabled: boolean
    email_enabled: boolean
    created_at?: string
    updated_at?: string
}

export interface NotificationEventDefinition {
    key: NotificationEventType
    label: string
    description: string
    roles: ('admin' | 'professional' | 'customer')[]
    category: 'orders' | 'jobs' | 'messages' | 'system'
}

export const NOTIFICATION_EVENT_DEFINITIONS: NotificationEventDefinition[] = [
    {
        key: 'order_created',
        label: 'Nuovo Ordine Confermato',
        description: 'Notifica inviata ad admin e cliente quando un nuovo ordine di acquisto o posa viene creato.',
        roles: ['admin', 'customer'],
        category: 'orders',
    },
    {
        key: 'job_assigned',
        label: 'Assegnazione Cantiere Posatore',
        description: 'Notifica al professionista e all\'amministrazione quando viene abbinato un posatore al cantiere.',
        roles: ['admin', 'professional'],
        category: 'jobs',
    },
    {
        key: 'status_changed',
        label: 'Avanzamento Stato Cantiere / Ordine',
        description: 'Avvisi operativi su inizio lavori (in corso), completamento posa e collaudo o annullamento.',
        roles: ['admin', 'professional', 'customer'],
        category: 'jobs',
    },
    {
        key: 'message_received',
        label: 'Messaggi Chat di Cantiere',
        description: 'Nuove comunicazioni scambiate tra cliente, professionista posatore e assistenza PosaFacile.',
        roles: ['admin', 'professional', 'customer'],
        category: 'messages',
    },
    {
        key: 'pro_registered',
        label: 'Richiesta Iscrizione Nuovo Posatore',
        description: 'Avviso immediato allo staff per la verifica documenti e abilitazione del posatore.',
        roles: ['admin'],
        category: 'system',
    },
    {
        key: 'pro_approved',
        label: 'Approvazione Account Professionista',
        description: 'Notifica al posatore quando la sua documentazione è stata verificata e il profilo attivato.',
        roles: ['professional'],
        category: 'system',
    },
    {
        key: 'room_prep_reminder',
        label: 'Promemoria Preparazione Stanza',
        description: 'Avviso preventivo inviato al cliente 48-72h prima dell\'avvio cantiere per sgomberare l\'area.',
        roles: ['customer'],
        category: 'jobs',
    },
    {
        key: 'info_pending',
        label: 'Richiesta Informazioni / Misure Cliente',
        description: 'Avviso bloccante quando mancano dati essenziali o foto del sottofondo prima della posa.',
        roles: ['customer', 'professional'],
        category: 'jobs',
    },
    {
        key: 'low_stock',
        label: 'Giacenza Magazzino Sotto Soglia',
        description: 'Alert per lo staff admin quando un articolo a catalogo sta per esaurire le scorte.',
        roles: ['admin'],
        category: 'orders',
    },
]
