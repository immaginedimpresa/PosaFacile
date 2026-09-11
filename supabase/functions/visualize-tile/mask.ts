// Surface masks are inferred from the ORIGINAL room, never from edited pixels.
import { polygonMasks } from './polygonMask.ts'
import { maskCoverage } from './maskMath.ts'
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { base64ToBytes } from './imageops.ts'
import { generateContent, parseJsonResponse, responseText, type VertexConfig } from './vertex.ts'

export interface MaskPrediction { box_2d: number[]; mask: string; label?: string }

/** Gemini PNG masks live INSIDE their normalized bounding box, not the full photo. */
export async function mergePredictions(predictions: unknown, width: number, height: number): Promise<Uint8Array | null> {
    if (!Array.isArray(predictions) || predictions.length === 0 || predictions.length > 30) return null
    const canvas = new Uint8Array(width * height)
    for (const prediction of predictions) {
        if (!prediction || !Array.isArray(prediction.box_2d) || prediction.box_2d.length !== 4
            || !prediction.box_2d.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1000)
            || typeof prediction.mask !== 'string' || !prediction.mask.startsWith('data:image/png;base64,')) return null
        const [y0, x0, y1, x1] = prediction.box_2d
        if (y1 <= y0 || x1 <= x0) return null
        let patch: Image
        try { patch = await Image.decode(base64ToBytes(prediction.mask.split(',')[1])) } catch { return null }
        const left = Math.floor(x0 * width / 1000), top = Math.floor(y0 * height / 1000)
        const right = Math.ceil(x1 * width / 1000), bottom = Math.ceil(y1 * height / 1000)
        // Bilinear interpolation of probabilities followed by a hard threshold avoids
        // translucent old tiles throughout the whole floor. Feather only at the edge.
        for (let y = top; y < bottom; y++) {
            const sy = Math.max(0, Math.min(patch.height - 1, (y - top + .5) * patch.height / (bottom - top) - .5))
            const iy = Math.floor(sy), fy = sy - iy
            for (let x = left; x < right; x++) {
                const sx = Math.max(0, Math.min(patch.width - 1, (x - left + .5) * patch.width / (right - left) - .5))
                const ix = Math.floor(sx), fx = sx - ix
                const at = (dx: number, dy: number) => patch.bitmap[(Math.min(patch.height - 1, iy + dy) * patch.width + Math.min(patch.width - 1, ix + dx)) * 4]
                const value = (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) + (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy
                if (value >= 128) canvas[y * width + x] = 255
            }
        }
    }
    return canvas
}

export async function getSurfaceRegions(config: VertexConfig, model: string, imageBase64: string, surface: 'floor' | 'wall', width: number, height: number): Promise<Uint8Array[]> {
    const target = surface === 'floor'
        ? 'all visible bare floor, including disconnected strips behind furniture. Exclude rugs, carpets, furniture and their legs, people, walls and skirting boards'
        : 'each distinct visible planar wall separately, one mask per wall with a descriptive position label. Exclude the floor, ceiling, skirting boards, windows, doors, mirrors, paintings, cabinets and furniture'
    const response = await generateContent(config, model, {
        contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: `Give the segmentation masks for ${target}. Preserve holes caused by objects occluding the surface. Shadows on the bare surface ARE part of it. Output a JSON list with box_2d in [ymin, xmin, ymax, xmax] normalized to 0-1000, mask as the base64 PNG probability map prefixed data:image/png;base64, and label. Each mask is cropped to its box_2d. Return [] if no requested surface is visible. Do not return bounding boxes without masks, prose, code or a repainted photograph.` },
        ] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    })
    let masks: Uint8Array[] = []
    try {
        const predictions = parseJsonResponse(responseText(response))
        if (surface === 'floor') {
            const mask = await mergePredictions(predictions, width, height)
            if (mask) masks = [mask]
        } else if (Array.isArray(predictions) && predictions.length <= 4) {
            const decoded = await Promise.all(predictions.map(p => mergePredictions([p], width, height)))
            if (decoded.every(m => m !== null)) masks = decoded as Uint8Array[]
        }
    } catch { /* malformed model output */ }
    // Some Vertex versions return textual mask tokens instead of usable PNGs.
    // Ask explicitly for vector contours in that case; never use edited-image differences.
    if (!masks.length) {
        const point = { type: 'ARRAY', items: { type: 'NUMBER' } }
        const polygon = { type: 'ARRAY', items: point }
        const contours = await generateContent(config, model, {
            contents: [{ role: 'user', parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: `Trace ${target}. Return precise visible surface polygons, using [x,y] points normalized to 0-1000 against the FULL photograph. Follow every boundary with enough vertices, especially around furniture legs. Do not use a bounding rectangle. For each physical plane list its disconnected visible regions, each with outline and holes (occluding objects strictly inside it). Holes must exclude furniture, rugs and objects. One plane for a floor; separate planes for differently oriented walls. Return planes: [] when uncertain. No base64 or image output.` },
            ] }],
            generationConfig: { temperature: 0, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json',
                responseSchema: { type: 'OBJECT', properties: { planes: { type: 'ARRAY', items: {
                    type: 'OBJECT', properties: { regions: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
                        outline: polygon, holes: { type: 'ARRAY', items: polygon },
                    }, required: ['outline', 'holes'] } } }, required: ['regions'],
                } } }, required: ['planes'] },
            },
        })
        try { masks = polygonMasks(parseJsonResponse(responseText(contours)), width, height) } catch { masks = [] }
        if (surface === 'floor' && masks.length > 1) {
            const merged = new Uint8Array(width * height)
            for (const mask of masks) for (let i = 0; i < merged.length; i++) merged[i] = Math.max(merged[i], mask[i])
            masks = [merged]
        }
    }
    const union = new Uint8Array(width * height)
    for (const mask of masks) for (let i = 0; i < union.length; i++) union[i] = Math.max(union[i], mask[i])
    if (!masks.length || masks.some(m => maskCoverage(m) < .002) || maskCoverage(union) < .005 || maskCoverage(union) > .95) {
        throw new Error('Non riesco a delimitare bene la superficie. Prova una foto più luminosa, con pavimento o parete ben visibili.')
    }
    return masks
}

