import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type UserRole } from '@/hooks/useAuth'

interface ProtectedRouteProps {
    children: React.ReactNode
    allowedRoles?: UserRole[]
}

const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Caricamento...</p>
        </div>
    </div>
)

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, role, loading } = useAuth()
    const location = useLocation()

    console.log('[ProtectedRoute Debug]', {
        path: location.pathname,
        loading,
        userEmail: user?.email,
        currentRole: role,
        roleType: typeof role,
        requiredRoles: allowedRoles,
        match: role && allowedRoles?.includes(role)
    })

    if (loading) {
        return <LoadingSpinner />
    }

    // Not authenticated - redirect to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Check role access if allowedRoles is specified
    if (allowedRoles && allowedRoles.length > 0 && role) {
        if (!allowedRoles.includes(role)) {
            return <Navigate to="/unauthorized" replace />
        }
    }

    return <>{children}</>
}
