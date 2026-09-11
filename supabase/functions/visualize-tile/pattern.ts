// Lo schema di posa, disegnato invece che chiesto a parole.
//
// Il problema che risolve. I campioni del catalogo non sono texture neutre:
// sono fotografie di una superficie GIÀ POSATA. "Marmo Nero Marquina" mostra
// otto colonne di listelli a correre; "Rovere Naturale" altrettante. Il prompt
// chiedeva al modello di ignorare quella disposizione e di seguire invece una
// frase inglese ("herringbone pattern, tiles at 90 degrees creating zigzag").
// È una gara fra pixel e parole, e la vincono i pixel: si sceglieva spina e
// usciva un correre, perché il correre era nell'immagine.
//
// La soluzione è togliere la posa dal campione anziché chiedere di ignorarla.
// Qui si ricostruisce una vista dall'alto della superficie finita:
//
//   1. si trovano le fughe del campione, e quindi le singole piastrelle;
//   2. si ributtano via quelle che contengono ancora un giunto dentro;
//   3. si ridisegna la superficie nello schema richiesto, alle proporzioni vere
//      del formato, stirando una piastrella del campione su ogni piastrella
//      nuova.
//
// Quello che esce va al modello al posto del campione. Il materiale è ancora
// quello del catalogo — sono i suoi pixel — ma la geometria adesso è quella
// scelta dal cliente, e non è più negoziabile.
//
// Costa fra 26 e 69 ms a 1024 px.

import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { resizeBox } from './imageops.ts'

export type Pattern = 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'

/** Oltre questo lato il campione non aggiunge dettaglio, aggiunge solo lavoro. */
const MAX_SAMPLE_EDGE = 800

// ---------- 1. le piastrelle dentro il campione ----------

type Px = Uint8ClampedArray
interface Cell { x: number; y: number; w: number; h: number }

function luminanceProfile(px: Px, W: number, H: number, axis: 'col' | 'row'): Float32Array {
    const n = axis === 'col' ? W : H
    const m = axis === 'col' ? H : W
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        let sum = 0
        for (let j = 0; j < m; j++) {
            const x = axis === 'col' ? i : j
            const y = axis === 'col' ? j : i
            const p = (y * W + x) * 4
            sum += 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2]
        }
        out[i] = sum / m
    }
    return out
}

/**
 * Le fughe come minimi del profilo di luminanza.
 *
 * Una fuga è una riga scura e continua: proiettata su un asse diventa un
 * avvallamento stretto sotto la media locale. Cerco quello, non i contorni
 * delle piastrelle, perché il contorno di una venatura somiglia a un bordo e
 * una fuga no.
 */
function groutLines(profile: Float32Array, soglia = 6): number[] {
    const n = profile.length
    if (n < 12) return []
    const win = Math.max(3, Math.round(n / 12))
    const lines: number[] = []

    for (let i = win; i < n - win; i++) {
        let around = 0
        for (let k = i - win; k <= i + win; k++) around += profile[k]
        around /= win * 2 + 1

        if (profile[i] < around - soglia
            && profile[i] <= profile[i - 1] && profile[i] <= profile[i + 1]) {
            const last = lines[lines.length - 1]
            // Due minimi attaccati sono la stessa fuga vista storta: tieni il più scuro.
            if (lines.length && i - last < 4) {
                if (profile[i] < profile[last]) lines[lines.length - 1] = i
            } else lines.push(i)
        }
    }
    return lines
}

/** Copia di un rettangolo, per poter riesaminare una cella da sola. */
function subImage(px: Px, W: number, c: Cell): Px {
    const out = new Uint8ClampedArray(c.w * c.h * 4)
    for (let y = 0; y < c.h; y++) {
        const src = ((c.y + y) * W + c.x) * 4
        out.set(px.subarray(src, src + c.w * 4), y * c.w * 4)
    }
    return out
}

export interface CellsResult {
    cells: Cell[]
    /** Falso quando non si è riconosciuta nessuna griglia: il campione fa da piastrella. */
    detected: boolean
    discarded: number
}

