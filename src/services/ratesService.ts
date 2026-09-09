import { supabase } from '@/lib/supabase'
import type { LayingType } from '@/store/configuratorStore'

/**
 * Tariffe di manodopera del professionista.
 *
 * Il preventivo usava costanti scritte nel codice, uguali per tutti. Il
 * prezzo della manodopera lo fa chi la esegue: qui ogni posatore dichiara le
 * proprie, e la piattaforma ci aggiunge il proprio margine.
 *
 * I valori predefiniti servono solo come punto di partenza per chi non le ha
 * ancora compilate: senza, il configuratore non potrebbe calcolare nulla.
 */

export interface ProfessionalRates {
    professional_id: string
    laying_dritta: number | null
    laying_correre: number | null
    laying_diagonale: number | null
    laying_spina: number | null
    laying_mosaico: number | null
    demolizione: number | null
    massetto: number | null
    impermeabilizzazione: number | null
    smaltimento: number | null
    battiscopa: number | null
    soglie: number | null
    /** Lavorazioni che il professionista non esegue. */
    servizi_esclusi: string[]
}

/** Ripiego di piattaforma: usato solo finché il posatore non ha deciso. */
export const RATE_DEFAULTS = {
    laying_dritta: 25,
    laying_correre: 27,
    laying_diagonale: 30.5,
    laying_spina: 37.5,
    laying_mosaico: 33.75,
    demolizione: 12,
    massetto: 18,
    impermeabilizzazione: 25,
    smaltimento: 8,
    battiscopa: 6,
    soglie: 35,
} as const

export const emptyRates = (professionalId: string): ProfessionalRates => ({
    professional_id: professionalId,
    ...RATE_DEFAULTS,
    servizi_esclusi: [],
})

/** Etichette e unità di misura, per non far indovinare al posatore cosa inserire. */
export const VOCI_POSA: { campo: keyof ProfessionalRates; label: string; nota: string }[] = [
    { campo: 'laying_dritta', label: 'Posa dritta', nota: 'Lo schema standard, a griglia' },
    { campo: 'laying_correre', label: 'A correre', nota: 'Sfalsata, tipo mattone' },
    { campo: 'laying_diagonale', label: 'Diagonale', nota: 'Ruotata di 45°, più sfrido e più tagli' },
    { campo: 'laying_spina', label: 'Spina di pesce', nota: 'La più lenta: doppio taglio e allineamenti' },
    { campo: 'laying_mosaico', label: 'Mosaico / decori', nota: 'Moduli piccoli o composizioni' },
]

export const VOCI_SERVIZI: {
    campo: keyof ProfessionalRates
    chiave: string
    label: string
    unita: string
    nota: string
}[] = [
    { campo: 'demolizione', chiave: 'demolizione', label: 'Demolizione pavimento', unita: '€/mq', nota: 'Rimozione del vecchio pavimento' },
    { campo: 'smaltimento', chiave: 'smaltimento', label: 'Smaltimento macerie', unita: '€/mq', nota: 'Carico e conferimento in discarica' },
    { campo: 'massetto', chiave: 'massetto', label: 'Massetto', unita: '€/mq', nota: 'Realizzazione del sottofondo' },
    { campo: 'impermeabilizzazione', chiave: 'impermeabilizzazione', label: 'Impermeabilizzazione', unita: '€/mq', nota: 'Guaina, per bagni e terrazzi' },
    { campo: 'battiscopa', chiave: 'battiscopa', label: 'Posa battiscopa', unita: '€/ml', nota: 'Al metro lineare' },
    { campo: 'soglie', chiave: 'soglie', label: 'Posa soglie', unita: '€/pz', nota: 'Al pezzo' },
]

const CAMPO_PER_POSA: Record<LayingType, keyof ProfessionalRates> = {
    dritta: 'laying_dritta',
    correre: 'laying_correre',
    diagonale: 'laying_diagonale',
    spina: 'laying_spina',
    mosaico: 'laying_mosaico',
}

export async function fetchRates(professionalId: string): Promise<ProfessionalRates> {
    const { data, error } = await supabase
        .from('professional_rates')
        .select('*')
        .eq('professional_id', professionalId)
        .maybeSingle()

    if (error || !data) {
        if (error) console.warn('Tariffe non lette:', error.message)
        return emptyRates(professionalId)
    }
    return data as ProfessionalRates
}

export async function saveRates(rates: ProfessionalRates): Promise<void> {
    const { error } = await supabase
        .from('professional_rates')
        .upsert(rates, { onConflict: 'professional_id' })

    if (error) throw error
}

const num = (value: unknown, fallback: number): number => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Tariffa di posa al mq per lo schema scelto, al netto del margine di
 * piattaforma. Se il professionista non l'ha compilata si usa il ripiego:
 * meglio un preventivo con un valore dichiarato che nessun preventivo.
 */
export function layingRate(rates: ProfessionalRates | null, layingType: LayingType): number {
    const campo = CAMPO_PER_POSA[layingType]
    return num(rates?.[campo], RATE_DEFAULTS[campo as keyof typeof RATE_DEFAULTS])
}

/** Tariffa di una lavorazione accessoria, con lo stesso criterio di ripiego. */
export function serviceRate(rates: ProfessionalRates | null, chiave: string): number {
    const voce = VOCI_SERVIZI.find((v) => v.chiave === chiave)
    if (!voce) return 0
    return num(rates?.[voce.campo], RATE_DEFAULTS[voce.campo as keyof typeof RATE_DEFAULTS])
}

/** Vero se il professionista non esegue quella lavorazione. */
export const servizioEscluso = (rates: ProfessionalRates | null, chiave: string): boolean =>
    Boolean(rates?.servizi_esclusi?.includes(chiave))
