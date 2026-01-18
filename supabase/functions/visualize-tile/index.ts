// Supabase Edge Function for AI Tile Visualization via Vertex AI (US Region)
// Bypasses EU Geo-blocking by forcing us-central1 region
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts"

// Configuration
const REGION = "us-central1"
const PROJECT_ID = "gen-lang-client-0870482364" // ID del progetto corretto
const MODEL_ID = "gemini-2.0-flash-exp" // Torniamo alla versione sperimentale che è sicuramente attiva

interface RequestBody {
    roomImage: string
    tileImage: string
    tileName: string
    layingPattern: 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'
    roomType: 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno'
    tileWidth?: number
    tileHeight?: number
}

const LAYING_PATTERN_PROMPTS: Record<string, string> = {
    dritta: 'POSA DRITTA (GRID LAYOUT): Le piastrelle devono essere allineate perfettamente in una griglia ortogonale ai muri. Le fughe devono formare linee continue incrociate (non sfalsate).',
    diagonale: 'POSA DIAGONALE (DIAMOND LAYOUT): Ruota la griglia di posa a 45 gradi rispetto ai muri principali. Le fughe devono formare una griglia di rombi in prospettiva.',
    correre: 'POSA A CORRERE (BRICK/OFFSET LAYOUT): Le piastrelle devono essere sfalsate del 50% (o 30%) in ogni riga successiva, simile a un muro di mattoni. NON allineare le fughe verticali.',
    spina: 'POSA A SPINA DI PESCE (HERRINGBONE LAYOUT): Le piastrelle rettangolari devono essere disposte a L l\'una contro l\'altra, formando un motivo a zig-zag (90 gradi). È CRUCIALE rispettare geometry a spina di pesce.',
    mosaico: 'POSA MOSAICO/PATTERN: Ripeti la texture rispettando il modulo geometrico del decoro.',
}

const ROOM_TYPE_PROMPTS: Record<string, string> = {
    bagno: 'bagno',
    cucina: 'cucina',
    soggiorno: 'soggiorno',
    camera: 'camera da letto',
    esterno: 'terrazzo/esterno',
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Auth Helpers ---

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

async function getAccessToken(serviceAccount: any): Promise<string> {
    const pem = serviceAccount.private_key
    const clientEmail = serviceAccount.client_email

    // Import Key
    const binaryKey = pemToArrayBuffer(pem)
    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        true,
        ["sign"]
    )

    const jwt = await create(
        { alg: "RS256", typ: "JWT" },
        {
            iss: clientEmail,
            scope: "https://www.googleapis.com/auth/cloud-platform",
            aud: "https://oauth2.googleapis.com/token",
            exp: getNumericDate(60 * 60), // 1 hour
            iat: getNumericDate(0),
        },
        key
    )

    const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })

    if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`Failed to get access token: ${text}`)
    }

    const data = await resp.json()
    return data.access_token
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i])
    }
    const base64 = btoa(binary)
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    return { data: base64, mimeType: contentType }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
        if (!serviceAccountStr) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT')
        const serviceAccount = JSON.parse(serviceAccountStr)
        const accessToken = await getAccessToken(serviceAccount)

        const body: RequestBody = await req.json()
        const { roomImage, tileImage, tileName, layingPattern, tileWidth, tileHeight } = body

        if (!roomImage || !tileImage) throw new Error('Missing images')

        // Prepare Base64
        const roomBase64 = roomImage.replace(/^data:image\/\w+;base64,/, '')
        const roomMimeType = roomImage.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'

        // Tile logic
        let tileBase64: string
        let tileMimeType: string
        if (tileImage.startsWith('data:')) {
            tileBase64 = tileImage.replace(/^data:image\/\w+;base64,/, '')
            tileMimeType = tileImage.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'
        } else {
            const tileData = await urlToBase64(tileImage)
            tileBase64 = tileData.data
            tileMimeType = tileData.mimeType
        }

        const vertexEndpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL_ID}:generateContent`

        // --- STEP 1: GENERATE MASK ---
        console.log("Step 1: Generating Floor Mask...")
        const maskPrompt = `TASK: Analizza l'immagine della stanza e genera una MASCHERA DI SEGMENTAZIONE binaria (bianco/nero) precisa per il PAVIMENTO.
OUTPUT: Un'immagine dove il pavimento visibile è completamente BIANCO (#FFFFFF) e tutto il resto (muri, soffitto, mobili, finestre) è completamente NERO (#000000).
PRECISIONE: I contorni devono essere netti. Escludi i piedi dei tavoli/sedie (devono essere neri).`

        const maskPayload = {
            contents: [{
                role: "user",
                parts: [
                    { inlineData: { mimeType: roomMimeType, data: roomBase64 } },
                    { text: maskPrompt }
                ]
            }],
            generationConfig: { responseModalities: ["image"], temperature: 0.0 }
        }

        const maskResp = await fetch(vertexEndpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(maskPayload)
        })

        if (!maskResp.ok) throw new Error(`Mask Gen Error: ${await maskResp.text()}`)
        const maskResult = await maskResp.json()

        let maskBase64 = null
        if (maskResult.candidates?.[0]?.content?.parts) {
            for (const part of maskResult.candidates[0].content.parts) {
                if (part.inlineData) maskBase64 = part.inlineData.data
            }
        }
        if (!maskBase64) throw new Error('Failed to generate floor mask')

        // --- STEP 2: INPAINT WITH COMPOSITING ---
        console.log("Step 2: Compositing...")
        const patternDesc = LAYING_PATTERN_PROMPTS[layingPattern] || 'posa dritta'
        const width = tileWidth || 60
        const height = tileHeight || 60

        const compositePrompt = `SEI UN MOTORE DI RENDERING 3D.
INPUT: 
1. Immagine Stanza (Originale)
2. Immagine Texture (Piastrella)
3. Immagine Maschera (Bianco = Area da modificare)

OBIETTIVO: Generare l'immagine finale della stanza sostituendo il pavimento.

REGOLE DI COMPOSITING:
1. USA LA MASCHERA: Modifica ESCLUSIVAMENTE i pixel che sono BIANCHI nella Maschera. I pixel NERI dell'originale devono restare IDENTICI al 100%.
2. PROSPETTIVA: Applica la texture della piastrella nell'area bianca seguendo la prospettiva della stanza.
3. PATTERN: ${patternDesc} (Dimensione: ${width}x${height} cm).
4. REALISMO: Fondi la nuova texture con le luci e le ombre della stanza originale (shadow blending). NON cancellare le ombre dei mobili.`

        const compositePayload = {
            contents: [{
                role: "user",
                parts: [
                    { inlineData: { mimeType: roomMimeType, data: roomBase64 } }, // Original
                    { inlineData: { mimeType: tileMimeType, data: tileBase64 } }, // Texture
                    { inlineData: { mimeType: "image/png", data: maskBase64 } }, // Mask (Generated)
                    { text: compositePrompt }
                ]
            }],
            generationConfig: { responseModalities: ["image"], temperature: 0.1 }
        }

        const finalResp = await fetch(vertexEndpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(compositePayload)
        })

        if (!finalResp.ok) throw new Error(`Final Gen Error: ${await finalResp.text()}`)
        const finalResult = await finalResp.json()

        let finalImage = null
        if (finalResult.candidates?.[0]?.content?.parts) {
            for (const part of finalResult.candidates[0].content.parts) {
                if (part.inlineData) finalImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            }
        }
        if (!finalImage) throw new Error('Failed to generate final image')

        return new Response(JSON.stringify({ success: true, image: finalImage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error("Function Error:", error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 200, // Return 200 to handle error in frontend
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
