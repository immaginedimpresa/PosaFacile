// Anteprima AI: sostituisce il pavimento o la parete nella foto di una stanza.
//
// Tre input decidono il risultato, e sono tutti verificabili:
//   1. l'IMMAGINE del campione — come è fatto il materiale;
//   2. le MISURE del formato — quanto è grande una piastrella, quindi la scala;
//   3. il TIPO DI POSA scelto — come sono disposte.
//
// Nessun testo del prodotto entra nel prompt: né nome, né descrizione, né
// materiale, colore o finitura. Sono campi compilati a mano e possono essere
// sbagliati: nel catalogo attuale lo sono quasi tutti (un prodotto chiamato
// "Marmo Nero Marquina" ha come immagine listelli di granito grigio). Finché il
// testo era un input, il modello risolveva la contraddizione a caso, e con lo
// stesso prodotto rendeva un pavimento nero e una parete grigia.
//
// La garanzia non è affidata al prompt ma alla forma dei dati: la query al
// catalogo chiede tre colonne numeriche e basta (vedi più sotto), quindi il
// testo non arriva nemmeno a questo processo. Chi in futuro volesse rimetterlo
// dentro dovrebbe allargare quella `select`, che è un gesto visibile.
//
// Per lo stesso motivo è uscito dal prompt anche il tipo di ambiente: è una
// scelta a tendina che può contraddire la foto — nel configuratore vale sempre
// "soggiorno" — e la stanza si vede benissimo nella foto stessa.
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
import { buildPatternSwatch, type Pattern } from './pattern.ts'
import { resizeBox, base64ToBytes, bytesToBase64, parseDataUrl } from './imageops.ts'

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
    productId?: string
    layingPattern: 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'
    /** Solo per i log: non entra nel prompt, la stanza si vede nella foto. */
    roomType?: 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno'
    /** Formato in millimetri, come nel catalogo. */
    tileWidth?: number
    tileHeight?: number
    /** Restituisce anche maschera e generata grezza, per ispezione. */
    debug?: boolean
}

/**
 * Il nome dello schema, in inglese, per una riga sola del prompt.
 *
 * Prima qui c'era un paragrafo per schema che descriveva la geometria a parole
 * ("rectangular tiles arranged in L-shape at 90 degrees creating zigzag").
 * Adesso la geometria è disegnata nello swatch e il modello la vede: la parola
 * serve solo a dargli il nome di quello che sta guardando.
 */
