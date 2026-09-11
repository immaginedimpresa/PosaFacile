// Anteprima AI: rifà il pavimento o la parete nella foto del cliente.
//
// v3. Le due versioni precedenti hanno sbagliato bersaglio in due modi opposti,
// e vale la pena averli scritti per non rifarli.
//
// La v1 chiedeva tutto al modello generativo, compreso lo schema di posa, e lo
// chiedeva a parole. Ma il campione del catalogo è la fotografia di una
// superficie GIÀ POSATA: dirgli "ignora la disposizione che vedi e fai una
// spina" è una gara fra pixel e parole, e la vincono i pixel. Si sceglieva
// spina e usciva un correre.
//
// La v2 è andata all'estremo opposto: niente modello generativo, solo
// proiezione prospettica deterministica di una texture. Geometria perfetta e
// risultato inguardabile — una lastra piatta incollata su una fotografia, senza
// ombre di contatto, senza riflessi, con le lame di sole cancellate. Il difetto
// non era tarabile: proiettare una texture piatta e moltiplicarla per una
// luminanza sfocata non produce una fotografia, per costruzione.
//
// La v3 divide il lavoro secondo quello che ciascuno sa fare:
//
//   la GEOMETRIA la decidiamo noi, disegnandola (pattern.ts): lo schema di posa
//   e le proporzioni del formato diventano pixel, non una frase interpretabile;
//
//   la FOTOGRAFIA la fa il modello: prospettiva, luce, ombre di contatto e
//   riflessi sono esattamente ciò in cui è bravo e che a mano costerebbe mesi.
//
// Una sola chiamata. Nessuna maschera, nessuna omografia, nessuna cache.
//
// Quello che NON entra mai nella richiesta: nome, descrizione, materiale,
// colore, finitura e tipo di ambiente. Sono campi compilati a mano e nel
// catalogo attuale sono quasi tutti sbagliati — un prodotto chiamato "Marmo
// Nero Marquina" ha come immagine listelli di granito grigio. La garanzia non è
// una frase nel prompt ma la forma dei dati: la `select` sul catalogo chiede
// due colonne numeriche, quindi il testo non arriva nemmeno in memoria.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'

import { base64ToBytes, bytesToBase64, parseDataUrl, resizeBox } from './imageops.ts'
import { getVertexAccessToken, generateImage, type ServiceAccount } from './vertex.ts'
import { buildPatternSwatch } from './pattern.ts'
import { validateInput, tileFormatCm } from './request.ts'
import { buildPrompt, nearestAspectRatio, PATTERN_NAME } from './prompt.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** Il lato lungo della foto rimandata al modello. Il client manda già 1280. */
const MAX_EDGE = 1280

/** Scarica il campione, con i limiti che impediscono a un URL di riempire la memoria. */
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

function limitImage(image: Image, edge: number): Image {
    const k = Math.min(1, edge / Math.max(image.width, image.height))
    return resizeBox(image, Math.max(1, Math.round(image.width * k)), Math.max(1, Math.round(image.height * k)))
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ success: false, error: 'Metodo non consentito.' }, 405)

    try {
        const raw = await req.text()
        if (raw.length > 15 * 1024 * 1024) return json({ success: false, error: 'Immagini troppo grandi.' }, 413)
        const body = validateInput(JSON.parse(raw))

        // Solo colonne numeriche: è questa `select` a garantire che il testo del
        // prodotto non possa diventare un'istruzione. Non allargarla.
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
        // `tileScale` è la manopola del cliente quando la stanza "non torna":
        // agisce sulle misure, quindi sia sul disegno sia sul prompt, insieme.
        const w = Math.round(format.w * body.tileScale * 10) / 10
        const h = Math.round(format.h * body.tileScale * 10) / 10

        const [decodedRoom, decodedSample] = await Promise.all([
            Image.decode(base64ToBytes(parseDataUrl(body.roomImage).base64)),
            loadSample(body.tileImage),
        ])
        const room = limitImage(decodedRoom, MAX_EDGE)
        const roomBase64 = bytesToBase64(await room.encodeJPEG(92))

        // La posa diventa pixel. Da qui in poi il modello non vede più la foto
        // del campione: vede la superficie già posata come l'ha chiesta il
        // cliente, fatta con i pixel di quel campione.
        const swatch = buildPatternSwatch(
            limitImage(decodedSample, 1024), body.layingPattern, Math.max(w, h), Math.min(w, h))
        const swatchBase64 = bytesToBase64(await swatch.image.encodeJPEG(94))

        const secret = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
        if (!secret) throw new Error('Servizio anteprime non configurato.')
        const serviceAccount: ServiceAccount = JSON.parse(secret)
        const config = {
            accessToken: await getVertexAccessToken(serviceAccount),
            projectId: Deno.env.get('GOOGLE_CLOUD_PROJECT') || serviceAccount.project_id,
            region: Deno.env.get('VISUALIZER_VERTEX_REGION') || 'global',
        }
        if (!config.projectId) throw new Error('Progetto del servizio anteprime non configurato.')
        // Configurabile senza rideploy: se il progetto non è ancora in allowlist
        // per il 3.1 basta cambiare la variabile d'ambiente.
        const model = Deno.env.get('VISUALIZER_IMAGE_MODEL') || 'gemini-3.1-flash-image-preview'

        console.log(
            `${body.surface} · ${w}x${h} cm · posa ${body.layingPattern} · foto ${room.width}x${room.height} · `
            + `swatch ${swatch.extentCm} cm da ${swatch.cells} piastrelle`
            + `${swatch.detected ? '' : ' (nessuna griglia: campione intero)'}`,
        )

        const generated = await generateImage(config, model, {
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: roomBase64 } },
                    { inlineData: { mimeType: 'image/jpeg', data: swatchBase64 } },
                    { text: buildPrompt(body.surface, PATTERN_NAME[body.layingPattern], w, h, swatch.extentCm) },
                ],
            }],
            generationConfig: {
                responseModalities: ['IMAGE'],
                temperature: 0.15,
                imageConfig: { aspectRatio: nearestAspectRatio(room.width, room.height) },
            },
        })

        const payload: Record<string, unknown> = {
            success: true,
            image: `data:image/jpeg;base64,${generated}`,
            renderer: 'generative-v3',
            note: 'La prospettiva e la luce sono ricostruite dal modello. Formato e schema di posa sono quelli scelti.',
        }
        // In debug torna anche lo swatch: senza, davanti a un risultato brutto
        // si tira a indovinare se ha sbagliato il disegno o il modello.
        if (body.debug) payload.swatch = `data:image/jpeg;base64,${swatchBase64}`

        return json(payload)
    } catch (error: unknown) {
        console.error('visualize-tile:', error instanceof Error ? error.message : 'unknown error')
        return json({ success: false, error: error instanceof Error ? error.message : 'Elaborazione non riuscita.' })
    }
})
