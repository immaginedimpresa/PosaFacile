export type Pattern = 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'
export interface TilePoint { u: number; v: number; grout: boolean; edgeDistance: number }
const mod = (x: number, n: number) => ((x % n) + n) % n

/** Coordinates in centimetres -> coordinates inside the actual product image. */
export function tilePoint(x: number, y: number, width: number, height: number, pattern: Pattern, groutCm = .2): TilePoint {
    if (pattern === 'diagonale') [x, y] = [(x + y) * Math.SQRT1_2, (y - x) * Math.SQRT1_2]
    if (pattern === 'spina') {
        // Two rectangular tiles on lattice (S,S), (-L,L). Works with non-integer L/S.
        const L = Math.max(width, height), S = Math.min(width, height)
        const a0 = Math.floor((x + y) / (2 * S)), b0 = Math.floor((y - x) / (2 * L))
        const reach = Math.ceil(L / (2 * S)) + 2
        for (let a = a0 - reach; a <= a0 + reach; a++) {
            for (let b = b0 - 2; b <= b0 + 2; b++) {
                const px = x - (a * S - b * L), py = y - (a * S + b * L)
                if (px >= 0 && px < L && py >= 0 && py < S) {
                    const u = px / L, v = py / S
                    return { u: width >= height ? u : v, v: width >= height ? v : 1 - u, grout: Math.min(px, L - px, py, S - py) < groutCm / 2, edgeDistance: Math.min(px, L - px, py, S - py) }
                }
                const vx = px - L, vy = py - (S - L)
                if (vx >= 0 && vx < S && vy >= 0 && vy < L) {
                    const u = vy / L, v = 1 - vx / S
                    return { u: width >= height ? u : v, v: width >= height ? v : 1 - u, grout: Math.min(vx, S - vx, vy, L - vy) < groutCm / 2, edgeDistance: Math.min(vx, S - vx, vy, L - vy) }
                }
            }
        }
        throw new Error('Schema a spina non risolvibile per questo formato.')
    }
    const row = Math.floor(y / height)
    if (pattern === 'correre') x -= mod(row, 2) * width / 2
    const tx = mod(x, width), ty = mod(y, height)
    // For mosaic the image is the whole sheet; never invent smaller tesserae.
    return { u: tx / width, v: ty / height, grout: Math.min(tx, width - tx, ty, height - ty) < groutCm / 2, edgeDistance: Math.min(tx, width - tx, ty, height - ty) }
}
