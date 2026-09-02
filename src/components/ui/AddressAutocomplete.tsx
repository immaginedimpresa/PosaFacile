import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2, Check } from 'lucide-react'
import { loadComuni, searchComuni, type Comune } from '@/lib/comuni'
import { geocodeComune, searchStreets, type Coordinates, type StreetSuggestion } from '@/lib/geocoding'

export interface AddressValue {
    indirizzo: string
    citta: string
    provincia: string
    cap: string
}

interface AddressAutocompleteProps {
    value: AddressValue
    onChange: (patch: Partial<AddressValue>) => void
}

const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none'

/**
 * Indirizzo in due tempi: prima il comune (dall'elenco ISTAT, che fissa sigla
 * provincia e CAP), poi la via cercata sul geocoder con bias sulle coordinate
 * del comune. È l'unico modo per avere una sigla provincia sempre corretta:
 * da quella dipende quali professionisti vengono proposti.
 */
export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
    const [comuni, setComuni] = useState<Comune[] | null>(null)
    const [comuneQuery, setComuneQuery] = useState(value.citta)
    const [comuneOptions, setComuneOptions] = useState<Comune[]>([])
    const [comuneOpen, setComuneOpen] = useState(false)
    const [comuneConfirmed, setComuneConfirmed] = useState(Boolean(value.citta && value.provincia))
    const [loadError, setLoadError] = useState<string | null>(null)

    const [coords, setCoords] = useState<Coordinates | null>(null)
    const [streetOptions, setStreetOptions] = useState<StreetSuggestion[]>([])
    const [streetOpen, setStreetOpen] = useState(false)
    const [streetLoading, setStreetLoading] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadComuni()
            .then(setComuni)
            .catch((err: Error) => setLoadError(err.message))
    }, [])

    // Un click fuori chiude i menu senza toccare i valori già scelti.
    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setComuneOpen(false)
                setStreetOpen(false)
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const handleComuneInput = (text: string) => {
        setComuneQuery(text)
        setComuneConfirmed(false)
        setCoords(null)
        onChange({ citta: '', provincia: '', cap: '' })
        setComuneOptions(comuni ? searchComuni(comuni, text) : [])
        setComuneOpen(true)
    }

    const selectComune = (comune: Comune) => {
        setComuneQuery(comune.nome)
        setComuneOptions([])
        setComuneOpen(false)
        setComuneConfirmed(true)
        onChange({ citta: comune.nome, provincia: comune.sigla, cap: comune.cap })

        // Le coordinate servono solo a orientare la ricerca della via: se il
        // geocoder non risponde, l'indirizzo resta comunque compilabile a mano.
        geocodeComune(comune.nome, comune.sigla)
            .then(setCoords)
            .catch(() => setCoords(null))
    }

    // Ricerca via: attesa di 350 ms dopo l'ultima digitazione, e la richiesta
    // precedente viene annullata per non far arrivare risposte fuori ordine.
    useEffect(() => {
        if (!streetOpen || value.indirizzo.trim().length < 3) {
            setStreetOptions([])
            return
        }

        const controller = new AbortController()
        const timer = setTimeout(() => {
            setStreetLoading(true)
            searchStreets(value.indirizzo, coords, controller.signal)
                .then(setStreetOptions)
                .catch(err => { if (err.name !== 'AbortError') setStreetOptions([]) })
                .finally(() => setStreetLoading(false))
        }, 350)

        return () => { clearTimeout(timer); controller.abort() }
    }, [value.indirizzo, coords, streetOpen])

    const selectStreet = (s: StreetSuggestion) => {
        onChange({
            indirizzo: [s.street, s.housenumber].filter(Boolean).join(' '),
            // Il CAP del civico è più preciso di quello generico del comune.
            ...(s.postcode ? { cap: s.postcode } : {}),
        })
        setStreetOptions([])
        setStreetOpen(false)
    }

    return (
        <div ref={containerRef} className="space-y-4">
            {/* Comune */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comune <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        className={`${inputClass} pl-10`}
                        placeholder={comuni ? 'Inizia a digitare il comune...' : 'Caricamento comuni...'}
                        disabled={!comuni && !loadError}
                        value={comuneQuery}
                        onChange={e => handleComuneInput(e.target.value)}
                        onFocus={() => { if (comuneOptions.length > 0) setComuneOpen(true) }}
                        autoComplete="off"
                    />
                    {comuneConfirmed && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" size={18} />
                    )}
                </div>

                {comuneOpen && comuneOptions.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                        {comuneOptions.map(c => (
                            <li key={`${c.nome}-${c.sigla}`}>
                                <button
                                    type="button"
                                    onClick={() => selectComune(c)}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 flex items-center justify-between gap-3"
                                >
                                    <span className="font-medium text-gray-900">{c.nome}</span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {c.sigla} · {c.regione}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {loadError && (
                    <p className="mt-1 text-xs text-red-600">
                        {loadError} — puoi comunque inserire i dati manualmente.
                    </p>
                )}
            </div>

            {/* Via */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indirizzo e civico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="text"
                        className={inputClass}
                        placeholder={comuneConfirmed ? 'Via Roma 15' : 'Scegli prima il comune'}
                        value={value.indirizzo}
                        onChange={e => { onChange({ indirizzo: e.target.value }); setStreetOpen(true) }}
                        onFocus={() => setStreetOpen(true)}
                        autoComplete="off"
                    />
                    {streetLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={18} />
                    )}
                </div>

                {streetOpen && streetOptions.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                        {streetOptions.map((s, i) => (
                            <li key={`${s.label}-${i}`}>
                                <button
                                    type="button"
                                    onClick={() => selectStreet(s)}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50"
                                >
                                    <span className="text-gray-900">{s.label}</span>
                                    {s.postcode && <span className="ml-2 text-xs text-gray-500">{s.postcode}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* CAP e provincia derivano dal comune: modificabili, ma già corretti */}
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">CAP</label>
                    <input
                        type="text" maxLength={5}
                        className={inputClass}
                        value={value.cap}
                        onChange={e => onChange({ cap: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label>
                    <input
                        type="text"
                        readOnly
                        className={`${inputClass} bg-gray-50 text-gray-600 cursor-not-allowed`}
                        placeholder="Derivata dal comune"
                        value={value.provincia}
                    />
                </div>
            </div>

            <p className="text-xs text-gray-400">
                Ricerca indirizzi fornita da OpenStreetMap · elenco comuni ISTAT
            </p>
        </div>
    )
}
