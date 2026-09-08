import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { useUserStore } from '@/store/userStore'
import { useAuthSession } from '@/hooks/useAuthSession'

interface RootLayoutProps {
    children?: React.ReactNode
    hideFooter?: boolean
}

export function RootLayout({ children, hideFooter }: RootLayoutProps) {
    const { user, profile } = useUserStore()
    const location = useLocation()

    useAuthSession()

    const userRole = profile?.role || user?.user_metadata?.role
    const isStaffOrPro = userRole === 'admin' || userRole === 'professional'
    const isPortalRoute =
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/pro')

    const shouldHideFooter = hideFooter || isPortalRoute || isStaffOrPro

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1">
                {children || <Outlet />}
            </main>
            {!shouldHideFooter && <Footer />}
        </div>
    )
}
