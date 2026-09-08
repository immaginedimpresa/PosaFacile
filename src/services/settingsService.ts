import { supabase } from '@/lib/supabase'

/**
 * Impostazioni di logistica.
 *
 * Determinano da quando in poi il cliente può scegliere una data nel
 * calendario: prima che il materiale sia in cantiere non ha senso proporre
 * un appuntamento di posa.
 */
export interface LogisticsSettings {
    /** Giorni dall'ordine alla partenza della merce dal magazzino. */
    materialLeadDays: number
    /** Giorni di trasporto dal magazzino all'indirizzo di posa. */
    shippingTransitDays: number
}

export const DEFAULT_LOGISTICS: LogisticsSettings = {
    materialLeadDays: 10,
    shippingTransitDays: 2,
}

const LOGISTICS_KEY = 'logistics'

/**
 * Copia in memoria: il calendario la interroga a ogni render e non ha senso
 * ripetere la query. Si invalida al salvataggio.
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
