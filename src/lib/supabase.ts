import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Vite incorpora le variabili `VITE_*` nel bundle al momento della build, non
 * a runtime: se mancano quando compila l'hosting, il sito parte rotto anche se
 * in locale funziona tutto. Il messaggio distingue i due casi, perché in
 * produzione non esiste nessun file .env da controllare.
 */
if (!supabaseUrl || !supabaseAnonKey) {
    const mancanti = [
        !supabaseUrl && 'VITE_SUPABASE_URL',
        !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
    ].filter(Boolean).join(', ')

    throw new Error(
        import.meta.env.DEV
            ? `Variabili d'ambiente Supabase mancanti (${mancanti}). Copia .env.example in .env e inserisci i valori del progetto.`
            : `Variabili d'ambiente Supabase mancanti (${mancanti}). Vanno impostate nell'hosting fra le variabili di build e poi serve un nuovo deploy: Vite le incorpora al momento della compilazione, non a runtime.`,
    )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
