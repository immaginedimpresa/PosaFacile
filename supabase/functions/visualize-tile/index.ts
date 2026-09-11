// v2: original photo -> semantic surface masks -> plane geometry -> texture projection.
// The vision model NEVER sees the product. Only its pixels and numeric dimensions
// enter the deterministic renderer. No image generation, titles or descriptions.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { base64ToBytes, bytesToBase64, parseDataUrl, resizeBox } from './imageops.ts'
import { getVertexAccessToken, type ServiceAccount } from './vertex.ts'
import { getSurfaceRegions } from './mask.ts'
import { estimatePlanes } from './analysis.ts'
import { RoomCache } from './roomCache.ts'
import type { SurfacePlane } from './render.ts'
import { renderSurface } from './render.ts'
import { maskCoverage } from './maskMath.ts'
import { validateInput, tileFormatCm } from './request.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const MAX_EDGE = 1280
const roomCache = new RoomCache<SurfacePlane[]>()

function limitImage(image: Image, edge: number): Image {
    const k = Math.min(1, edge / Math.max(image.width, image.height))
    return resizeBox(image, Math.max(1, Math.round(image.width * k)), Math.max(1, Math.round(image.height * k)))
}

async function loadSample(value: string): Promise<Image> {
    if (value.startsWith('data:')) return await Image.decode(base64ToBytes(parseDataUrl(value).base64))
    const response = await fetch(value, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('Immagine della piastrella non raggiungibile.')
    if (Number(response.headers.get('content-length')) > 10 * 1024 * 1024) {
        await response.body?.cancel()
        throw new Error('Immagine della piastrella troppo grande.')
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Immagine della piastrella troppo grande.')
    return await Image.decode(bytes)
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ success: false, error: 'Metodo non consentito.' }, 405)
    try {
        const raw = await req.text()
        if (raw.length > 15 * 1024 * 1024) return json({ success: false, error: 'Immagini troppo grandi.' }, 413)
        const body = validateInput(JSON.parse(raw))
        // Select ONLY numeric measurements. Product text cannot enter any model request.
        let product: { format_width?: number; format_height?: number } | null = null
        if (body.productId) {
            const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
            if (url && key) {
                const { data, error } = await createClient(url, key).from('products')
                    .select('format_width, format_height').eq('id', body.productId).maybeSingle()
                if (error) throw new Error('Impossibile leggere il formato della piastrella.')
                product = data
            }
        }
        const format = tileFormatCm(product, body.tileWidth, body.tileHeight)
        const [decodedRoom, decodedSample] = await Promise.all([
            Image.decode(base64ToBytes(parseDataUrl(body.roomImage).base64)), loadSample(body.tileImage),
        ])
        const original = limitImage(decodedRoom, MAX_EDGE)
        const sample = limitImage(decodedSample, 1024)
        const secret = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
        if (!secret) throw new Error('Servizio anteprime non configurato.')
        const serviceAccount: ServiceAccount = JSON.parse(secret)
        const config = {
            accessToken: await getVertexAccessToken(serviceAccount),
            projectId: Deno.env.get('GOOGLE_CLOUD_PROJECT') || serviceAccount.project_id,
            region: Deno.env.get('VISUALIZER_VERTEX_REGION') || 'global',
        }
        if (!config.projectId) throw new Error('Progetto del servizio anteprime non configurato.')
        const model = Deno.env.get('VISUALIZER_VISION_MODEL') || 'gemini-2.5-flash'
        const roomBase64 = bytesToBase64(await original.encodeJPEG(92))
        const hashInput = `${config.projectId}|${config.region}|${model}|${body.surface}|${roomBase64}`
        const hash = bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput))))
        const planes = await roomCache.get(hash, async () => {
            const masks = await getSurfaceRegions(config, model, roomBase64, body.surface, original.width, original.height)
            const geometry = await estimatePlanes(config, model, original, roomBase64, masks, body.surface)
            return masks.map((mask, i) => ({ mask, geometry: geometry[i] }))
        })
        const output = renderSurface(original, sample, planes, format.w, format.h, body.layingPattern, body.tileScale)
        const payload: Record<string, unknown> = {
            success: true, image: `data:image/png;base64,${bytesToBase64(await output.encode())}`,
            renderer: 'projective-texture-v2', composited: true, width: output.width, height: output.height,
            scaleEstimated: true, note: 'Prospettiva e scala della stanza sono stimate dalla foto. Il formato della piastrella è quello selezionato.',
        }
        if (body.debug) {
            payload.geometry = planes.map(p => p.geometry)
            payload.coverage = planes.map(p => maskCoverage(p.mask))
            payload.masks = await Promise.all(planes.map(async ({ mask }) => {
                const image = new Image(original.width, original.height)
                for (let i = 0; i < mask.length; i++) {
                    image.bitmap[i * 4] = image.bitmap[i * 4 + 1] = image.bitmap[i * 4 + 2] = mask[i]
                    image.bitmap[i * 4 + 3] = 255
                }
                return `data:image/png;base64,${bytesToBase64(await image.encode())}`
            }))
        }
        return json(payload)
    } catch (error: unknown) {
        console.error('visualize-tile:', error instanceof Error ? error.message : 'unknown error')
        return json({ success: false, error: error instanceof Error ? error.message : 'Elaborazione non riuscita.' })
    }
})
