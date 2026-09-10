// Anteprima AI: sostituisce il pavimento o la parete nella foto di una stanza.
//
// Tre input decidono il risultato, e sono tutti verificabili:
//   1. l'IMMAGINE del campione — come è fatto il materiale;
//   2. le MISURE del formato — quanto è grande una piastrella, quindi la scala;
//   3. il TIPO DI POSA scelto — come sono disposte.
//
// Nome, descrizione, materiale, colore e finitura del prodotto NON entrano nel
// prompt. Sono campi compilati a mano e possono essere sbagliati: nel catalogo
// attuale lo sono quasi tutti (un prodotto chiamato "Marmo Nero Marquina" ha
// come immagine listelli di granito grigio). Finché il testo era un input, il
// modello risolveva la contraddizione a caso, e con lo stesso prodotto rendeva
// un pavimento nero e una parete grigia. Adesso decide l'immagine, punto.
//
// La pipeline è in tre passaggi:
//   generazione → segmentazione della superficie → ricomposizione sull'originale
//
// L'ultimo passaggio è quello che garantisce il requisito "cambia solo la
// superficie scelta": fuori dalla maschera i pixel dell'originale non vengono
// nemmeno toccati. Prima ci si affidava al prompt, e il modello ogni tanto
// spostava i quadri o faceva sparire un tappeto.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts"

import { getSurfaceMask, featherMask, maskCoverage } from './mask.ts'
import { estimateAlignment, compositeSurface } from './composite.ts'
import { deriveChangeMask } from './changemask.ts'

// --- Configurazione Vertex AI ---
const REGION = "us-central1"
const PROJECT_ID = "gen-lang-client-0870482364"
// Modello con image output accessibile a questo progetto. `gemini-3-pro-image-preview`
// risponde 404 "Publisher model not found".
//
// Attenzione a come si verifica la disponibilità di un modello: una POST con corpo
// vuoto restituisce 400 "Empty instances" anche per modelli a cui il progetto NON ha
// accesso, perché l'errore arriva prima del controllo. Serve una richiesta vera.
// Con una richiesta vera, `image-segmentation-001` risponde 404 "is unavailable":
// su questo progetto un modello di segmentazione non c'è, ed è il motivo per cui la
// maschera si ricava dalle differenze (vedi changemask.ts) invece che chiederla.
const IMAGE_MODEL = "gemini-2.5-flash-image"

/**
 * Lato lungo massimo dell'immagine restituita.
 *
 * La ricomposizione lavora sull'originale, quindi il risultato può essere molto
 * più grande di quello che produce il modello (~1184x864). Il limite serve alla
 * memoria: una foto da telefono a 4000x3000 occupa 48 MB come bitmap, e nella
 * fusione ne servono due copie.
 */
const MAX_OUTPUT_EDGE = 2000

/** Sotto o sopra queste soglie la maschera è palesemente sbagliata e si scarta. */
const MIN_COVERAGE = 0.02
const MAX_COVERAGE = 0.92

interface RequestBody {
    roomImage: string
    tileImage: string
    surface?: 'floor' | 'wall'
    /** Solo per i log: non entra nel prompt. */
    tileName?: string
    productId?: string
    layingPattern: 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'
    roomType: 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno'
    /** Formato in millimetri, come nel catalogo. */
    tileWidth?: number
    tileHeight?: number
    /** Restituisce anche maschera e generata grezza, per ispezione. */
    debug?: boolean
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

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = ''
    // A blocchi: String.fromCharCode con centinaia di migliaia di argomenti
    // fa saltare lo stack.
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    return btoa(binary)
}

/**
 * Ritenta quando Vertex risponde 429.
 *
 * Il limite è per progetto, non per utente: bastano due persone che premono
 * "genera" nello stesso momento perché una delle due si veda restituire un
 * errore. Prima non c'era alcun ritentativo e l'errore arrivava dritto in
 * faccia al cliente.
 */
async function withRetry(fn: () => Promise<Response>, attempts = 3): Promise<Response> {
    let last: Response | null = null
    for (let i = 0; i < attempts; i++) {
        const resp = await fn()
        if (resp.status !== 429 && resp.status !== 503) return resp
        last = resp
        if (i < attempts - 1) {
            // Attesa crescente con un pizzico di casualità: due richieste
            // respinte insieme non devono ripresentarsi insieme.
            const wait = 900 * Math.pow(2, i) + Math.random() * 400
            console.warn(`Vertex ${resp.status}: ritento fra ${Math.round(wait)} ms`)
            await new Promise((r) => setTimeout(r, wait))
        }
    }
    return last!
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
    const response = await fetch(url)
    const bytes = new Uint8Array(await response.arrayBuffer())
    return {
        data: bytesToBase64(bytes),
        mimeType: (response.headers.get('content-type') || 'image/jpeg').split(';')[0]
    }
}

