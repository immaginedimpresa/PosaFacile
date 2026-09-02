// Supabase Edge Function for AI Tile Visualization
// Singola chiamata a Vertex AI (gemini-2.5-flash-image): sostituisce il pavimento
// direttamente nella foto della stanza, senza maschera né inpainting separati.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// --- Configurazione Vertex AI ---
const REGION = "us-central1"
const PROJECT_ID = "gen-lang-client-0870482364"
// Unico modello con image output accessibile a questo progetto: i gemini-3.x-image
// sono elencati ma rispondono 404 "project does not have access", e non c'è nessun
// modello Imagen disponibile (verificato via publishers/google/models).
const IMAGE_MODEL = "gemini-2.5-flash-image"

interface RequestBody {
    roomImage: string
    tileImage: string
    tileName: string
    productId?: string
    layingPattern: 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'
    roomType: 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno'
    tileWidth?: number
    tileHeight?: number
}

const LAYING_PATTERN_PROMPTS: Record<string, string> = {
    dritta: 'straight grid pattern (grid layout), tiles perfectly aligned in orthogonal grid, continuous straight grout lines',
    diagonale: 'diagonal pattern (diamond layout), tiles rotated 45 degrees to walls, diamond-shaped grout grid',
    correre: 'running bond / brick offset pattern, tiles staggered 50% per row, no aligned vertical grout lines',
    spina: 'herringbone pattern, rectangular tiles arranged in L-shape at 90 degrees creating zigzag, precise herringbone geometry',
    mosaico: 'mosaic pattern, repeating geometric tile module with precise decorative pattern alignment',
}

const ROOM_TYPE_EN: Record<string, string> = {
    bagno: 'bathroom',
    cucina: 'kitchen',
    soggiorno: 'living room',
    camera: 'bedroom',
    esterno: 'outdoor terrace',
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Vertex AI Auth (Service Account JWT) ---

function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64Lines = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/[\n\r]/g, '')
    const str = atob(b64Lines)
    const buf = new ArrayBuffer(str.length)
    const bufView = new Uint8Array(buf)
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i)
    }
    return buf
}

async function getVertexAccessToken(serviceAccount: any): Promise<string> {
    const binaryKey = pemToArrayBuffer(serviceAccount.private_key)
    const key = await crypto.subtle.importKey(
        "pkcs8", binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        true, ["sign"]
    )
    const jwt = await create(
        { alg: "RS256", typ: "JWT" },
        {
            iss: serviceAccount.client_email,
            scope: "https://www.googleapis.com/auth/cloud-platform",
            aud: "https://oauth2.googleapis.com/token",
            exp: getNumericDate(60 * 60),
            iat: getNumericDate(0),
        },
        key
    )
    const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })
    if (!resp.ok) throw new Error(`Vertex auth failed: ${await resp.text()}`)
    return (await resp.json()).access_token
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i])
    return {
        data: btoa(binary),
        mimeType: (response.headers.get('content-type') || 'image/jpeg').split(';')[0]
    }
}

// --- Scheda tecnica della piastrella ---

const MATERIAL_EN: Record<string, string> = {
    gres: 'porcelain stoneware (gres porcellanato)',
    ceramic: 'glazed ceramic',
    cotto: 'terracotta (cotto)',
    natural_stone: 'natural stone',
}

const FINISH_EN: Record<string, string> = {
    matt: 'matt finish, low sheen, diffuse reflection',
    glossy: 'glossy polished finish, strong specular reflections',
    textured: 'textured / structured surface with tactile relief',
    lappato: 'lappato (semi-polished) finish, soft satin sheen',
}

const CATEGORY_EN: Record<string, string> = {
    floor: 'floor tile',
    wall: 'wall tile',
    outdoor: 'outdoor tile',
    mosaic: 'mosaic tile',
}

/**
 * products.format_width/height sono in millimetri (catalogo: 150-1200), mentre il
 * resto della funzione ragiona in centimetri. Converte, o null se il dato manca.
 */
