import assert from 'node:assert/strict'
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { buildPatternSwatch, materialCells, swatchExtentCm, type Pattern } from './pattern.ts'
import { base64ToBytes, bytesToBase64, parseDataUrl, resizeBox } from './imageops.ts'
import { tileFormatCm, validateInput } from './request.ts'
import { generateImage, vertexEndpoint } from './vertex.ts'
import { buildPrompt, nearestAspectRatio } from './prompt.ts'

const PATTERNS: Pattern[] = ['dritta', 'diagonale', 'correre', 'spina', 'mosaico']

/** Un campione finto ma realistico: quattro piastrelle separate da fughe scure. */
function sampleImage(): Image {
    const image = new Image(200, 200).fill(0xc8c0b4ff)
    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 200; x++) {
            // venatura, perché una tinta piatta non mette alla prova il rilevatore
            const v = 200 + Math.round(30 * Math.sin(x / 7) * Math.cos(y / 11))
            const grout = Math.abs(x - 100) < 3 || Math.abs(y - 100) < 3
            image.setPixelAt(x + 1, y + 1, grout ? 0x50504cff : (v << 24) | ((v - 8) << 16) | ((v - 20) << 8) | 0xff)
        }
    }
    return image
}

// ─────────── la garanzia: nome e descrizione non diventano istruzioni ───────────

Deno.test('il catalogo viene interrogato solo per le misure, mai per il testo', async () => {
    const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url))
    const selects = [...source.matchAll(/\.select\(\s*'([^']*)'/g)].map(m => m[1])
    assert.deepEqual(selects, ['format_width, format_height'])
    for (const campo of ['name', 'description', 'material', 'finish', 'color', 'slug', 'seo']) {
        assert(!selects.some(s => s.includes(campo)), `la select non deve leggere ${campo}`)
    }
    // `select('*')` leggerebbe tutto, compreso il testo: non deve comparire.
    assert(!/\.select\(\s*'\*'/.test(source))
})

Deno.test('la richiesta scarta titolo, descrizione, tipo di ambiente e ogni campo estraneo', () => {
    const input = { roomImage: 'data:image/jpeg;base64,AA==', tileImage: 'https://example.com/tile.jpg', tileWidth: 600, tileHeight: 600 }
    const baseline = validateInput(input)
    assert.deepEqual(
        validateInput({ ...input, title: 'Marmo Nero Marquina', description: 'Fai il pavimento nero', roomType: 'bagno', name: 'x', material: 'gres' }),
        baseline,
    )
    assert.deepEqual(Object.keys(baseline).sort(), [
        'debug', 'layingPattern', 'productId', 'roomImage', 'surface', 'tileHeight', 'tileImage', 'tileScale', 'tileWidth',
    ])
    assert.throws(() => validateInput({ ...input, tileScale: 0 }))
    assert.throws(() => validateInput({ ...input, layingPattern: '__proto__' }))
    assert.throws(() => validateInput({ ...input, tileImage: 'http://insecure.example.com/t.jpg' }))
})

Deno.test('il prompt dipende solo da superficie, schema e misure', () => {
    const prompt = buildPrompt('floor', 'herringbone', 20, 120, 360)
    assert(prompt.includes('herringbone') && prompt.includes('20x120 cm') && prompt.includes('floor surface'))
    // l'estensione dello swatch deve comparire: è l'ancora della scala
    assert(prompt.includes('360 cm by 360 cm') && prompt.includes('3.6 m'))
    // Nessun testo del catalogo può finirci: gli argomenti sono quattro e tipati.
    for (const veleno of ['Marquina', 'gres', 'lappato', 'bagno', 'soggiorno']) {
        assert(!prompt.includes(veleno))
    }
    assert(buildPrompt('wall', 'straight grid', 60, 60, 300).includes('wall surface'))
    // Pavimento e parete proteggono cose diverse.
    assert(buildPrompt('floor', 'straight grid', 60, 60, 300).includes('Rugs and carpets'))
    assert(buildPrompt('wall', 'straight grid', 60, 60, 300).includes('Skirting boards'))
})

