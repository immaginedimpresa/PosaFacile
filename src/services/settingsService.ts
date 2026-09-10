import { supabase } from '@/lib/supabase'

/**
 * Impostazioni di logistica.
 *
 * Determinano da quando in poi il cliente può scegliere una data nel
 * calendario e i costi di consegna, piano e facchinaggio per i materiali pesanti.
 */
export interface LogisticsSettings {
    /** Giorni dall'ordine alla partenza della merce dal magazzino. */
    materialLeadDays: number
    /** Giorni di trasporto dal magazzino all'indirizzo di posa. */
    shippingTransitDays: number
    /** Costo base scarico merci a terra (€). */
    baseDeliveryCost: number
    /** Costo facchinaggio al piano per piano CON montacarichi (€/piano). */
    costPerFloorWithLift: number
    /** Costo facchinaggio al piano per piano SENZA montacarichi (€/piano). */
    costPerFloorNoLift: number
    /** Maggiorazione per sosta furgone distante (>50m) o assenza zona scarico (€). */
    noUnloadingZoneSurcharge: number
}

export const DEFAULT_LOGISTICS: LogisticsSettings = {
    materialLeadDays: 10,
    shippingTransitDays: 2,
    baseDeliveryCost: 0,
    costPerFloorWithLift: 10,
    costPerFloorNoLift: 25,
    noUnloadingZoneSurcharge: 35,
}

export interface DeliveryBreakdown {
    total: number
    base: number
    floorCost: number
    parkingSurcharge: number
    isBoxDelivery: boolean
}

/**
 * Calcola il costo totale di consegna e facchinaggio in base al piano,
 * alla presenza di montacarichi, allo scarico nel box e alla distanza della sosta.
 */
export function calculateDeliveryCost(
    delivery: {
        floorType?: 'ground' | 'upper'
        floorNumber?: number
        destination?: 'floor' | 'box'
        hasUnloadingZone?: boolean
        hasFreightElevator?: boolean
    } | null | undefined,
    settings?: LogisticsSettings | null,
): DeliveryBreakdown {
    const cfg = settings || DEFAULT_LOGISTICS
    const base = Number(cfg.baseDeliveryCost) || 0
    const parkingSurcharge = (delivery?.hasUnloadingZone === false)
        ? (Number(cfg.noUnloadingZoneSurcharge) || 0)
        : 0

    const isBox = delivery?.destination === 'box'
    let floorCost = 0

    if (!isBox && delivery?.floorType === 'upper') {
        const floors = Math.max(1, Number(delivery?.floorNumber) || 1)
        const ratePerFloor = delivery?.hasFreightElevator
            ? (Number(cfg.costPerFloorWithLift) || 0)
            : (Number(cfg.costPerFloorNoLift) || 0)
        floorCost = floors * ratePerFloor
    }

    return {
        total: Math.round((base + parkingSurcharge + floorCost) * 100) / 100,
        base,
        floorCost,
        parkingSurcharge,
        isBoxDelivery: isBox,
    }
}

const LOGISTICS_KEY = 'logistics'

/**
 * Copia in memoria: il calendario e il configuratore la interrogano
 * a ogni render e non ha senso ripetere la query. Si invalida al salvataggio.
 */
let cached: LogisticsSettings | null = null

export async function fetchLogisticsSettings(force = false): Promise<LogisticsSettings> {
    if (cached && !force) return cached

    const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', LOGISTICS_KEY)
        .maybeSingle()

    if (error) {
        // Se la tabella non è ancora migrata il configuratore deve comunque
        // funzionare: si usano i valori di default.
        console.warn('Impostazioni logistica non disponibili:', error.message)
        cached = DEFAULT_LOGISTICS
        return cached
    }

    const value = (data?.value ?? {}) as Partial<LogisticsSettings>
    cached = {
        materialLeadDays: numOr(value.materialLeadDays, DEFAULT_LOGISTICS.materialLeadDays),
        shippingTransitDays: numOr(value.shippingTransitDays, DEFAULT_LOGISTICS.shippingTransitDays),
        baseDeliveryCost: numOr(value.baseDeliveryCost, DEFAULT_LOGISTICS.baseDeliveryCost),
        costPerFloorWithLift: numOr(value.costPerFloorWithLift, DEFAULT_LOGISTICS.costPerFloorWithLift),
        costPerFloorNoLift: numOr(value.costPerFloorNoLift, DEFAULT_LOGISTICS.costPerFloorNoLift),
        noUnloadingZoneSurcharge: numOr(value.noUnloadingZoneSurcharge, DEFAULT_LOGISTICS.noUnloadingZoneSurcharge),
    }
    return cached
}

export async function saveLogisticsSettings(
    settings: LogisticsSettings,
    adminId?: string | null,
): Promise<void> {
    const { error } = await supabase
        .from('platform_settings')
        .upsert(
            {
                key: LOGISTICS_KEY,
                value: settings as unknown as Record<string, number>,
                updated_at: new Date().toISOString(),
                updated_by: adminId ?? null,
            },
            { onConflict: 'key' },
        )

    if (error) throw error
    cached = settings
}

const numOr = (value: unknown, fallback: number): number => {
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? n : fallback
}