function productFormatCm(product: any): { w: number; h: number } | null {
    const w = Number(product?.format_width), h = Number(product?.format_height)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
    return { w: Math.round(w / 10), h: Math.round(h / 10) }
}

/** Righe di specifica costruite dai dati reali del prodotto; i campi vuoti sono omessi. */
function buildTileSpec(product: any, fallbackName: string, fw?: number, fh?: number): string {
    const lines: string[] = []
    const add = (label: string, value?: string | null) => {
        if (value) lines.push(`- ${label}: ${value}`)
    }

    add('Product', product?.name || fallbackName)
    add('Type', CATEGORY_EN[product?.category] || null)
    add('Material', MATERIAL_EN[product?.material] || null)
    add('Surface finish', FINISH_EN[product?.finish] || null)

    const fmt = productFormatCm(product)
    const w = fmt?.w ?? fw
    const h = fmt?.h ?? fh
    if (w && h) add('Nominal tile format', `${w}x${h} cm`)
    if (product?.thickness) add('Thickness', `${product.thickness} mm`)

    if (product?.color_name || product?.color_hex) {
        add('Colour', [product.color_name, product.color_hex].filter(Boolean).join(' '))
    }
    if (Array.isArray(product?.style_tags) && product.style_tags.length) {
        add('Style', product.style_tags.join(', '))
    }
    if (Array.isArray(product?.certifications) && product.certifications.length) {
        add('Certifications', product.certifications.join(', '))
    }
    if (product?.description) {
        add('Manufacturer description', String(product.description).replace(/\s+/g, ' ').slice(0, 600))
    }

    return lines.join('\n')
}

// --- Aspect ratio: il modello normalizza a 1:1 se non glielo diciamo ---

const SUPPORTED_RATIOS: [string, number][] = [
    ["9:16", 9 / 16], ["3:4", 3 / 4], ["4:5", 4 / 5], ["1:1", 1],
    ["5:4", 5 / 4], ["4:3", 4 / 3], ["3:2", 3 / 2], ["16:9", 16 / 9], ["21:9", 21 / 9],
]

function getImageDimensions(base64: string): { width: number; height: number } | null {
    let bytes: Uint8Array
    try {
        const bin = atob(base64.slice(0, 65536))
        bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    } catch {
        return null
    }
    const view = new DataView(bytes.buffer)

    // PNG: IHDR width/height a offset 16
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes.length > 24) {
        return { width: view.getUint32(16), height: view.getUint32(20) }
    }

    // JPEG: cerca il marker SOF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
        let i = 2
        while (i + 9 < bytes.length) {
            if (bytes[i] !== 0xFF) { i++; continue }
            const marker = bytes[i + 1]
            if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
                return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) }
            }
            if (marker === 0xD8 || (marker >= 0xD0 && marker <= 0xD9)) { i += 2; continue }
            i += 2 + view.getUint16(i + 2)
        }
    }
    return null
}

