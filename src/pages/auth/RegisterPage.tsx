import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Check, Loader2, MailCheck } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordField } from '@/components/auth/PasswordField'
import { authPageLink, getSafeAuthRedirect } from '@/lib/authNavigation'

export function RegisterPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const redirect = getSafeAuthRedirect(params.get('redirect'))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const firstName = String(data.get('firstName') || '').trim()
        const lastName = String(data.get('lastName') || '').trim()
        if (!firstName || !lastName) {
            setError('Inserisci nome e cognome per creare il tuo account.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const { data: result, error: signupError } =
                await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            role: 'customer',
                        },
                        emailRedirectTo: `${window.location.origin}${authPageLink('login', redirect)}`,
                    },
                })
            if (signupError) throw signupError
            if (result.session) {
                const store = useUserStore.getState()
                store.setUser(result.session.user)
                await store.loadProfile(result.session.user.id)
                navigate(redirect || '/dashboard', { replace: true })
            } else {
                setConfirmation(true)
                setPassword('')
            }
        } catch {
            setError(
                'Non siamo riusciti a creare l’account. Controlla i dati e riprova. Se sei già registrato, accedi o recupera la password.',
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout mode="register" redirect={redirect}>
            {confirmation ? (
                <div className="pf-auth-confirmation" role="status">
                    <MailCheck size={40} strokeWidth={1.5} />
                    <p className="pf-eyebrow">MANCA SOLO UN PICCOLO PASSO</p>
                    <h1>Ci vediamo nella tua email.</h1>
                    <p>
                        Controlla la casella <strong>{email}</strong> e segui il
                        link di conferma, se richiesto. Poi potrai accedere al
                        tuo spazio. Se hai già un account con questa email, usa
                        l’accesso.
                    </p>
                    <Link
                        to={authPageLink('login', redirect)}
                        className="pf-button pf-button-orange"
                    >
                        Vai all’accesso <ArrowUpRight size={18} />
                    </Link>
                    <small>
                        Non trovi il messaggio? Controlla anche lo spam.
                    </small>
                </div>
            ) : (
                <>
                    <div className="pf-auth-form-heading">
                        <p className="pf-eyebrow">
                            LE BELLE IDEE COMINCIANO QUI
                        </p>
                        <h1>Fai spazio ai tuoi progetti.</h1>
                        <p>
                            Crea il tuo account gratuito e ritrova ogni scelta,
                            dal primo preventivo al lavoro finito.
                        </p>
                    </div>
                    {error && (
                        <div className="pf-auth-error" role="alert">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="pf-auth-form">
                        <div className="pf-auth-name-grid">
                            <div className="pf-auth-field">
                                <label htmlFor="register-first-name">
                                    Nome
                                </label>
                                <input
                                    id="register-first-name"
                                    name="firstName"
                                    autoComplete="given-name"
                                    required
                                    placeholder="Il tuo nome"
                                    disabled={loading}
                                />
                            </div>
                            <div className="pf-auth-field">
                                <label htmlFor="register-last-name">
                                    Cognome
                                </label>
                                <input
                                    id="register-last-name"
                                    name="lastName"
                                    autoComplete="family-name"
                                    required
                                    placeholder="Il tuo cognome"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="pf-auth-field">
                            <label htmlFor="register-email">
                                Indirizzo email
                            </label>
                            <input
                                id="register-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="nome@esempio.it"
                                disabled={loading}
                            />
                        </div>
                        <PasswordField
                            id="register-password"
                            value={password}
                            onChange={setPassword}
                            newPassword
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="pf-button pf-button-orange pf-auth-submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2
                                        size={17}
                                        className="animate-spin"
                                    />{' '}
                                    Creiamo il tuo spazio…
                                </>
                            ) : (
                                <>
                                    Crea il tuo account gratuito{' '}
                                    <ArrowUpRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                    <div className="pf-auth-free">
                        <span>
                            <Check size={14} /> Nessuna carta richiesta
                        </span>
                        <span>
                            <Check size={14} /> Nessun obbligo di acquisto
                        </span>
                    </div>
                    <p className="pf-auth-switch">
                        Hai già un account?{' '}
                        <Link to={authPageLink('login', redirect)}>
                            Accedi al tuo spazio <ArrowUpRight size={13} />
                        </Link>
                    </p>
                    <div className="pf-auth-next">
                        <span>IL PROSSIMO PASSO</span>
                        <p>
                            {redirect?.startsWith('/configuratore')
                                ? 'Dopo l’accesso, riprendi il tuo preventivo dal punto in cui lo hai lasciato.'
                                : 'Esplora i materiali, crea il tuo primo preventivo e salva le idee che vuoi realizzare.'}
                        </p>
                    </div>
                </>
            )}
        </AuthLayout>
    )
}
