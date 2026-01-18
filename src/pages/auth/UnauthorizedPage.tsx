import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function UnauthorizedPage() {
    const { role, signOut } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (role === 'admin') {
            navigate('/admin', { replace: true })
        }
    }, [role, navigate])

    const handleSignOut = async () => {
        await signOut()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                        className="w-10 h-10 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Accesso Non Autorizzato
                </h1>
                <p className="text-gray-600 mb-6">
                    Non hai i permessi necessari per accedere a questa pagina.
                    {role && (
                        <span className="block mt-2 text-sm">
                            Il tuo ruolo attuale: <span className="font-medium">{role}</span>
                        </span>
                    )}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                    >
                        Torna alla Home
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        Esci
                    </button>
                </div>
            </div>
        </div>
    )
}