function nearestAspectRatio(base64: string): string | null {
    const dim = getImageDimensions(base64)
    if (!dim || !dim.height) return null
    const target = dim.width / dim.height
    let best = SUPPORTED_RATIOS[0]
    for (const r of SUPPORTED_RATIOS) {
        if (Math.abs(Math.log(r[1] / target)) < Math.abs(Math.log(best[1] / target))) best = r
    }
    return best[0]
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        // --- Leggi secrets ---
        const serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
        if (!serviceAccountStr) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT secret')
        const serviceAccount = JSON.parse(serviceAccountStr)

        // --- Parse body ---
        const body: RequestBody = await req.json()
        const { roomImage, tileImage, tileName, productId, layingPattern, roomType, tileWidth, tileHeight } = body
        if (!roomImage || !tileImage) throw new Error('Missing images')

        // Prepara room image
        const roomBase64 = roomImage.replace(/^data:image\/\w+;base64,/, '')
        const roomMimeType = roomImage.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'

        // Prepara tile image
        let tileBase64: string, tileMimeType: string
        if (tileImage.startsWith('data:')) {
            tileBase64 = tileImage.replace(/^data:image\/\w+;base64,/, '')
            tileMimeType = tileImage.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'
        } else {
            const td = await urlToBase64(tileImage)
            tileBase64 = td.data; tileMimeType = td.mimeType
        }

        // Scheda tecnica dal DB: finitura, spessore e formato reali cambiano il risultato
        // molto più del solo nome commerciale.
        let product: any = null
        if (productId) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
            if (supabaseUrl && serviceKey) {
                const db = createClient(supabaseUrl, serviceKey)
                const { data, error } = await db
                    .from('products')
                    .select('name, sku, description, category, material, format_width, format_height, thickness, finish, color_name, color_hex, style_tags, certifications')
                    .eq('id', productId)
                    .maybeSingle()
                // Una scheda mancante non deve bloccare la generazione: si prosegue coi dati del body.
                if (error) console.error('Lettura scheda prodotto fallita:', error.message)
                product = data
            }
        }

        const pattern = LAYING_PATTERN_PROMPTS[layingPattern] || 'straight grid pattern'
        const roomLabel = ROOM_TYPE_EN[roomType] || 'room'
        const fmt = productFormatCm(product)
        const w = fmt?.w || tileWidth || 60
        const h = fmt?.h || tileHeight || 60
        const tileSpec = buildTileSpec(product, tileName, tileWidth, tileHeight)
        console.log(product ? `Scheda tecnica caricata per ${productId}` : 'Nessuna scheda tecnica: uso i dati della richiesta')

        const editPrompt = `Photorealistic interior edit of the ${roomLabel} in the FIRST image.
Replace ONLY the floor surface with the tile shown in the SECOND image ("${product?.name || tileName}").

TILE TECHNICAL DATA (render the material exactly as specified):
${tileSpec}

LAYING: ${pattern}. Lay the tiles at their true ${w}x${h} cm size relative to the room, so the number of tiles across the floor is physically correct for the room's dimensions.
The new floor must follow the room's exact perspective and vanishing point, with tile scale decreasing correctly toward the background.
Reproduce the material's optical behaviour from the technical data above: the surface finish drives how much light it reflects, and the colour, veining and texture must stay faithful to the SECOND image.
Realistic grout lines proportional to the tile format, natural lighting, soft contact shadows under furniture, reflections consistent with the original photo.
CRITICAL: everything except the floor must remain pixel-identical to the FIRST image — walls, ceiling, furniture, rugs, doors, windows, objects, framing and lighting are unchanged. Do not move, remove or restyle anything. Do not crop or rotate the photo.
Output: the edited photo only, ultra-photorealistic, architectural visualization quality.`

        console.log(`Editing floor with ${IMAGE_MODEL} (Vertex AI)...`)

        const accessToken = await getVertexAccessToken(serviceAccount)
        const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${IMAGE_MODEL}:generateContent`

        // Senza aspectRatio esplicito il modello restituisce sempre 1:1
        const aspectRatio = nearestAspectRatio(roomBase64)
        console.log(`Aspect ratio: ${aspectRatio ?? 'non rilevato (default modello)'}`)

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { inlineData: { mimeType: roomMimeType, data: roomBase64 } },
                    { inlineData: { mimeType: tileMimeType, data: tileBase64 } },
                    { text: editPrompt },
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                temperature: 0.2,
                ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
            }
        }

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!resp.ok) throw new Error(`Image generation failed: ${await resp.text()}`)
        const result = await resp.json()

        let finalImage: string | null = null
        for (const part of result.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || 'image/png'
                finalImage = `data:${mime};base64,${part.inlineData.data}`
                break
            }
        }
        if (!finalImage) {
            const reason = result.candidates?.[0]?.finishReason || 'unknown'
            throw new Error(`${IMAGE_MODEL} did not return an image (finishReason: ${reason})`)
        }
        console.log("Edit complete.")

        return new Response(
            JSON.stringify({ success: true, image: finalImage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error("visualize-tile Error:", error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
