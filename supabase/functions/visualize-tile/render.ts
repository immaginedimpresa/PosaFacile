import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { imageToPlane, project, type PlaneGeometry } from './geometry.ts'
import { tilePoint, type Pattern } from './texture.ts'
import { resizeBox } from './imageops.ts'
import { featherMask } from './maskMath.ts'

export interface SurfacePlane { mask: Uint8Array; geometry: PlaneGeometry }

/** Low-frequency, mask-normalized luminance. Does not copy old grout or floor colour.
 * Operates at 96px, keeping CPU and temporary memory bounded on Edge Functions. */
function illumination(original: Image, mask: Uint8Array): { data: Float32Array; w: number; h: number } {
    const w = 96, h = Math.max(1, Math.round(original.height / original.width * w))
    const sum = new Float32Array(w * h), weights = new Float32Array(w * h)
    const step = Math.max(1, Math.floor(original.width / w))
    let total = 0, count = 0
    for (let y = 0; y < original.height; y += step) for (let x = 0; x < original.width; x += step) {
        const i = y * original.width + x
        if (mask[i] < 128) continue
        const p = i * 4, b = original.bitmap
        const l = .2126 * b[p] + .7152 * b[p + 1] + .0722 * b[p + 2]
        const q = Math.min(h - 1, Math.floor(y * h / original.height)) * w + Math.min(w - 1, Math.floor(x * w / original.width))
        sum[q] += l; weights[q]++; total += l; count++
    }
    const mean = total / Math.max(1, count)
    const data = new Float32Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0, n = 0
        for (let yy = Math.max(0, y - 5); yy <= Math.min(h - 1, y + 5); yy++) {
            for (let xx = Math.max(0, x - 5); xx <= Math.min(w - 1, x + 5); xx++) { s += sum[yy * w + xx]; n += weights[yy * w + xx] }
        }
        data[y * w + x] = n ? Math.max(.45, Math.min(1.4, Math.pow((s / n + 8) / (mean + 8), .7))) : 1
    }
    return { data, w, h }
}

function sample(image: Image, u: number, v: number, c: number): number {
    const x = Math.max(0, Math.min(image.width - 1, u * (image.width - 1)))
    const y = Math.max(0, Math.min(image.height - 1, v * (image.height - 1)))
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
    const at = (xx: number, yy: number) => image.bitmap[(Math.min(image.height - 1, yy) * image.width + Math.min(image.width - 1, xx)) * 4 + c]
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy
}

/** Deterministic material projection. Outside all masks RGBA is copied verbatim. */
export function renderSurface(original: Image, material: Image, planes: SurfacePlane[], tileWidthCm: number, tileHeightCm: number, pattern: Pattern, scale = 1): Image {
    if (![tileWidthCm, tileHeightCm, scale].every(n => Number.isFinite(n) && n > 0)) throw new Error('Formato piastrella non valido.')
    const result = original.clone()
    const levels = [material]
    while (levels.at(-1)!.width > 2 && levels.at(-1)!.height > 2) {
        const last = levels.at(-1)!
        levels.push(resizeBox(last, Math.max(1, Math.floor(last.width / 2)), Math.max(1, Math.floor(last.height / 2))))
    }
    const W = original.width, H = original.height
    const tw = tileWidthCm * scale, th = tileHeightCm * scale
    const written = new Uint8Array(W * H)
    for (const { mask, geometry } of planes) {
        if (mask.length !== W * H) throw new Error('Maschera di dimensioni errate.')
        const transform = imageToPlane(geometry)
        const light = illumination(original, mask)
        const alpha = featherMask(mask, W, H, Math.max(1, Math.round(W / 700)))
        let covered = 0, invalid = 0
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x
            if (!alpha[i] || written[i]) continue
            covered++
            const [u, v] = project(transform, x, y)
            const [ux, vx] = project(transform, x + 1, y), [uy, vy] = project(transform, x, y + 1)
            const footprint = Math.max(Math.hypot(ux - u, vx - v), Math.hypot(uy - u, vy - v))
            // A horizon crossing inside the mask is a bad plane, not a strip to leave unchanged.
            if (!Number.isFinite(footprint) || Math.abs(u) > 100_000 || Math.abs(v) > 100_000 || footprint > 1000) { invalid++; continue }
            const level = Math.max(0, Math.min(levels.length - 1, Math.floor(Math.log2(Math.max(1, footprint * Math.max(material.width / tw, material.height / th))))))
            const texture = levels[level]
            const at = tilePoint(u, v, tw, th, pattern)
            const lx = Math.min(light.w - 1, x * light.w / W), ly = Math.min(light.h - 1, y * light.h / H)
            const ix = Math.floor(lx), iy = Math.floor(ly), fx = lx - ix, fy = ly - iy
            const l = (dx: number, dy: number) => light.data[Math.min(light.h - 1, iy + dy) * light.w + Math.min(light.w - 1, ix + dx)]
            const shade = (l(0, 0) * (1 - fx) + l(1, 0) * fx) * (1 - fy) + (l(0, 1) * (1 - fx) + l(1, 1) * fx) * fy
            // Integrate a thin grout line over the pixel footprint; keep visible joints
            // even when a 2 mm joint projects to less than one image pixel.
            const grout = footprint > Math.min(tw, th) / 2
                ? Math.min(.2, .2 / tw + .2 / th)
                : Math.max(0, Math.min(1, .5 + (.1 - at.edgeDistance) / Math.max(.001, footprint)))
            const a = alpha[i] / 255, p = i * 4
            for (let c = 0; c < 3; c++) {
                const value = (sample(texture, at.u, at.v, c) * (1 - grout) + 150 * grout) * shade
                result.bitmap[p + c] = original.bitmap[p + c] * (1 - a) + value * a
            }
            written[i] = 1
        }
        if (!covered || invalid / covered > .001) throw new Error('Prospettiva incerta sulla superficie. Prova una foto con più angoli visibili.')
    }
    return result
}
