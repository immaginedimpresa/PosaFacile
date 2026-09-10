// Operazioni sui pixel che la libreria non offre, o offre male.
//
// `imagescript` sa ridimensionare in un modo solo:
//
//     if (mode === Image.RESIZE_NEAREST_NEIGHBOR) return this.__resize_nearest_neighbor__(...)
//     else throw new Error('Invalid resize mode')
//
// Nearest neighbour su una riduzione butta i pixel invece di mediarli. Su una
// foto di piastrelle è il caso peggiore possibile: le fughe sono righe sottili
// ad alto contrasto, cioè esattamente ciò che produce moiré quando lo si
// sottocampiona. Una foto da telefono a 4000 px scesa a 2000 usciva con la
// posa esistente ricamata di scalini.
//
// Il rimedio è quindici righe di media su area, e costa meno di trenta
// millisecondi su un lato 2000.

import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'

/**
 * Riduzione con media sull'area di provenienza.
 *
 * Ogni pixel di destinazione è la media dei pixel di origine che gli ricadono
 * dentro, quindi nessuna informazione viene scartata: è quello che fa un
 * filtro box, ed è il minimo accettabile per una riduzione.
 *
 * Per gli ingrandimenti non fa nulla di meglio del nearest neighbour, ma qui
 * non si ingrandisce mai.
 */
export function resizeBox(img: Image, width: number, height: number): Image {
    const W = img.width, H = img.height
    if (width === W && height === H) return img
    if (width > W || height > H) return img.resize(width, height)

    const out = new Image(width, height)
    const src = img.bitmap, dst = out.bitmap
    const sx = W / width, sy = H / height

    for (let y = 0; y < height; y++) {
        const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy))
        for (let x = 0; x < width; x++) {
            const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx))
            let r = 0, g = 0, b = 0, a = 0, n = 0
            for (let v = y0; v < y1; v++) {
                let p = (v * W + x0) * 4
                for (let u = x0; u < x1; u++, p += 4) {
                    r += src[p]; g += src[p + 1]; b += src[p + 2]; a += src[p + 3]; n++
                }
            }
            const q = (y * width + x) * 4
            dst[q] = r / n; dst[q + 1] = g / n; dst[q + 2] = b / n; dst[q + 3] = a / n
        }
    }
    return out
}

/**
 * Base64 → byte.
 *
 * `Uint8Array.from(atob(s), (c) => c.charCodeAt(0))` fa la stessa cosa in una
 * riga, ma chiama la funzione di trasformazione una volta per byte: misurato su
 * 5 MB, 266 ms contro 20. La differenza conta perché una Edge Function ha due
 * secondi di CPU per richiesta e questa conversione avviene tre volte.
 */
export function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

/** Byte → base64, a blocchi: `String.fromCharCode` con troppi argomenti fa saltare lo stack. */
export function bytesToBase64(bytes: Uint8Array): string {
    let binary = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    return btoa(binary)
}

/** Toglie il prefisso `data:image/...;base64,` e restituisce anche il tipo. */
export function parseDataUrl(value: string): { base64: string; mimeType: string } {
    return {
        base64: value.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: value.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg',
    }
}