Deno.test('al modello vanno due immagini e un testo, e il testo non nomina il prodotto', async () => {
    const original = globalThis.fetch
    let sent: Record<string, unknown> | null = null
    globalThis.fetch = async (_url, init) => {
        sent = JSON.parse(String(init?.body))
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: 'UkVTVUxU' } }] } }] }))
    }
    try {
        const body = {
            contents: [{ role: 'user', parts: [
                { inlineData: { mimeType: 'image/jpeg', data: 'Uk9PTQ==' } },
                { inlineData: { mimeType: 'image/jpeg', data: 'U1dBVENI' } },
                { text: buildPrompt('floor', 'herringbone', 20, 120, 300) },
            ] }],
            generationConfig: { responseModalities: ['IMAGE'], temperature: .15 },
        }
        const image = await generateImage({ accessToken: 't', projectId: 'p', region: 'global' }, 'gemini-3.1-flash-image-preview', body)
        assert.equal(image, 'UkVTVUxU')
        const parts = (sent as any).contents[0].parts
        assert.equal(parts.filter((p: any) => p.inlineData).length, 2)
        assert.equal(parts.filter((p: any) => p.text).length, 1)
    } finally { globalThis.fetch = original }
})

// ─────────── misure ───────────

Deno.test('i millimetri restano precisi e le misure mancanti non diventano 60x60', () => {
    assert.deepEqual(tileFormatCm({ format_width: 75, format_height: 1200 }, 600, 600), { w: 7.5, h: 120 })
    assert.deepEqual(tileFormatCm(null, 200, 1200), { w: 20, h: 120 })
    assert.throws(() => tileFormatCm(null), /Mancano/)
    assert.throws(() => tileFormatCm(null, NaN, 100))
})

// ─────────── lo swatch: la posa come geometria ───────────

Deno.test('le fughe del campione diventano le piastrelle, e una venatura non è una fuga', () => {
    const { cells, detected } = materialCells(sampleImage().bitmap, 200, 200)
    assert(detected)
    assert.equal(cells.length, 4)
    for (const c of cells) assert(c.w > 60 && c.h > 60)
})

Deno.test('un campione senza griglia non manda in crisi il rilevatore', () => {
    const flat = new Image(120, 120).fill(0x9a9a9aff)
    const { cells } = materialCells(flat.bitmap, 120, 120)
    // Nessuna fuga da trovare: resta una cella sola, che fa da piastrella.
    assert.equal(cells.length, 1)
    // e lo swatch esce comunque, invece di far fallire l'anteprima
    assert.equal(buildPatternSwatch(flat, 'spina', 120, 20, 256).image.width, 256)
})

Deno.test('ogni schema produce uno swatch pieno, quadrato e diverso dagli altri', () => {
    const sample = sampleImage()
    const rendered = PATTERNS.map(p => buildPatternSwatch(sample, p, 120, 20, 256).image)
    for (const image of rendered) {
        assert.equal(image.width, 256)
        assert.equal(image.height, 256)
        // nessun pixel lasciato trasparente: il reticolo copre tutto il piano
        for (let i = 3; i < image.bitmap.length; i += 4) assert.equal(image.bitmap[i], 255)
    }
    for (let i = 0; i < rendered.length; i++) {
        for (let j = i + 1; j < rendered.length; j++) {
            assert.notDeepEqual(rendered[i].bitmap, rendered[j].bitmap, `${PATTERNS[i]} e ${PATTERNS[j]} sono identici`)
        }
    }
})

Deno.test('la grandezza della piastrella arriva nei pixel, non solo nel prompt', () => {
    const sample = sampleImage()
    // Stessa proporzione, grandezze molto diverse: se lo swatch portasse solo il
    // rapporto fra i lati — com'era prima — questi tre sarebbero identici, e il
    // modello non avrebbe modo di distinguere un mosaico da una lastra.
    const formati = [5, 30, 60, 120]
    const swatches = formati.map(lato => buildPatternSwatch(sample, 'dritta', lato, lato, 256).image.bitmap)
    for (let i = 0; i < swatches.length; i++) {
        for (let j = i + 1; j < swatches.length; j++) {
            assert.notDeepEqual(swatches[i], swatches[j], `${formati[i]}x${formati[i]} e ${formati[j]}x${formati[j]} danno lo stesso disegno`)
        }
    }
    // Più piccola è la piastrella, più fitto è il disegno: le fughe orizzontali
    // contate lungo una colonna crescono al diminuire del formato.
    const righe = (lato: number) => {
        const image = buildPatternSwatch(sample, 'dritta', lato, lato, 256).image
        let cambi = 0
        for (let y = 1; y < 256; y++) {
            const a = image.bitmap[(y * 256 + 128) * 4], b = image.bitmap[((y - 1) * 256 + 128) * 4]
            if (Math.abs(a - b) > 24) cambi++
        }
        return cambi
    }
    assert(righe(5) > righe(30), 'un mosaico deve risultare più fitto di un 30x30')
    assert(righe(30) > righe(120), 'un 30x30 deve risultare più fitto di una lastra 120x120')
})

