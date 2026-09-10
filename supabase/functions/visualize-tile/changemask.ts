// Maschera ricavata da ciò che il modello ha cambiato.
//
// È il ripiego di `getSurfaceMask`: su questo progetto Vertex nessun modello di
// segmentazione è invocabile (`image-segmentation-001` risponde 404 "is
// unavailable", i Gemini testuali restituiscono il riquadro ma non i pixel).
//
// L'idea: confrontare originale e generata dopo averle allineate. Dove il
// modello ha rifatto la superficie la differenza è enorme (misurato: 54/255 di
// media sul pavimento); dove ha sbavato è piccola e sparsa (2-6/255, macchie
// dello 0,4-4%). Una soglia separa i due regimi, e la pulizia morfologica più
// il filtro sulle componenti connesse butta via le macchie: restano solo le
// aree grandi e compatte, cioè la superficie.
//
// Limite noto, e va detto: un oggetto appoggiato SULLA superficie — un tappeto —
// forma una macchia grande e attaccata al pavimento, quindi sopravvive al
// filtro. Se il modello lo toglie, resta tolto. Per garantire anche quello
// serve una segmentazione vera.

import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import type { Alignment } from './composite.ts'

/** Lavorare a un quarto di lato basta: la maschera viene poi sfumata comunque. */
const SUBSAMPLE = 4

/**
 * Sotto questa differenza media il pixel è "uguale": rumore di ricompressione.
 * Tarata bassa di proposito. Un rovere che diventa nero supera qualunque soglia,
 * ma un rovere che diventa parquet a spina cambia poco come colore e molto come
 * disegno: con 26 spariva quasi tutto.
 */
const DIFF_THRESHOLD = 18

/**
 * Una componente più piccola di così non è una superficie, è una sbavatura.
 * Anche questa bassa: quando un tappeto copre quasi tutta la stanza, il
 * pavimento a vista sono strisce strette fra i mobili, e ognuna è una
 * componente per conto suo.
 */
const MIN_COMPONENT_RATIO = 0.004

export interface ChangeMaskResult {
    mask: Uint8Array
    coverage: number
    /** Quante macchie sono state scartate: utile a capire quanto ha sbavato. */
    discarded: number
}

export function deriveChangeMask(
    orig: Image,
    gen: Image,
    align: Alignment,
    surface: 'floor' | 'wall',
): ChangeMaskResult | null {
    const W = Math.max(1, Math.floor(orig.width / SUBSAMPLE))
    const H = Math.max(1, Math.floor(orig.height / SUBSAMPLE))
    const ob = orig.bitmap, gb = gen.bitmap

    // --- 1. mappa binaria delle differenze ---
    const changed = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const ox = x * SUBSAMPLE, oy = y * SUBSAMPLE
            const gx = Math.round(ox * align.scale + align.ox)
            const gy = Math.round(oy * align.scale + align.oy)
            if (gx < 0 || gy < 0 || gx >= gen.width || gy >= gen.height) continue

            const p = (oy * orig.width + ox) * 4
            const q = (gy * gen.width + gx) * 4
            const d = (Math.abs(ob[p] - gb[q]) + Math.abs(ob[p + 1] - gb[q + 1]) + Math.abs(ob[p + 2] - gb[q + 2])) / 3
            if (d > DIFF_THRESHOLD) changed[y * W + x] = 1
        }
    }

    // --- 2. chiusura morfologica: salda le aree vicine, non assottiglia ---
    //
    // Qui prima c'era anche un'apertura (erosione + dilatazione) per togliere i
    // puntini. Toglieva anche le strisce di pavimento larghe pochi pixel fra un
    // mobile e l'altro, che in una stanza arredata sono buona parte di quello
    // che si vede. I puntini li elimina già il filtro sulla dimensione delle
    // componenti, che non ha quel difetto.
    const closed = morph(morph(changed, W, H, 'dilate'), W, H, 'erode')

    // --- 3. componenti connesse, con il filtro di buon senso sulla posizione ---
    const labels = new Int32Array(W * H).fill(-1)
    const stack: number[] = []
    const keep = new Uint8Array(W * H)
    let discarded = 0
    let label = 0

    for (let start = 0; start < closed.length; start++) {
        if (closed[start] === 0 || labels[start] !== -1) continue

        const members: number[] = []
        let sumY = 0
        labels[start] = label
        stack.push(start)

        while (stack.length) {
            const idx = stack.pop()!
            members.push(idx)
            sumY += Math.floor(idx / W)
            const x = idx % W, y = Math.floor(idx / W)
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                const nx = x + dx, ny = y + dy
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
                const n = ny * W + nx
                if (closed[n] === 1 && labels[n] === -1) {
                    labels[n] = label
                    stack.push(n)
                }
            }
        }
        label++

        const ratio = members.length / (W * H)
        const centroidY = (sumY / members.length) / H
        // Un pavimento non ha il baricentro sul soffitto, e una parete non ce
        // l'ha sul pavimento. Serve a scartare le macchie lasciate dal modello
        // dove non doveva toccare.
        const plausibile = surface === 'floor' ? centroidY > 0.35 : centroidY < 0.75

        if (ratio >= MIN_COMPONENT_RATIO && plausibile) {
            for (const idx of members) keep[idx] = 1
        } else if (ratio >= MIN_COMPONENT_RATIO / 4) {
            discarded++
        }
    }

    let covered = 0
    for (let i = 0; i < keep.length; i++) if (keep[i]) covered++
    if (covered === 0) return null

    // --- 4. ritorno alla risoluzione piena ---
    const mask = new Uint8Array(orig.width * orig.height)
    for (let y = 0; y < orig.height; y++) {
        const sy = Math.min(H - 1, Math.floor(y / SUBSAMPLE))
        for (let x = 0; x < orig.width; x++) {
            const sx = Math.min(W - 1, Math.floor(x / SUBSAMPLE))
            mask[y * orig.width + x] = keep[sy * W + sx] ? 255 : 0
        }
    }

    return { mask, coverage: covered / (W * H), discarded }
}

/** Erosione o dilatazione con intorno a croce: separabile non serve, è 3x3. */
function morph(src: Uint8Array, W: number, H: number, op: 'erode' | 'dilate'): Uint8Array {
    const out = new Uint8Array(src.length)
    const wantAll = op === 'erode'

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let all = 1, any = 0
            for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                const nx = Math.max(0, Math.min(W - 1, x + dx))
                const ny = Math.max(0, Math.min(H - 1, y + dy))
                const v = src[ny * W + nx]
                if (v) any = 1; else all = 0
            }
            out[y * W + x] = wantAll ? all : any
        }
    }
    return out
}
