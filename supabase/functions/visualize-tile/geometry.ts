/** Geometry only: no product names, descriptions or material inference. */
export type Point = [number, number]
export interface PlaneGeometry {
    /** Four corners of a rectangular reference area, clockwise, in image pixels. */
    quad: [Point, Point, Point, Point]
    widthCm: number
    heightCm: number
}
export type Homography = number[]

export function validateGeometry(value: unknown, width: number, height: number): PlaneGeometry {
    const p = value as { quad?: unknown; widthCm?: unknown; heightCm?: unknown } | null
    if (!p || !Array.isArray(p.quad) || p.quad.length !== 4
        || !p.quad.every(q => Array.isArray(q) && q.length === 2 && q.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1000))
        || typeof p.widthCm !== 'number' || !Number.isFinite(p.widthCm) || p.widthCm < 20 || p.widthCm > 5000
        || typeof p.heightCm !== 'number' || !Number.isFinite(p.heightCm) || p.heightCm < 20 || p.heightCm > 5000) {
        throw new Error('Prospettiva della superficie non riconosciuta. Prova una foto con più angoli della stanza visibili.')
    }
    const quad = p.quad.map(([x, y]) => [x * (width - 1) / 1000, y * (height - 1) / 1000]) as PlaneGeometry['quad']
    let sign = 0, area = 0
    for (let i = 0; i < 4; i++) {
        const a = quad[i], b = quad[(i + 1) % 4], c = quad[(i + 2) % 4]
        const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        if (Math.abs(cross) < 1 || (sign && Math.sign(cross) !== sign)) throw new Error('La prospettiva stimata non è valida. Prova un’altra foto.')
        sign = Math.sign(cross)
        area += a[0] * b[1] - b[0] * a[1]
    }
    if (Math.abs(area) / 2 < width * height * .005) throw new Error('Superficie troppo piccola per stimare la prospettiva.')
    return { quad, widthCm: p.widthCm, heightCm: p.heightCm }
}

/** Solve the 8-parameter projective transform using pivoted Gaussian elimination. */
export function imageToPlane(plane: PlaneGeometry): Homography {
    const dst: Point[] = [[0, 0], [plane.widthCm, 0], [plane.widthCm, plane.heightCm], [0, plane.heightCm]]
    const rows: number[][] = []
    plane.quad.forEach(([x, y], i) => {
        const [u, v] = dst[i]
        rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
        rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
    })
    for (let col = 0; col < 8; col++) {
        let pivot = col
        for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row
        if (Math.abs(rows[pivot][col]) < 1e-9) throw new Error('Prospettiva non risolvibile.')
        ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
        const scale = rows[col][col]
        for (let j = col; j <= 8; j++) rows[col][j] /= scale
        for (let row = 0; row < 8; row++) {
            if (row === col) continue
            const f = rows[row][col]
            for (let j = col; j <= 8; j++) rows[row][j] -= f * rows[col][j]
        }
    }
    return [...rows.map(row => row[8]), 1]
}

export function project(h: Homography, x: number, y: number): Point {
    const d = h[6] * x + h[7] * y + 1
    if (Math.abs(d) < 1e-8) return [NaN, NaN]
    return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d]
}
