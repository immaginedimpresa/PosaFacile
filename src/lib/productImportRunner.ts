import type { PlannedImportRow, ProductInsert } from './productCsvImport.ts'

export type ImportOutcome =
    | 'created'
    | 'updated'
    | 'skipped'
    | 'invalid'
    | 'failed'
    | 'uncertain'
    | 'pending'
export interface ImportResult {
    line: number
    sku: string
    outcome: ImportOutcome
    message: string
}
export interface ImportWriteError {
    message: string
    code?: string
}
export interface ImportWriter {
    create: (products: ProductInsert[]) => Promise<ImportWriteError | null>
    update: (
        id: string,
        patch: Partial<ProductInsert>,
    ) => Promise<ImportWriteError | null>
}
export interface ImportProgress {
    completed: number
    total: number
    results: ImportResult[]
}

/** A batch is atomic. Split confirmed constraint failures only, never uncertain network failures. */
export async function runProductImport(
    plan: PlannedImportRow[],
    writer: ImportWriter,
    onProgress: (progress: ImportProgress) => void,
    shouldStop: () => boolean,
): Promise<ImportResult[]> {
    const results = new Map<number, ImportResult>()
    const put = (
        row: PlannedImportRow,
        outcome: ImportOutcome,
        message: string,
    ) =>
        results.set(row.line, {
            line: row.line,
            sku: row.product.sku,
            outcome,
            message,
        })
    plan.forEach((row) => {
        if (row.action === 'skip')
            put(
                row,
                'skipped',
                'SKU già presente: prodotto lasciato invariato.',
            )
        if (row.action === 'invalid') put(row, 'invalid', row.errors.join(' '))
    })
    const report = () =>
        onProgress({
            completed: results.size,
            total: plan.length,
            results: [...results.values()],
        })
    let uncertain = false
    const write = async (
        operation: () => Promise<ImportWriteError | null>,
    ): Promise<ImportWriteError | null> => {
        try {
            return await operation()
        } catch {
            return {
                message: 'Connessione interrotta: esito non verificabile.',
            }
        }
    }
    const markError = (rows: PlannedImportRow[], error: ImportWriteError) => {
        const knownFailure = Boolean(
            error.code && /^(?:\d{5}|PGRST\d+)$/.test(error.code),
        )
        rows.forEach((row) =>
            put(
                row,
                knownFailure ? 'failed' : 'uncertain',
                knownFailure
                    ? error.message
                    : 'Esito non verificabile. Controlla lo SKU nel catalogo prima di riprovare. ' +
                          error.message,
            ),
        )
        if (!knownFailure || error.code === '42501') uncertain = true
    }
    report()
    const creates = plan.filter((row) => row.action === 'create')
    for (
        let start = 0;
        start < creates.length && !shouldStop() && !uncertain;
        start += 50
    ) {
        const batch = creates.slice(start, start + 50)
        const error = await write(() =>
            writer.create(batch.map((row) => row.product)),
        )
        if (!error)
            batch.forEach((row) => put(row, 'created', 'Prodotto creato.'))
        else if (error.code?.startsWith('23') || error.code?.startsWith('22')) {
            // PostgreSQL rejected the entire batch. Isolate rows without losing valid products.
            for (const row of batch) {
                if (shouldStop() || uncertain) break
                const rowError = await write(() => writer.create([row.product]))
                if (rowError) markError([row], rowError)
                else put(row, 'created', 'Prodotto creato.')
                report()
            }
        } else markError(batch, error)
        report()
    }
    const updates = plan.filter((row) => row.action === 'update')
    for (
        let start = 0;
        start < updates.length && !shouldStop() && !uncertain;
        start += 4
    ) {
        const batch = updates.slice(start, start + 4)
        await Promise.all(
            batch.map(async (row) => {
                const error = await write(() =>
                    writer.update(row.existingId!, row.patch),
                )
                if (error) markError([row], error)
                else
                    put(
                        row,
                        'updated',
                        'Aggiornati solo i campi associati e non vuoti.',
                    )
            }),
        )
        report()
    }
    plan.forEach((row) => {
        if (!results.has(row.line))
            put(
                row,
                'pending',
                'Non importato: caricamento interrotto prima di questa riga.',
            )
    })
    return plan.map((row) => results.get(row.line)!)
}
