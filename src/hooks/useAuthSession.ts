import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/store/userStore'

/** Restore the session on public pages and on direct visits to the configurator. */
export function useAuthSession() {
    useEffect(() => {
        let active = true
        const restore = (user: User | null) => {
            if (!active) return
            const store = useUserStore.getState()
            store.setUser(user)
            if (user) {
                void store.loadProfile(user.id).finally(() => {
                    if (active) store.setLoading(false)
                })
            } else {
                store.setProfile(null)
                store.setLoading(false)
            }
        }
        void supabase.auth
            .getSession()
            .then(({ data: { session } }) => restore(session?.user ?? null))
            .catch(() => {
                if (active) useUserStore.getState().setLoading(false)
            })
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event !== 'INITIAL_SESSION') restore(session?.user ?? null)
        })
        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [])
}
