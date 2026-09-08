import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    ClipboardList,
    Layers,
    MessageCircle,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { authPageLink } from '@/lib/authNavigation'
import { useConfiguratorStore } from '@/store/configuratorStore'
import '@/pages/public/home.css'
import '@/pages/auth/auth.css'

export function AuthLayout({
    children,
    mode,
    redirect,
}: {
    children: ReactNode
    mode: 'login' | 'register'
    redirect: string | null
}) {
    const sqm = useConfiguratorStore(
        (state) => state.dimensions.pavimentoMq + state.dimensions.paretiMq,
    )
    const returningToQuote = redirect?.startsWith('/configuratore')
    return (
        <div className="pf-auth">
            <header className="pf-auth-header">
                <div className="pf-header-container pf-auth-header-inner">
                    <Link
                        to="/"
                        aria-label="PosaFacile, pagina iniziale"
                        className="group"
                    >
                        <Logo size="md" />
                    </Link>
                    <Link
                        to={returningToQuote ? '/configuratore' : '/'}
                        className="pf-auth-back"
                    >
                        <ArrowLeft size={15} />
                        <span>
                            {returningToQuote
                                ? 'Torna al tuo progetto'
                                : 'Torna a PosaFacile'}
                        </span>
                    </Link>
                </div>
            </header>
            <main className="pf-auth-main">
                <section
                    className="pf-auth-story"
                    aria-label="La tua area personale"
                >
                    <div className="pf-auth-story-copy">
                        <p className="pf-eyebrow">
                            LE TUE IDEE, IN UN UNICO POSTO
                        </p>
                        <h2>
                            La tua casa.
                            <br />
                            Il tuo progetto.
                            <br />
                            <span>Il tuo spazio.</span>
                        </h2>
                        <p>
                            Un posto per immaginare, scegliere e ritrovare ogni
                            dettaglio. Dalla prima idea all’ultima piastrella.
                        </p>
                    </div>
                    <div className="pf-auth-photo">
                        <img
                            src="/images/living-elegante.jpg"
                            alt="Un living accogliente con materiali naturali e luce dalle grandi finestre"
                            width="900"
                            height="700"
                        />
                        <div className="pf-auth-photo-label">
                            <span>
                                <Layers size={18} />
                            </span>
                            <div>
                                <strong>Le belle idee meritano spazio.</strong>
                                <small>
                                    Inizia a costruire il tuo prossimo progetto.
                                </small>
                            </div>
                            <ArrowUpRight size={17} />
                        </div>
                    </div>
                    <div className="pf-auth-benefits">
                        {[
                            {
                                icon: ClipboardList,
                                text: 'Preventivi da ritrovare',
                            },
                            { icon: Layers, text: 'Progetti da seguire' },
                            {
                                icon: MessageCircle,
                                text: 'Persone con cui parlare',
                            },
                        ].map(({ icon: Icon, text }) => (
                            <span key={text}>
                                <Icon size={16} strokeWidth={1.5} />
                                {text}
                            </span>
                        ))}
                    </div>
                </section>
                <section
                    className="pf-auth-form-section"
                    aria-label={
                        mode === 'login'
                            ? 'Accedi alla tua area'
                            : 'Crea il tuo account'
                    }
                >
                    <div className="pf-auth-form-wrap">
                        <nav
                            className="pf-auth-tabs"
                            aria-label="Accesso e registrazione"
                        >
                            <Link
                                to={authPageLink('login', redirect)}
                                className={mode === 'login' ? 'is-active' : ''}
                                aria-current={
                                    mode === 'login' ? 'page' : undefined
                                }
                            >
                                Accedi
                            </Link>
                            <Link
                                to={authPageLink('register', redirect)}
                                className={
                                    mode === 'register' ? 'is-active' : ''
                                }
                                aria-current={
                                    mode === 'register' ? 'page' : undefined
                                }
                            >
                                Crea un account
                            </Link>
                        </nav>
                        {returningToQuote && (
                            <div className="pf-auth-project-note">
                                <span>
                                    <Check size={16} />
                                </span>
                                <div>
                                    <strong>Il tuo progetto ti aspetta.</strong>
                                    <small>
                                        {sqm > 0
                                            ? `${sqm} m² di nuove possibilità. `
                                            : ''}
                                        Dopo l’accesso torni al preventivatore.
                                    </small>
                                </div>
                            </div>
                        )}
                        {children}
                    </div>
                    <p className="pf-auth-footer">
                        © {new Date().getFullYear()} PosaFacile · Materiali.
                        Persone. Spazi da vivere.
                    </p>
                </section>
            </main>
        </div>
    )
}
