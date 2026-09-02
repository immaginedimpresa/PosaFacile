/**
 * Client per Photon (https://photon.komoot.io), geocoder gratuito su dati
 * OpenStreetMap, senza chiave API.
 *
 * Photon in ricerca libera sbaglia spesso sugli indirizzi italiani: "via roma
 * barletta" restituisce Via Barletta a Roma, perché pesa il nome della via più
 * del comune. Con un bias su lat/lon invece è preciso. Per questo il flusso è
 * in due tempi: prima si sceglie il comune (da src/lib/comuni.ts), poi si cerca
 * la via con le coordinate di quel comune come bias.
 */

const PHOTON_URL = 'https://photon.komoot.io/api'

export interface Coordinates {
    lat: number
    lon: number
}

export interface StreetSuggestion {
    street: string
    housenumber: string | null
    postcode: string | null
    city: string | null
    /** Etichetta pronta da mostrare nel menu dei suggerimenti. */
    label: string
}

interface PhotonFeature {
    geometry: { coordinates: [number, number] }
    properties: {
        name?: string
        street?: string
        housenumber?: string
        postcode?: string
        city?: string
        countrycode?: string
        osm_value?: string
    }
}

async function photon(params: Record<string, string>, signal?: AbortSignal): Promise<PhotonFeature[]> {
    // 'lang' accetta solo default/de/en/fr: 'default' restituisce i nomi locali.
    const query = new URLSearchParams({ lang: 'default', ...params })
    const res = await fetch(`${PHOTON_URL}?${query}`, { signal })
    if (!res.ok) throw new Error(`Geocoder non raggiungibile (${res.status})`)
    const data = await res.json()
    return (data.features ?? []) as PhotonFeature[]
}

/** Coordinate di un comune, usate come bias per la ricerca della via. */
export async function geocodeComune(
    nome: string,
    sigla: string,
    signal?: AbortSignal,
): Promise<Coordinates | null> {
    const features = await photon({ q: `${nome} ${sigla}`, osm_tag: 'place', limit: '5' }, signal)

    const place = features.find(f =>
        f.properties.countrycode === 'IT' &&
        ['city', 'town', 'village', 'municipality'].includes(f.properties.osm_value ?? ''),
    ) ?? features.find(f => f.properties.countrycode === 'IT')

    if (!place) return null
    const [lon, lat] = place.geometry.coordinates
    return { lat, lon }
}

/** Vie che corrispondono alla digitazione, ordinate per vicinanza al comune scelto. */
export async function searchStreets(
    query: string,
    near: Coordinates | null,
    signal?: AbortSignal,
): Promise<StreetSuggestion[]> {
    if (query.trim().length < 3) return []

    const params: Record<string, string> = { q: query, limit: '6' }
    if (near) {
        params.lat = near.lat.toString()
        params.lon = near.lon.toString()
    }

    const features = await photon(params, signal)
    const seen = new Set<string>()
    const results: StreetSuggestion[] = []

    for (const f of features) {
        const p = f.properties
        if (p.countrycode !== 'IT') continue

        const street = p.street ?? p.name
        if (!street) continue

        const key = `${street}|${p.housenumber ?? ''}|${p.city ?? ''}`
        if (seen.has(key)) continue
        seen.add(key)

        results.push({
            street,
            housenumber: p.housenumber ?? null,
            postcode: p.postcode ?? null,
            city: p.city ?? null,
            label: [
                [street, p.housenumber].filter(Boolean).join(' '),
                p.city,
            ].filter(Boolean).join(', '),
        })
    }

    return results
}
