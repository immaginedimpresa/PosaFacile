// Ricomposizione del risultato sulla foto originale.
//
// Il modello restituisce un'immagine più piccola dell'originale (misurato:
// 1800x1350 in ingresso, 1184x864 in uscita) e leggermente ritagliata. Non è un
// re-inquadramento: è un riscalo uniforme più un ritaglio centrato, e come tale
// si può annullare.
//
// Annullato quello, si tiene la superficie generata e si rimette tutto il resto
// dall'originale, a piena risoluzione. Il risultato è che fuori dalla maschera i
// pixel sono identici per costruzione — non perché il modello sia stato bravo —
// e che non si perde metà della risoluzione della foto di partenza.

import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'

/** Trasformazione che porta un punto dell'originale sul corrispondente generato. */
export interface Alignment {
    scale: number
    ox: number
    oy: number
}

/** Luminanza a bassa risoluzione: basta per allineare, e costa poco. */
function grayPyramid(img: Image, targetWidth: number): { data: Float32Array; w: number; h: number } {
    const w = Math.max(32, Math.min(targetWidth, img.width))
    const h = Math.max(1, Math.round(img.height * w / img.width))
    const small = img.clone().resize(w, h)
    const data = new Float32Array(w * h)
    const bmp = small.bitmap
    for (let i = 0, p = 0; i < data.length; i++, p += 4) {
        data[i] = 0.299 * bmp[p] + 0.587 * bmp[p + 1] + 0.114 * bmp[p + 2]
    }
    return { data, w, h }
}

/**
 * Stima riscalo e scorrimento fra originale e generata.
 *
 * Il criterio è la differenza *fuori* dalla maschera: lì le due immagini
 * dovrebbero coincidere, quindi l'allineamento giusto è quello che le fa
 * coincidere meglio. Usare la zona sostituita avrebbe il difetto opposto —
 * è l'unica che deve essere diversa.
 *
 * La ricerca gira su miniature: a piena risoluzione costerebbe secondi per
 * ottenere gli stessi tre numeri.
 */
export function estimateAlignment(orig: Image, gen: Image, mask: Uint8Array | null): Alignment {
    const O = grayPyramid(orig, 220)
    const G = grayPyramid(gen, Math.round(220 * gen.width / orig.width))

    // La maschera è a dimensione originale: la si campiona alla scala della miniatura.
    const outside = (x: number, y: number): boolean => {
        if (!mask) return true
        const mx = Math.round(x * orig.width / O.w)
        const my = Math.round(y * orig.height / O.h)
        const idx = Math.min(mask.length - 1, my * orig.width + mx)
        return mask[idx] < 64
    }

    const baseScale = G.w / O.w
    let best: Alignment = { scale: baseScale, ox: 0, oy: 0 }
    let bestScore = Infinity

    for (let s = baseScale * 0.94; s <= baseScale * 1.07; s += baseScale * 0.005) {
        for (let dx = -6; dx <= 6; dx += 2) {
            for (let dy = -6; dy <= 6; dy += 2) {
                let sum = 0, n = 0
                // Campionamento rado: un punto ogni tre basta a scegliere fra
                // candidati, e taglia la ricerca di un ordine di grandezza.
                for (let y = 0; y < O.h; y += 3) {
                    for (let x = 0; x < O.w; x += 3) {
                        if (!outside(x, y)) continue
                        const gx = Math.round(x * s + dx)
                        const gy = Math.round(y * s + dy)
                        if (gx < 0 || gy < 0 || gx >= G.w || gy >= G.h) continue
                        sum += Math.abs(O.data[y * O.w + x] - G.data[gy * G.w + gx])
                        n++
                    }
                }
                // Un allineamento che fa combaciare pochissimi punti non è un
                // buon allineamento: è solo una finestra piccola.
                if (n < (O.w * O.h) / 9 * 0.5) continue
                const score = sum / n
                if (score < bestScore) {
                    bestScore = score
                    best = { scale: s, ox: dx, oy: dy }
                }
            }
        }
    }

    // I valori trovati vivono nello spazio delle miniature. Riportarli a quello
    // delle immagini piene è solo un cambio di unità:
    //   x_min = X * O.w / W          (originale piena → miniatura)
    //   gx_pieno = gx_min * gw / G.w (miniatura generata → generata piena)
    // da cui, sostituendo gx_min = x_min * s + dx:
    //   gx_pieno = X * (O.w * s * gw) / (W * G.w) + dx * gw / G.w
    const scale = (O.w * best.scale * gen.width) / (orig.width * G.w)
    const ox = best.ox * (gen.width / G.w)
    const oy = best.oy * (gen.height / G.h)

    const nominal = gen.width / orig.width
    console.log(
        `Allineamento: scala ${scale.toFixed(5)} (nominale ${nominal.toFixed(5)}), `
        + `scorrimento ${ox.toFixed(1)},${oy.toFixed(1)} px, residuo ${bestScore.toFixed(2)}/255`,
    )

    return { scale, ox, oy }
}

/** Campionamento bilineare della generata, in coordinate frazionarie. */
function sampleBilinear(bmp: Uint8ClampedArray, w: number, h: number, fx: number, fy: number, out: number[]): boolean {
    if (fx < 0 || fy < 0 || fx > w - 1 || fy > h - 1) return false
    const x0 = Math.floor(fx), y0 = Math.floor(fy)
    const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1)
    const tx = fx - x0, ty = fy - y0

    for (let c = 0; c < 3; c++) {
        const p00 = bmp[(y0 * w + x0) * 4 + c], p10 = bmp[(y0 * w + x1) * 4 + c]
        const p01 = bmp[(y1 * w + x0) * 4 + c], p11 = bmp[(y1 * w + x1) * 4 + c]
        out[c] = (p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty
    }
    return true
}

/**
 * Fonde la superficie generata dentro la foto originale.
 *
 * Dove la maschera vale 0 il pixel resta esattamente quello di partenza; dove
 * vale 255 è quello generato; in mezzo si mescolano, ed è la sfumatura che
 * nasconde il confine.
 */
export function compositeSurface(
    orig: Image,
    gen: Image,
    mask: Uint8Array,
    align: Alignment,
): Image {
    const result = orig.clone()
    const dst = result.bitmap
    const src = gen.bitmap
    const { width: W, height: H } = orig
    const sample: number[] = [0, 0, 0]

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const m = mask[y * W + x]
            if (m === 0) continue

            const fx = x * align.scale + align.ox
            const fy = y * align.scale + align.oy
            if (!sampleBilinear(src, gen.width, gen.height, fx, fy, sample)) continue

            const a = m / 255
            const p = (y * W + x) * 4
            dst[p] = dst[p] * (1 - a) + sample[0] * a
            dst[p + 1] = dst[p + 1] * (1 - a) + sample[1] * a
            dst[p + 2] = dst[p + 2] * (1 - a) + sample[2] * a
        }
    }
    return result
}
