// Formattazione dei valori che compaiono nelle email.
//
// I client di posta non eseguono `Intl` al momento della lettura: quello che
// spediamo è già testo definitivo. Quindi si formatta qui, una volta, in
// italiano, e si accetta che una data sbagliata resti sbagliata per sempre.

export const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

const MONTHS = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

const WEEKDAYS = [
    'domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato',
]

/** "12 marzo 2026". Restituisce null se la data manca o non è leggibile. */
export function formatDate(value: unknown): string | null {
    if (!value) return null
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return null
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "giovedì 12 marzo 2026": il giorno della settimana aiuta chi deve liberare casa. */
export function formatDateLong(value: unknown): string | null {
    if (!value) return null
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return null
    return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "€ 1.234,56". */
export function formatMoney(value: unknown): string | null {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return null
    const [int, dec] = n.toFixed(2).split('.')
    return `€ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}

/** "24,5 m²", senza decimali quando è un intero. */
export function formatSqm(value: unknown): string | null {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n <= 0) return null
    const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    return `${text.replace('.', ',')} m²`
}

/** "1 giornata" / "6,5 giornate". */
export function formatDays(value: unknown): string | null {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n <= 0) return null
    const text = Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
    return `${text} ${n === 1 ? 'giornata' : 'giornate'}`
}

/** Solo il nome di battesimo: "Ciao Marco," legge meglio di "Ciao Marco Rossi,". */
export function firstName(fullName: unknown): string | null {
    const name = String(fullName ?? '').trim()
    if (!name || name.includes('@')) return null
    return name.split(/\s+/)[0]
}

/** Indirizzo di posa su una riga, saltando i pezzi mancanti. */
export function formatAddress(address: unknown): string | null {
    if (!address || typeof address !== 'object') return null
    const a = address as Record<string, unknown>
    const street = [a.address, a.street, a.via].find(Boolean)
    // La provincia sta attaccata alla città, non separata da virgola:
    // "20851 Lissone (MB)", come si scrive su una busta.
    const locality = [
        [a.cap, a.city ?? a.citta].filter(Boolean).join(' '),
        a.provincia ? `(${a.provincia})` : null,
    ].filter(Boolean).join(' ')

    const line = [street, a.civico, locality].filter(Boolean).join(', ')
    return line || null
}

const LAYING_LABELS: Record<string, string> = {
    dritta: 'Posa dritta',
    diagonale: 'Posa in diagonale',
    spina_italiana: 'Spina italiana',
    spina_ungherese: 'Spina ungherese',
    cassero: 'Cassero irregolare',
    modulare: 'Posa modulare',
}

const PROJECT_LABELS: Record<string, string> = {
    bagno: 'Bagno',
    cucina: 'Cucina',
    soggiorno: 'Soggiorno',
    camera: 'Camera da letto',
    esterno: 'Esterno / Terrazzo',
    altro: 'Altro ambiente',
}

export const layingLabel = (key: unknown): string | null =>
    key ? (LAYING_LABELS[String(key)] ?? String(key)) : null

export const projectLabel = (key: unknown): string | null =>
    key ? (PROJECT_LABELS[String(key)] ?? String(key)) : null
