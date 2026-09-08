import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Component to detect invite links and auth errors in URL hash.
 * It redirects to the appropriate page only once, even when React StrictMode
 * mounts the component twice in development.
 */
export function InviteHandler() {
    const navigate = useNavigate()
    const location = useLocation()
    const hasRedirected = useRef(false)

    useEffect(() => {
        // Get hash from window (more reliable than location.hash for initial loads)
        const hash = window.location.hash

        // Prevent double navigation caused by StrictMode double‑mounting
        if (hasRedirected.current) {
            return
        }

        // Only redirect if we're NOT already on the invite-accept page
        if (location.pathname !== '/invite-accept') {
            // Check if URL contains invite parameters or auth errors
            const isAuthPage =
                location.pathname === '/login' ||
                location.pathname === '/register'
            if (
                hash &&
                (hash.includes('type=invite') ||
                    (hash.includes('error=') && !isAuthPage))
            ) {
                // Use replace instead of navigate to avoid history pollution
                navigate('/invite-accept' + hash, { replace: true })
                hasRedirected.current = true
            }
        }
    }, [navigate, location.pathname])

    return null
}
