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

        // Debug logs – you can remove them in production
        console.log('[InviteHandler] Current path:', location.pathname)
        console.log('[InviteHandler] Hash detected:', hash)

        // Prevent double navigation caused by StrictMode double‑mounting
        if (hasRedirected.current) {
            return
        }

        // Only redirect if we're NOT already on the invite-accept page
        if (location.pathname !== '/invite-accept') {
            // Check if URL contains invite parameters or auth errors
            if (hash && (hash.includes('type=invite') || hash.includes('error='))) {
                console.log('[InviteHandler] Redirecting to /invite-accept with hash')
                // Use replace instead of navigate to avoid history pollution
                navigate('/invite-accept' + hash, { replace: true })
                hasRedirected.current = true
            }
        } else {
            console.log('[InviteHandler] Already on invite-accept page, skipping redirect')
        }
    }, [navigate, location.pathname])

    return null
}
