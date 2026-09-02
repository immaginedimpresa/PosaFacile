import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Lock, CheckCircle, AlertCircle } from 'lucide-react'

export function InviteAcceptPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [urlError, setUrlError] = useState<string | null>(null)
    const [checking, setChecking] = useState(true)
    const [ready, setReady] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const type = hashParams.get('type')
        const errorType = hashParams.get('error')
        const errorDesc = hashParams.get('error_description')

        // Check for errors in URL
        if (errorType) {
            if (errorType === 'access_denied' && errorDesc?.includes('expired')) {
                setUrlError('Il link di invito è scaduto. Richiedi un nuovo invito all\'amministratore.')
            } else {
                setUrlError(errorDesc?.replace(/\+/g, ' ') || 'Si è verificato un errore. Richiedi un nuovo invito.')
            }
            setChecking(false)
            return
        }

        // updateUser() richiede la sessione creata dal token nell'URL: il client la
        // stabilisce in modo asincrono, quindi non basta leggere i parametri dell'hash.
        let cancelled = false

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (cancelled || !session) return
            setReady(true)
            setChecking(false)
        })

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (cancelled) return
            if (session) {
                setReady(true)
                setChecking(false)
                return
            }
            // Nessuna sessione e nessun token di invito nell'URL: non c'è nulla da accettare.
            if (type !== 'invite' && type !== 'recovery') {
                navigate('/login', { replace: true })
                return
            }
            // Token presente ma sessione non ancora pronta: lasciamo lavorare il listener
            // e ci arrendiamo solo dopo un timeout, altrimenti resteremmo in attesa infinita.
            setTimeout(() => {
                if (cancelled) return
                setChecking(false)
                setReady(prev => {
                    if (!prev) setUrlError('Non è stato possibile validare il link di invito. Richiedi un nuovo invito.')
                    return prev
                })
            }, 5000)
        })

        return () => {
            cancelled = true
            subscription.unsubscribe()
        }
    }, [navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Le password non coincidono')
            return
        }

        if (password.length < 6) {
            setError('La password deve essere di almeno 6 caratteri')
            return
        }

        setLoading(true)

        try {
            // Update user password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) throw updateError

            setSuccess(true)
            // Il token resta nell'hash: lo rimuoviamo per non lasciarlo nella cronologia
            window.history.replaceState(null, '', window.location.pathname)

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                navigate('/pro', { replace: true })
            }, 2000)

        } catch (err: any) {
            console.error('Error accepting invite:', err)
            setError(err.message || 'Errore durante la configurazione della password')
            setLoading(false)
        }
    }

    if (checking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600">Verifica dell'invito in corso...</p>
                </div>
            </div>
        )
    }

    // If there's a URL error, show error state
    if (urlError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
                >
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Non Valido</h2>
                    <p className="text-gray-600 mb-6">{urlError}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
                    >
                        Torna al Login
                    </button>
                </motion.div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
                >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Configurato!</h2>
                    <p className="text-gray-600">
                        La tua password è stata impostata con successo.<br />
                        Verrai reindirizzato alla dashboard...
                    </p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-orange-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Benvenuto in PosaFacile</h1>
                    <p className="text-gray-600">Imposta la tua password per completare la registrazione</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nuova Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Almeno 6 caratteri"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Ripeti la password"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !ready}
                        className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Configurazione in corso...' : 'Imposta Password e Accedi'}
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