const PATTERN_NAME: Record<string, string> = {
    dritta: 'straight grid',
    diagonale: 'diagonal (diamond)',
    correre: 'running bond',
    spina: 'herringbone',
    mosaico: 'mosaic sheets',
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

/** Scarica un'immagine come byte: da qui viene decodificata, non rispedita. */
async function fetchBytes(url: string): Promise<Uint8Array> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Immagine della piastrella non raggiungibile (${response.status})`)
    return new Uint8Array(await response.arrayBuffer())
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

// L'elenco completo di quelli che il modello accetta. `2:3` mancava, e non e'
// un dettaglio: e' il taglio di una foto scattata in verticale col telefono,
// cioe' il caso piu' frequente. Senza, la piu' vicina risultava 3:4, il modello
// re-inquadrava, e l'allineamento doveva rimediare a uno scarto che non
// avrebbe dovuto esserci.
const SUPPORTED_RATIOS: [string, number][] = [
    ["9:16", 9 / 16], ["2:3", 2 / 3], ["3:4", 3 / 4], ["4:5", 4 / 5], ["1:1", 1],
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
 * La seconda immagine non è più la foto del campione: è la vista dall'alto
 * della superficie finita, ricostruita da noi (vedi pattern.ts). Cambia il modo
 * di chiedere. Prima si diceva "riproduci questo materiale ma IGNORA la
 * disposizione che vedi", che è una richiesta contraddittoria e infatti veniva
 * disattesa. Adesso si dice "riproduci questa superficie", e basta: materiale e
 * geometria nell'immagine coincidono già con quello che vogliamo.
 */
function buildEditPrompt(
    surface: 'floor' | 'wall',
    patternName: string,
    w: number,
    h: number,
    thicknessMm: number | null,
): string {
    const surfaceLabel = surface === 'wall' ? 'wall surface' : 'floor surface'
    const otherSurfaces = surface === 'wall'
        ? 'floor, ceiling, furniture, sanitary ware, mirrors, doors, windows, objects'
        : 'walls, ceiling, furniture, rugs, doors, windows, objects'

    return `Photorealistic interior edit of the room in the FIRST image.

THE TWO IMAGES HAVE DIFFERENT ROLES:
- FIRST image: the real photo to edit. Its perspective, framing and lighting are fixed.
- SECOND image: a flat, straight-on view of the finished surface, seen from directly above with
  no perspective. This is the surface to lay. Reproduce it faithfully — its material (colour,
  tone, veining, grain, texture), its tile shape, its ${patternName} layout and its grout lines —
  the only thing you change is the viewpoint: it must be seen in the room's perspective instead
  of from above.

TASK: replace ONLY the ${surfaceLabel} of the room with the surface in the SECOND image.

HOW THE NEW SURFACE MUST SIT IN THE ROOM:
- Real tile size: ${w}x${h} cm. Render at true scale, so the number of tiles across the surface
  is physically correct for its real dimensions.${
        thicknessMm ? `\n- Tile thickness: ${thicknessMm} mm.` : ''}
- Keep the ${patternName} layout of the SECOND image exactly: same arrangement, same tile
  proportions, same grout lines. Do not substitute a different layout, and do not straighten,
  rotate or simplify it.
- Follow the room's exact perspective and vanishing point, with tile scale decreasing correctly
  toward the background.
- Apply it across the WHOLE visible ${surfaceLabel}, including the parts currently covered by a
  different material, and make the change clearly visible even if the existing surface already
  resembles the new one.${surface === 'floor' ? `
- Rugs and carpets are NOT the floor. They stay exactly as they are, lying on top of the new
  tiles: do not retexture them, do not restyle them, do not remove them. The new tiles go on the
  bare floor visible around and beyond them. If a rug hides most of the room, still retile every
  visible strip of bare floor.` : `
- Skirting boards, door frames and window frames are NOT the wall: leave them as they are.`}

MATERIAL: the SECOND image decides, and nothing else. Do not substitute any other material. If it
looks like grey stone, the result must be grey stone; if it looks like light oak, the result must
be light oak. Judge how much light the surface reflects from that image too. Relight it to match
the room's own light, keeping the tile-to-tile variation it already shows.

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

        const { roomImage, tileImage, productId, layingPattern, roomType, tileWidth, tileHeight } = body
        const surface = body.surface === 'wall' ? 'wall' : 'floor'
        if (!roomImage || !tileImage) throw new Error('Missing images')

        // --- Foto della stanza, a piena risoluzione ---
        const room = parseDataUrl(roomImage)
        let original = await Image.decode(base64ToBytes(room.base64))
        if (Math.max(original.width, original.height) > MAX_OUTPUT_EDGE) {
            const k = MAX_OUTPUT_EDGE / Math.max(original.width, original.height)
            // Media sull'area, non nearest neighbour: ridurre una foto di
            // piastrelle scartando pixel invece che mediandoli produce moiré
            // proprio sulle fughe (vedi imageops.ts).
            original = resizeBox(original,
                Math.round(original.width * k), Math.round(original.height * k))
        }
        // Si rimanda al modello la versione normalizzata, non l'originale: così
        // le coordinate della maschera e quelle della generata parlano della
        // stessa immagine.
        const roomBase64 = bytesToBase64(await original.encodeJPEG(92))

        // --- Campione ---
        const sample = await Image.decode(
            tileImage.startsWith('data:')
                ? base64ToBytes(parseDataUrl(tileImage).base64)
                : await fetchBytes(tileImage),
        )

        // --- Misure dal catalogo: solo quelle ---
        //
        // Questa `select` è la garanzia che il testo del prodotto non venga
        // usato come istruzione: tre colonne numeriche, nome e descrizione non
        // arrivano nemmeno in memoria. Sono i campi che possono essere
        // sbagliati, e quando entravano nel prompt vincevano sull'immagine.
        // Non allargarla senza una ragione.
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
        const patternKey = (layingPattern in PATTERN_NAME ? layingPattern : 'dritta') as Pattern
        const patternName = PATTERN_NAME[patternKey]

        // --- Lo schema di posa, disegnato ---
        //
        // Da qui in poi il modello non vede più la foto del campione: vede
        // questa. È lo stesso materiale — sono i suoi pixel — ma disposto come
        // ha chiesto il cliente, alle proporzioni vere del formato.
        const swatch = buildPatternSwatch(sample, patternKey, Math.max(w, h), Math.min(w, h))
        const swatchBase64 = bytesToBase64(await swatch.image.encodeJPEG(94))

        // `roomType` compare qui e da nessun'altra parte: serve a capire, dai
        // log, se l'utente ha scelto un ambiente che la foto smentisce.
        console.log(
            `${surface} · ${w}x${h} cm · posa ${layingPattern} · `
            + `foto ${original.width}x${original.height}${roomType ? ` · ambiente dichiarato: ${roomType}` : ''}`,
        )
        console.log(
            `Swatch ${patternKey}: campione ${sample.width}x${sample.height} → `
            + `${swatch.cells} piastrelle riconosciute`
            + (swatch.discarded ? ` (${swatch.discarded} scartate perché contenevano una fuga)` : '')
            + (swatch.detected ? '' : ' — nessuna griglia riconosciuta, campione usato intero'),
        )

        const accessToken = await getVertexAccessToken(serviceAccount)

        // --- 1 e 2: generazione e segmentazione, in parallelo ---
        // Sono indipendenti: la maschera descrive la foto di partenza, non il
        // risultato. Farle insieme dimezza l'attesa.
        const aspectRatio = nearestAspectRatio(original.width, original.height)
        const editPrompt = buildEditPrompt(
            surface, patternName, w, h,
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
                                { inlineData: { mimeType: 'image/jpeg', data: roomBase64 } },
                                { inlineData: { mimeType: 'image/jpeg', data: swatchBase64 } },
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
                        return await Image.decode(base64ToBytes(part.inlineData.data))
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
            payload.swatch = `data:image/jpeg;base64,${swatchBase64}`
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
