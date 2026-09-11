import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts"

export interface ServiceAccount { private_key: string; client_email: string; project_id: string }
export interface VertexConfig { accessToken: string; projectId: string; region: string }
export interface GeminiPart { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } }
export interface GeminiResponse { candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[] }

export function vertexEndpoint(config: VertexConfig, model: string): string {
    const host = config.region === 'global' ? 'aiplatform.googleapis.com' : `${config.region}-aiplatform.googleapis.com`
    return `https://${host}/v1/projects/${config.projectId}/locations/${config.region}/publishers/google/models/${model}:generateContent`
}

/** Only transient HTTP failures are retried. Never retry safety refusals. */
export async function generateContent(config: VertexConfig, model: string, body: unknown): Promise<GeminiResponse> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(vertexEndpoint(config, model), {
            method: 'POST',
            headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(90_000),
        })
        if (response.ok) return await response.json()
        const status = response.status
        await response.body?.cancel()
        if ((status === 429 || status === 503) && attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt + Math.random() * 300))
            continue
        }
        console.error(`Vertex ${model}: HTTP ${status}`)
        if (status === 404) throw new Error('Il modello di anteprima non è disponibile: verificare modello, progetto e regione sul server.')
        if (status === 429 || status === 503) throw new Error('Il servizio anteprime è occupato. Riprova tra poco.')
        throw new Error('Il servizio anteprime non è disponibile al momento.')
    }
    throw new Error('Il servizio anteprime è occupato. Riprova tra poco.')
}

export function responseText(response: GeminiResponse): string {
    return (response.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('')
}

export function parseJsonResponse(text: string): unknown {
    return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
}

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

export async function getVertexAccessToken(serviceAccount: ServiceAccount): Promise<string> {
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
        signal: AbortSignal.timeout(15_000),
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })
    if (!resp.ok) throw new Error('Autenticazione del servizio anteprime non riuscita.')
    return (await resp.json()).access_token
}

