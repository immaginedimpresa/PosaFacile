/** Feather inward: zero pixels must remain zero, including furniture holes. */
export function featherMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
    if (radius < 1) return mask

    // Sfocatura a box separabile: due passate lineari invece di una quadratica.
    const horizontal = new Uint8Array(mask.length)
    const win = radius * 2 + 1

    for (let y = 0; y < height; y++) {
        const row = y * width
        let sum = 0
        for (let x = -radius; x <= radius; x++) {
            sum += mask[row + Math.max(0, Math.min(width - 1, x))]
        }
        for (let x = 0; x < width; x++) {
            horizontal[row + x] = Math.round(sum / win)
            const out = Math.max(0, Math.min(width - 1, x - radius))
            const inn = Math.max(0, Math.min(width - 1, x + radius + 1))
            sum += mask[row + inn] - mask[row + out]
        }
    }

    const result = new Uint8Array(mask.length)
    for (let x = 0; x < width; x++) {
        let sum = 0
        for (let y = -radius; y <= radius; y++) {
            sum += horizontal[Math.max(0, Math.min(height - 1, y)) * width + x]
        }
        for (let y = 0; y < height; y++) {
            result[y * width + x] = Math.round(sum / win)
            const out = Math.max(0, Math.min(height - 1, y - radius))
            const inn = Math.max(0, Math.min(height - 1, y + radius + 1))
            sum += horizontal[inn * width + x] - horizontal[out * width + x]
        }
    }
    for (let i = 0; i < result.length; i++) result[i] = Math.min(mask[i], result[i])
    return result
}

/** Quanta parte della foto copre la maschera: serve a scartare risultati assurdi. */
export function maskCoverage(mask: Uint8Array): number {
    let covered = 0
    for (let i = 0; i < mask.length; i++) if (mask[i] > 127) covered++
    return covered / mask.length
}
