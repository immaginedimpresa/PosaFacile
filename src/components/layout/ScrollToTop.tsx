import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
    const { pathname, hash } = useLocation()

    useEffect(() => {
        if (hash) {
            const frame = requestAnimationFrame(() => {
                document
                    .getElementById(decodeURIComponent(hash.slice(1)))
                    ?.scrollIntoView({ block: 'start' })
            })
            return () => cancelAnimationFrame(frame)
        }
        window.scrollTo(0, 0)
    }, [pathname, hash])

    return null
}
