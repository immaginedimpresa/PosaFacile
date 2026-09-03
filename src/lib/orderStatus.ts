/**
 * Stati di un ordine, allineati all'enum order_status del database.
 * Tenere qui l'elenco evita il disallineamento che faceva fallire l'annullamento:
 * il frontend scriveva 'cancelled' quando l'enum non lo prevedeva.
 */
export const ORDER_STATUSES = [
    'draft',
    'new',
    'confirmed',
    'assigned',
    'material_shipped',
    'material_delivered',
    'in_progress',
    'completed',
    'disputed',
    'refunded',
    'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

const LABELS: Record<OrderStatus, string> = {
    draft: 'Bozza',
    new: 'Nuovo',
    confirmed: 'Confermato',
    assigned: 'Posatore assegnato',
    material_shipped: 'Materiale spedito',
    material_delivered: 'Materiale consegnato',
    in_progress: 'Posa in corso',
    completed: 'Completato',
    disputed: 'In contestazione',
    refunded: 'Rimborsato',
    cancelled: 'Annullato',
}

const COLORS: Record<OrderStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    new: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-blue-100 text-blue-800',
    assigned: 'bg-indigo-100 text-indigo-800',
    material_shipped: 'bg-sky-100 text-sky-800',
    material_delivered: 'bg-teal-100 text-teal-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    disputed: 'bg-orange-100 text-orange-800',
    refunded: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
}

const isOrderStatus = (value: string): value is OrderStatus =>
    (ORDER_STATUSES as readonly string[]).includes(value)

/** Uno stato sconosciuto viene mostrato tale e quale invece di sparire. */
export const orderStatusLabel = (status: string): string =>
    isOrderStatus(status) ? LABELS[status] : status

export const orderStatusColor = (status: string): string =>
    isOrderStatus(status) ? COLORS[status] : 'bg-gray-100 text-gray-800'

/** Il cliente può annullare finché il materiale non è partito e la posa non è iniziata. */
const CANCELLABILI: readonly OrderStatus[] = ['draft', 'new', 'confirmed', 'assigned']

export const canCancelOrder = (status: string): boolean =>
    isOrderStatus(status) && CANCELLABILI.includes(status)
