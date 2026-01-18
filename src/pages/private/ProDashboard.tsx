import { Shield, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProDashboard() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Portale Professionista</h1>
                    <p className="text-gray-500">Gestisci i tuoi incarichi e la tua disponibilità</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                        <Shield size={14} /> Account Verificato
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-black text-white p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Guadagni Mese</h3>
                    <div className="text-3xl font-bold">€ 0.00</div>
                    <p className="text-sm text-gray-400 mt-2">Ultimi 30 giorni</p>
                </div>
                <div className="bg-white border p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Lavori Completati</h3>
                    <div className="text-3xl font-bold">0</div>
                    <p className="text-sm text-gray-500 mt-2">Totale carriera</p>
                </div>
                <div className="bg-white border p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Rating</h3>
                    <div className="text-3xl font-bold">5.0</div>
                    <p className="text-sm text-gray-500 mt-2">Basato su 0 recensioni</p>
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">Nuove Opportunità</h2>
            <div className="bg-white border rounded-lg p-8 text-center">
                <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Nessun lavoro disponibile nella tua zona</h3>
                <p className="text-gray-500 mb-4">Ti avviseremo quando ci saranno nuove richieste vicino a te.</p>
                <Button variant="outline">Aggiorna la tua zona di lavoro</Button>
            </div>
        </div>
    )
}
