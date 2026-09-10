import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export function Footer() {
    return (
        <footer className="border-t border-stone-200 bg-[#f5f2ec] py-14 text-stone-600">
            <div className="mx-auto w-[calc(100%-40px)] max-w-7xl md:w-[calc(100%-64px)] xl:w-[calc(100%-96px)]">
                <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" aria-label="PosaFacile, pagina iniziale">
                            <Logo size="md" />
                        </Link>
                        <p className="mt-5 max-w-64 text-sm leading-relaxed">
                            Il pavimento che immagini.
                            <br />
                            La semplicità di un unico progetto.
                        </p>
                        <Link
                            to="/configuratore"
                            className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-stone-900"
                        >
                            Diamo forma alla tua idea <ArrowUpRight size={15} />
                        </Link>
                    </div>
                    {[
                        {
                            title: 'La tua nuova casa',
                            links: [
                                {
                                    label: 'Esplora i materiali',
                                    to: '/catalog',
                                },
                                {
                                    label: 'Trova ispirazione',
                                    to: '/#ispirazioni',
                                },
                                { label: 'Calcola il budget', to: '/#stima' },
                            ],
                        },
                        {
                            title: 'Il tuo progetto',
                            links: [
                                {
                                    label: 'Come funziona',
                                    to: '/come-funziona',
                                },
                                {
                                    label: 'Per le imprese (B2B)',
                                    to: '/come-funziona#imprese',
                                },
                                {
                                    label: 'Crea un preventivo',
                                    to: '/configuratore',
                                },
                                { label: 'Domande frequenti', to: '/come-funziona#domande-servizio' },
                            ],
                        },
                        {
                            title: 'Sempre con te',
                            links: [
                                { label: 'Area personale', to: '/login' },
                                { label: 'Crea un account', to: '/register' },
                                {
                                    label: 'Sei un professionista?',
                                    to: '/professionisti',
                                },
                                {
                                    label: 'Accesso professionisti',
                                    to: '/login',
                                },
                            ],
                        },
                    ].map((group) => (
                        <div key={group.title}>
                            <h3 className="mb-5 text-xs font-bold text-stone-900">
                                {group.title}
                            </h3>
                            <ul className="space-y-3">
                                {group.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.to}
                                            className="text-xs transition-colors hover:text-orange-600"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-12 flex flex-col justify-between gap-3 border-t border-stone-300/60 pt-6 text-[10px] text-stone-600 sm:flex-row">
                    <p>
                        © {new Date().getFullYear()} PosaFacile. Tutti i diritti
                        riservati.
                    </p>
                    <p>Materiali. Persone. Spazi da vivere.</p>
                </div>
            </div>
        </footer>
    )
}