/**
 * Le celle del campione: i rettangoli fra due fughe consecutive.
 *
 * Ogni cella è UNA piastrella fotografata, e questo è il punto: il disegno non
 * ritaglia il materiale a caso, prende una cella e la stira sulla piastrella da
 * riempire. Così la scala del disegno resta quella vera, e due piastrelle
 * vicine sono due piastrelle diverse come in una posa reale.
 */
export function materialCells(px: Px, W: number, H: number): CellsResult {
    const cols = groutLines(luminanceProfile(px, W, H, 'col'))
    const rows = groutLines(luminanceProfile(px, W, H, 'row'))
    const xs = [0, ...cols, W]
    const ys = [0, ...rows, H]

    const cells: Cell[] = []
    for (let j = 0; j + 1 < ys.length; j++) {
        for (let i = 0; i + 1 < xs.length; i++) {
            const w = xs[i + 1] - xs[i], h = ys[j + 1] - ys[j]
            // Margine interno: una fuga sfuma, non è una riga netta.
            const mx = Math.max(1, Math.round(w * 0.08))
            const my = Math.max(1, Math.round(h * 0.08))
            const c = { x: xs[i] + mx, y: ys[j] + my, w: w - 2 * mx, h: h - 2 * my }
            // Sotto questa taglia è una scheggia fra due fughe vicine, non una piastrella.
            if (c.w >= W * 0.05 && c.h >= H * 0.05) cells.push(c)
        }
    }

    if (cells.length === 0) {
        // Nessuna griglia riconoscibile: campione a texture continua, oppure
        // una foto che non è una piastrella. Il campione intero fa da modulo:
        // sbagliato forse, ma non arbitrario.
        return { cells: [{ x: 0, y: 0, w: W, h: H }], detected: false, discarded: 0 }
    }

    // Scarta le celle che hanno ancora una fuga dentro.
    //
    // Capita sui campioni posati a correre: i giunti sono sfalsati, quindi una
    // riga rilevata attraversa una piastrella qui e un giunto due colonne più
    // in là. Una cella così contiene mezza piastrella e mezzo vicino, e stirata
    // stampa una riga scura in mezzo al gres.
    //
    // La soglia qui è più ALTA che per la griglia esterna, non più bassa. Una
    // soglia severa sembrava la scelta prudente e invece scartava tutto: dentro
    // una piastrella la venatura produce minimi locali in continuazione, e a
    // 2,5 nessuna cella su settantaquattro sopravviveva — il filtro cadeva
    // sempre nel ripiego e non filtrava niente. Un giunto vero è scuro quanto
    // quelli della griglia esterna, quindi si cerca quello. Misurato sui due
    // campioni del catalogo: a 10 restano 26 celle su 42 e 21 su 32, a 4 zero.
    const clean = cells.filter((c) => {
        const sub = subImage(px, W, c)
        return groutLines(luminanceProfile(sub, c.w, c.h, 'col'), 10).length === 0
            && groutLines(luminanceProfile(sub, c.w, c.h, 'row'), 10).length === 0
    })

    // Se ne restano quattro o meno la rilevazione è inaffidabile, e filtrare
    // toglierebbe varietà senza aggiungere pulizia.
    const discarded = cells.length - clean.length
    return clean.length > 4
        ? { cells: clean, detected: true, discarded }
        : { cells, detected: true, discarded: 0 }
}

// ---------- 2. disegno ----------

/**
 * Rumore deterministico.
 *
 * Due piastrelle vicine devono pescare celle diverse, ma la stessa richiesta
 * deve produrre lo stesso swatch: un'anteprima che cambia a ogni tentativo non
 * è confrontabile con la precedente.
 */
