import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { useUserStore } from '@/store/userStore'
import { supabase } from '@/lib/supabase'

interface RootLayoutProps {
    children?: React.ReactNode
    hideFooter?: boolean
}

export function RootLayout({ children, hideFooter }: RootLayoutProps) {
    const { user, profile, setUser, setProfile, loadProfile, setLoading } = useUserStore()
    const location = useLocation()

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

    const userRole = profile?.role || (user as any)?.user_metadata?.role
    const isStaffOrPro = userRole === 'admin' || userRole === 'professional'
    const isPortalRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/pro')

    const shouldHideFooter = hideFooter || isPortalRoute || isStaffOrPro

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
                {children || <Outlet />}
            </main>
            {!shouldHideFooter && <Footer />}
        </div>
    )
}

