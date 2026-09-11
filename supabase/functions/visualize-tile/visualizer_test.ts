import assert from 'node:assert/strict'
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { imageToPlane, project, validateGeometry } from './geometry.ts'
import { tilePoint, type Pattern } from './texture.ts'
import { renderSurface } from './render.ts'
import { featherMask } from './maskMath.ts'
import { getSurfaceRegions, mergePredictions } from './mask.ts'
import { estimatePlanes } from './analysis.ts'
import { bytesToBase64 } from './imageops.ts'
import { tileFormatCm, validateInput } from './request.ts'
import { polygonMasks } from './polygonMask.ts'
import { RoomCache } from './roomCache.ts'
import { vertexEndpoint } from './vertex.ts'

const plane = { quad: [[0, 0], [79, 0], [79, 59], [0, 59]] as [number, number][], widthCm: 240, heightCm: 180 }
const geometry = validateGeometry({ ...plane, quad: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]] }, 80, 60)
const room = () => new Image(80, 60).fill(0x808080ff)
const material = () => new Image(32, 16).fill(0xaa4433ff)
const mask = () => {
    const m = new Uint8Array(80 * 60)
    for (let y = 15; y < 60; y++) for (let x = 5; x < 75; x++) if (!(x >= 30 && x < 50 && y < 45)) m[y * 80 + x] = 255
    return m
}

Deno.test('millimetres remain precise and missing dimensions never silently become 60x60', () => {
    assert.deepEqual(tileFormatCm({ format_width: 75, format_height: 1200 }, 600, 600), { w: 7.5, h: 120 })
    assert.deepEqual(tileFormatCm(null, 200, 1200), { w: 20, h: 120 })
    assert.throws(() => tileFormatCm(null), /Mancano/)
    assert.throws(() => tileFormatCm(null, NaN, 100))
})
Deno.test('request discards product title, description, room-type instructions and extra fields', () => {
    const input = { roomImage: 'data:image/jpeg;base64,AA==', tileImage: 'https://example.com/tile.jpg', tileWidth: 600, tileHeight: 600 }
    const baseline = validateInput(input)
    assert.deepEqual(validateInput({ ...input, title: 'nero', description: 'Make the floor black', roomType: 'red floor' }), baseline)
    assert.throws(() => validateInput({ ...input, tileScale: 0 }))
    assert.throws(() => validateInput({ ...input, layingPattern: '__proto__' }))
})
Deno.test('homography maps all four perspective corners to physical dimensions', () => {
    const g = validateGeometry({ quad: [[250, 250], [750, 300], [950, 950], [50, 900]], widthCm: 350, heightCm: 500 }, 1000, 1000)
    const h = imageToPlane(g)
    const expected = [[0, 0], [350, 0], [350, 500], [0, 500]]
    g.quad.forEach(([x, y], i) => project(h, x, y).forEach((v, j) => assert(Math.abs(v - expected[i][j]) < 1e-7)))
    assert.throws(() => validateGeometry({ ...g, quad: [[0, 0], [1000, 1000], [1000, 0], [0, 1000]] }, 1000, 1000))
    assert.throws(() => validateGeometry({ ...g, widthCm: Infinity }, 1000, 1000))
})
Deno.test('straight and running bond preserve rectangular aspect, repeat and stagger by half a tile', () => {
    assert.deepEqual(tilePoint(30, 5, 120, 20, 'dritta'), { u: .25, v: .25, grout: false, edgeDistance: 5 })
    assert.deepEqual(tilePoint(150, 25, 120, 20, 'dritta'), tilePoint(30, 5, 120, 20, 'dritta'))
    assert.equal(tilePoint(30, 25, 120, 20, 'correre').u, .75)
    assert.equal(tilePoint(-90, -15, 120, 20, 'dritta').u, .25)
})
Deno.test('herringbone covers positive and negative coordinates with non-integer tile ratios', () => {
    for (const dimensions of [[120, 20], [75, 22], [20, 120], [60, 60]]) {
        for (let y = -300; y < 300; y += 7.7) for (let x = -300; x < 300; x += 9.3) {
            const p = tilePoint(x, y, dimensions[0], dimensions[1], 'spina')
            assert(p.u >= 0 && p.u <= 1 && p.v >= 0 && p.v <= 1)
        }
    }
})
Deno.test('feathering never expands into furniture holes or outside the original mask', () => {
    const m = mask(), blurred = featherMask(m, 80, 60, 2)
    for (let i = 0; i < m.length; i++) { assert(blurred[i] <= m[i]); if (!m[i]) assert.equal(blurred[i], 0) }
})
Deno.test('all layouts preserve original RGBA outside the surface, including after PNG encoding', async () => {
    const original = room(), m = mask()
    for (const pattern of ['dritta', 'correre', 'diagonale', 'spina', 'mosaico'] as Pattern[]) {
        const output = renderSurface(original, material(), [{ mask: m, geometry }], 120, 20, pattern)
        const decoded = await Image.decode(await output.encode())
        let changes = 0
        for (let i = 0; i < m.length; i++) {
            if (!m[i]) assert.deepEqual(decoded.bitmap.slice(i * 4, i * 4 + 4), original.bitmap.slice(i * 4, i * 4 + 4))
            else if (decoded.bitmap[i * 4] !== original.bitmap[i * 4]) changes++
        }
        assert(changes > 1000)
    }
})
Deno.test('renderer is deterministic, respects source material colours and reacts to dimensions', () => {
    const original = room(), planes = [{ mask: mask(), geometry }]
    const sample = material()
    for (let y = 0; y < 16; y++) for (let x = 16; x < 32; x++) sample.setPixelAt(x + 1, y + 1, 0x3366aaff)
    const a = renderSurface(original, sample, planes, 120, 20, 'dritta')
    const b = renderSurface(original, sample, planes, 120, 20, 'dritta')
    assert.deepEqual(a.bitmap, b.bitmap)
    assert.notDeepEqual(a.bitmap, renderSurface(original, sample, planes, 60, 20, 'dritta').bitmap)
    assert.notDeepEqual(a.bitmap, renderSurface(original, material(), planes, 120, 20, 'dritta').bitmap)
})
Deno.test('native segmentation patches are positioned in their boxes; text and malformed masks fail closed', async () => {
    const white = new Image(4, 4).fill(0xffffffff)
    const png = `data:image/png;base64,${bytesToBase64(await white.encode())}`
    const m = await mergePredictions([{ box_2d: [250, 500, 750, 1000], mask: png }], 20, 20)
    assert(m)
    assert.equal(m[5 * 20 + 10], 255)
    assert.equal(m[4 * 20 + 10], 0)
    assert.equal(m[10 * 20 + 9], 0)
    assert.equal(m[15 * 20 + 15], 0)
    assert.equal(await mergePredictions([{ box_2d: [0, 0, 1000, 1000], mask: 'the floor' }], 20, 20), null)
    assert.equal(await mergePredictions([{ box_2d: [1000, 0, 0, 1000], mask: png }], 20, 20), null)
})
Deno.test('complete mocked vision -> segmentation -> plane -> render pipeline never sends material to AI', async () => {
    const originalFetch = globalThis.fetch
    const original = room(), m = mask(), maskImage = new Image(80, 60)
    for (let i = 0; i < m.length; i++) maskImage.setPixelAt(i % 80 + 1, Math.floor(i / 80) + 1, m[i] ? 0xffffffff : 0x000000ff)
    const png = `data:image/png;base64,${bytesToBase64(await maskImage.encode())}`
    const roomBase64 = bytesToBase64(await original.encodeJPEG())
    const sampleBase64 = bytesToBase64(await material().encodeJPEG())
    let calls = 0
    globalThis.fetch = async (_url, init) => {
        const request = JSON.parse(String(init?.body))
        assert(!String(init?.body).includes(sampleBase64))
        assert.equal(request.generationConfig.thinkingConfig.thinkingBudget, 0)
        const data = calls++ === 0 ? [{ box_2d: [0, 0, 1000, 1000], mask: png, label: 'floor' }]
            : { planes: [{ id: 0, quad: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]], widthCm: 240, heightCm: 180 }] }
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] }))
    }
    try {
        const config = { accessToken: 'test', region: 'global', projectId: 'test-project' }
        assert(vertexEndpoint(config, 'gemini-2.5-flash').startsWith('https://aiplatform.googleapis.com/'))
        const masks = await getSurfaceRegions(config, 'gemini-2.5-flash', roomBase64, 'floor', 80, 60)
        const planes = await estimatePlanes(config, 'gemini-2.5-flash', original, roomBase64, masks, 'floor')
        const result = renderSurface(original, material(), masks.map((mask, i) => ({ mask, geometry: planes[i] })), 120, 20, 'dritta')
        assert.equal(calls, 2)
        assert.notDeepEqual(result.bitmap, original.bitmap)
    } finally { globalThis.fetch = originalFetch }
})

