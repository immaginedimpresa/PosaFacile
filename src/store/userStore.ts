import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface UserState {
    user: User | null
    profile: UserProfile | null
    loading: boolean
    setUser: (user: User | null) => void
    setProfile: (profile: UserProfile | null) => void
    setLoading: (loading: boolean) => void
    signIn: (email: string, password: string) => Promise<void>
    signInWithGoogle: () => Promise<void>
    signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
    signOut: () => Promise<void>
    loadProfile: (userId: string) => Promise<void>
}

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    profile: null,
    loading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),
    signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        set({ user: data.user })
        if (data.user) {
            await get().loadProfile(data.user.id)
        }
    },
    signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        })
        if (error) throw error
    },
    signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        })
        if (error) throw error
        set({ user: data.user })
    },
    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null })
    },
    loadProfile: async (userId: string) => {
        try {
            // Race the DB query against a timeout
            const queryPromise = supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile load timeout')), 3000)
            )

            const result = await Promise.race([queryPromise, timeoutPromise]) as any

            if (result.data) {
                set({ profile: result.data })
            }
        } catch (error) {
            console.error('UserStore: Error loading profile:', error)
            // Silence error to keep UI interactive
        } finally {
            set({ loading: false })
        }
    }
}))
