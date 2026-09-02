import { useEffect, useState } from 'react'
import { Search, X, MapPin, Loader2 } from 'lucide-react'
import { ITALIAN_PROVINCES } from '@/lib/provinces'
import { loadComuni, searchComuni, type Comune } from '@/lib/comuni'
import { geocodeComune } from '@/lib/geocoding'

export type CoverageMode = 'province' | 'radius'

export interface CoverageValue {
    mode: CoverageMode
    /** Sigle delle province servite, usate quando mode è 'province'. */
    zones: string[]
    centerLat: number | null
    centerLon: number | null
    /** Etichetta del punto centrale, solo per mostrarlo all'admin. */
    centerLabel: string
    radiusKm: string
}

interface CoverageSelectorProps {
    value: CoverageValue
    onChange: (patch: Partial<CoverageValue>) => void
}

const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition'

/**
 * Un professionista copre o un elenco di province o un raggio attorno a un punto.
 * Le due modalità si escludono: è il campo coverage_mode a dire quale vale, e la
 * ricerca dei posatori applica solo quella.
 */
export function CoverageSelector({ value, onChange }: CoverageSelectorProps) {
    const [provinceSearch, setProvinceSearch] = useState('')
    const [comuni, setComuni] = useState<Comune[] | null>(null)
    const [centerQuery, setCenterQuery] = useState(value.centerLabel)
    const [centerOptions, setCenterOptions] = useState<Comune[]>([])
    const [locating, setLocating] = useState(false)
    const [centerError, setCenterError] = useState<string | null>(null)

    useEffect(() => {
        if (value.mode !== 'radius' || comuni) return
        loadComuni().then(setComuni).catch(() => setCenterError('Elenco comuni non disponibile'))
    }, [value.mode, comuni])

    const toggleZone = (code: string) =>
        onChange({
            zones: value.zones.includes(code)
                ? value.zones.filter(z => z !== code)
                : [...value.zones, code],
        })

    const selectCenter = async (comune: Comune) => {
        setCenterQuery(comune.nome)
        setCenterOptions([])
        setLocating(true)
        setCenterError(null)
        try {
            const coords = await geocodeComune(comune.nome, comune.sigla)
            if (!coords) {
                setCenterError('Coordinate non trovate per questo comune')
                return
            }
            onChange({
                centerLat: coords.lat,
                centerLon: coords.lon,
                centerLabel: `${comune.nome} (${comune.sigla})`,
            })
        } catch {
            setCenterError('Geocodifica non riuscita, riprova')
        } finally {
            setLocating(false)
        }
    }

    const filteredProvinces = ITALIAN_PROVINCES.filter(p =>
        provinceSearch === '' ||
        p.name.toLowerCase().includes(provinceSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(provinceSearch.toLowerCase())
    )

    return (
        <section className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Area di Copertura
            </h3>

            <div className="grid grid-cols-2 gap-3">
                {(['province', 'radius'] as const).map(mode => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => onChange({ mode })}
                        className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition-colors ${
                            value.mode === mode
                                ? 'border-orange-500 bg-orange-50 text-orange-800'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                        {mode === 'province' ? 'Per province' : 'Per raggio'}
                        <span className="block text-[11px] font-normal text-gray-500 mt-0.5">
                            {mode === 'province' ? 'Province servite' : 'Cerchio attorno a un punto'}
                        </span>
                    </button>
                ))}
            </div>

            {value.mode === 'province' ? (
                <>
                    {value.zones.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                            <span className="w-full text-xs font-semibold text-orange-700 mb-1">
                                {value.zones.length} province selezionate:
                            </span>
                            {value.zones.map(code => {
                                const prov = ITALIAN_PROVINCES.find(p => p.code === code)
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => toggleZone(code)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-orange-200 rounded-md text-xs font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                                    >
                                        {code} · {prov?.name ?? code}
                                        <X size={10} />
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Cerca provincia..."
                            value={provinceSearch}
                            onChange={e => setProvinceSearch(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="max-h-44 overflow-y-auto p-2 bg-gray-50">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                                {filteredProvinces.map(prov => (
                                    <label
                                        key={prov.code}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                                            value.zones.includes(prov.code)
                                                ? 'bg-orange-100 text-orange-800'
                                                : 'hover:bg-white text-gray-700'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={value.zones.includes(prov.code)}
                                            onChange={() => toggleZone(prov.code)}
                                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                                        />
                                        <span className="font-medium">{prov.code}</span>
                                        <span className="text-gray-500 truncate">{prov.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-3">
                    <div className="relative">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Punto centrale <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                type="text"
                                className={`${inputClass} pl-9`}
                                placeholder={comuni ? 'Comune da cui parte il raggio...' : 'Caricamento comuni...'}
                                disabled={!comuni}
                                value={centerQuery}
                                onChange={e => {
                                    setCenterQuery(e.target.value)
                                    setCenterOptions(comuni ? searchComuni(comuni, e.target.value) : [])
                                }}
                                autoComplete="off"
                            />
                            {locating && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={15} />
                            )}
                        </div>

                        {centerOptions.length > 0 && (
                            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                                {centerOptions.map(c => (
                                    <li key={`${c.nome}-${c.sigla}`}>
                                        <button
                                            type="button"
                                            onClick={() => selectCenter(c)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex justify-between gap-2"
                                        >
                                            <span>{c.nome}</span>
                                            <span className="text-xs text-gray-500">{c.sigla}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Raggio (km) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number" min="1" step="1"
                            className={inputClass}
                            placeholder="50"
                            value={value.radiusKm}
                            onChange={e => onChange({ radiusKm: e.target.value })}
                        />
                    </div>

                    {value.centerLat !== null && value.centerLon !== null ? (
                        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            Centro impostato su <strong>{value.centerLabel}</strong>
                            {' '}({value.centerLat.toFixed(4)}, {value.centerLon.toFixed(4)})
                        </p>
                    ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Scegli un comune dall'elenco per fissare il centro del raggio.
                        </p>
                    )}

                    {centerError && <p className="text-xs text-red-600">{centerError}</p>}
                </div>
            )}
        </section>
    )
}
