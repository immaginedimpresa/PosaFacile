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

import {
    offersMaterialHandling,
    materialHandlingRatePerFloor,
    markupMultiplier,
    type ProfessionalRates,
    type MarkupOverrides,
} from '@/services/ratesService'

export type MaterialHandling = 'client' | 'pro' | 'carrier'

export interface DeliveryBreakdown {
    total: number
    base: number
    floorCost: number
    parkingSurcharge: number
    isBoxDelivery: boolean
    isStreetDelivery: boolean
    handlingBy: MaterialHandling
    proRatePerMqFloor?: number
    proOffersHandling?: boolean
}

/**
 * Calcola il costo totale di consegna e facchinaggio in base al piano,
 * alla presenza di montacarichi, allo scarico nel box o a bordo strada,
 * e a chi si occupa del trasporto dei colli fino al piano di posa (cliente vs posatore vs corriere).
 */
export function calculateDeliveryCost(
    delivery: {
        floorType?: 'ground' | 'upper'
        floorNumber?: number
        destination?: 'floor' | 'box' | 'street'
        handlingBy?: MaterialHandling
        hasUnloadingZone?: boolean
        hasFreightElevator?: boolean
    } | null | undefined,
    settings?: LogisticsSettings | null,
    proOptions?: {
        baseMq?: number
        rates?: ProfessionalRates | null
        markupPercent?: number | null
        markupOverrides?: MarkupOverrides | null
    },
): DeliveryBreakdown {
    const cfg = settings || DEFAULT_LOGISTICS
    const base = Number(cfg.baseDeliveryCost) || 0
    const destination = delivery?.destination || 'street'
    const isFloorDelivery = destination === 'floor'
    const isStreetDelivery = destination === 'street'
    const isBox = destination === 'box'

    // Chi trasporta il materiale al piano:
    // Se consegna diretta al piano: i facchini del corriere ('carrier')
    // Se a bordo strada o box: il cliente ('client') oppure il posatore ('pro')
    const handlingBy: MaterialHandling = isFloorDelivery
        ? 'carrier'
        : (delivery?.handlingBy || 'client')

    const proOffers = offersMaterialHandling(proOptions?.rates ?? null)

    // Sosta distante: se scarico a bordo strada con il cliente che fa da sé,
    // lo scarico avviene velocemente sulla strada senza sosta prolungata.
    // Se invece c'è il posatore che effettua la salita al piano, o scarico nel box,
    // o consegna al piano con sosta distante (>50m), si applica il supplemento sosta.
    const parkingSurcharge = (!isStreetDelivery || (handlingBy === 'pro' && proOffers)) && (delivery?.hasUnloadingZone === false)
        ? (Number(cfg.noUnloadingZoneSurcharge) || 0)
        : 0

    let floorCost = 0
    let proRatePerMqFloor = 0

    // Il costo del piano si applica solo se il piano è superiore E il materiale viene
    // trasportato dal corriere ('carrier') o dal posatore ('pro').
    // Se ci pensa il cliente ('client'), il costo è zero (€ 0.00).
    const needsPaidFloorCarrying = (isFloorDelivery || (handlingBy === 'pro' && proOffers)) && delivery?.floorType === 'upper'

    if (needsPaidFloorCarrying) {
        const floors = Math.max(1, Number(delivery?.floorNumber) || 1)
        if (handlingBy === 'pro') {
            // Calcolato sui mq e la tariffa a mq/piano del posatore + eventuale markup di piattaforma
            const baseRate = materialHandlingRatePerFloor(proOptions?.rates ?? null)
            const mult = markupMultiplier(
                'porto_piano',
                proOptions?.markupPercent,
                proOptions?.markupOverrides,
            )
            proRatePerMqFloor = Math.round(baseRate * mult * 100) / 100
            const mq = Math.max(0, Number(proOptions?.baseMq) || 0)
            floorCost = Math.round(mq * floors * proRatePerMqFloor * 100) / 100
        } else {
            // Consegna diretta al piano con facchini del corriere (a forfait per piano)
            const ratePerFloor = delivery?.hasFreightElevator
                ? (Number(cfg.costPerFloorWithLift) || 0)
                : (Number(cfg.costPerFloorNoLift) || 0)
            floorCost = floors * ratePerFloor
        }
    }

    return {
        total: Math.round((base + parkingSurcharge + floorCost) * 100) / 100,
        base,
        floorCost,
        parkingSurcharge,
        isBoxDelivery: isBox,
        isStreetDelivery,
        handlingBy,
        proRatePerMqFloor,
        proOffersHandling: proOffers,
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
