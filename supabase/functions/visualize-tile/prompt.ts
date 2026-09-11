// Tutto ciò che arriva al modello in forma di testo, in un file solo.
//
// Sta separato dal gestore della richiesta per una ragione pratica: così si può
// leggere per intero, e si vede a colpo d'occhio che gli unici ingressi sono la
// superficie, il nome dello schema e due numeri. Nessun campo del catalogo può
// entrarci, perché la funzione non ha modo di riceverlo.

export type Surface = 'floor' | 'wall'

/**
 * I rapporti d'aspetto che il modello accetta.
 *
 * Senza, normalizza a 1:1 e restituisce una foto re-inquadrata. `2:3` c'è
 * perché è il taglio di uno scatto verticale da telefono, cioè il caso più
 * frequente, e senza finiva su 3:4.
 */
const SUPPORTED_RATIOS: [string, number][] = [
    ['9:16', 9 / 16], ['2:3', 2 / 3], ['3:4', 3 / 4], ['4:5', 4 / 5], ['1:1', 1],
    ['5:4', 5 / 4], ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9], ['21:9', 21 / 9],
]

export function nearestAspectRatio(width: number, height: number): string {
    const target = width / height
    return SUPPORTED_RATIOS.reduce((best, r) =>
        Math.abs(Math.log(r[1] / target)) < Math.abs(Math.log(best[1] / target)) ? r : best)[0]
}

/**
 * Il nome dello schema serve solo a dare al modello il nome di quello che sta
 * guardando. La geometria è già nei pixel dello swatch: qui non si descrive.
 */
export const PATTERN_NAME: Record<string, string> = {
    dritta: 'straight grid',
    diagonale: 'diagonal (diamond)',
    correre: 'running bond',
    spina: 'herringbone',
    mosaico: 'mosaic sheets',
}

/**
 * Il prompt.
 *
 * Dice una cosa sola, da tre angolazioni: la seconda immagine è la superficie
 * finita vista dall'alto, e l'unico compito è rimetterla nella stanza in
 * prospettiva. Materiale e disposizione non sono in discussione, perché sono
 * già decisi nei pixel che gli stiamo passando — ed è questa la differenza
 * rispetto alla v1, che descriveva la posa a parole e chiedeva al modello di
 * ignorare quella visibile nel campione.
 */
export function buildPrompt(surface: Surface, patternName: string, w: number, h: number): string {
    const target = surface === 'wall' ? 'wall surface' : 'floor surface'
    const untouched = surface === 'wall'
        ? 'floor, ceiling, furniture, sanitary ware, mirrors, doors, windows and every object'
        : 'walls, ceiling, furniture, rugs, doors, windows and every object'

    return `Photorealistic interior photograph edit.

FIRST image: the real photograph to edit. Its framing, perspective and lighting are fixed.
SECOND image: the finished surface seen from directly above, flat, with no perspective. This is
the material and the layout to lay — both are already decided here.

TASK: re-lay the ${target} of the room in the FIRST image with the surface of the SECOND image.

The SECOND image decides the material and the layout. Reproduce its colour, tone, veining, grain
and texture faithfully, and keep its ${patternName} arrangement exactly: same tile proportions,
same joints, same alignment. Do not substitute anything else and do not simplify, rotate or
straighten the layout.

The FIRST image decides everything else. Lay the surface in the room's own perspective, converging
on its vanishing points, with the tiles at true scale for a ${w}x${h} cm tile, so their number
across the room is physically right. Relight the new surface with the room's own light: keep the
patches of sunlight, the soft shadows and the darkening in the corners exactly where they fall
now, and add the contact shadows where furniture meets the new surface. Match the reflections to
how glossy the surface in the SECOND image looks.${surface === 'floor' ? `

Rugs and carpets are NOT the floor: they stay exactly as they are, lying on top of the new tiles.
Do not retexture, restyle or remove them. Tile the bare floor around and beyond them.` : `

Skirting boards, door frames and window frames are NOT the wall: leave them as they are.`}

Everything except the ${target} must stay identical to the FIRST image: ${untouched} keep their
position, shape, colour and lighting. Do not crop, rotate or re-frame the photograph.

Output: the edited photograph only.`
}
