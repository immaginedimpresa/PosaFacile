import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserStore } from '@/store/userStore'
import { FadeIn } from '@/components/ui/motion'

export function RegisterPage() {
    const navigate = useNavigate()
    const { signUp } = useUserStore()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const firstName = formData.get('firstName') as string
        const lastName = formData.get('lastName') as string

        // Simplification: We assume customer role by default. 
        // Pros register via a different flow or select role here if we add that field.
        const role = 'customer'

        try {
            await signUp(email, password, { first_name: firstName, last_name: lastName, role })

            // Note: Supabase might require email confirmation unless disabled in project settings.
            // If auto-confirm is on, sign-in might be needed or handled automatically.
            // For MVP we assume we can redirect or show success.
            alert('Registrazione completata! Controlla la tua email o accedi se la conferma è disabilitata.')
            navigate('/login')
        } catch (err: any) {
            console.error(err)
            setError('Errore durante la registrazione. ' + (err.message || ''))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <FadeIn className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-display text-gray-900 mb-2">Registrati</h1>
                    <p className="text-gray-500">Inizia il tuo progetto con PosaFacile</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <Input name="firstName" required placeholder="Mario" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                            <Input name="lastName" required placeholder="Rossi" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input type="email" name="email" required placeholder="mario.rossi@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <Input type="password" name="password" required placeholder="••••••••" minLength={6} />
                    </div>

                    <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                        {loading ? 'Registrazione...' : 'Crea Account'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Hai già un account? <Link to="/login" className="text-primary font-bold hover:underline">Accedi</Link>
                </div>
            </FadeIn>
        </div>
    )
}