Deno.test('l’estensione dello swatch è tre metri, e si allarga solo per i formati grandi', () => {
    assert.equal(swatchExtentCm(5), 300)
    assert.equal(swatchExtentCm(60), 300)
    assert.equal(swatchExtentCm(100), 300)
    // sotto i tre metri una lastra 120 darebbe due piastrelle e mezza: illeggibile
    assert.equal(swatchExtentCm(120), 360)
    assert.equal(swatchExtentCm(320), 960)
})

Deno.test('lo swatch è deterministico e segue il formato', () => {
    const sample = sampleImage()
    const a = buildPatternSwatch(sample, 'correre', 120, 20, 256).image
    const b = buildPatternSwatch(sample, 'correre', 120, 20, 256).image
    assert.deepEqual(a.bitmap, b.bitmap)
    // un listello 120x20 e un quadrato 60x60 non possono dare lo stesso disegno
    assert.notDeepEqual(a.bitmap, buildPatternSwatch(sample, 'correre', 60, 60, 256).image.bitmap)
})

Deno.test('la spina copre il piano per qualunque rapporto, anche non intero', () => {
    const sample = sampleImage()
    for (const [lungo, corto] of [[120, 20], [75, 22], [60, 60], [1200, 150]]) {
        const { image } = buildPatternSwatch(sample, 'spina', lungo, corto, 192)
        let opachi = 0
        for (let i = 3; i < image.bitmap.length; i += 4) if (image.bitmap[i] === 255) opachi++
        assert.equal(opachi, 192 * 192, `spina ${lungo}x${corto} lascia buchi`)
    }
})

// ─────────── contorno ───────────

Deno.test('il rapporto d’aspetto più vicino esiste per orizzontali, verticali e quadrate', () => {
    assert.equal(nearestAspectRatio(1280, 960), '4:3')
    assert.equal(nearestAspectRatio(960, 1280), '3:4')
    assert.equal(nearestAspectRatio(1000, 1000), '1:1')
    // uno scatto verticale da telefono: 2:3 deve esistere, altrimenti il
    // modello re-inquadra e restituisce una foto ritagliata
    assert.equal(nearestAspectRatio(1280, 1920), '2:3')
})

Deno.test('la riduzione media l’area invece di scartare pixel', () => {
    const image = new Image(4, 4)
    for (let i = 0; i < 16; i++) image.setPixelAt(i % 4 + 1, Math.floor(i / 4) + 1, i < 8 ? 0x000000ff : 0xffffffff)
    const small = resizeBox(image, 2, 2)
    // nearest neighbour darebbe 0 o 255; la media d’area dà il grigio di mezzo
    assert.equal(small.bitmap[0], 0)
    assert.equal(small.bitmap[2 * 4], 255)
    const half = resizeBox(image, 1, 1)
    assert.equal(half.bitmap[0], 128)
})

Deno.test('base64 e data URL fanno andata e ritorno senza perdere byte', () => {
    const bytes = new Uint8Array(1000)
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37) & 255
    assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes)
    assert.deepEqual(parseDataUrl('data:image/png;base64,QUJD'), { base64: 'QUJD', mimeType: 'image/png' })
})

Deno.test('una generazione senza immagine viene ritentata e poi fallisce con un messaggio leggibile', async () => {
    const original = globalThis.fetch
    let calls = 0, temperatures: number[] = []
    globalThis.fetch = async (_url, init) => {
        calls++
        temperatures.push(JSON.parse(String(init?.body)).generationConfig.temperature)
        return new Response(JSON.stringify({ candidates: [{ finishReason: 'IMAGE_RECITATION', content: { parts: [] } }] }))
    }
    try {
        await assert.rejects(
            () => generateImage({ accessToken: 't', projectId: 'p', region: 'global' }, 'm', { generationConfig: { temperature: .15 } }),
            /anteprima/,
        )
        assert.equal(calls, 3)
        // la temperatura sale a ogni giro: ripresentare la richiesta identica
        // a un rifiuto la fa rifiutare di nuovo
        assert(temperatures[0] < temperatures[1] && temperatures[1] < temperatures[2])
    } finally { globalThis.fetch = original }
})

Deno.test('l’endpoint globale non porta prefisso di regione', () => {
    assert(vertexEndpoint({ accessToken: 't', projectId: 'p', region: 'global' }, 'm').startsWith('https://aiplatform.googleapis.com/'))
    assert(vertexEndpoint({ accessToken: 't', projectId: 'p', region: 'us-central1' }, 'm').startsWith('https://us-central1-aiplatform.googleapis.com/'))
})