function hash(i: number, j: number): number {
    let h = (i * 73856093) ^ (j * 19349663)
    h = (h ^ (h >>> 13)) * 1274126177
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Bilineare: la cella viene stirata, quindi interpolare serve davvero. */
function sampleBilinear(px: Px, W: number, H: number, fx: number, fy: number, out: number[]): void {
    const x0 = Math.max(0, Math.min(W - 1, Math.floor(fx)))
    const y0 = Math.max(0, Math.min(H - 1, Math.floor(fy)))
    const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1)
    const tx = fx - x0, ty = fy - y0

    for (let c = 0; c < 3; c++) {
        const p00 = px[(y0 * W + x0) * 4 + c], p10 = px[(y0 * W + x1) * 4 + c]
        const p01 = px[(y1 * W + x0) * 4 + c], p11 = px[(y1 * W + x1) * 4 + c]
        out[c] = (p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty
    }
}

/**
 * Riempie una piastrella con una cella del campione, stirata a coprirla.
 *
 * Se la cella è verticale e la piastrella orizzontale (o viceversa) la cella
 * ruota di novanta gradi: un listello fotografato in piedi resta un listello
 * anche posato di traverso, non diventa un quadrato schiacciato.
 */
function fillTile(
    dst: Px, CW: number, CH: number,
    px: Px, W: number, H: number, cells: Cell[],
    x0: number, y0: number, tw: number, th: number,
    i: number, j: number,
): void {
    const cell = cells[Math.floor(hash(i, j) * cells.length) % cells.length]
    const flipU = hash(i + 31, j) > 0.5
    const flipV = hash(i, j + 57) > 0.5
    const rot = (cell.w >= cell.h) !== (tw >= th)

    const rgb = [0, 0, 0]
    const xs = Math.max(0, Math.floor(x0)), xe = Math.min(CW, Math.ceil(x0 + tw))
    const ys = Math.max(0, Math.floor(y0)), ye = Math.min(CH, Math.ceil(y0 + th))

    for (let y = ys; y < ye; y++) {
        for (let x = xs; x < xe; x++) {
            let u = (x - x0) / tw, v = (y - y0) / th   // 0..1 sulla piastrella nuova
            if (flipU) u = 1 - u
            if (flipV) v = 1 - v
            if (rot) { const t = u; u = v; v = 1 - t }
            sampleBilinear(px, W, H, cell.x + u * (cell.w - 1), cell.y + v * (cell.h - 1), rgb)
            const p = (y * CW + x) * 4
            dst[p] = rgb[0]; dst[p + 1] = rgb[1]; dst[p + 2] = rgb[2]; dst[p + 3] = 255
        }
    }
}

export interface SwatchResult {
    image: Image
    cells: number
    detected: boolean
    discarded: number
}

/**
 * La vista dall'alto della superficie finita.
 *
 * `longCm` e `shortCm` sono il formato reale: decidono le proporzioni della
 * piastrella disegnata, quindi un 20x120 esce come un listello e non come una
 * mattonella. È l'unico punto in cui le misure del catalogo diventano geometria
 * anziché una frase nel prompt.
 */
export function buildPatternSwatch(
    sample: Image,
    pattern: Pattern,
    longCm: number,
    shortCm: number,
    size = 1024,
): SwatchResult {
    const src = Math.max(sample.width, sample.height) > MAX_SAMPLE_EDGE
        ? resizeBox(sample,
            Math.round(sample.width * MAX_SAMPLE_EDGE / Math.max(sample.width, sample.height)),
            Math.round(sample.height * MAX_SAMPLE_EDGE / Math.max(sample.width, sample.height)))
        : sample

    const px = src.bitmap, W = src.width, H = src.height
    const { cells, detected, discarded } = materialCells(px, W, H)

    // Colore della fuga: la media del materiale, scurita. Un grigio scelto a
    // tavolino stonerebbe su metà del catalogo.
    let r = 0, g = 0, b = 0, n = 0
    for (const c of cells) {
        for (let y = c.y; y < c.y + c.h; y += 3) {
            for (let x = c.x; x < c.x + c.w; x += 3) {
                const p = (y * W + x) * 4
                r += px[p]; g += px[p + 1]; b += px[p + 2]; n++
            }
        }
    }
    const grout = [r / n * 0.72, g / n * 0.72, b / n * 0.72]

    // La diagonale si disegna dritta su una tela più grande e poi si ruota:
    // servono gli angoli, altrimenti dopo la rotazione restano vuoti.
    const isDiag = pattern === 'diagonale'
    const CW = isDiag ? Math.round(size * 1.5) : size
    const CH = CW

    // Circa cinque piastrelle sul lato lungo: abbastanza da leggere lo schema
    // senza che il singolo pezzo diventi un francobollo.
    const L = Math.round(CW / 5)
    const S = Math.max(6, Math.round(L * (shortCm / longCm)))
    const gw = Math.max(2, Math.round(L * 0.008))

    const canvas = new Uint8ClampedArray(CW * CH * 4)
    for (let i = 0; i < CW * CH; i++) {
        canvas[i * 4] = grout[0]; canvas[i * 4 + 1] = grout[1]
        canvas[i * 4 + 2] = grout[2]; canvas[i * 4 + 3] = 255
    }

    const put = (x: number, y: number, w: number, h: number, i: number, j: number) =>
        fillTile(canvas, CW, CH, px, W, H, cells, x, y, w, h, i, j)

    if (pattern === 'spina') {
        // Motivo di due piastrelle — una orizzontale in (0,0), una verticale in
        // (L, S-L) — su reticolo t1 = (S,S), t2 = (-L,L).
        //
        // Il determinante del reticolo è 2·L·S, cioè esattamente l'area delle
        // due piastrelle: è la condizione perché la spina copra il piano senza
        // buchi e senza sovrapposizioni, per qualunque formato.
        const N = Math.ceil((CW + CH) / Math.min(L, S)) + 4
        for (let a = -N; a <= N; a++) {
            for (let b = -N; b <= N; b++) {
                const ox = a * S - b * L, oy = a * S + b * L
                if (ox < -L - S || ox > CW + L + S || oy < -L - S || oy > CH + L + S) continue
                put(ox + gw / 2, oy + gw / 2, L - gw, S - gw, a, b)
                put(ox + L + gw / 2, oy + S - L + gw / 2, S - gw, L - gw, a + 500, b)
            }
        }
    } else if (pattern === 'mosaico') {
        // Il modulo del mosaico è già nel campione: qui si posano i fogli, e il
        // foglio intero è il campione intero.
        const sheet = Math.round(CW / 4)
        const whole = [{ x: 0, y: 0, w: W, h: H }]
        for (let j = -1; j * sheet < CH + sheet; j++) {
            for (let i = -1; i * sheet < CW + sheet; i++) {
                fillTile(canvas, CW, CH, px, W, H, whole,
                    i * sheet + gw / 2, j * sheet + gw / 2, sheet - gw, sheet - gw, i, j)
            }
        }
    } else {
        // Dritta, correre e diagonale condividono la griglia: cambia lo
        // sfalsamento fra le file, e la diagonale ruota alla fine.
        const stagger = pattern === 'correre' ? 0.5 : 0
        for (let j = -1; j * (S + gw) < CH + S; j++) {
            const off = ((j % 2) + 2) % 2 === 1 ? stagger * (L + gw) : 0
            for (let i = -2; i * (L + gw) < CW + L; i++) {
                put(i * (L + gw) + off + gw / 2, j * (S + gw) + gw / 2, L - gw, S - gw, i, j)
            }
        }
    }

    const image = new Image(isDiag ? size : CW, isDiag ? size : CH)

    if (!isDiag) {
        image.bitmap.set(canvas)
        return { image, cells: cells.length, detected, discarded }
    }

    // Quarantacinque gradi: la posa diagonale è la griglia dritta girata.
    const out = image.bitmap
    const k = Math.SQRT1_2
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - size / 2, dy = y - size / 2
            // Il quadrato ruotato sta dentro la tela larga 1.5×: gli angoli
            // cadono a 0.707·size dal centro contro un mezzo lato di 0.75·size.
            // Il taglio serve solo a non uscire dall'array se quei numeri cambiano.
            const sx = Math.max(0, Math.min(CW - 1, Math.round(dx * k - dy * k + CW / 2)))
            const sy = Math.max(0, Math.min(CH - 1, Math.round(dx * k + dy * k + CH / 2)))
            const q = (y * size + x) * 4
            const p = (sy * CW + sx) * 4
            out[q] = canvas[p]; out[q + 1] = canvas[p + 1]; out[q + 2] = canvas[p + 2]; out[q + 3] = 255
        }
    }
    return { image, cells: cells.length, detected, discarded }
}