/**
 * Le misure del formato, in centimetri.
 *
 * `products.format_width/height` sono in millimetri (catalogo: 150-1200), e
 * anche il frontend passa quel campo così com'è. Il resto della funzione ragiona
 * in centimetri: la conversione avviene qui, in un punto solo, perché prima
 * esisteva un percorso in cui i millimetri finivano nel prompt come centimetri e
 * chiedevano piastrelle da "600x1200 cm".
 */
function tileFormatCm(product: any, bodyW?: number, bodyH?: number): { w: number; h: number } {
    const raw = [
        [Number(product?.format_width), Number(product?.format_height)],
        [Number(bodyW), Number(bodyH)],
    ].find(([w, h]) => Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0)

    if (!raw) return { w: 60, h: 60 }
    return { w: Math.round(raw[0] / 10), h: Math.round(raw[1] / 10) }
}

// --- Aspect ratio: il modello normalizza a 1:1 se non glielo diciamo ---

const SUPPORTED_RATIOS: [string, number][] = [
    ["9:16", 9 / 16], ["3:4", 3 / 4], ["4:5", 4 / 5], ["1:1", 1],
    ["5:4", 5 / 4], ["4:3", 4 / 3], ["3:2", 3 / 2], ["16:9", 16 / 9], ["21:9", 21 / 9],
]

function nearestAspectRatio(width: number, height: number): string | null {
    if (!height) return null
    const target = width / height
    let best = SUPPORTED_RATIOS[0]
    for (const r of SUPPORTED_RATIOS) {
        if (Math.abs(Math.log(r[1] / target)) < Math.abs(Math.log(best[1] / target))) best = r
    }
    return best[0]
}

/**
 * Il prompt di sostituzione.
 *
 * Il campione è una texture già "posata": mostra un suo schema, una sua
 * proporzione e le sue fughe. Senza separare in modo esplicito l'aspetto del
 * materiale dalla geometria della posa, il modello copia lo schema del campione
 * e ignora quello richiesto.
 */
