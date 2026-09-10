import type { Database } from '@/types/supabase'
import type { CsvDocument, CsvRecord } from './csv.ts'

export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ImportField =
    Exclude<keyof ProductInsert, 'id' | 'created_at' | 'updated_at'> | 'format'
export type FieldMapping = Partial<Record<ImportField, number>>
export type EnumField = 'category' | 'material' | 'finish' | 'status'
export type ValueMapping = Partial<Record<EnumField, Record<string, string>>>
export interface ImportOptions {
    numberFormat: 'it' | 'en'
    dimensionUnit: 'mm' | 'cm'
    category: NonNullable<ProductInsert['category']>
    material: NonNullable<ProductInsert['material']>
    status: NonNullable<ProductInsert['status']>
    duplicates: 'skip' | 'update'
}
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
    numberFormat: 'it',
    dimensionUnit: 'mm',
    category: 'floor',
    material: 'gres',
    status: 'draft',
    duplicates: 'skip',
}
interface FieldDefinition {
    key: ImportField
    label: string
    aliases: string[]
    required?: boolean
    hint?: string
}
export const IMPORT_FIELDS: FieldDefinition[] = [
    {
        key: 'sku',
        label: 'SKU / codice articolo',
        required: true,
        aliases: [
            'codice',
            'codice articolo',
            'codice prodotto',
            'article code',
            'product code',
            'reference',
            'referenza',
            'cod art',
        ],
    },
    {
        key: 'name',
        label: 'Nome prodotto',
        required: true,
        aliases: [
            'nome',
            'nome articolo',
            'prodotto',
            'articolo',
            'product name',
            'titolo',
            'denominazione',
        ],
    },
    {
        key: 'price_per_sqm',
        label: 'Prezzo vendita €/m²',
        required: true,
        aliases: [
            'prezzo',
            'prezzo vendita',
            'prezzo mq',
            'prezzo al mq',
            'prezzo vendita mq',
            'prezzo vendita m2',
            'listino',
            'price',
            'price sqm',
            'prezzo euro mq',
        ],
    },
    {
        key: 'category',
        label: 'Categoria',
        aliases: [
            'categoria',
            'destinazione',
            'destinazione uso',
            'tipo prodotto',
            'tipologia',
        ],
    },
    {
        key: 'material',
        label: 'Materiale',
        aliases: ['materiale', 'composizione'],
    },
    {
        key: 'format',
        label: 'Formato completo',
        aliases: [
            'formato',
            'dimensioni',
            'dimensione',
            'size',
            'misura',
            'misure',
        ],
        hint: 'Esempio: 60x120 cm. Le colonne larghezza e altezza, se associate, prevalgono.',
    },
    {
        key: 'format_width',
        label: 'Larghezza',
        aliases: [
            'larghezza',
            'width',
            'larghezza mm',
            'larghezza cm',
            'width mm',
            'width cm',
            'formato larghezza',
        ],
    },
    {
        key: 'format_height',
        label: 'Altezza / lunghezza',
        aliases: [
            'altezza',
            'lunghezza',
            'height',
            'length',
            'altezza mm',
            'altezza cm',
            'lunghezza mm',
            'lunghezza cm',
            'height mm',
            'height cm',
        ],
    },
    {
        key: 'thickness',
        label: 'Spessore (mm)',
        aliases: ['spessore', 'spessore mm', 'thickness mm'],
    },
    {
        key: 'finish',
        label: 'Finitura',
        aliases: ['finitura', 'superficie', 'surface'],
    },
    {
        key: 'color_name',
        label: 'Colore',
        aliases: ['colore', 'color', 'colour', 'nome colore'],
    },
    {
        key: 'color_hex',
        label: 'Colore HEX',
        aliases: ['hex', 'colore hex', 'codice colore'],
        hint: 'Esempio: #D4B896.',
    },
    {
        key: 'description',
        label: 'Descrizione',
        aliases: [
            'descrizione',
            'descrizione prodotto',
            'description long',
            'descrizione estesa',
        ],
    },
    {
        key: 'cost_per_sqm',
        label: 'Prezzo acquisto €/m²',
        aliases: [
            'costo',
            'cost',
            'prezzo acquisto',
            'costo mq',
            'prezzo acquisto mq',
            'costo m2',
        ],
    },
    {
        key: 'stock_qty',
        label: 'Giacenza (m²)',
        aliases: [
            'stock',
            'giacenza',
            'quantita',
            'disponibilita',
            'stock quantity',
            'giacenza mq',
            'stock mq',
        ],
    },
    {
        key: 'min_order_sqm',
        label: 'Ordine minimo (m²)',
        aliases: ['ordine minimo', 'minimo ordine', 'min order', 'minimo mq'],
    },
    {
        key: 'lead_time_days',
        label: 'Approvvigionamento (giorni)',
        aliases: [
            'lead time',
            'giorni consegna',
            'tempi consegna',
            'consegna giorni',
            'giorni approvvigionamento',
        ],
    },
    {
        key: 'images',
        label: 'Immagini (URL)',
        aliases: [
            'immagini',
            'immagine',
            'image',
            'image url',
            'url immagine',
            'foto',
            'url foto',
        ],
        hint: 'URL completi separati da | oppure un array JSON. I file locali non vengono caricati.',
    },
    {
        key: 'tileable_image_url',
        label: 'Texture AI (URL)',
        aliases: ['texture', 'texture url', 'url texture', 'immagine ai'],
    },
    {
        key: 'datasheet_url',
        label: 'Scheda tecnica (URL)',
        aliases: ['scheda tecnica', 'scheda tecnica url', 'datasheet', 'pdf'],
    },
    {
        key: 'style_tags',
        label: 'Tag di stile',
        aliases: ['stile', 'tag', 'tags', 'stili'],
        hint: 'Valori separati da | oppure array JSON.',
    },
    {
        key: 'certifications',
        label: 'Certificazioni',
        aliases: ['certificazioni', 'certification'],
        hint: 'Valori separati da | oppure array JSON.',
    },
    {
        key: 'status',
        label: 'Stato prodotto',
        aliases: ['stato', 'stato prodotto', 'pubblicazione'],
    },
    {
        key: 'slug',
        label: 'Slug / indirizzo prodotto',
        aliases: ['url slug', 'permalink'],
        hint: 'Se assente, viene generato da nome e SKU solo per i nuovi prodotti.',
    },
    {
        key: 'seo_title',
        label: 'Titolo SEO',
        aliases: ['titolo seo', 'meta title'],
    },
    {
        key: 'seo_description',
        label: 'Descrizione SEO',
        aliases: ['descrizione seo', 'meta description'],
    },
    {
        key: 'supplier_id',
        label: 'ID fornitore',
        aliases: ['id fornitore', 'supplier uuid'],
        hint: 'UUID del fornitore, non il suo nome.',
    },
]
export const ENUM_OPTIONS = {
    category: [
        {
            value: 'floor',
            label: 'Pavimento',
            aliases: ['pavimenti', 'flooring'],
        },
        {
            value: 'wall',
            label: 'Rivestimento',
            aliases: ['rivestimenti', 'parete', 'pareti'],
        },
        {
            value: 'outdoor',
            label: 'Esterno',
            aliases: ['esterni', 'outdoors'],
        },
        { value: 'mosaic', label: 'Mosaico', aliases: ['mosaici'] },
    ],
    material: [
        {
            value: 'gres',
            label: 'Gres porcellanato',
            aliases: [
                'gres',
                'porcellanato',
                'porcelain',
                'porcelain stoneware',
            ],
        },
        { value: 'ceramic', label: 'Ceramica', aliases: ['ceramiche'] },
        { value: 'cotto', label: 'Cotto', aliases: ['terracotta'] },
        {
            value: 'natural_stone',
            label: 'Pietra naturale',
            aliases: ['pietra', 'marmo', 'marble', 'stone'],
        },
    ],
    finish: [
        {
            value: 'matt',
            label: 'Opaco',
            aliases: ['opaca', 'matte', 'naturale'],
        },
        { value: 'glossy', label: 'Lucido', aliases: ['lucida', 'polished'] },
        {
            value: 'textured',
            label: 'Strutturato',
            aliases: ['strutturata', 'antiscivolo'],
        },
        { value: 'lappato', label: 'Lappato', aliases: ['lappata'] },
    ],
    status: [
        { value: 'draft', label: 'Bozza', aliases: ['bozze'] },
        {
            value: 'active',
            label: 'Attivo',
            aliases: ['attiva', 'pubblicato', 'pubblicata', 'online'],
        },
        {
            value: 'out_of_stock',
            label: 'Esaurito',
            aliases: ['esaurita', 'non disponibile'],
        },
        {
            value: 'discontinued',
            label: 'Sospeso',
            aliases: ['sospesa', 'fuori produzione'],
        },
    ],
} as const
export const ENUM_FIELDS: EnumField[] = [
    'category',
    'material',
    'finish',
    'status',
]
export function normalizeHeader(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/€/g, ' euro ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
}
export function suggestMapping(headers: string[]): FieldMapping {
    const mapping: FieldMapping = {}
    const used = new Set<number>()
    for (const field of IMPORT_FIELDS) {
        const names = [field.key, field.label, ...field.aliases].map(
            normalizeHeader,
        )
        const index = headers.findIndex(
            (header, column) =>
                !used.has(column) && names.includes(normalizeHeader(header)),
        )
        if (index >= 0) {
            mapping[field.key] = index
            used.add(index)
        }
    }
    return mapping
}
export function resolveEnum(
    field: EnumField,
    raw: string,
    values: ValueMapping,
): string | undefined {
    const normalized = normalizeHeader(raw)
    const explicit = values[field]?.[normalized]
    if (
        explicit &&
        ENUM_OPTIONS[field].some((option) => option.value === explicit)
    )
        return explicit
    return ENUM_OPTIONS[field].find((option) =>
        [option.value, option.label, ...option.aliases].some(
            (alias) => normalizeHeader(alias) === normalized,
        ),
    )?.value
}
export function unknownEnumValues(
    document: CsvDocument,
    mapping: FieldMapping,
    values: ValueMapping,
) {
    return ENUM_FIELDS.flatMap((field) => {
        const column = mapping[field]
        if (column === undefined) return []
        const unique = new Map<
            string,
            { field: EnumField; raw: string; count: number }
        >()
        document.rows.forEach((row) => {
            const raw = row.cells[column]?.trim()
            if (!raw || resolveEnum(field, raw, {})) return
            const key = normalizeHeader(raw)
            const current = unique.get(key)
            unique.set(key, { field, raw, count: (current?.count || 0) + 1 })
        })
        return [...unique.values()].map((value) => ({
            ...value,
            selected: values[field]?.[normalizeHeader(value.raw)] || '',
        }))
    })
}

