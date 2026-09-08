import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
    ArrowLeft,
    ArrowUpRight,
    Loader2,
    MailCheck,
    ShieldCheck,
} from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleMark, PasswordField } from '@/components/auth/PasswordField'
import {
    authDestination,
    authPageLink,
    getSafeAuthRedirect,
} from '@/lib/authNavigation'

export function LoginPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const redirect = getSafeAuthRedirect(params.get('redirect'))
    const recoveryRequested = params.get('mode') === 'recovery'
    const { signIn } = useUserStore()
    const [mode, setMode] = useState<'login' | 'forgot' | 'recovery'>(
        recoveryRequested ? 'recovery' : 'login',
    )
    const [recoveryReady, setRecoveryReady] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [resetSent, setResetSent] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)

    // OAuth returns here; password login redirects in its own submit handler.
    useEffect(() => {
        let active = true
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setMode('recovery')
                setRecoveryReady(true)
            }
        })
        supabase.auth
            .getSession()
            .then(async ({ data: { session }, error: sessionError }) => {
                if (!active) return
                if (recoveryRequested) {
                    setRecoveryReady(Boolean(session))
                    if (!session || sessionError)
                        setError(
                            'Il link non è più valido. Richiedi una nuova email per reimpostare la password.',
                        )
                } else if (session) {
                    const store = useUserStore.getState()
                    store.setUser(session.user)
                    await store.loadProfile(session.user.id)
                    if (active)
                        navigate(
                            authDestination(
                                useUserStore.getState().profile?.role ||
                                    session.user.user_metadata?.role,
                                redirect,
                            ),
                            { replace: true },
                        )
                }
            })
            .catch(() => {
                if (active)
                    setError(
                        'Non riusciamo a verificare la sessione. Riprova tra poco.',
                    )
            })
        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [navigate, recoveryRequested, redirect])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError(null)
        try {
            if (mode === 'forgot') {
                const callback = new URL('/login', window.location.origin)
                callback.searchParams.set('mode', 'recovery')
                if (redirect) callback.searchParams.set('redirect', redirect)
                const { error: resetError } =
                    await supabase.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo: callback.toString(),
                    })
                if (resetError) throw resetError
                setResetSent(true)
            } else if (mode === 'recovery') {
                const { error: updateError } = await supabase.auth.updateUser({
                    password,
                })
                if (updateError) throw updateError
                await supabase.auth.signOut()
                useUserStore.getState().setUser(null)
                useUserStore.getState().setProfile(null)
                setPassword('')
                setNotice('Password aggiornata. Accedi con la nuova password.')
                setMode('login')
                navigate(authPageLink('login', redirect), { replace: true })
            } else {
                await signIn(email.trim(), password)
                const store = useUserStore.getState()
                navigate(
                    authDestination(
                        store.profile?.role || store.user?.user_metadata?.role,
                        redirect,
                    ),
                    { replace: true },
                )
            }
        } catch {
            setError(
                mode === 'login'
                    ? 'Non siamo riusciti ad accedere. Controlla email e password e riprova. Se hai appena creato l’account, verifica la tua email.'
                    : 'Non è stato possibile completare la richiesta. Riprova tra poco.',
            )
        } finally {
            setLoading(false)
        }
    }
    const handleGoogle = async () => {
        setLoading(true)
        setError(null)
        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}${authPageLink('login', redirect)}`,
                },
            })
            if (oauthError) throw oauthError
        } catch {
            setError(
                'L’accesso con Google non è disponibile al momento. Puoi usare email e password.',
            )
            setLoading(false)
        }
    }
    const changeMode = (next: 'login' | 'forgot') => {
        setMode(next)
        setError(null)
        setResetSent(false)
    }

    return (
        <AuthLayout mode="login" redirect={redirect}>
            <div className="pf-auth-form-heading">
                <p className="pf-eyebrow">
                    {mode === 'login'
                        ? 'RIPARTIAMO DALLE TUE IDEE'
                        : 'RITROVIAMO IL TUO SPAZIO'}
                </p>
                <h1>
                    {mode === 'login'
                        ? 'Bentornato a casa.'
                        : mode === 'forgot'
                          ? 'Una nuova password?'
                          : 'Ripartiamo in sicurezza.'}
                </h1>
                <p>
                    {mode === 'login'
                        ? 'Accedi per ritrovare preventivi, progetti e tutte le tue prossime possibilità.'
                        : mode === 'forgot'
                          ? 'Inserisci la tua email. Ti invieremo un link per scegliere una nuova password.'
                          : 'Scegli la nuova password per il tuo account.'}
                </p>
            </div>
            {notice && (
                <p className="pf-auth-project-note" role="status">
                    {notice}
                </p>
            )}
            {error && (
                <div className="pf-auth-error" role="alert">
                    {error}
                </div>
            )}
            {resetSent ? (
                <div className="pf-auth-confirmation" role="status">
                    <MailCheck size={34} strokeWidth={1.5} />
                    <h2>Controlla la tua casella.</h2>
                    <p>
                        Se l’indirizzo è associato a un account, riceverai
                        un’email con il link per reimpostare la password.
                        Controlla anche lo spam.
                    </p>
                    <button
                        className="pf-button pf-button-dark"
                        onClick={() => changeMode('login')}
                    >
                        Torna all’accesso <ArrowUpRight size={17} />
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="pf-auth-form">
                    {mode !== 'recovery' && (
                        <div className="pf-auth-field">
                            <label htmlFor="login-email">Indirizzo email</label>
                            <input
                                id="login-email"
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
                    )}
                    {mode !== 'forgot' && (
                        <PasswordField
                            id="login-password"
                            value={password}
                            onChange={setPassword}
                            newPassword={mode === 'recovery'}
                            disabled={loading}
                        />
                    )}
                    {mode === 'login' && (
                        <button
                            type="button"
                            className="pf-auth-forgot"
                            onClick={() => changeMode('forgot')}
                            disabled={loading}
                        >
                            Password dimenticata?
                        </button>
                    )}
                    <button
                        className="pf-button pf-button-orange pf-auth-submit"
                        type="submit"
                        disabled={
                            loading || (mode === 'recovery' && !recoveryReady)
                        }
                    >
                        {loading ? (
                            <>
                                <Loader2 size={17} className="animate-spin" />{' '}
                                Un momento…
                            </>
                        ) : (
                            <>
                                {mode === 'login'
                                    ? redirect?.startsWith('/configuratore')
                                        ? 'Accedi e riprendi il progetto'
                                        : 'Entra nel tuo spazio'
                                    : mode === 'forgot'
                                      ? 'Invia il link di recupero'
                                      : 'Salva la nuova password'}
                                <ArrowUpRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            )}
            {mode === 'login' && (
                <>
                    <div className="pf-auth-divider">
                        <span>oppure, ancora più semplice</span>
                    </div>
                    <button
                        type="button"
                        className="pf-auth-google"
                        onClick={handleGoogle}
                        disabled={loading}
                    >
                        <GoogleMark />
                        Continua con Google
                    </button>
                    <p className="pf-auth-switch">
                        È la tua prima volta?{' '}
                        <Link to={authPageLink('register', redirect)}>
                            Crea il tuo account <ArrowUpRight size={13} />
                        </Link>
                    </p>
                    <div className="pf-auth-trust">
                        <ShieldCheck size={17} />
                        <span>
                            Un solo accesso per preventivi, ordini e
                            aggiornamenti.
                            <small>
                                Sei un professionista? Accedi qui con il tuo
                                account.
                            </small>
                        </span>
                    </div>
                </>
            )}
            {mode !== 'login' && (
                <button
                    className="pf-auth-return"
                    onClick={() =>
                        changeMode(mode === 'recovery' ? 'forgot' : 'login')
                    }
                    disabled={loading}
                >
                    <ArrowLeft size={14} />
                    {mode === 'recovery'
                        ? 'Richiedi un nuovo link'
                        : 'Torna all’accesso'}
                </button>
            )}
        </AuthLayout>
    )
}
