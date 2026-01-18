import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { useUserStore } from '@/store/userStore'
import { supabase } from '@/lib/supabase'

interface RootLayoutProps {
    children?: React.ReactNode
    hideFooter?: boolean
}

export function RootLayout({ children, hideFooter }: RootLayoutProps) {
    const { setUser, setProfile, loadProfile, setLoading } = useUserStore()

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                loadProfile(session.user.id).finally(() => setLoading(false))
            } else {
                setLoading(false)
            }
        })

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                loadProfile(session.user.id)
            } else {
                setProfile(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
                {children || <Outlet />}
            </main>
            {!hideFooter && <Footer />}
        </div>
    )
}

