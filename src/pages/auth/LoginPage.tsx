import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserStore } from '@/store/userStore'
import { FadeIn } from '@/components/ui/motion'

export function LoginPage() {
    const navigate = useNavigate()
    const { signIn, signInWithGoogle } = useUserStore()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            await signIn(email, password)

            // Check role for redirection
            const profile = useUserStore.getState().profile
            if (profile?.role === 'professional') {
                navigate('/pro')
            } else {
                navigate('/dashboard')
            }
        } catch (err: any) {
            console.error(err)
            setError('Credenziali non valide o errore del server.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <FadeIn className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-display text-gray-900 mb-2">Accedi</h1>
                    <p className="text-gray-500">Bentornato su PosaFacile</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input type="email" name="email" required placeholder="mario.rossi@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <Input type="password" name="password" required placeholder="••••••••" />
                    </div>

                    <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                        {loading ? 'Accesso in corso...' : 'Accedi'}
                    </Button>
                </form>

                <div className="mt-4">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Oppure continua con</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        className="w-full mt-4 h-12"
                        onClick={async () => {
                            setLoading(true)
                            try {
                                await signInWithGoogle()
                            } catch (err) {
                                console.error(err)
                                setError('Errore durante l\'accesso con Google')
                                setLoading(false)
                            }
                        }}
                        disabled={loading}
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Google
                    </Button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Non hai un account? <Link to="/register" className="text-primary font-bold hover:underline">Registrati</Link>
                </div>
            </FadeIn>
        </div>
    )
}
