export const CSV_MAX_BYTES = 10 * 1024 * 1024
export const CSV_MAX_ROWS = 5000
export type CsvDelimiter = ',' | ';' | '\t' | '|'
export interface CsvRecord {
    line: number
    cells: string[]
}
export interface CsvDocument {
    headers: string[]
    rows: CsvRecord[]
    delimiter: CsvDelimiter
}

/** Decode common spreadsheet exports without losing Italian accents. */
export function decodeCsv(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    if (bytes[0] === 0xff && bytes[1] === 0xfe)
        return new TextDecoder('utf-16le').decode(bytes)
    if (bytes[0] === 0xfe && bytes[1] === 0xff)
        return new TextDecoder('utf-16be').decode(bytes)
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
        return new TextDecoder('windows-1252').decode(bytes)
    }
}

function detectDelimiter(text: string): CsvDelimiter {
    const candidates: CsvDelimiter[] = [';', ',', '\t', '|']
    const counts = candidates.map(() => [0])
    let quoted = false
    let row = 0
    for (let i = 0; i < text.length && row < 20; i++) {
        const char = text[i]
        if (char === '"') {
            if (quoted && text[i + 1] === '"') i++
            else quoted = !quoted
        } else if (!quoted) {
            if (char === '\n' || char === '\r') {
                if (char === '\r' && text[i + 1] === '\n') i++
                if (counts.some((list) => list[row] > 0)) {
                    row++
                    counts.forEach((list) => list.push(0))
                }
            } else
                candidates.forEach((candidate, index) => {
                    if (char === candidate) counts[index][row]++
                })
        }
    }
    let best: CsvDelimiter = ';'
    let bestScore = -1
    counts.forEach((list, index) => {
        if (!list[0]) return
        const score =
            list.filter((count) => count === list[0]).length * 100 + list[0]
        if (score > bestScore) {
            best = candidates[index]
            bestScore = score
        }
    })
    return best
}

/** RFC-style quoted fields, escaped quotes and embedded newlines; no split(','). */
export function parseCsv(
    source: string,
    delimiter?: CsvDelimiter,
    hasHeaders = true,
): CsvDocument {
    if (source.length > CSV_MAX_BYTES)
        throw new Error('Il file supera il limite di 10 MB.')
    let text = source.replace(/^\uFEFF/, '')
    if (text.includes('\0'))
        throw new Error('Il file non è un CSV testuale valido.')
    const separatorHint = text.match(/^sep=([;,\t|])\r?\n/i)
    let line = 1
    if (separatorHint) {
        text = text.slice(separatorHint[0].length)
        line++
    }
    const separator =
        delimiter ||
        (separatorHint?.[1] as CsvDelimiter | undefined) ||
        detectDelimiter(text)
    const records: CsvRecord[] = []
    let cells: string[] = []
    let cell = ''
    let quoted = false
    let closedQuote = false
    let startLine = line
    const pushCell = () => {
        cells.push(cell)
        if (cells.length > 100)
            throw new Error('Il CSV può contenere al massimo 100 colonne.')
        cell = ''
        closedQuote = false
    }
    const pushRecord = () => {
        pushCell()
        if (cells.some((value) => value.trim() !== ''))
            records.push({ line: startLine, cells })
        if (records.length > CSV_MAX_ROWS + (hasHeaders ? 1 : 0))
            throw new Error(
                `Importa al massimo ${CSV_MAX_ROWS} prodotti alla volta.`,
            )
        cells = []
    }
    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (quoted) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    cell += '"'
                    i++
                } else {
                    quoted = false
                    closedQuote = true
                }
            } else {
                cell += char
                if (char === '\n' || (char === '\r' && text[i + 1] !== '\n'))
                    line++
            }
        } else if (char === separator) pushCell()
        else if (char === '\r' || char === '\n') {
            pushRecord()
            if (char === '\r' && text[i + 1] === '\n') i++
            line++
            startLine = line
        } else if (closedQuote) {
            if (!/\s/.test(char))
                throw new Error(
                    `Riga ${line}: carattere inatteso dopo le virgolette.`,
                )
        } else if (char === '"') {
            if (cell.trim())
                throw new Error(
                    `Riga ${line}: virgolette non valide. Racchiudi l’intero valore tra virgolette.`,
                )
            cell = ''
            quoted = true
        } else cell += char
    }
    if (quoted)
        throw new Error(`Riga ${startLine}: manca la virgoletta di chiusura.`)
    pushRecord()
    if (!records.length) throw new Error('Il file è vuoto.')
    const headers = hasHeaders
        ? records
              .shift()!
              .cells.map((value, i) => value.trim() || `Colonna ${i + 1}`)
        : records[0].cells.map((_, i) => `Colonna ${i + 1}`)
    if (headers.length < 2)
        throw new Error(
            'È stata trovata una sola colonna. Controlla il separatore del file.',
        )
    if (!records.length)
        throw new Error('Il CSV contiene solo le intestazioni, senza prodotti.')
    return { headers, rows: records, delimiter: separator }
}

/** Quote every cell and neutralize formulas in downloadable spreadsheet reports. */
export function encodeCsv(rows: unknown[][]): string {
    return (
        '\uFEFF' +
        rows
            .map((row) =>
                row
                    .map((value) => {
                        let text = String(value ?? '')
                        if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text
                        return `"${text.replace(/"/g, '""')}"`
                    })
                    .join(';'),
            )
            .join('\r\n')
    )
}

export function downloadCsv(filename: string, rows: unknown[][]) {
    const url = URL.createObjectURL(
        new Blob([encodeCsv(rows)], { type: 'text/csv;charset=utf-8;' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
