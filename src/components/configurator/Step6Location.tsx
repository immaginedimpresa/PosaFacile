import { useConfiguratorStore } from '@/store/configuratorStore'
import { MapPin } from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

export function Step6Location() {
    const { location, setLocation } = useConfiguratorStore()

    return (
        <div className="space-y-6">
            <div>
                <p className="text-gray-500">
                    Indica l&apos;indirizzo dell&apos;immobile per verificare la copertura e trovare i migliori posatori qualificati della tua zona.
                </p>
            </div>

            {/* Address Form */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-4 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-base">Indirizzo di lavoro</h3>
                        <p className="text-xs text-stone-500">Città, CAP e via dell&apos;intervento di posa</p>
                    </div>
                </div>

                <AddressAutocomplete
                    value={location}
                    onChange={setLocation}
                />
            </div>
        </div>
    )
}
