import { supabase } from '@/lib/supabase'

/**
 * Chiamata alla generazione dell'anteprima.
 *
 * Estratta dal componente che la ospitava perché ora serve in due posti: la
 * hero della home e il passo del configuratore. La logica di rete e la
 * normalizzazione del risultato stanno qui una volta sola.
 */

export type LayingPattern = 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'
export type RoomType = 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno'
/** Superficie da sostituire: cambia il prompt e cosa resta intatto. */
export type Surface = 'floor' | 'wall'

/**
 * L'immagine del prodotto da mandare all'anteprima.
 *
 * `images[0]` è la foto di vetrina: serve a far cliccare, quindi a volte è un
 * ambiente arredato invece che il materiale. Nel catalogo attuale quattro
 * prodotti su nove hanno lì una foto di stock che non contiene nemmeno una
 * piastrella. `tileable_image_url` è il campo pensato per il campione, e va
 * preferito quando c'è: da quando il prompt non legge più il nome, questa
 * immagine è l'unica cosa che decide come viene il risultato.
 */
export function tileSampleUrl(
    product: { images?: unknown; tileable_image_url?: string | null } | null | undefined,
): string | null {
    if (!product) return null
    const gallery = Array.isArray(product.images) ? (product.images as string[]) : []
    return product.tileable_image_url || gallery[0] || null
}

export interface VisualizeInput {
    /** Foto della stanza, come data URL. */
    roomImage: string
    /** Immagine della piastrella scelta: è l'unica fonte sull'aspetto del materiale. */
    tileImage: string
    productId?: string
    layingPattern?: LayingPattern
    roomType?: RoomType
    tileWidth?: number | null
    tileHeight?: number | null
    surface?: Surface
}

export interface VisualizeResult {
    image: string | null
    error: string | null
}

/** La funzione può restituire un data URL, un indirizzo o base64 grezzo. */
const normalizeImage = (value: string): string => {
    if (value.startsWith('data:') || value.startsWith('http')) return value
    return `data:image/jpeg;base64,${value}`
}

export async function visualizeTile(input: VisualizeInput): Promise<VisualizeResult> {
    try {
        const { data, error } = await supabase.functions.invoke('visualize-tile', {
            body: {
                roomImage: input.roomImage,
                tileImage: input.tileImage,
                productId: input.productId,
                layingPattern: input.layingPattern ?? 'dritta',
                roomType: input.roomType ?? 'soggiorno',
                surface: input.surface ?? 'floor',
                tileWidth: input.tileWidth ?? undefined,
                tileHeight: input.tileHeight ?? undefined,
            },
        })

        if (error) throw error

        if (data?.success && data?.image) {
            return { image: normalizeImage(data.image), error: null }
        }
        throw new Error(data?.error || 'Generazione non riuscita')
    } catch (err: any) {
        console.error('Anteprima AI:', err)
        // Le funzioni Supabase annidano il messaggio utile dentro `context`.
        const message = err?.context?.message || err?.message || 'Errore durante l’elaborazione.'
        return { image: null, error: message }
    }
}

/** Legge un file immagine come data URL, con i controlli di ammissibilità. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export function readPhoto(file: File): Promise<{ dataUrl: string | null; error: string | null }> {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve({ dataUrl: null, error: 'Serve un’immagine: JPG, PNG o HEIC.' })
            return
        }
        if (file.size > MAX_PHOTO_BYTES) {
            resolve({ dataUrl: null, error: 'La foto supera i 5 MB. Provane una più leggera.' })
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => resolve({ dataUrl: reader.result as string, error: null })
        reader.onerror = () => resolve({ dataUrl: null, error: 'Non sono riuscito a leggere la foto.' })
        reader.readAsDataURL(file)
    })
}
