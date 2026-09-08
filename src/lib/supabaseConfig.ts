/**
 * Configurazione del client Supabase.
 *
 * Vite incorpora le variabili `VITE_*` nel bundle al momento della build: se
 * l'hosting compila senza averle impostate, il sito parte rotto pur
 * funzionando in locale. Per non dipendere dalla configurazione del pannello
 * di deploy, i valori pubblici del progetto stanno qui come ripiego.
 *
 * La chiave `anon` è pubblica per costruzione — finisce comunque nel bundle
 * che scarica ogni visitatore — quindi tenerla nel repository non aggiunge
 * alcuna esposizione. A proteggere i dati è la Row Level Security sul
 * database, non la segretezza di questa chiave.
 *
 * Le variabili d'ambiente restano prioritarie: bastano a puntare a un
 * progetto diverso (staging, sviluppo) senza toccare il codice.
 */

const FALLBACK_SUPABASE_URL = 'https://dgkejtsseshiankefhgy.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRna2VqdHNzZXNoaWFua2VmaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDk1NTMsImV4cCI6MjEwMzkyNTU1M30.QNbBnL4zwK6xjMQuJSt7uJyCw_RABueogMRXmQLebeE'

/** Valore non vuoto, altrimenti il ripiego. */
const pick = (value: string | undefined, fallback: string): string => {
    const trimmed = (value ?? '').trim()
    return trimmed.length > 0 ? trimmed : fallback
}

export const SUPABASE_URL = pick(import.meta.env.VITE_SUPABASE_URL, FALLBACK_SUPABASE_URL)
export const SUPABASE_ANON_KEY = pick(import.meta.env.VITE_SUPABASE_ANON_KEY, FALLBACK_SUPABASE_ANON_KEY)

/** Vero quando la configurazione arriva dall'ambiente e non dal ripiego. */
export const usingEnvConfig =
    SUPABASE_URL !== FALLBACK_SUPABASE_URL || SUPABASE_ANON_KEY !== FALLBACK_SUPABASE_ANON_KEY
