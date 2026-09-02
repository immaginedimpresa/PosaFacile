/**
 * Elenco dei comuni italiani (fonte ISTAT), servito da /comuni.json.
 *
 * Sta in public/ e non nel bundle: mezzo megabyte non deve pesare sul primo
 * caricamento, e serve solo quando l'utente compila un indirizzo.
 *
 * È la fonte di verità per la sigla provincia: ricavarla dai risultati del
 * geocoder è inaffidabile (nomi tipo "Monza e della Brianza" o "Roma Capitale",
 * e in Valle d'Aosta il campo manca del tutto), ma è proprio la sigla a
 * determinare quali professionisti sono disponibili.
 */

export interface Comune {
    nome: string
    sigla: string
    regione: string
    cap: string
}

interface RawComune {
    n: string
    s: string
    r: string
    c: string
    p: number
}

let cache: Comune[] | null = null
let inFlight: Promise<Comune[]> | null = null

export async function loadComuni(): Promise<Comune[]> {
    if (cache) return cache
    // Più campi che digitano insieme non devono scaricare il file due volte.
    if (inFlight) return inFlight

    inFlight = fetch('/comuni.json')
        .then(res => {
            if (!res.ok) throw new Error(`Elenco comuni non disponibile (${res.status})`)
            return res.json() as Promise<RawComune[]>
        })
        .then(raw => {
            cache = raw.map(c => ({ nome: c.n, sigla: c.s, regione: c.r, cap: c.c }))
            return cache
        })
        .finally(() => { inFlight = null })

    return inFlight
}

/** Normalizza accenti e apostrofi così "Forli" trova "Forlì" e "L Aquila" trova "L'Aquila". */
function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * I comuni arrivano già ordinati per popolazione decrescente: a parità di
 * prefisso digitato, i centri maggiori vengono proposti per primi.
 */
export function searchComuni(comuni: Comune[], query: string, limit = 8): Comune[] {
    const q = normalize(query)
    if (q.length < 2) return []

    const startsWith: Comune[] = []
    const contains: Comune[] = []

    for (const c of comuni) {
        const nome = normalize(c.nome)
        if (nome.startsWith(q)) {
            startsWith.push(c)
            if (startsWith.length >= limit) break
        } else if (contains.length < limit && nome.includes(q)) {
            contains.push(c)
        }
    }

    return [...startsWith, ...contains].slice(0, limit)
}

/** Sigle delle province che appartengono alla stessa regione di quella indicata. */
export function provincesInSameRegion(comuni: Comune[], sigla: string): string[] {
    const regione = comuni.find(c => c.sigla === sigla)?.regione
    if (!regione) return []
    return [...new Set(comuni.filter(c => c.regione === regione).map(c => c.sigla))]
}
