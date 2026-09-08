import { useConfiguratorStore } from '@/store/configuratorStore'
import { MapPin } from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

export function Step6Location() {
    const { location, setLocation } = useConfiguratorStore()

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dove vuoi eseguire i lavori?</h3>
                <p className="text-gray-500">Partiamo da qui: sapendo la zona possiamo calcolare il preventivo sulla tariffa reale del posatore che la copre</p>
            </div>

            {/* Address Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">Indirizzo di lavoro</span>
                </div>

                <AddressAutocomplete
                    value={location}
                    onChange={setLocation}
                />
            </div>
        </div>
    )
}
