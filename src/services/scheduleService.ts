import { supabase } from '@/lib/supabase'

/**
 * Regole permanenti di disponibilità di un professionista.
 *
 * Sono la parte che si imposta una volta e vale sempre. Le assenze puntuali
 * (ferie, un martedì dal dentista) restano eccezioni giorno per giorno in
 * `professional_availability`.
 */
export interface ProfessionalSchedule {
    professional_id: string
    /** Giorni lavorativi in notazione ISO: 1 = lunedì … 7 = domenica. */
    working_days: number[]
    /** Preavviso minimo prima che un cliente possa fissare l'inizio. */
    min_notice_days: number
    /** Margine fra la fine di un cantiere e l'inizio del successivo. */
    buffer_days: number
    /** Cantieri apribili nello stesso giorno. */
    max_concurrent_jobs: number
    /** Fin dove nel tempo si accettano prenotazioni. */
    booking_horizon_weeks: number
    /** Sospensione temporanea: fino a questa data niente proposte. */
    paused_until: string | null
}

export const DEFAULT_SCHEDULE: Omit<ProfessionalSchedule, 'professional_id'> = {
    working_days: [1, 2, 3, 4, 5],
    min_notice_days: 2,
    buffer_days: 0,
    max_concurrent_jobs: 1,
    booking_horizon_weeks: 12,
    paused_until: null,
}

export const GIORNI_SETTIMANA = [
    { iso: 1, breve: 'Lun', lungo: 'Lunedì' },
    { iso: 2, breve: 'Mar', lungo: 'Martedì' },
    { iso: 3, breve: 'Mer', lungo: 'Mercoledì' },
    { iso: 4, breve: 'Gio', lungo: 'Giovedì' },
    { iso: 5, breve: 'Ven', lungo: 'Venerdì' },
    { iso: 6, breve: 'Sab', lungo: 'Sabato' },
    { iso: 7, breve: 'Dom', lungo: 'Domenica' },
] as const

export async function fetchSchedule(professionalId: string): Promise<ProfessionalSchedule> {
    const { data, error } = await supabase
        .from('professional_schedule')
        .select('*')
        .eq('professional_id', professionalId)
        .maybeSingle()

    if (error || !data) {
        // Senza riga si lavora con i valori predefiniti: il calendario deve
        // restare usabile anche se la migrazione non è ancora passata.
        if (error) console.warn('Regole di disponibilità non lette:', error.message)
        return { professional_id: professionalId, ...DEFAULT_SCHEDULE }
    }
    return data as ProfessionalSchedule
}

export async function saveSchedule(schedule: ProfessionalSchedule): Promise<void> {
    const { error } = await supabase
        .from('professional_schedule')
        .upsert(schedule, { onConflict: 'professional_id' })

    if (error) throw error
}

/* ------------------------------------------------------------------ */
/* Regole applicate a una data                                         */
/* ------------------------------------------------------------------ */

/** getDay() restituisce 0 per domenica; le regole usano la notazione ISO. */
export const isoWeekday = (date: Date): number => date.getDay() === 0 ? 7 : date.getDay()

export type MotivoNonDisponibile =
    | 'passato'
    | 'preavviso'
    | 'orizzonte'
    | 'pausa'
    | 'giorno-non-lavorativo'
    | 'assenza'
    | 'gia-occupato'

const ETICHETTE: Record<MotivoNonDisponibile, string> = {
    passato: 'Data già passata',
    preavviso: 'Troppo vicina: serve il preavviso minimo',
    orizzonte: 'Oltre il periodo in cui accetta prenotazioni',
    pausa: 'Il professionista ha sospeso le proposte',
    'giorno-non-lavorativo': 'Non è un giorno lavorativo',
    assenza: 'Assenza segnata dal professionista',
    'gia-occupato': 'Ha già un cantiere in questa data',
}

export const motivoLeggibile = (motivo: MotivoNonDisponibile): string => ETICHETTE[motivo]

export interface DisponibilitaInput {
    schedule: ProfessionalSchedule
    /** Date in cui il professionista ha segnato un'assenza. */
    assenze: Set<string>
    /** Date già occupate da cantieri, con il numero di cantieri per data. */
    cantieriPerData: Map<string, number>
    /** Riferimento temporale, iniettabile per i test. */
    oggi?: Date
}

export const toIso = (date: Date): string => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Perché una data non è prenotabile, o null se lo è.
 *
 * Restituisce il motivo invece di un semplice sì/no: un giorno grigio senza
 * spiegazione è la ragione per cui i calendari non si capiscono.
 */
export function motivoIndisponibilita(
    date: Date,
    { schedule, assenze, cantieriPerData, oggi = new Date() }: DisponibilitaInput,
): MotivoNonDisponibile | null {
    const giorno = new Date(date)
    giorno.setHours(0, 0, 0, 0)
    const riferimento = new Date(oggi)
    riferimento.setHours(0, 0, 0, 0)

    if (giorno < riferimento) return 'passato'

    const primaUtile = new Date(riferimento)
    primaUtile.setDate(primaUtile.getDate() + schedule.min_notice_days)
    if (giorno < primaUtile) return 'preavviso'

    if (schedule.paused_until) {
        const pausa = new Date(schedule.paused_until)
        pausa.setHours(0, 0, 0, 0)
        if (giorno <= pausa) return 'pausa'
    }

    const orizzonte = new Date(riferimento)
    orizzonte.setDate(orizzonte.getDate() + schedule.booking_horizon_weeks * 7)
    if (giorno > orizzonte) return 'orizzonte'

    if (!schedule.working_days.includes(isoWeekday(giorno))) return 'giorno-non-lavorativo'

    const iso = toIso(giorno)
    if (assenze.has(iso)) return 'assenza'
    if ((cantieriPerData.get(iso) ?? 0) >= schedule.max_concurrent_jobs) return 'gia-occupato'

    return null
}
