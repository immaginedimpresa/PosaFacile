type Point = [number, number]
/** Scanline rasterization: contour coordinates are normalized against the full image. */
function fill(mask: Uint8Array, points: unknown, width: number, height: number, value: number): void {
    if (!Array.isArray(points) || points.length < 3 || points.length > 500
        || !points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1000))) throw new Error('Contorno non valido.')
    const poly = points.map(([x, y]) => [x * width / 1000, y * height / 1000]) as Point[]
    for (let y = 0; y < height; y++) {
        const intersections: number[] = []
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const [xi, yi] = poly[i], [xj, yj] = poly[j]
            if ((yi > y + .5) !== (yj > y + .5)) intersections.push(xi + (y + .5 - yi) * (xj - xi) / (yj - yi))
        }
        intersections.sort((a, b) => a - b)
        for (let i = 0; i + 1 < intersections.length; i += 2) {
            const start = Math.max(0, Math.ceil(intersections[i] - .5)), end = Math.min(width, Math.ceil(intersections[i + 1] - .5))
            mask.fill(value, y * width + start, y * width + end)
        }
    }
}

export function polygonMasks(value: unknown, width: number, height: number): Uint8Array[] {
    const v = value as { planes?: { regions?: { outline?: unknown; holes?: unknown[] }[] }[] } | null
    if (!Array.isArray(v?.planes) || v.planes.length > 4) throw new Error('Superfici non valide.')
    return v.planes.map(plane => {
        if (!Array.isArray(plane.regions) || !plane.regions.length || plane.regions.length > 30) throw new Error('Regioni non valide.')
        const mask = new Uint8Array(width * height)
        for (const region of plane.regions) fill(mask, region.outline, width, height, 255)
        // Holes have priority, including when a second polygon overlaps them.
        for (const region of plane.regions) {
            if (!Array.isArray(region.holes) || region.holes.length > 100) throw new Error('Esclusioni non valide.')
            for (const hole of region.holes) fill(mask, hole, width, height, 0)
        }
        return mask
    })
}
