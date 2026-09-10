// Segmentazione della superficie da sostituire.
//
// Il modello di immagini rigenera tutto il fotogramma: anche quando si comporta
// bene, "si comporta bene" non è una garanzia. Misurato su casi reali, fuori dal
// pavimento restava alterato lo 0,4-0,5% dei pixel in alto e il 4% a metà
// altezza — abbastanza da far sparire un tappeto e da riscrivere i quadri.
//
// L'unico modo per garantire che cambi solo la superficie scelta è sapere DOVE
// sta quella superficie, e rimettere tutto il resto dall'originale.
//
// La maschera la dà `image-segmentation-001`, il modello dedicato di Vertex.
// Vale la pena dire cosa NON funziona, per non riprovarci:
//   - gemini-2.5-flash / -pro / -lite: restituiscono il riquadro corretto ma al
//     posto dei pixel della maschera mettono una frase;
//   - gemini-2.5-flash-image a cui si chiede "una maschera binaria": torna una
//     copia schiarita della foto. Riformulato come "ridipingi di bianco e nero"
//     torna la stessa foto un po' più chiara. Sa dipingere, non sa segmentare.

import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'

const SEG_MODEL = 'image-segmentation-001'

/**
 * Le classi semantiche del modello. Sono nomi di un vocabolario fisso: se il
 * modello non le riconosce si ripiega sulla modalità a testo libero.
 */
const SEMANTIC_CLASS: Record<string, string> = {
    floor: 'floor',
    wall: 'wall',
}

const FREE_PROMPT: Record<string, string> = {
    floor: 'the floor of the room',
    wall: 'the walls of the room',
}

interface Prediction {
    bytesBase64Encoded?: string
    maskBytesBase64Encoded?: string
}

async function callSegmentation(
    accessToken: string,
    region: string,
    projectId: string,
    imageBase64: string,
    instance: Record<string, unknown>,
    parameters: Record<string, unknown>,
): Promise<Prediction[]> {
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}`
        + `/locations/${region}/publishers/google/models/${SEG_MODEL}:predict`

    const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            instances: [{ image: { bytesBase64Encoded: imageBase64 }, ...instance }],
            parameters,
        }),
    })

    if (!resp.ok) {
        console.error(`Segmentazione (${JSON.stringify(parameters)}):`, (await resp.text()).slice(0, 250))
        return []
    }
    const json = await resp.json()
    return (json.predictions || []) as Prediction[]
}

/**
 * Maschera della superficie, alle stesse dimensioni della foto passata.
 *
 * Il modello segmenta l'immagine che riceve, quindi la maschera nasce già nello
 * spazio giusto: nessun riallineamento da fare, a differenza di tutto ciò che
 * passa dal modello generativo.
 *
 * Restituisce null se non si ottiene niente di utilizzabile: il chiamante
 * decide se procedere senza ricomposizione o fermarsi.
 */
export async function getSurfaceMask(
    accessToken: string,
    region: string,
    projectId: string,
    imageBase64: string,
    surface: 'floor' | 'wall',
    width: number,
    height: number,
): Promise<Uint8Array | null> {
    // Prima la modalità semantica: è addestrata su classi di scena e distingue
    // il pavimento dal tappeto che ci sta sopra, che è esattamente il confine
    // difficile. La modalità a testo libero è il ripiego.
    const attempts: Array<{ nome: string; instance: Record<string, unknown>; parameters: Record<string, unknown> }> = [
        {
            nome: 'semantic',
            instance: {},
            parameters: { mode: 'semantic', classes: [SEMANTIC_CLASS[surface]] },
        },
        {
            nome: 'prompt',
            instance: { prompt: FREE_PROMPT[surface] },
            parameters: { mode: 'prompt', maxPredictions: 4, confidenceThreshold: 0.25 },
        },
    ]

    for (const attempt of attempts) {
        const predictions = await callSegmentation(
            accessToken, region, projectId, imageBase64, attempt.instance, attempt.parameters,
        )
        if (predictions.length === 0) continue

        const mask = await mergePredictions(predictions, width, height)
        if (mask) {
            console.log(`Maschera ${surface} da modalità ${attempt.nome}: ${predictions.length} predizioni`)
            return mask
        }
    }

    console.error(`Nessuna maschera utilizzabile per ${surface}`)
    return null
}

/** Fonde le predizioni in una sola mappa di copertura, tenendo il valore più alto. */
async function mergePredictions(
    predictions: Prediction[],
    width: number,
    height: number,
): Promise<Uint8Array | null> {
    const canvas = new Uint8Array(width * height)
    let used = 0

    for (const prediction of predictions) {
        const b64 = prediction.bytesBase64Encoded || prediction.maskBytesBase64Encoded
        if (!b64) continue

        let patch: Image
        try {
            const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
            patch = await Image.decode(bytes)
            if (patch.width !== width || patch.height !== height) patch = patch.resize(width, height)
        } catch (err) {
            console.error('Maschera non decodificabile:', err instanceof Error ? err.message : err)
            continue
        }

        const bmp = patch.bitmap
        for (let i = 0; i < canvas.length; i++) {
            const v = bmp[i * 4]
            if (v > canvas[i]) canvas[i] = v
        }
        used++
    }

    return used > 0 ? canvas : null
}

/**
 * Sfuma il bordo della maschera.
 *
 * Un bordo netto stampa una linea visibile dove la superficie generata incontra
 * quella originale: basta un pixel di disallineamento fra le due immagini perché
 * si veda. Una sfumatura di pochi pixel la nasconde senza spostare il confine,
 * perché è una media mobile centrata.
 */
export function featherMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
    if (radius < 1) return mask

    // Sfocatura a box separabile: due passate lineari invece di una quadratica.
    const horizontal = new Uint8Array(mask.length)
    const win = radius * 2 + 1

    for (let y = 0; y < height; y++) {
        const row = y * width
        let sum = 0
        for (let x = -radius; x <= radius; x++) {
            sum += mask[row + Math.max(0, Math.min(width - 1, x))]
        }
        for (let x = 0; x < width; x++) {
            horizontal[row + x] = Math.round(sum / win)
            const out = Math.max(0, Math.min(width - 1, x - radius))
            const inn = Math.max(0, Math.min(width - 1, x + radius + 1))
            sum += mask[row + inn] - mask[row + out]
        }
    }

    const result = new Uint8Array(mask.length)
    for (let x = 0; x < width; x++) {
        let sum = 0
        for (let y = -radius; y <= radius; y++) {
            sum += horizontal[Math.max(0, Math.min(height - 1, y)) * width + x]
        }
        for (let y = 0; y < height; y++) {
            result[y * width + x] = Math.round(sum / win)
            const out = Math.max(0, Math.min(height - 1, y - radius))
            const inn = Math.max(0, Math.min(height - 1, y + radius + 1))
            sum += horizontal[inn * width + x] - horizontal[out * width + x]
        }
    }
    return result
}

/** Quanta parte della foto copre la maschera: serve a scartare risultati assurdi. */
export function maskCoverage(mask: Uint8Array): number {
    let covered = 0
    for (let i = 0; i < mask.length; i++) if (mask[i] > 127) covered++
    return covered / mask.length
}
