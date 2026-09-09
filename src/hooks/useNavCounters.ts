import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * Contatori mostrati sulle voci di menu.
 *
 * Il numero indica quante cose aspettano una decisione, non quante ne
 * esistono in tutto: un contatore che mostra il totale e' rumore, e dopo due
 * giorni non lo guarda piu' nessuno. Le query sono di solo conteggio
 * (`head: true`), quindi non trasferiscono righe.
 */

export interface AdminNavCounters {
    /** Ordini ancora da lavorare: ricevuti o pagati ma non assegnati. */
    ordini: number
    /** Professionisti in attesa di verifica. */
    professionisti: number
    /** Clienti registrati negli ultimi sette giorni. */
    clienti: number
}

const ZERO_ADMIN: AdminNavCounters = { ordini: 0, professionisti: 0, clienti: 0 }

export function useAdminNavCounters(): AdminNavCounters {
    const [counters, setCounters] = useState<AdminNavCounters>(ZERO_ADMIN)
    const location = useLocation()

    const leggiContatori = async (): Promise<AdminNavCounters> => {
        const settimanaFa = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const [ordini, professionisti, clienti] = await Promise.all([
            supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .in('status', ['new', 'confirmed']),
            supabase
                .from('professional_profiles')
                .select('id', { count: 'exact', head: true })
                .eq('verified', false),
            supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('role', 'customer')
                .gte('created_at', settimanaFa),
        ])

        return {
            ordini: ordini.count ?? 0,
            professionisti: professionisti.count ?? 0,
            clienti: clienti.count ?? 0,
        }
    }

    // Si aggiorna a ogni cambio di sezione: dopo aver lavorato un ordine il
    // numero deve scendere senza dover ricaricare la pagina.
    useEffect(() => {
        let attivo = true
        void (async () => {
            try {
                const risultato = await leggiContatori()
                if (attivo) setCounters(risultato)
            } catch (err: unknown) {
                console.warn('Contatori non aggiornati:', (err as Error)?.message)
            }
        })()
        return () => {
            attivo = false
        }
    }, [location.pathname])

    return counters
}

/** Incarichi che aspettano una risposta dal professionista. */
export function useProNavCounters(professionalId: string | undefined): { lavori: number } {
    const [lavori, setLavori] = useState(0)
    const location = useLocation()

    useEffect(() => {
        if (!professionalId) return

        let attivo = true
        supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('professional_id', professionalId)
            .eq('status', 'assigned')
            .then(({ count, error }) => {
                if (!attivo) return
                if (error) {
                    console.warn('Contatore lavori non aggiornato:', error.message)
                    return
                }
                setLavori(count ?? 0)
            })

        return () => {
            attivo = false
        }
    }, [professionalId, location.pathname])

    // Senza professionista il valore e' zero per definizione, senza bisogno
    // di azzerare lo stato dentro l'effetto.
    return { lavori: professionalId ? lavori : 0 }
}
