/** Only return to a route inside this app after authentication. */
export function getSafeAuthRedirect(value: string | null): string | null {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null
    try {
        const url = new URL(value, window.location.origin)
        if (
            url.origin !== window.location.origin ||
            /^\/(login|register)(\/|$)/.test(url.pathname)
        )
            return null
        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        return null
    }
}

export function authDestination(
    role: string | undefined,
    redirect: string | null,
) {
    if (role === 'admin') return '/admin'
    if (role === 'professional') return '/pro'
    return redirect || '/dashboard'
}

export function authPageLink(
    page: 'login' | 'register',
    redirect: string | null,
) {
    return `/${page}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`
}
