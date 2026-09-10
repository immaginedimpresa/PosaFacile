import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { useAuthSession } from '@/hooks/useAuthSession'

interface RootLayoutProps {
    children?: React.ReactNode
    hideFooter?: boolean
}

export function RootLayout({ children, hideFooter }: RootLayoutProps) {
    const location = useLocation()

    useAuthSession()

    // Match portal segments, not public routes such as /professionisti or /products.
    const isPortalRoute = ['/admin', '/pro'].some(
        (route) =>
            location.pathname === route ||
            location.pathname.startsWith(`${route}/`),
    )

    const shouldHideFooter = hideFooter || isPortalRoute

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
