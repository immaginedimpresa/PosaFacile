// Prova locale dell'anteprima, senza Docker e senza deploy.
//
// Usa gli stessi moduli della funzione vera — stesso swatch, stesso prompt,
// stesso modello — e scrive su disco i due file che servono a capire un
// risultato brutto:
//
//   out_swatch.png     quello che il modello riceve come superficie da posare
//   out_result.jpg     quello che restituisce
//
// Se il risultato non convince, il confronto fra i due dice subito di chi è la
// colpa: se lo swatch è sbagliato il problema è il campione del catalogo o il
// rilevatore delle fughe; se lo swatch è giusto e il risultato no, è il modello
// o il prompt.
//
// USO
//   export GEMINI_API_KEY=...                       (da Google AI Studio)
//   deno run --allow-net --allow-read --allow-write --allow-env \
//     local_preview.ts stanza.jpg piastrella.jpg 20 120 spina floor
//
// In alternativa, per provare esattamente il percorso di produzione:
//   export GOOGLE_SERVICE_ACCOUNT="$(cat chiave.json)"
//
// Gli argomenti dopo le due immagini sono: lato corto in cm, lato lungo in cm,
// schema di posa, superficie. Tutti opzionali, con questi valori di default.

import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { bytesToBase64, resizeBox } from './imageops.ts'
import { buildPatternSwatch, type Pattern } from './pattern.ts'
import { buildPrompt, nearestAspectRatio, PATTERN_NAME, type Surface } from './prompt.ts'
import { generateImage, getVertexAccessToken, type ServiceAccount } from './vertex.ts'

const [roomPath, tilePath, cortoArg, lungoArg, patternArg, surfaceArg] = Deno.args
if (!roomPath || !tilePath) {
    console.error('uso: local_preview.ts <stanza.jpg> <piastrella.jpg> [cortoCm] [lungoCm] [posa] [floor|wall]')
    Deno.exit(1)
}

const corto = Number(cortoArg ?? 20)
const lungo = Number(lungoArg ?? 120)
const pattern = (patternArg ?? 'spina') as Pattern
const surface = (surfaceArg ?? 'floor') as Surface
const model = Deno.env.get('VISUALIZER_IMAGE_MODEL') || 'gemini-3.1-flash-image-preview'

const limit = (image: Image, edge: number): Image => {
    const k = Math.min(1, edge / Math.max(image.width, image.height))
    return resizeBox(image, Math.max(1, Math.round(image.width * k)), Math.max(1, Math.round(image.height * k)))
}

const room = limit(await Image.decode(await Deno.readFile(roomPath)), 1280)
const sample = limit(await Image.decode(await Deno.readFile(tilePath)), 1024)

const swatch = buildPatternSwatch(sample, pattern, Math.max(corto, lungo), Math.min(corto, lungo))
await Deno.writeFile('out_swatch.png', await swatch.image.encode())

const roomBase64 = bytesToBase64(await room.encodeJPEG(92))
const swatchBase64 = bytesToBase64(await swatch.image.encode())
const prompt = buildPrompt(surface, PATTERN_NAME[pattern], corto, lungo, swatch.extentCm)

console.log(`stanza   ${room.width}x${room.height} (${nearestAspectRatio(room.width, room.height)})`)
console.log(`swatch   ${swatch.extentCm} cm di superficie reale su ${swatch.image.width} px`)
console.log(`campione ${sample.width}x${sample.height} → ${swatch.cells} piastrelle riconosciute`
    + `${swatch.discarded ? `, ${swatch.discarded} scartate` : ''}${swatch.detected ? '' : ' — nessuna griglia'}`)
console.log(`posa     ${pattern} · ${corto}x${lungo} cm · ${surface}`)
console.log(`modello  ${model}`)
console.log('out_swatch.png scritto. Chiamo il modello…')

const body = {
    contents: [{
        role: 'user',
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: roomBase64 } },
            { inlineData: { mimeType: 'image/png', data: swatchBase64 } },
            { text: prompt },
        ],
    }],
    generationConfig: {
        responseModalities: ['IMAGE'],
        temperature: 0.15,
        imageConfig: { aspectRatio: nearestAspectRatio(room.width, room.height) },
    },
}

const started = performance.now()
let base64: string

const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
const apiKey = Deno.env.get('GEMINI_API_KEY')

if (serviceAccount) {
    // Percorso di produzione: Vertex con service account.
    const parsed: ServiceAccount = JSON.parse(serviceAccount)
    base64 = await generateImage({
        accessToken: await getVertexAccessToken(parsed),
        projectId: Deno.env.get('GOOGLE_CLOUD_PROJECT') || parsed.project_id,
        region: Deno.env.get('VISUALIZER_VERTEX_REGION') || 'global',
    }, model, body)
} else if (apiKey) {
    // Scorciatoia per la prova locale: l'API di AI Studio vuole solo una chiave.
    // Stesso modello e stessa richiesta, endpoint diverso.
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    const text = await response.text()
    if (!response.ok) {
        console.error(`HTTP ${response.status}: ${text.slice(0, 600)}`)
        Deno.exit(1)
    }
    const parsed = JSON.parse(text)
    const part = (parsed.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: unknown }) => p.inlineData)
    if (!part) {
        console.error('Nessuna immagine restituita. finishReason:', parsed.candidates?.[0]?.finishReason)
        console.error(JSON.stringify(parsed).slice(0, 600))
        Deno.exit(1)
    }
    base64 = part.inlineData.data
} else {
    console.error('Serve GEMINI_API_KEY oppure GOOGLE_SERVICE_ACCOUNT nell’ambiente.')
    Deno.exit(1)
}

await Deno.writeFile('out_result.jpg', Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
console.log(`out_result.jpg scritto in ${((performance.now() - started) / 1000).toFixed(1)} s`)