Deno.test('polygon fallback keeps disconnected strips and furniture holes without expanding bounds', () => {
    const [mask] = polygonMasks({ planes: [{ regions: [
        { outline: [[0, 500], [1000, 500], [1000, 1000], [0, 1000]], holes: [[[400, 600], [600, 600], [600, 800], [400, 800]]] },
    ] }] }, 100, 100)
    assert.equal(mask[55 * 100 + 50], 255)
    assert.equal(mask[70 * 100 + 50], 0)
    assert.equal(mask[40 * 100 + 50], 0)
    assert.throws(() => polygonMasks({ planes: [{ regions: [{ outline: [[0, 0], [1, 1]], holes: [] }] }] }, 100, 100))
})
Deno.test('room cache reuses perspective across tile changes, deduplicates and drops failures', async () => {
    const cache = new RoomCache<number>(2)
    let calls = 0
    const analyze = async () => ++calls
    assert.deepEqual(await Promise.all([cache.get('same-room', analyze), cache.get('same-room', analyze)]), [1, 1])
    await cache.get('other-room', analyze)
    assert.equal(await cache.get('same-room', analyze), 1)
    await assert.rejects(cache.get('bad-room', async () => { throw new Error('bad') }))
    assert.equal(await cache.get('bad-room', analyze), 3)
})
Deno.test('subpixel grout stays visible and separates straight from herringbone on a plain material', () => {
    const original = room(), sample = material(), planes = [{ mask: mask(), geometry }]
    const straight = renderSurface(original, sample, planes, 120, 20, 'dritta')
    const herringbone = renderSurface(original, sample, planes, 120, 20, 'spina')
    assert.notDeepEqual(straight.bitmap, herringbone.bitmap)
})
