import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserStore } from '@/store/userStore'

interface AuthDialogProps {
    open: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
    const { signIn, signUp, signInWithGoogle } = useUserStore()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            await signIn(email, password)
            onSuccess?.()
        } catch (err: any) {
            console.error(err)
            setError('Credenziali non valide. Riprova.')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const firstName = formData.get('firstName') as string
        const lastName = formData.get('lastName') as string

        try {
            await signUp(email, password, {
                first_name: firstName,
                last_name: lastName,
                role: 'customer'
            })

            // Auto-login dopo registrazione se email confirmation è disabilitata
            try {
                await signIn(email, password)
                onSuccess?.()
            } catch {
                // Se auto-login fallisce, mostra messaggio
                setError('Registrazione completata! Ti abbiamo inviato un\'email di conferma.')
            }
        } catch (err: any) {
            console.error(err)
            setError('Errore durante la registrazione. ' + (err.message || ''))
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setLoading(true)
        setError(null)

        try {
            await signInWithGoogle()
            // Note: Google OAuth will redirect, so onSuccess might not be called
        } catch (err: any) {
            console.error(err)
            setError('Errore durante l\'accesso con Google')
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[500px]"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">
                        Accedi o Registrati
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Per procedere con la prenotazione, accedi al tuo account o creane uno nuovo
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
                            {error}
                        </div>
                    )}

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Accedi</TabsTrigger>
                            <TabsTrigger value="register">Registrati</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="space-y-4 mt-4">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="mario.rossi@example.com"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <Input
                                        type="password"
                                        name="password"
                                        required
                                        placeholder="••••••••"
                                        disabled={loading}
                                    />
                                </div>

                                <Button type="submit" className="w-full h-11 bg-orange-500 hover:bg-orange-600" disabled={loading}>
                                    {loading ? 'Accesso in corso...' : 'Accedi'}
                                </Button>
                            </form>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-500">
                                        Oppure continua con
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                type="button"
                                className="w-full h-11"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                            >
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                                </svg>
                                Google
                            </Button>
                        </TabsContent>

                        <TabsContent value="register" className="space-y-4 mt-4">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nome
                                        </label>
                                        <Input
                                            name="firstName"
                                            required
                                            placeholder="Mario"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cognome
                                        </label>
                                        <Input
                                            name="lastName"
                                            required
                                            placeholder="Rossi"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="mario.rossi@example.com"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <Input
                                        type="password"
                                        name="password"
                                        required
                                        placeholder="••••••••"
                                        minLength={6}
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Minimo 6 caratteri</p>
                                </div>

                                <Button type="submit" className="w-full h-11 bg-orange-500 hover:bg-orange-600" disabled={loading}>
                                    {loading ? 'Registrazione...' : 'Crea Account'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
