import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeCsv, encodeCsv, parseCsv, CSV_MAX_ROWS } from '../src/lib/csv.ts'
import { DEFAULT_IMPORT_OPTIONS, normalizeHeader, parseImportNumber, planImport, suggestMapping, unknownEnumValues, validateImport, type ImportOptions, type PlannedImportRow } from '../src/lib/productCsvImport.ts'
import { runProductImport, type ImportWriter } from '../src/lib/productImportRunner.ts'

const options: ImportOptions = { ...DEFAULT_IMPORT_OPTIONS }
const validate = (text: string, custom = options) => {
    const csv = parseCsv(text)
    return validateImport(csv, suggestMapping(csv.headers), custom)
}
const sample = 'sku;name;price_per_sqm\nTILE-1;Pietra naturale;29,90'
const creates = (count: number): PlannedImportRow[] => planImport(validate('sku;name;price_per_sqm\n' + Array.from({length: count}, (_, i) => `SKU-${i};Tile ${i};20`).join('\n')), [], 'skip')

test('reads Excel BOM, separator declaration, CRLF, quotes and embedded newlines with source line numbers', () => {
    const csv = parseCsv('\uFEFFsep=;\r\nCodice;Nome;Prezzo;Descrizione\r\n001;"Pietra; bianca";"29,90";"Una ""bella""\r\npiastrella"\r\n\r\n002;Seconda;30;Descrizione')
    assert.equal(csv.delimiter, ';')
    assert.deepEqual(csv.rows.map(row => row.line), [3, 6])
    assert.equal(csv.rows[0].cells[0], '001')
    assert.equal(csv.rows[0].cells[1], 'Pietra; bianca')
    assert.equal(csv.rows[0].cells[3], 'Una "bella"\r\npiastrella')
})
test('detects comma, tab and pipe exports with quoted delimiters', () => {
    for (const delimiter of [',', '\t', '|'] as const) {
        const csv = parseCsv(['sku', 'name', 'price_per_sqm'].join(delimiter) + '\n' + ['001', '"Name, with; punctuation"', '20.50'].join(delimiter))
        assert.equal(csv.delimiter, delimiter)
        assert.equal(csv.rows[0].cells.length, 3)
    }
})
test('supports headerless files and an explicit separator override', () => {
    const csv = parseCsv('001;Pietra;29,90\n002;Legno;32', ';', false)
    assert.deepEqual(csv.headers, ['Colonna 1', 'Colonna 2', 'Colonna 3'])
    assert.equal(csv.rows[0].line, 1)
    assert.equal(csv.rows.length, 2)
})
test('does not merge duplicate or empty headers', () => {
    const csv = parseCsv('sku;Nome;Nome;\nA;Pietra;Bianca;altro')
    assert.equal(csv.headers.length, 4)
    assert.equal(csv.headers[3], 'Colonna 4')
    assert.equal(suggestMapping(csv.headers).name, 1)
})
test('rejects malformed quotes, header-only, empty and oversize row count files', () => {
    assert.throws(() => parseCsv('sku;name\nA;"open'), /chiusura/)
    assert.throws(() => parseCsv('sku;name\nA;"value"extra'), /inatteso/)
    assert.throws(() => parseCsv('sku;name'), /senza prodotti/)
    assert.throws(() => parseCsv(''), /vuoto/)
    assert.throws(() => parseCsv('sku;name\n' + 'A;N\n'.repeat(CSV_MAX_ROWS + 1)), /al massimo/)
})
test('decodes UTF-8, UTF-16LE and legacy Windows accents', () => {
    assert.equal(decodeCsv(new TextEncoder().encode('Grès').buffer), 'Grès')
    assert.equal(decodeCsv(Uint8Array.from([0xff, 0xfe, 0x47, 0, 0x72, 0, 0xe8, 0, 0x73, 0]).buffer), 'Grès')
    assert.equal(decodeCsv(Uint8Array.from([0x47, 0x72, 0xe8, 0x73]).buffer), 'Grès')
})
test('recognizes Italian and English headers and assigns each source only once', () => {
    const mapping = suggestMapping(['Codice articolo', 'Nome prodotto', 'Prezzo vendita €/m²', 'Giacenza', 'Larghezza cm', 'Materiale', 'Image URL'])
    assert.deepEqual(mapping, { sku: 0, name: 1, price_per_sqm: 2, material: 5, format_width: 4, stock_qty: 3, images: 6 })
    assert.equal(normalizeHeader('  Prezzo_€/m²  '), 'prezzo euro m2')
})
test('parses explicit Italian and international numeric conventions without truncation', () => {
    assert.equal(parseImportNumber('€ 1.234,50/m²', 'it'), 1234.5)
    assert.equal(parseImportNumber('29.90', 'it'), 29.9)
    assert.equal(parseImportNumber('1.234', 'it'), 1234)
    assert.equal(parseImportNumber('1,234.50', 'en'), 1234.5)
    assert.throws(() => parseImportNumber('29,90', 'en'))
    assert.throws(() => parseImportNumber('29abc', 'it'))
    assert.throws(() => parseImportNumber('Infinity', 'it'))
    assert.throws(() => parseImportNumber('1.2.3', 'it'))
})
test('converts cm formats and explicit width headers into integer mm', () => {
    const row = validate(sample + ';bad') // Deliberate extra column must not vanish.
    assert(row[0].errors.some(error => error.includes('colonne')))
    const valid = validate('sku;name;price_per_sqm;Formato;Larghezza cm;Spessore\nA;Pietra;20;60x120 cm;80;9,5')[0]
    assert.deepEqual(valid.errors, [])
    assert.equal(valid.product.format_width, 800)
    assert.equal(valid.product.format_height, 1200)
    assert.equal(valid.product.thickness, 9.5)
    assert.equal(validate('sku;name;price_per_sqm;Formato\nA;Pietra;20;60×120', {...options, dimensionUnit: 'cm'})[0].product.format_width, 600)
})
test('maps enum synonyms and explicitly associates incompatible supplier values', () => {
    const csv = parseCsv('Codice;Nome;Prezzo;Categoria;Materiale;Finitura\nA;Pietra;20;Indoor XXL;Grès porcellanato;Opaca')
    const mapping = suggestMapping(csv.headers)
    assert.equal(unknownEnumValues(csv, mapping, {}).length, 1)
    assert(validateImport(csv, mapping, options)[0].errors.some(error => error.includes('Indoor XXL')))
    const row = validateImport(csv, mapping, options, { category: { 'indoor xxl': 'floor' } })[0]
    assert.deepEqual(row.errors, [])
    assert.equal(row.product.category, 'floor')
    assert.equal(row.product.material, 'gres')
    assert.equal(row.product.finish, 'matt')
})
test('draft defaults apply only to creation and do not become mapped updates', () => {
    const row = validate(sample)[0]
    assert.equal(row.product.status, 'draft')
    assert.equal(row.product.stock_qty, 0)
    assert.equal(row.product.min_order_sqm, 1)
    assert.equal(row.product.lead_time_days, 7)
    assert.equal(row.patch.status, undefined)
    assert.equal(row.patch.slug, undefined)
    assert.equal(row.patch.images, undefined)
    assert.equal(row.product.sku, 'TILE-1')
    assert.deepEqual(row.errors, [])
})
test('rejects missing required values, negative prices, fractional days and oversized fields', () => {
    const rows = validate('sku;name;price_per_sqm;lead_time_days\n;Name;20;7\nB;;20;7\nC;Name;-3;7\nD;Name;20;1.5\nE;Name;100000000;7\nF;Name;20.1234;7')
    rows.forEach(row => assert(row.errors.length > 0, `row ${row.line}`))
    assert(validate(`sku;name;price_per_sqm\n${'a'.repeat(51)};Name;20`)[0].errors.length)
})
test('imports image lists, technical URLs, HEX and tags; rejects unsafe URLs', () => {
    const row = validate('sku;name;price_per_sqm;images;color_hex;style_tags\nA;Name;20;https://example.com/a.jpg|https://example.com/b.jpg;d4b896;classico|pietra')[0]
    assert.deepEqual(row.errors, [])
    assert.deepEqual(row.product.images, ['https://example.com/a.jpg', 'https://example.com/b.jpg'])
    assert.equal(row.product.tileable_image_url, 'https://example.com/a.jpg')
    assert.equal(row.product.color_hex, '#D4B896')
    assert.deepEqual(row.product.style_tags, ['classico', 'pietra'])
    assert(validate('sku;name;price_per_sqm;images\nA;Name;20;javascript:alert(1)')[0].errors.length)
    assert(validate('sku;name;price_per_sqm;images\nA;Name;20;file:///tmp/photo.jpg')[0].errors.length)
})
test('preserves SKU leading zeros and rejects all duplicate SKU rows in the file', () => {
    const rows = validate('sku;name;price_per_sqm\n001;Name;20\n001;Other;30\n002;Last;40')
    assert.equal(rows[0].product.sku, '001')
    assert(rows[0].errors.some(error => error.includes('ripetuto')))
    assert(rows[1].errors.some(error => error.includes('ripetuto')))
    assert.deepEqual(rows[2].errors, [])
})
test('detects existing SKU beyond current UI filters and preserves existing slug on update', () => {
    const rows = validate(sample)
    const existing = [{ id: 'existing-id', sku: 'TILE-1', slug: 'old-url' }]
    assert.equal(planImport(rows, existing, 'skip')[0].action, 'skip')
    const update = planImport(rows, existing, 'update')[0]
    assert.equal(update.action, 'update')
    assert.equal(update.existingId, 'existing-id')
    assert.equal(update.product.slug, 'old-url')
    assert.equal(update.patch.slug, undefined)
})
test('catches slug conflicts in database and within the CSV', () => {
    const rows = validate(sample)
    assert.equal(planImport(rows, [{ id: 'other', sku: 'OTHER', slug: rows[0].product.slug }], 'skip')[0].action, 'invalid')
    const duplicateSlugs = validate('sku;name;price_per_sqm;slug\nA;One;20;same\nB;Two;30;same')
    assert(planImport(duplicateSlugs, [], 'skip').every(row => row.action === 'invalid'))
})
test('downloadable reports escape quotes/newlines and neutralize spreadsheet formulas', () => {
    const csv = encodeCsv([['SKU', 'Detail'], ['=HYPERLINK("bad")', 'Line\nnext'], [' +SUM(1)', '@formula']])
    const decoded = parseCsv(csv)
    assert.equal(decoded.rows[0].cells[0], '\'=HYPERLINK("bad")')
    assert.equal(decoded.rows[0].cells[1], 'Line\nnext')
    assert(decoded.rows[1].cells.every(value => value.startsWith("'")))
})
test('bulk insertion batches 50 records and reports every result', async () => {
    const sizes: number[] = []
    const writer: ImportWriter = { create: async rows => { sizes.push(rows.length); return null }, update: async () => null }
    const result = await runProductImport(creates(123), writer, () => {}, () => false)
    assert.deepEqual(sizes, [50, 50, 23])
    assert.equal(result.filter(row => row.outcome === 'created').length, 123)
})
test('isolates rejected database rows after a confirmed atomic batch failure', async () => {
    const writer: ImportWriter = { create: async rows => rows.length > 1 || rows[0].sku === 'SKU-1' ? { code: '23505', message: 'Duplicate key' } : null, update: async () => null }
    const result = await runProductImport(creates(3), writer, () => {}, () => false)
    assert.deepEqual(result.map(row => row.outcome), ['created', 'failed', 'created'])
})
test('never retries an uncertain network write and stops later batches', async () => {
    let calls = 0
    const writer: ImportWriter = { create: async () => { calls++; throw new Error('Network down') }, update: async () => null }
    const result = await runProductImport(creates(55), writer, () => {}, () => false)
    assert.equal(calls, 1)
    assert.equal(result.filter(row => row.outcome === 'uncertain').length, 50)
    assert.equal(result.filter(row => row.outcome === 'pending').length, 5)
})
test('stop waits for the current batch and records remaining rows as not imported', async () => {
    let stopped = false
    const writer: ImportWriter = { create: async () => { stopped = true; return null }, update: async () => null }
    const result = await runProductImport(creates(55), writer, () => {}, () => stopped)
    assert.equal(result.filter(row => row.outcome === 'created').length, 50)
    assert.equal(result.filter(row => row.outcome === 'pending').length, 5)
})
test('updating uses nonempty mapped cells only, preserving unmentioned stock, images and status', async () => {
    const rows = validate('sku;name;price_per_sqm;images;stock_qty\nA;New name;25;;')
    const plan = planImport(rows, [{ id: 'id-a', sku: 'A', slug: 'existing-url' }], 'update')
    let payload: unknown
    const result = await runProductImport(plan, { create: async () => { throw new Error('Must not insert') }, update: async (id, patch) => { payload = { id, patch }; return null } }, () => {}, () => false)
    assert.deepEqual(payload, { id: 'id-a', patch: { sku: 'A', name: 'New name', price_per_sqm: 25 } })
    assert.equal(result[0].outcome, 'updated')
})
test('skipped and invalid rows never cause database writes', async () => {
    const rows = validate('sku;name;price_per_sqm\nA;Name;20\nB;Name;bad')
    const result = await runProductImport(planImport(rows, [{ id: 'a', sku: 'A', slug: 'existing' }], 'skip'), { create: async () => { assert.fail('Unexpected insert') }, update: async () => { assert.fail('Unexpected update') } }, () => {}, () => false)
    assert.deepEqual(result.map(row => row.outcome), ['skipped', 'invalid'])
})
