import type { Pattern } from './texture.ts'
export interface VisualizerRequest {
    roomImage: string; tileImage: string; productId?: string; surface: 'floor' | 'wall'
    layingPattern: Pattern; tileWidth?: number; tileHeight?: number; tileScale: number; debug: boolean
}
export function validateInput(value: unknown): VisualizerRequest {
    const v = value as Partial<VisualizerRequest> | null
    if (!v || typeof v.roomImage !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(v.roomImage)
        || typeof v.tileImage !== 'string' || !v.tileImage) throw new Error('Carica una foto JPG, PNG o WebP e scegli una piastrella.')
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(v.tileImage)) {
        const url = new URL(v.tileImage)
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('URL della piastrella non valido.')
    }
    if (v.surface !== undefined && v.surface !== 'floor' && v.surface !== 'wall') throw new Error('Superficie non valida.')
    if (v.layingPattern !== undefined && !['dritta', 'diagonale', 'correre', 'spina', 'mosaico'].includes(v.layingPattern)) throw new Error('Schema di posa non valido.')
    const tileScale = v.tileScale ?? 1
    if (typeof tileScale !== 'number' || !Number.isFinite(tileScale) || tileScale < .5 || tileScale > 2) throw new Error('Scala non valida.')
    return { roomImage: v.roomImage, tileImage: v.tileImage, productId: typeof v.productId === 'string' ? v.productId : undefined,
        surface: v.surface ?? 'floor', layingPattern: v.layingPattern ?? 'dritta', tileWidth: v.tileWidth, tileHeight: v.tileHeight, tileScale, debug: v.debug === true }
}
export function tileFormatCm(product: { format_width?: number; format_height?: number } | null, width?: number, height?: number): { w: number; h: number } {
    const pair = [[product?.format_width, product?.format_height], [width, height]]
        .find(p => p.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 10 && n <= 5000))
    if (!pair) throw new Error('Mancano le misure della piastrella. Completa larghezza e altezza nella scheda prodotto.')
    // Preserve decimal centimetres: 75 mm is 7.5 cm, not 8 cm.
    return { w: pair[0]! / 10, h: pair[1]! / 10 }
}
