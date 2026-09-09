import { Euro, Info } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { RatesSettings } from '@/components/pro/RatesSettings'

/**
 * Le tariffe hanno una pagina propria.
 *
 * Stavano in fondo al profilo, dopo dati anagrafici, fiscali e zone: sono il
 * dato che entra in ogni preventivo e che si aggiorna piu' spesso di tutto il
 * resto, e finiva dove nessuno arrivava a scorrere.
 */
export function RatesPage() {
    const { user } = useAuth()

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <Euro className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                            Le tue tariffe
                        </h1>
                        <p className="text-stone-500 text-sm mt-0.5">
                            Il prezzo della manodopera nei preventivi che ricevi
                        </p>
                    </div>
                </div>
            </div>

            {user?.id ? (
                <RatesSettings professionalId={user.id} />
            ) : (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 flex items-start gap-3.5">
                    <Info size={20} className="text-stone-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-stone-600 font-medium">
                        Accedi con il tuo account professionista per impostare le tariffe.
                    </p>
                </div>
            )}
        </div>
    )
}
