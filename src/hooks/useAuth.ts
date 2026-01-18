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
                    // In a clean architecture, the role should be in metadata
                    // We fallback to 'customer' only if not present
                    const role = (session.user.user_metadata?.role as UserRole) || 'customer'
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
                const role = (session.user.user_metadata?.role as UserRole) || 'customer'
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
