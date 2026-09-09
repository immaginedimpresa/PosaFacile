import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type UserRole = 'admin' | 'professional' | 'customer'

interface AuthState {
    user: User | null
    session: Session | null
    role: UserRole | null
    loading: boolean
}

interface UseAuthReturn extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signInWithGoogle: () => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; role?: UserRole }) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    isAdmin: boolean
    isProfessional: boolean
    isCustomer: boolean
}

/**
 * Il ruolo si legge da public.users, non dai metadata del JWT.
 *
 * `user_metadata` e' modificabile dall'utente stesso con una updateUser:
 * usarlo per decidere cosa mostrare significa lasciare che chiunque apra
 * l'interfaccia di amministrazione. La colonna `role` e' protetta da un
 * trigger che impedisce di auto-assegnarsi un ruolo.
 *
 * In caso di errore si assume il ruolo meno privilegiato.
 */
async function fetchUserRole(user: User): Promise<UserRole> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (error) return 'customer'
        if (data?.role) return data.role as UserRole

        // Riga assente: succede se il trigger di registrazione e' fallito, e
        // lascerebbe l'utente fuori dalla propria area senza spiegazione.
        // Si ricrea al volo, con il ruolo dichiarato alla registrazione
        // ridotto ai valori auto-assegnabili: 'admin' non passa mai da qui,
        // e il trigger guard_user_role lo impedisce comunque lato database.
        const dichiarato = user.user_metadata?.role
        const ruolo: UserRole = dichiarato === 'professional' ? 'professional' : 'customer'

        const { error: insertError } = await supabase.from('users').insert({
            id: user.id,
            email: user.email ?? '',
            first_name: user.user_metadata?.first_name ?? '',
            last_name: user.user_metadata?.last_name ?? '',
            role: ruolo,
        })

        if (insertError) {
            console.warn('Anagrafica utente non ricreata:', insertError.message)
            return 'customer'
        }
        return ruolo
    } catch {
        return 'customer'
    }
}

export function useAuth(): UseAuthReturn {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        role: null,
        loading: true,
    })

    useEffect(() => {
        let mounted = true

        // 1. Get initial session
        const initialize = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (!mounted) return

                if (session?.user) {
                    const role = await fetchUserRole(session.user)
                    if (!mounted) return
                    setState({
                        user: session.user,
                        session,
                        role,
                        loading: false,
                    })
                } else {
                    setState({
                        user: null,
                        session: null,
                        role: null,
                        loading: false,
                    })
                }
            } catch (error) {
                console.error('[Auth] Initialization error:', error)
                if (mounted) setState(s => ({ ...s, loading: false }))
            }
        }

        initialize()

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return

            if (session?.user) {
                // La sessione c'e' gia': si mostra il caricamento finche' il
                // ruolo non arriva, per non far lampeggiare la schermata
                // sbagliata a chi ha un ruolo diverso da 'customer'.
                setState(s => ({ ...s, user: session.user, session, loading: true }))
                fetchUserRole(session.user).then(role => {
                    if (!mounted) return
                    setState({ user: session.user, session, role, loading: false })
                })
            } else {
                setState({
                    user: null,
                    session: null,
                    role: null,
                    loading: false,
                })
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const signIn = async (email: string, password: string) => {
        const { data: _data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { error: error as Error | null }
    }

    const signInWithGoogle = async () => {
        const { error: googleError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        })
        return { error: googleError as Error | null }
    }

    const signUp = async (
        email: string,
        password: string,
        metadata?: { first_name?: string; last_name?: string; role?: UserRole }
    ) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: metadata?.first_name || '',
                    last_name: metadata?.last_name || '',
                    role: metadata?.role || 'customer',
                },
            },
        })
        return { error: error as Error | null }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setState({
            user: null,
            session: null,
            role: null,
            loading: false,
        })
    }

    return {
        ...state,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        isAdmin: state.role === 'admin',
        isProfessional: state.role === 'professional',
        isCustomer: state.role === 'customer',
    }
}
