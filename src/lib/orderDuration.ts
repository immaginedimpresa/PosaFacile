/**
 * Ponte fra la riga `orders` e il motore di stima della durata.
 *
 * La stima viene congelata su `orders.duration_breakdown` quando l'ordine
 * nasce: cambiare in futuro una resa non deve riscrivere la durata promessa a
 * un cliente. Per gli ordini creati prima di questa funzionalità la stima
 * viene invece ricalcolata al volo dai dati dell'ordine.
 */

import { LAYING_TYPE_LABELS, type LayingType } from '@/store/configuratorStore'
import { estimateLayingDuration, type DurationEstimate, type DurationInput } from '@/lib/layingDuration'

/** In `orders.laying_type` è finita l'etichetta, non la chiave: va ritradotta. */
const LABEL_TO_LAYING_TYPE = Object.entries(LAYING_TYPE_LABELS).reduce<Record<string, LayingType>>(
    (acc, [key, label]) => {
        acc[label.toLowerCase()] = key as LayingType
        return acc
    },
    {},
)

export function parseLayingType(value: unknown): LayingType {
    const raw = String(value ?? '').trim().toLowerCase()
    if (!raw) return 'dritta'
    if (raw in LAYING_TYPE_LABELS) return raw as LayingType
    return LABEL_TO_LAYING_TYPE[raw] ?? 'dritta'
}

const AMBIENTI = ['bagno', 'cucina', 'soggiorno', 'camera', 'esterno', 'altro'] as const
type Ambiente = (typeof AMBIENTI)[number]

const parseAmbiente = (value: unknown): Ambiente | null => {
    const raw = String(value ?? '').trim().toLowerCase()
    return (AMBIENTI as readonly string[]).includes(raw) ? (raw as Ambiente) : null
}

/** La stima salvata è un JSON: va riconosciuta prima di fidarsene. */
const isStoredEstimate = (value: unknown): value is DurationEstimate =>
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as DurationEstimate).phases) &&
    typeof (value as DurationEstimate).workDays === 'number'

/**
 * Estrae (o ricostruisce) la stima di durata di un ordine.
 * `crewSize` permette al posatore di simulare l'effetto della squadra senza
 * toccare la stima congelata.
 */
export function durationForOrder(
    order: any,
    overrides: Partial<DurationInput> = {},
): DurationEstimate {
    if (!order) return estimateLayingDuration({ floorSqm: 0, wallSqm: 0, layingType: 'dritta' })

    const nessunOverride = Object.keys(overrides).length === 0
    if (nessunOverride && isStoredEstimate(order.duration_breakdown)) {
        return order.duration_breakdown as DurationEstimate
    }

    // `items` conserva i dati grezzi del configuratore: sono più precisi
    // delle colonne denormalizzate dell'ordine.
    const item = Array.isArray(order.items) ? order.items[0] : null
    const product = item?.product ?? null

    return estimateLayingDuration({
        floorSqm: Number(item?.dimensions?.pavimentoMq ?? order.floor_sqm) || 0,
        wallSqm: Number(item?.dimensions?.paretiMq ?? order.wall_sqm) || 0,
        layingType: parseLayingType(item?.layingType ?? order.laying_type),
        ambiente: parseAmbiente(item?.projectInfo?.ambiente ?? order.project_type),
        intervento: item?.projectInfo?.intervento ?? null,
        tileWidthMm: product?.format_width ?? null,
        tileHeightMm: product?.format_height ?? null,
        services: item?.services ?? null,
        ...overrides,
    })
}

/** Giornate che valgono per la pianificazione: quelle confermate, se ci sono. */
export function effectiveWorkDays(order: any, estimate: DurationEstimate): number {
    const confermate = Number(order?.confirmed_work_days)
    return Number.isFinite(confermate) && confermate > 0 ? confermate : estimate.workDays
}

export function effectiveCalendarDays(order: any, estimate: DurationEstimate): number {
    const confermati = Number(order?.confirmed_calendar_days)
    if (Number.isFinite(confermati) && confermati > 0) return confermati
    const confermateLavoro = Number(order?.confirmed_work_days)
    if (Number.isFinite(confermateLavoro) && confermateLavoro > 0) {
        return Math.ceil(confermateLavoro) + estimate.curingDays
    }
    return estimate.calendarDays
}

/**
 * La durata che vale per pianificare.
 *
 * PosaFacile calcola la stima; se il professionista l'ha corretta, da quel
 * momento è la sua correzione a comandare. Ogni calendario, data di fine e
 * blocco d'agenda deve passare da qui: usare la stima grezza dopo una
 * conferma significa pianificare su un numero che il posatore ha già smentito.
 */
export function effectiveDuration(order: any): DurationEstimate {
    const stima = durationForOrder(order)
    const workDays = effectiveWorkDays(order, stima)
    const calendarDays = effectiveCalendarDays(order, stima)

    if (workDays === stima.workDays && calendarDays === stima.calendarDays) return stima

    return {
        ...stima,
        workDays,
        calendarDays,
        // Una durata confermata non è più una forchetta: è un impegno.
        minWorkDays: workDays,
        maxWorkDays: workDays,
    }
}

/** Vero se il professionista ha confermato (o corretto) le giornate. */
export function isDurationConfirmed(order: any): boolean {
    return Number(order?.confirmed_work_days) > 0
}