function buildEditPrompt(
    surface: 'floor' | 'wall',
    roomLabel: string,
    pattern: string,
    w: number,
    h: number,
    thicknessMm: number | null,
): string {
    const surfaceLabel = surface === 'wall' ? 'wall surface' : 'floor surface'
    const otherSurfaces = surface === 'wall'
        ? 'floor, ceiling, furniture, sanitary ware, mirrors, doors, windows, objects'
        : 'walls, ceiling, furniture, rugs, doors, windows, objects'

    return `Photorealistic interior edit of the ${roomLabel} in the FIRST image.

THE TWO IMAGES HAVE DIFFERENT ROLES:
- FIRST image: the real photo to edit. Its perspective, framing and lighting are fixed.
- SECOND image: a photograph of the tile material. It is the ONLY source of truth for how the
  material looks: colour, tone, veining, grain, mottling and surface texture must be taken from
  this image and reproduced faithfully. Do not substitute any other material. If the material in
  the sample looks like grey stone, the result must be grey stone; if it looks like light oak,
  the result must be light oak.
  IGNORE completely the tile arrangement, the tile proportions, the grout width and the scale
  visible in the sample: it is a material photograph, not the layout to reproduce.

TASK: replace ONLY the ${surfaceLabel} of the ${roomLabel} with this material.

GEOMETRY OF THE NEW SURFACE (this, not what the sample shows):
- Tile size: ${w}x${h} cm, rendered at true scale relative to the room, so the number of tiles
  across the surface is physically correct for its real dimensions.${
        thicknessMm ? `\n- Tile thickness: ${thicknessMm} mm.` : ''}
- Layout: ${pattern}
- Grout lines: realistic width proportional to a ${w}x${h} cm tile, colour coherent with the material.
- The surface must follow the room's exact perspective and vanishing point, with tile scale
  decreasing correctly toward the background.
- Apply the new material across the WHOLE visible ${surfaceLabel}, including the parts currently
  covered by a different material, and make the change clearly visible even if the existing
  surface already resembles the sample.${surface === 'floor' ? `
- Rugs and carpets are NOT the floor. They stay exactly as they are, lying on top of the new
  tiles: do not retexture them, do not restyle them, do not remove them. The new tiles go on the
  bare floor visible around and beyond them. If a rug hides most of the room, still retile every
  visible strip of bare floor.` : `
- Skirting boards, door frames and window frames are NOT the wall: leave them as they are.`}

MATERIAL APPEARANCE: the SECOND image decides, and nothing else. Colour, veining and texture must
match it closely, with natural variation between tiles rather than the identical swatch repeated
on every tile. Judge how much light the surface reflects from the sample itself.

CRITICAL: everything except the ${surfaceLabel} must remain identical to the FIRST image —
${otherSurfaces}, framing and lighting are unchanged. Do not move, remove or restyle anything.
Do not crop or rotate the photo.

Output: the edited photo only, ultra-photorealistic, architectural visualization quality.`
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
        if (!serviceAccountStr) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT secret')
        const serviceAccount = JSON.parse(serviceAccountStr)

        const body: RequestBody = await req.json()

        const { roomImage, tileImage, tileName, productId, layingPattern, roomType, tileWidth, tileHeight } = body
        const surface = body.surface === 'wall' ? 'wall' : 'floor'
        if (!roomImage || !tileImage) throw new Error('Missing images')

        // --- Foto della stanza, a piena risoluzione ---
        const roomRaw = Uint8Array.from(
            atob(roomImage.replace(/^data:image\/\w+;base64,/, '')),
            (c) => c.charCodeAt(0),
        )
        let original = await Image.decode(roomRaw)
        if (Math.max(original.width, original.height) > MAX_OUTPUT_EDGE) {
            const k = MAX_OUTPUT_EDGE / Math.max(original.width, original.height)
            original = original.resize(Math.round(original.width * k), Math.round(original.height * k))
        }
        const roomMimeType = roomImage.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'
        // Si rimanda al modello la versione normalizzata, non l'originale: così
        // le coordinate della maschera e quelle della generata parlano della
        // stessa immagine.
        const roomBase64 = bytesToBase64(await original.encodeJPEG(92))

        // --- Campione ---
        let tileBase64: string, tileMimeType: string
        if (tileImage.startsWith('data:')) {
            tileBase64 = tileImage.replace(/^data:image\/\w+;base64,/, '')
            tileMimeType = tileImage.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'
        } else {
            const td = await urlToBase64(tileImage)
            tileBase64 = td.data; tileMimeType = td.mimeType
        }

        // --- Misure dal catalogo: solo quelle ---
        // Nome, materiale, finitura, colore e descrizione non vengono letti di
        // proposito. Sono i campi che possono essere sbagliati, e quando entrano
        // nel prompt vincono sull'immagine.
        let product: any = null
        if (productId) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
            if (supabaseUrl && serviceKey) {
                const db = createClient(supabaseUrl, serviceKey)
                const { data, error } = await db
                    .from('products')
                    .select('format_width, format_height, thickness')
                    .eq('id', productId)
                    .maybeSingle()
                if (error) console.error('Lettura misure prodotto fallita:', error.message)
                product = data
            }
        }

        const { w, h } = tileFormatCm(product, tileWidth, tileHeight)
        const thickness = Number(product?.thickness)
        const pattern = LAYING_PATTERN_PROMPTS[layingPattern] || LAYING_PATTERN_PROMPTS.dritta
        const roomLabel = ROOM_TYPE_EN[roomType] || 'room'

        console.log(
            `${surface} · ${w}x${h} cm · posa ${layingPattern} · `
            + `foto ${original.width}x${original.height}${tileName ? ` · ${tileName}` : ''}`,
        )

        const accessToken = await getVertexAccessToken(serviceAccount)

        // --- 1 e 2: generazione e segmentazione, in parallelo ---
        // Sono indipendenti: la maschera descrive la foto di partenza, non il
        // risultato. Farle insieme dimezza l'attesa.
        const aspectRatio = nearestAspectRatio(original.width, original.height)
        const editPrompt = buildEditPrompt(
            surface, roomLabel, pattern, w, h,
            Number.isFinite(thickness) && thickness > 0 ? thickness : null,
        )

        const generatePromise = (async (): Promise<Image> => {
            const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}`
                + `/locations/${REGION}/publishers/google/models/${IMAGE_MODEL}:generateContent`

            // Il modello a volte non restituisce nessuna immagine e chiude con
            // `IMAGE_RECITATION` o `SAFETY`: capita anche su foto di arredamento
            // del tutto innocue, ed è transitorio. Senza ritentativo l'utente si
            // vede un errore per una richiesta che al secondo colpo funziona.
            let lastReason = 'unknown'
            for (let attempt = 0; attempt < 3; attempt++) {
                const resp = await withRetry(() => fetch(endpoint, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: "user",
                            parts: [
                                { inlineData: { mimeType: roomMimeType, data: roomBase64 } },
                                { inlineData: { mimeType: tileMimeType, data: tileBase64 } },
                                { text: editPrompt },
                            ],
                        }],
                        generationConfig: {
                            responseModalities: ["IMAGE"],
                            // Un pizzico di varietà fra un tentativo e il successivo:
                            // ripetere identica una richiesta rifiutata la fa rifiutare
                            // di nuovo.
                            temperature: 0.2 + attempt * 0.15,
                            ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
                        },
                    }),
                }))

                if (!resp.ok) throw new Error(`Image generation failed: ${await resp.text()}`)
                const result = await resp.json()

                for (const part of result.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData?.data) {
                        return await Image.decode(
                            Uint8Array.from(atob(part.inlineData.data), (c) => c.charCodeAt(0)),
                        )
                    }
                }
                lastReason = result.candidates?.[0]?.finishReason || 'unknown'
                console.warn(`Nessuna immagine (finishReason: ${lastReason}), tentativo ${attempt + 1}/3`)
            }
            throw new Error(`${IMAGE_MODEL} non ha restituito un'immagine (finishReason: ${lastReason})`)
        })()

        // La maschera descrive la foto di partenza, non il risultato: si può
        // chiedere insieme alla generazione invece che dopo, e l'attesa non
        // raddoppia.
        const maskPromise = getSurfaceMask(
            accessToken, REGION, PROJECT_ID, roomBase64, surface,
            original.width, original.height,
        ).catch((err) => {
            console.error('Segmentazione in errore:', err instanceof Error ? err.message : err)
            return null
        })

        const [generated, rawMask] = await Promise.all([generatePromise, maskPromise])
        console.log(
            `Generata ${generated.width}x${generated.height}`
            + (rawMask ? '' : ', senza maschera'),
        )

        // --- 3: ricomposizione ---
        //
        // L'allineamento si stima due volte quando c'è una maschera: la prima
        // senza, per poter costruire la mappa delle differenze; la seconda
        // escludendo la superficie, che è l'unico modo di misurare uno
        // scostamento su ciò che dovrebbe coincidere.
        let alignment = estimateAlignment(original, generated, null)

        let mask: Uint8Array | null = rawMask
        let source = rawMask ? 'segmentazione' : null

        if (!mask) {
            const derived = deriveChangeMask(original, generated, alignment, surface)
            if (derived) {
                mask = derived.mask
                source = 'differenze'
                console.log(
                    `Maschera da differenze: ${(derived.coverage * 100).toFixed(1)}% della foto, `
                    + `${derived.discarded} macchie scartate fuori superficie`,
                )
            }
        }

        let output = generated
        let composited = false
        let note: string | null = null

        if (!mask) {
            note = 'superficie non individuata: restituita la generazione senza ricomposizione'
        } else {
            const coverage = maskCoverage(mask)
            if (coverage < MIN_COVERAGE || coverage > MAX_COVERAGE) {
                note = `area individuata implausibile (${(coverage * 100).toFixed(1)}% della foto): `
                    + 'restituita la generazione senza ricomposizione'
            } else {
                // Il raggio segue la dimensione dell'immagine: su una foto grande
                // due pixel di sfumatura non nascondono niente.
                const radius = Math.max(2, Math.round(Math.max(original.width, original.height) / 400))
                const feathered = featherMask(mask, original.width, original.height, radius)
                alignment = estimateAlignment(original, generated, feathered)
                output = compositeSurface(original, generated, feathered, alignment)
                composited = true
                console.log(
                    `Ricomposta (${source}): area al ${(coverage * 100).toFixed(1)}%, sfumatura ${radius}px, `
                    + `risoluzione ${output.width}x${output.height}`,
                )
            }
        }
        if (note) console.warn(note)

        const payload: Record<string, unknown> = {
            success: true,
            image: `data:image/jpeg;base64,${bytesToBase64(await output.encodeJPEG(92))}`,
            composited,
            width: output.width,
            height: output.height,
            note,
        }

        // In debug si restituiscono anche i passaggi intermedi: senza, capire
        // se ha sbagliato la generazione o la maschera è indovinare.
        if (body.debug) {
            payload.rawGenerated = `data:image/jpeg;base64,${bytesToBase64(await generated.encodeJPEG(88))}`
            if (mask) {
                const vis = new Image(original.width, original.height)
                for (let i = 0; i < mask.length; i++) {
                    const v = mask[i]
                    vis.bitmap[i * 4] = v
                    vis.bitmap[i * 4 + 1] = v
                    vis.bitmap[i * 4 + 2] = v
                    vis.bitmap[i * 4 + 3] = 255
                }
                payload.mask = `data:image/jpeg;base64,${bytesToBase64(await vis.encodeJPEG(80))}`
                payload.coverage = maskCoverage(mask)
                payload.maskSource = source
            }

        }

        return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error("visualize-tile Error:", error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