export function parseImportNumber(raw: string, format: 'it' | 'en'): number {
    let value = raw
        .trim()
        .replace(/(?:€|EUR)/gi, '')
        .replace(/\s/g, '')
    value = value.replace(/\/(?:m²|m2|mq)$/i, '')
    if (format === 'it') {
        if (value.includes(',')) {
            if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+$/.test(value))
                throw new Error('Numero non valido (esempio: 1.234,50).')
            value = value.replace(/\./g, '').replace(',', '.')
        } else if (/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(value))
            value = value.replace(/\./g, '')
    } else if (value.includes(',')) {
        if (!/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(value))
            throw new Error('Numero non valido (esempio: 1,234.50).')
        value = value.replace(/,/g, '')
    }
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))
        throw new Error('Inserisci un numero valido.')
    return Number(value)
}
function dimension(raw: string, header: string, options: ImportOptions) {
    const suffix = raw.match(/\s*(mm|cm)\s*$/i)
    const unit =
        suffix?.[1].toLowerCase() ||
        (/\bcm\b/i.test(header)
            ? 'cm'
            : /\bmm\b/i.test(header)
              ? 'mm'
              : options.dimensionUnit)
    const value =
        parseImportNumber(
            raw.replace(/\s*(mm|cm)\s*$/i, ''),
            options.numberFormat,
        ) * (unit === 'cm' ? 10 : 1)
    if (value <= 0 || !Number.isInteger(value) || value > 2147483647)
        throw new Error(
            'Il formato deve corrispondere a millimetri interi maggiori di zero.',
        )
    return value
}
function arrayValue(raw: string): string[] {
    if (raw.trim().startsWith('[')) {
        const value: unknown = JSON.parse(raw)
        if (
            !Array.isArray(value) ||
            value.some((item) => typeof item !== 'string')
        )
            throw new Error(
                'Usa un array di testi oppure valori separati da |.',
            )
        return value.map((item) => (item as string).trim()).filter(Boolean)
    }
    return raw
        .split('|')
        .map((value) => value.trim())
        .filter(Boolean)
}
function validUrl(value: string) {
    try {
        const url = new URL(value)
        return (
            ['http:', 'https:'].includes(url.protocol) &&
            Boolean(url.hostname) &&
            !url.username &&
            !url.password
        )
    } catch {
        return false
    }
}
function slugify(value: string) {
    return normalizeHeader(value).replace(/ /g, '-')
}
export interface ValidatedImportRow {
    line: number
    source: CsvRecord
    product: ProductInsert
    /** Only nonempty, mapped cells, for updating existing products. */
    patch: Partial<ProductInsert>
    errors: string[]
    warnings: string[]
}
const numericFields: ImportField[] = [
    'price_per_sqm',
    'cost_per_sqm',
    'stock_qty',
    'min_order_sqm',
    'lead_time_days',
    'thickness',
]
export function validateImport(
    document: CsvDocument,
    mapping: FieldMapping,
    options: ImportOptions,
    values: ValueMapping = {},
): ValidatedImportRow[] {
    const rows = document.rows.map((source) => {
        const errors: string[] = []
        const warnings: string[] = []
        const patch: Record<string, unknown> = {}
        if (source.cells.length !== document.headers.length)
            errors.push(
                `La riga ha ${source.cells.length} colonne; ne erano previste ${document.headers.length}.`,
            )
        for (const field of IMPORT_FIELDS) {
            const column = mapping[field.key]
            const raw =
                column === undefined ? '' : (source.cells[column] || '').trim()
            if (!raw) {
                if (field.required)
                    errors.push(`${field.label}: valore obbligatorio.`)
                continue
            }
            try {
                if (ENUM_FIELDS.includes(field.key as EnumField)) {
                    const value = resolveEnum(
                        field.key as EnumField,
                        raw,
                        values,
                    )
                    if (!value)
                        throw new Error(
                            `“${raw}” non riconosciuto: associa il valore o correggi il file.`,
                        )
                    patch[field.key] = value
                } else if (field.key === 'format') {
                    const match = raw.match(
                        /^\s*([\d.,]+)\s*[x×X*]\s*([\d.,]+)\s*(mm|cm)?\s*$/i,
                    )
                    if (!match)
                        throw new Error('Usa un formato come 60x120 cm.')
                    const unit = match[3] || ''
                    patch.format_width = dimension(
                        match[1] + unit,
                        document.headers[column!],
                        options,
                    )
                    patch.format_height = dimension(
                        match[2] + unit,
                        document.headers[column!],
                        options,
                    )
                } else if (
                    field.key === 'format_width' ||
                    field.key === 'format_height'
                )
                    patch[field.key] = dimension(
                        raw,
                        document.headers[column!],
                        options,
                    )
                else if (numericFields.includes(field.key)) {
                    const number = parseImportNumber(raw, options.numberFormat)
                    if (
                        number < 0 ||
                        ([
                            'price_per_sqm',
                            'min_order_sqm',
                            'thickness',
                        ].includes(field.key) &&
                            number === 0)
                    )
                        throw new Error(
                            'Il valore deve essere positivo (zero consentito solo per costo, stock e giorni).',
                        )
                    if (field.key === 'lead_time_days') {
                        if (!Number.isInteger(number) || number > 2147483647)
                            throw new Error('Usa un numero intero di giorni.')
                    } else if (
                        number >
                            (field.key === 'thickness'
                                ? 999.99
                                : 99999999.99) ||
                        Math.abs(number * 100 - Math.round(number * 100)) >
                            0.000001
                    )
                        throw new Error(
                            'Usa al massimo due decimali e un valore entro i limiti del campo.',
                        )
                    patch[field.key] = number
                } else if (
                    ['images', 'style_tags', 'certifications'].includes(
                        field.key,
                    )
                ) {
                    const list = arrayValue(raw)
                    if (
                        field.key === 'images' &&
                        list.some((url) => !validUrl(url))
                    )
                        throw new Error(
                            'Le immagini devono essere URL http/https completi, separati da |.',
                        )
                    patch[field.key] = list
                } else if (
                    field.key === 'datasheet_url' ||
                    field.key === 'tileable_image_url'
                ) {
                    if (!validUrl(raw))
                        throw new Error('Inserisci un URL http/https completo.')
                    patch[field.key] = raw
                } else if (field.key === 'color_hex') {
                    if (!/^#?[\da-f]{6}$/i.test(raw))
                        throw new Error(
                            'Usa un colore HEX a 6 cifre, ad esempio #D4B896.',
                        )
                    patch[field.key] = '#' + raw.replace(/^#/, '').toUpperCase()
                } else if (field.key === 'supplier_id') {
                    if (
                        !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(raw)
                    )
                        throw new Error('Serve un UUID valido del fornitore.')
                    patch[field.key] = raw
                } else {
                    const max =
                        field.key === 'sku'
                            ? 50
                            : field.key === 'color_name'
                              ? 100
                              : ['name', 'slug', 'seo_title'].includes(
                                      field.key,
                                  )
                                ? 255
                                : 20000
                    if (raw.length > max)
                        throw new Error(`Massimo ${max} caratteri.`)
                    if (
                        field.key === 'slug' &&
                        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)
                    )
                        throw new Error(
                            'Usa lettere minuscole, numeri e trattini.',
                        )
                    patch[field.key] = raw
                }
            } catch (error) {
                errors.push(
                    `${field.label}: ${error instanceof Error ? error.message : 'Valore non valido.'}`,
                )
            }
        }
        const typedPatch = patch as Partial<ProductInsert>
        const product: ProductInsert = {
            category: options.category,
            material: options.material,
            status: options.status,
            min_order_sqm: 1,
            stock_qty: 0,
            lead_time_days: 7,
            images: [],
            ...typedPatch,
            sku: typedPatch.sku || '',
            name: typedPatch.name || '',
            price_per_sqm: typedPatch.price_per_sqm || 0,
            slug:
                typedPatch.slug ||
                slugify(`${typedPatch.name || ''}-${typedPatch.sku || ''}`)
                    .slice(0, 255)
                    .replace(/-$/, ''),
        }
        if (!product.slug)
            errors.push(
                'Impossibile generare lo slug: associa una colonna slug valida.',
            )
        if (!Array.isArray(product.images) || !product.images.length)
            warnings.push('Nessuna immagine: completala dalla scheda prodotto.')
        if (!product.format_width || !product.format_height)
            warnings.push(
                'Formato incompleto: influenza la stima dei giorni di posa.',
            )
        // Creation uses the first photo as its AI texture, consistently with the product form.
        if (
            !product.tileable_image_url &&
            Array.isArray(product.images) &&
            typeof product.images[0] === 'string'
        )
            product.tileable_image_url = product.images[0]
        return {
            line: source.line,
            source,
            product,
            patch: typedPatch,
            errors,
            warnings,
        }
    })
    const skuCounts = new Map<string, number>()
    rows.forEach((row) => {
        if (row.product.sku)
            skuCounts.set(
                row.product.sku,
                (skuCounts.get(row.product.sku) || 0) + 1,
            )
    })
    rows.forEach((row) => {
        if ((skuCounts.get(row.product.sku) || 0) > 1)
            row.errors.push(
                `SKU “${row.product.sku}” ripetuto nel CSV: mantieni una sola riga per articolo.`,
            )
    })
    return rows
}
export interface ExistingProduct {
    id: string
    sku: string
    slug: string
}
export interface PlannedImportRow extends ValidatedImportRow {
    action: 'create' | 'update' | 'skip' | 'invalid'
    existingId?: string
}
export function planImport(
    rows: ValidatedImportRow[],
    existing: ExistingProduct[],
    duplicates: ImportOptions['duplicates'],
): PlannedImportRow[] {
    const bySku = new Map(existing.map((product) => [product.sku, product]))
    const bySlug = new Map(existing.map((product) => [product.slug, product]))
    const plan: PlannedImportRow[] = rows.map((row) => {
        const current = bySku.get(row.product.sku)
        const errors = [...row.errors]
        const action = errors.length
            ? 'invalid'
            : current
              ? duplicates === 'skip'
                  ? 'skip'
                  : 'update'
              : 'create'
        const slug =
            action === 'update'
                ? row.patch.slug || current!.slug
                : row.product.slug
        const owner = bySlug.get(slug)
        if (action !== 'skip' && owner && owner.sku !== row.product.sku)
            errors.push(
                `Slug “${slug}” già usato da SKU ${owner.sku}. Associa uno slug diverso.`,
            )
        return {
            ...row,
            product: { ...row.product, slug },
            warnings: current
                ? []
                : row.warnings,
            errors,
            action: errors.length ? 'invalid' : action,
            existingId: current?.id,
        }
    })
    const slugs = new Map<string, PlannedImportRow[]>()
    plan.filter(
        (row) => row.action === 'create' || row.action === 'update',
    ).forEach((row) =>
        slugs.set(row.product.slug, [
            ...(slugs.get(row.product.slug) || []),
            row,
        ]),
    )
    slugs.forEach((group) => {
        if (group.length > 1)
            group.forEach((row) => {
                row.errors.push(
                    'Slug ripetuto tra i prodotti da importare. Associa indirizzi diversi.',
                )
                row.action = 'invalid'
            })
    })
    return plan
}
