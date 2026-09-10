import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    FileUp,
    Link2,
    Loader2,
    RotateCcw,
    X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
    CSV_MAX_BYTES,
    CSV_MAX_ROWS,
    decodeCsv,
    downloadCsv,
    parseCsv,
    type CsvDelimiter,
    type CsvDocument,
} from '@/lib/csv'
import {
    DEFAULT_IMPORT_OPTIONS,
    ENUM_OPTIONS,
    IMPORT_FIELDS,
    normalizeHeader,
    planImport,
    suggestMapping,
    unknownEnumValues,
    validateImport,
    type FieldMapping,
    type ImportOptions,
    type PlannedImportRow,
    type ValueMapping,
} from '@/lib/productCsvImport'
import type { ImportProgress, ImportResult } from '@/lib/productImportRunner'
import {
    findImportConflicts,
    importProductCatalog,
} from '@/services/productImportService'

const inputClass =
    'w-full min-w-0 rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-sm text-stone-800 outline-none transition-colors focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50'
const secondaryButton =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 transition-all hover:bg-stone-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
const actionLabels = {
    create: 'Nuovo',
    update: 'Aggiorna',
    skip: 'Già presente',
    invalid: 'Da correggere',
}
const outcomeLabels = {
    created: 'Creato',
    updated: 'Aggiornato',
    skipped: 'Saltato',
    invalid: 'Non valido',
    failed: 'Errore',
    uncertain: 'Da verificare',
    pending: 'Non importato',
}

interface ImportProductsDialogProps {
    onClose: () => void
    onImported: () => void | Promise<void>
}

export function ImportProductsDialog({
    onClose,
    onImported,
}: ImportProductsDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const stopRef = useRef(false)
    const [stage, setStage] = useState(0)
    const [source, setSource] = useState('')
    const [filename, setFilename] = useState('')
    const [delimiter, setDelimiter] = useState<CsvDelimiter | ''>('')
    const [hasHeaders, setHasHeaders] = useState(true)
    const [document, setDocument] = useState<CsvDocument | null>(null)
    const [mapping, setMapping] = useState<FieldMapping>({})
    const [values, setValues] = useState<ValueMapping>({})
    const [options, setOptions] = useState<ImportOptions>({
        ...DEFAULT_IMPORT_OPTIONS,
    })
    const [error, setError] = useState<string | null>(null)
    const [reading, setReading] = useState(false)
    const [checking, setChecking] = useState(false)
    const [importing, setImporting] = useState(false)
    const [stopping, setStopping] = useState(false)
    const [showAllFields, setShowAllFields] = useState(false)
    const [plan, setPlan] = useState<PlannedImportRow[]>([])
    const [skipInvalid, setSkipInvalid] = useState(false)
    const [onlyErrors, setOnlyErrors] = useState(false)
    const [page, setPage] = useState(0)
    const [progress, setProgress] = useState<ImportProgress>({
        completed: 0,
        total: 0,
        results: [],
    })
    const [results, setResults] = useState<ImportResult[]>([])
    const busy = importing || checking || reading

    useEffect(() => {
        const dialog = dialogRef.current
        const previouslyFocused = window.document
            .activeElement as HTMLElement | null
        dialog?.showModal()
        return () => {
            dialog?.close()
            previouslyFocused?.focus()
        }
    }, [])
    useEffect(() => {
        if (!importing) return
        const preventLeaving = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', preventLeaving)
        return () => window.removeEventListener('beforeunload', preventLeaving)
    }, [importing])

    const parseSource = (
        text: string,
        separator: CsvDelimiter | '',
        headers: boolean,
    ) => {
        setError(null)
        setDocument(null)
        setValues({})
        setPlan([])
        setPage(0)
        try {
            const parsed = parseCsv(text, separator || undefined, headers)
            setDocument(parsed)
            setMapping(suggestMapping(parsed.headers))
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Non è stato possibile leggere il CSV.',
            )
        }
    }
    const loadFile = async (file: File) => {
        setError(null)
        setDocument(null)
        setSource('')
        setFilename(file.name)
        if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
            setError(
                'Scegli un file .csv, .tsv o .txt. Esporta i fogli Excel in CSV prima di caricarli.',
            )
            return
        }
        if (file.size > CSV_MAX_BYTES) {
            setError(
                'Il file supera il limite di 10 MB. Suddividilo in più CSV.',
            )
            return
        }
        setReading(true)
        try {
            const text = decodeCsv(await file.arrayBuffer())
            setSource(text)
            parseSource(text, delimiter, hasHeaders)
        } catch {
            setError(
                'Non è stato possibile leggere il file. Prova a selezionarlo di nuovo.',
            )
        } finally {
            setReading(false)
        }
    }
    const unknownValues = useMemo(
        () => (document ? unknownEnumValues(document, mapping, values) : []),
        [document, mapping, values],
    )
    const missingRequired = IMPORT_FIELDS.filter(
        (field) => field.required && mapping[field.key] === undefined,
    )
    const usedColumns = new Set(Object.values(mapping))
    const visibleFields = IMPORT_FIELDS.filter(
        (field) =>
            showAllFields || field.required || mapping[field.key] !== undefined,
    )
    const counts = useMemo(
        () => ({
            create: plan.filter((row) => row.action === 'create').length,
            update: plan.filter((row) => row.action === 'update').length,
            skip: plan.filter((row) => row.action === 'skip').length,
            invalid: plan.filter((row) => row.action === 'invalid').length,
        }),
        [plan],
    )
    const visibleRows = (
        onlyErrors ? plan.filter((row) => row.errors.length) : plan
    ).slice(page * 20, page * 20 + 20)
    const filteredCount = onlyErrors ? counts.invalid : plan.length
    const finishedCount = results.filter(
        (row) => row.outcome === 'created' || row.outcome === 'updated',
    ).length
    const failedCount = results.filter((row) =>
        ['failed', 'uncertain', 'pending'].includes(row.outcome),
    ).length

    const preview = async () => {
        if (!document || missingRequired.length) return
        setChecking(true)
        setError(null)
        setSkipInvalid(false)
        try {
            const validated = validateImport(document, mapping, options, values)
            const existing = await findImportConflicts(validated)
            setPlan(planImport(validated, existing, options.duplicates))
            setStage(2)
            setPage(0)
            setOnlyErrors(false)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Impossibile preparare l’anteprima.',
            )
        } finally {
            setChecking(false)
        }
    }
    const startImport = async () => {
        if (!counts.create && !counts.update) return
        if (counts.invalid && !skipInvalid) return
        setImporting(true)
        setError(null)
        setStopping(false)
        stopRef.current = false
        try {
            const outcome = await importProductCatalog(
                plan,
                setProgress,
                () => stopRef.current,
            )
            setResults(outcome)
            setStage(3)
            const completed = outcome.filter(
                (row) => row.outcome === 'created' || row.outcome === 'updated',
            ).length
            if (completed) {
                toast.success(
                    `${completed} ${completed === 1 ? 'prodotto importato' : 'prodotti importati'}`,
                )
                try {
                    await onImported()
                } catch {
                    toast.error(
                        'Importazione eseguita. Aggiorna la lista prodotti per vedere i risultati.',
                    )
                }
            }
        } catch {
            setError(
                'Importazione interrotta. Controlla il catalogo prima di riprovare: alcuni prodotti potrebbero essere già stati salvati.',
            )
            setStage(3)
        } finally {
            setImporting(false)
        }
    }
    const exportReport = () => {
        if (!document) return
        const byLine = new Map(results.map((result) => [result.line, result]))
        downloadCsv('esito-importazione-catalogo.csv', [
            ['Riga CSV', 'Esito', 'Dettaglio', ...document.headers],
            ...plan.map((row) => {
                const result = byLine.get(row.line)
                return [
                    row.line,
                    result
                        ? outcomeLabels[result.outcome]
                        : actionLabels[row.action],
                    result?.message ||
                        [...row.errors, ...row.warnings].join(' '),
                    ...row.source.cells,
                ]
            }),
        ])
    }
    const downloadTemplate = () =>
        downloadCsv('modello-catalogo-posafacile.csv', [
            [
                'sku',
                'name',
                'price_per_sqm',
                'category',
                'material',
                'format_width',
                'format_height',
                'finish',
                'stock_qty',
                'images',
                'status',
            ],
            [
                'DEMO-001',
                'Gres effetto pietra 60x60',
                '29,90',
                'Pavimento',
                'Gres porcellanato',
                '600',
                '600',
                'Opaco',
                '120',
                '',
                'Bozza',
            ],
            [
                'DEMO-002',
                'Gres effetto legno 20x120',
                '34,50',
                'Pavimento',
                'Gres porcellanato',
                '200',
                '1200',
                'Opaco',
                '80',
                '',
                'Bozza',
            ],
        ])

    return createPortal(
        <dialog
            ref={dialogRef}
            aria-labelledby="csv-import-title"
            onCancel={(event) => {
                event.preventDefault()
                if (!busy) onClose()
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget && !busy) onClose()
            }}
            className="fixed inset-0 m-auto w-[calc(100%-24px)] max-w-5xl max-h-[calc(100dvh-24px)] overflow-hidden rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/50 backdrop:backdrop-blur-sm"
        >
            <div className="flex max-h-[calc(100dvh-24px)] flex-col">
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-stone-50/80 px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                            <FileSpreadsheet size={21} />
                        </span>
                        <div>
                            <h2
                                id="csv-import-title"
                                className="text-base font-bold sm:text-lg"
                            >
                                Carica catalogo da CSV
                            </h2>
                            <p className="mt-0.5 text-xs text-stone-500">
                                Associa i campi, controlla i prodotti e importa.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Chiudi importazione CSV"
                        disabled={busy}
                        onClick={onClose}
                        className="rounded-lg p-2 text-stone-500 hover:bg-stone-200 disabled:opacity-30"
                    >
                        <X size={20} />
                    </button>
                </header>
                <ol
                    aria-label="Passaggi importazione"
                    className="grid shrink-0 grid-cols-4 gap-2 border-b border-stone-100 px-5 py-3 sm:px-7"
                >
                    {[
                        'File CSV',
                        'Associa campi',
                        'Anteprima',
                        'Risultato',
                    ].map((label, index) => (
                        <li
                            key={label}
                            aria-current={stage === index ? 'step' : undefined}
                            className={`flex items-center gap-2 text-[10px] font-bold sm:text-xs ${stage === index ? 'text-orange-700' : 'text-stone-500'}`}
                        >
                            <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${stage === index ? 'bg-orange-100' : stage > index ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}
                            >
                                {stage > index ? (
                                    <Check size={13} />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <span>{label}</span>
                        </li>
                    ))}
                </ol>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
                    {error && (
                        <div
                            role="alert"
                            className="mb-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                        >
                            <AlertCircle size={18} className="shrink-0" />
                            {error}
                        </div>
                    )}
                    {stage === 0 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-bold">
                                    Il tuo catalogo, anche se ha colonne
                                    diverse.
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                                    Carica il file del fornitore. Ti suggeriamo
                                    gli abbinamenti: nel prossimo passaggio
                                    potrai correggerli e scegliere quali dati
                                    importare.
                                </p>
                            </div>
                            <label
                                htmlFor="catalog-csv-file"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                    event.preventDefault()
                                    if (!busy && event.dataTransfer.files[0])
                                        void loadFile(
                                            event.dataTransfer.files[0],
                                        )
                                }}
                                className={`flex flex-col items-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40 px-5 py-9 text-center transition-colors hover:bg-orange-50 ${busy ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
                            >
                                <FileUp
                                    size={32}
                                    className="mb-3 text-orange-500"
                                />
                                <span className="text-sm font-bold">
                                    {reading
                                        ? 'Lettura in corso…'
                                        : filename ||
                                          'Trascina qui il CSV oppure scegli un file'}
                                </span>
                                <span className="mt-2 text-xs text-stone-500">
                                    CSV, TSV o TXT · fino a 10 MB e{' '}
                                    {CSV_MAX_ROWS.toLocaleString('it-IT')}{' '}
                                    prodotti
                                </span>
                                <input
                                    ref={fileRef}
                                    id="catalog-csv-file"
                                    type="file"
                                    accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                                    disabled={busy}
                                    className="mt-4 block max-w-full text-xs text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-bold file:text-orange-700"
                                    onChange={(event) => {
                                        if (event.target.files?.[0])
                                            void loadFile(event.target.files[0])
                                        event.target.value = ''
                                    }}
                                />
                            </label>
                            {source && (
                                <div className="grid gap-4 rounded-xl border border-stone-200 p-4 sm:grid-cols-2">
                                    <label className="text-xs font-bold text-stone-600">
                                        Separatore
                                        <select
                                            aria-label="Separatore CSV"
                                            value={delimiter}
                                            onChange={(event) => {
                                                const value = event.target
                                                    .value as CsvDelimiter | ''
                                                setDelimiter(value)
                                                parseSource(
                                                    source,
                                                    value,
                                                    hasHeaders,
                                                )
                                            }}
                                            className={`${inputClass} mt-2`}
                                        >
                                            <option value="">
                                                Rilevamento automatico
                                            </option>
                                            <option value=";">
                                                Punto e virgola ;
                                            </option>
                                            <option value=",">Virgola ,</option>
                                            <option value={'\t'}>
                                                Tabulazione
                                            </option>
                                            <option value="|">
                                                Barra verticale |
                                            </option>
                                        </select>
                                    </label>
                                    <label className="flex items-center gap-3 text-sm text-stone-700">
                                        <input
                                            type="checkbox"
                                            checked={hasHeaders}
                                            onChange={(event) => {
                                                setHasHeaders(
                                                    event.target.checked,
                                                )
                                                parseSource(
                                                    source,
                                                    delimiter,
                                                    event.target.checked,
                                                )
                                            }}
                                            className="h-4 w-4 accent-orange-500"
                                        />
                                        La prima riga contiene le intestazioni
                                    </label>
                                </div>
                            )}
                            {document && (
                                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                    <CheckCircle2 size={19} />
                                    <span>
                                        <strong>
                                            {document.rows.length} righe
                                        </strong>{' '}
                                        e{' '}
                                        <strong>
                                            {document.headers.length} colonne
                                        </strong>{' '}
                                        lette. {usedColumns.size} campi
                                        riconosciuti.
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-col justify-between gap-3 rounded-xl bg-stone-50 p-4 sm:flex-row sm:items-center">
                                <p className="text-xs leading-relaxed text-stone-500">
                                    Non hai un file pronto?
                                    <br />
                                    Scarica il modello con due righe di esempio
                                    e formati in millimetri.
                                </p>
                                <button
                                    type="button"
                                    onClick={downloadTemplate}
                                    className={secondaryButton}
                                >
                                    <Download size={15} /> Scarica modello CSV
                                </button>
                            </div>
                        </div>
                    )}
                    {stage === 1 && document && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold">
                                    Abbina le colonne del tuo file.
                                </h3>
                                <p className="mt-1 text-sm text-stone-500">
                                    SKU, nome e prezzo di vendita sono
                                    obbligatori. Le colonne non associate
                                    saranno ignorate.
                                </p>
                            </div>
                            {missingRequired.length > 0 && (
                                <p
                                    role="status"
                                    className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800"
                                >
                                    Da associare:{' '}
                                    {missingRequired
                                        .map((field) => field.label)
                                        .join(', ')}
                                    .
                                </p>
                            )}
                            <div className="overflow-hidden rounded-2xl border border-stone-200">
                                <div className="hidden grid-cols-[1fr_1fr_0.8fr] gap-4 border-b border-stone-200 bg-stone-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-500 sm:grid">
                                    <span>Campo PosaFacile</span>
                                    <span>Colonna del CSV</span>
                                    <span>Esempio dal file</span>
                                </div>
                                {visibleFields.map((field) => (
                                    <div
                                        key={field.key}
                                        className="grid gap-3 border-b border-stone-100 px-4 py-3 last:border-0 sm:grid-cols-[1fr_1fr_0.8fr] sm:items-center"
                                    >
                                        <div>
                                            <label
                                                htmlFor={`csv-field-${field.key}`}
                                                className="text-xs font-bold text-stone-800"
                                            >
                                                {field.label}
                                                {field.required && (
                                                    <span className="ml-1 text-orange-600">
                                                        *
                                                    </span>
                                                )}
                                            </label>
                                            {field.hint && (
                                                <p className="mt-1 text-[10px] leading-relaxed text-stone-500">
                                                    {field.hint}
                                                </p>
                                            )}
                                        </div>
                                        <select
                                            id={`csv-field-${field.key}`}
                                            className={inputClass}
                                            value={mapping[field.key] ?? ''}
                                            onChange={(event) => {
                                                const next = { ...mapping }
                                                if (event.target.value === '')
                                                    delete next[field.key]
                                                else
                                                    next[field.key] = Number(
                                                        event.target.value,
                                                    )
                                                setMapping(next)
                                                setValues({})
                                            }}
                                        >
                                            <option value="">
                                                {field.required
                                                    ? 'Seleziona una colonna…'
                                                    : 'Non importare questo campo'}
                                            </option>
                                            {document.headers.map(
                                                (header, index) => (
                                                    <option
                                                        key={index}
                                                        value={index}
                                                        disabled={
                                                            usedColumns.has(
                                                                index,
                                                            ) &&
                                                            mapping[
                                                                field.key
                                                            ] !== index
                                                        }
                                                    >
                                                        {index + 1}. {header}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <p className="break-words text-xs text-stone-500">
                                            {mapping[field.key] !== undefined
                                                ? document.rows
                                                      .find((row) =>
                                                          row.cells[
                                                              mapping[
                                                                  field.key
                                                              ]!
                                                          ]?.trim(),
                                                      )
                                                      ?.cells[
                                                          mapping[field.key]!
                                                      ]?.slice(0, 140) ||
                                                  'Valore vuoto'
                                                : field.key === 'slug'
                                                  ? 'Generato da nome e SKU'
                                                  : '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="text-xs font-bold text-orange-700 hover:underline"
                                onClick={() => setShowAllFields(!showAllFields)}
                            >
                                {showAllFields
                                    ? 'Mostra solo campi associati e obbligatori'
                                    : `Mostra tutti i ${IMPORT_FIELDS.length} campi disponibili`}
                            </button>
                            {unknownValues.length > 0 && (
                                <section className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold">
                                        <Link2
                                            size={17}
                                            className="text-orange-600"
                                        />
                                        Associa anche i valori non riconosciuti
                                    </h4>
                                    <p className="mt-2 text-xs leading-relaxed text-stone-500">
                                        Ad esempio, puoi associare una categoria
                                        del fornitore a “Pavimento”. Ogni scelta
                                        si applica a tutte le righe con quel
                                        valore.
                                    </p>
                                    <div className="mt-4 space-y-3">
                                        {unknownValues.map((item) => (
                                            <label
                                                key={`${item.field}-${normalizeHeader(item.raw)}`}
                                                className="grid items-center gap-2 text-xs sm:grid-cols-2"
                                            >
                                                <span>
                                                    <strong>
                                                        {
                                                            IMPORT_FIELDS.find(
                                                                (field) =>
                                                                    field.key ===
                                                                    item.field,
                                                            )?.label
                                                        }
                                                        : {item.raw}
                                                    </strong>
                                                    <small className="ml-2 text-stone-500">
                                                        ({item.count} righe)
                                                    </small>
                                                </span>
                                                <select
                                                    aria-label={`Associa valore ${item.raw} per ${item.field}`}
                                                    value={item.selected}
                                                    onChange={(event) =>
                                                        setValues(
                                                            (previous) => ({
                                                                ...previous,
                                                                [item.field]: {
                                                                    ...previous[
                                                                        item
                                                                            .field
                                                                    ],
                                                                    [normalizeHeader(
                                                                        item.raw,
                                                                    )]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            }),
                                                        )
                                                    }
                                                    className={inputClass}
                                                >
                                                    <option value="">
                                                        Da associare…
                                                    </option>
                                                    {ENUM_OPTIONS[
                                                        item.field
                                                    ].map((option) => (
                                                        <option
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        ))}
                                    </div>
                                </section>
                            )}
                            <section>
                                <h4 className="mb-3 text-sm font-bold">
                                    Come interpretare i dati
                                </h4>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="text-xs font-bold text-stone-600">
                                        Formato numeri
                                        <select
                                            aria-label="Formato numeri"
                                            value={options.numberFormat}
                                            className={`${inputClass} mt-2`}
                                            onChange={(event) =>
                                                setOptions((previous) => ({
                                                    ...previous,
                                                    numberFormat: event.target
                                                        .value as ImportOptions['numberFormat'],
                                                }))
                                            }
                                        >
                                            <option value="it">
                                                Italiano · 1.234,50
                                            </option>
                                            <option value="en">
                                                Internazionale · 1,234.50
                                            </option>
                                        </select>
                                    </label>
                                    <label className="text-xs font-bold text-stone-600">
                                        Unità dei formati senza indicazione
                                        <select
                                            aria-label="Unità dei formati"
                                            value={options.dimensionUnit}
                                            className={`${inputClass} mt-2`}
                                            onChange={(event) =>
                                                setOptions((previous) => ({
                                                    ...previous,
                                                    dimensionUnit: event.target
                                                        .value as ImportOptions['dimensionUnit'],
                                                }))
                                            }
                                        >
                                            <option value="mm">
                                                Millimetri · 600 × 1200
                                            </option>
                                            <option value="cm">
                                                Centimetri · 60 × 120
                                            </option>
                                        </select>
                                    </label>
                                </div>
                                <p className="mt-2 text-[11px] text-stone-500">
                                    Le unità cm/mm scritte nel valore o
                                    nell’intestazione prevalgono sulla scelta.
                                    Lo spessore è sempre in mm.
                                </p>
                            </section>
                            <section className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                                <h4 className="text-sm font-bold">
                                    Valori iniziali per i nuovi prodotti
                                </h4>
                                <p className="mt-1 text-xs text-stone-500">
                                    Usati solo quando la relativa cella è vuota
                                    o non associata.
                                </p>
                                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                    {(
                                        [
                                            'category',
                                            'material',
                                            'status',
                                        ] as const
                                    ).map((field) => (
                                        <label
                                            key={field}
                                            className="text-xs font-bold text-stone-600"
                                        >
                                            {
                                                IMPORT_FIELDS.find(
                                                    (item) =>
                                                        item.key === field,
                                                )?.label
                                            }
                                            <select
                                                aria-label={`Valore iniziale ${field}`}
                                                className={`${inputClass} mt-2`}
                                                value={options[field]}
                                                onChange={(event) =>
                                                    setOptions((previous) => ({
                                                        ...previous,
                                                        [field]:
                                                            event.target.value,
                                                    }))
                                                }
                                            >
                                                {ENUM_OPTIONS[field].map(
                                                    (option) => (
                                                        <option
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                    ))}
                                </div>
                            </section>
                            <fieldset className="space-y-3">
                                <legend className="mb-3 text-sm font-bold">
                                    Se lo SKU è già nel catalogo
                                </legend>
                                {[
                                    {
                                        value: 'skip',
                                        title: 'Salta il prodotto esistente',
                                        text: 'Importa solo i nuovi articoli. Il catalogo attuale resta invariato.',
                                    },
                                    {
                                        value: 'update',
                                        title: 'Aggiorna i campi associati',
                                        text: 'Aggiorna il prodotto con lo stesso SKU. Celle vuote, campi non associati e slug generati non sostituiscono i dati esistenti.',
                                    },
                                ].map((item) => (
                                    <label
                                        key={item.value}
                                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${options.duplicates === item.value ? 'border-orange-300 bg-orange-50/40' : 'border-stone-200'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="csv-duplicates"
                                            value={item.value}
                                            checked={
                                                options.duplicates ===
                                                item.value
                                            }
                                            onChange={() =>
                                                setOptions((previous) => ({
                                                    ...previous,
                                                    duplicates:
                                                        item.value as ImportOptions['duplicates'],
                                                }))
                                            }
                                            className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                                        />
                                        <span>
                                            <strong className="block text-xs">
                                                {item.title}
                                            </strong>
                                            <span className="mt-1 block text-xs leading-relaxed text-stone-500">
                                                {item.text}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </fieldset>
                        </div>
                    )}
                    {stage === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-bold">
                                    Controlla il risultato prima di importare.
                                </h3>
                                <p className="mt-1 text-sm text-stone-500">
                                    {filename} · {plan.length} righe. Gli SKU
                                    sono stati verificati nel catalogo completo.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    {
                                        label: 'Nuovi prodotti',
                                        value: counts.create,
                                    },
                                    {
                                        label: 'Da aggiornare',
                                        value: counts.update,
                                    },
                                    {
                                        label: 'Già presenti · saltati',
                                        value: counts.skip,
                                    },
                                    {
                                        label: 'Righe da correggere',
                                        value: counts.invalid,
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-xl border border-stone-200 bg-stone-50/70 p-4"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                                            {item.label}
                                        </span>
                                        <strong className="mt-1 block text-2xl font-black">
                                            {item.value}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-xs text-stone-600">
                                    <input
                                        type="checkbox"
                                        checked={onlyErrors}
                                        onChange={(event) => {
                                            setOnlyErrors(event.target.checked)
                                            setPage(0)
                                        }}
                                        className="accent-orange-500"
                                    />
                                    Mostra solo righe con errori
                                </label>
                                <button
                                    type="button"
                                    onClick={exportReport}
                                    className={secondaryButton}
                                >
                                    <Download size={14} /> Scarica verifica CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-stone-200">
                                <table className="w-full min-w-[700px] text-left text-xs">
                                    <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                                        <tr>
                                            {[
                                                'Riga',
                                                'Prodotto / SKU',
                                                'Prezzo €/m²',
                                                'Formato mm',
                                                'Azione',
                                                'Controlli',
                                            ].map((label) => (
                                                <th
                                                    key={label}
                                                    className="px-3 py-3 font-bold"
                                                >
                                                    {label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {visibleRows.map((row) => (
                                            <tr
                                                key={row.line}
                                                className={
                                                    row.errors.length
                                                        ? 'bg-rose-50/30'
                                                        : ''
                                                }
                                            >
                                                <td className="px-3 py-3 text-stone-500">
                                                    {row.line}
                                                </td>
                                                <td className="max-w-52 px-3 py-3">
                                                    <strong className="block break-words">
                                                        {row.product.name ||
                                                            'Nome mancante'}
                                                    </strong>
                                                    <span className="mt-1 block text-stone-500">
                                                        {row.product.sku ||
                                                            'SKU mancante'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3">
                                                    {row.product.price_per_sqm.toLocaleString(
                                                        'it-IT',
                                                        {
                                                            minimumFractionDigits: 2,
                                                        },
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3">
                                                    {row.product.format_width ||
                                                        '—'}{' '}
                                                    ×{' '}
                                                    {row.product
                                                        .format_height || '—'}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${row.action === 'invalid' ? 'bg-rose-100 text-rose-700' : row.action === 'skip' ? 'bg-stone-100 text-stone-600' : 'bg-orange-50 text-orange-700'}`}
                                                    >
                                                        {
                                                            actionLabels[
                                                                row.action
                                                            ]
                                                        }
                                                    </span>
                                                    {row.action ===
                                                        'create' && (
                                                        <small className="mt-2 block text-stone-500">
                                                            {
                                                                ENUM_OPTIONS.status.find(
                                                                    (option) =>
                                                                        option.value ===
                                                                        row
                                                                            .product
                                                                            .status,
                                                                )?.label
                                                            }
                                                        </small>
                                                    )}
                                                </td>
                                                <td className="min-w-56 max-w-80 px-3 py-3">
                                                    <ul className="space-y-1">
                                                        {row.errors.map(
                                                            (message) => (
                                                                <li
                                                                    key={
                                                                        message
                                                                    }
                                                                    className="text-rose-700"
                                                                >
                                                                    {message}
                                                                </li>
                                                            ),
                                                        )}
                                                        {!row.errors.length &&
                                                            row.warnings.map(
                                                                (message) => (
                                                                    <li
                                                                        key={
                                                                            message
                                                                        }
                                                                        className="text-amber-800"
                                                                    >
                                                                        {
                                                                            message
                                                                        }
                                                                    </li>
                                                                ),
                                                            )}
                                                        {!row.errors.length &&
                                                            !row.warnings
                                                                .length && (
                                                                <li className="text-emerald-700">
                                                                    Dati pronti
                                                                </li>
                                                            )}
                                                    </ul>
                                                    {!row.errors.length && row.action !== 'skip' && (
                                                        <details className="mt-2 text-stone-600">
                                                            <summary className="cursor-pointer text-[11px] font-bold text-orange-700">Dettagli da {row.action === 'update' ? 'aggiornare' : 'salvare'}</summary>
                                                            <dl className="mt-2 space-y-2 text-[10px]">
                                                                {Object.entries(row.action === 'update' ? row.patch : row.product).map(([key, value]) => (
                                                                    <div key={key}>
                                                                        <dt className="font-bold">{IMPORT_FIELDS.find(field => field.key === key)?.label || key}</dt>
                                                                        <dd className="break-all">{Array.isArray(value) ? value.join(' | ') || '—' : String(value ?? '—')}</dd>
                                                                    </div>
                                                                ))}
                                                            </dl>
                                                        </details>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {!visibleRows.length && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="p-6 text-center text-stone-500"
                                                >
                                                    Nessuna riga da mostrare.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredCount > 20 && (
                                <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
                                    <span>
                                        Righe {page * 20 + 1}–
                                        {Math.min(
                                            (page + 1) * 20,
                                            filteredCount,
                                        )}{' '}
                                        di {filteredCount}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            className={secondaryButton}
                                            disabled={!page}
                                            onClick={() => setPage(page - 1)}
                                        >
                                            Precedenti
                                        </button>
                                        <button
                                            className={secondaryButton}
                                            disabled={
                                                (page + 1) * 20 >= filteredCount
                                            }
                                            onClick={() => setPage(page + 1)}
                                        >
                                            Successive
                                        </button>
                                    </div>
                                </div>
                            )}
                            {counts.invalid > 0 && (
                                <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                                    <input
                                        type="checkbox"
                                        checked={skipInvalid}
                                        disabled={importing}
                                        onChange={(event) =>
                                            setSkipInvalid(event.target.checked)
                                        }
                                        className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                                    />
                                    <span>
                                        Importa solo le righe valide. Le{' '}
                                        <strong>
                                            {counts.invalid} righe con errori
                                        </strong>{' '}
                                        saranno escluse e riportate nel file
                                        degli esiti.
                                    </span>
                                </label>
                            )}
                            {importing && (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="rounded-xl border border-orange-200 bg-orange-50 p-4"
                                >
                                    <div className="mb-2 flex justify-between text-xs font-bold text-orange-800">
                                        <span>
                                            {stopping
                                                ? 'Interruzione dopo le operazioni in corso…'
                                                : 'Importazione in corso…'}
                                        </span>
                                        <span>
                                            {progress.completed} /{' '}
                                            {progress.total}
                                        </span>
                                    </div>
                                    <progress
                                        aria-label="Avanzamento importazione"
                                        max={progress.total || 1}
                                        value={progress.completed}
                                        className="h-2 w-full accent-orange-500"
                                    />
                                    <p className="mt-2 text-[11px] text-stone-600">
                                        Mantieni aperta questa finestra. Ogni
                                        blocco completato viene salvato nel
                                        catalogo.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    {stage === 3 && (
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-6 text-center">
                                <CheckCircle2
                                    size={36}
                                    className="mx-auto mb-3 text-orange-500"
                                />
                                <h3 className="text-xl font-bold">
                                    {failedCount || error
                                        ? 'Importazione conclusa con segnalazioni'
                                        : 'Importazione completata'}
                                </h3>
                                <p className="mt-2 text-sm text-stone-500">
                                    <strong className="text-stone-900">
                                        {finishedCount} prodotti salvati
                                    </strong>{' '}
                                    nel catalogo. Le righe non importate sono
                                    elencate nel report.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {(
                                    [
                                        'created',
                                        'updated',
                                        'skipped',
                                        'invalid',
                                        'failed',
                                        'uncertain',
                                        'pending',
                                    ] as const
                                ).map((outcome) => {
                                    const count = results.filter(
                                        (row) => row.outcome === outcome,
                                    ).length
                                    return count > 0 ? (
                                        <div
                                            key={outcome}
                                            className="rounded-xl border border-stone-200 p-4"
                                        >
                                            <span className="text-xs text-stone-500">
                                                {outcomeLabels[outcome]}
                                            </span>
                                            <strong className="mt-1 block text-2xl">
                                                {count}
                                            </strong>
                                        </div>
                                    ) : null
                                })}
                            </div>
                            {results.some(
                                (row) => row.outcome === 'uncertain',
                            ) && (
                                <p
                                    role="alert"
                                    className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"
                                >
                                    Per alcune righe il server non ha confermato
                                    l’esito. Verifica i relativi SKU nel
                                    catalogo prima di ripetere l’importazione.
                                </p>
                            )}
                            <button
                                type="button"
                                className={secondaryButton}
                                onClick={exportReport}
                            >
                                <Download size={16} /> Scarica esiti completi
                                CSV
                            </button>
                        </div>
                    )}
                </div>
                <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/70 px-5 py-4 sm:px-7">
                    <div>
                        {stage > 0 && stage < 3 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setStage(stage - 1)
                                    setError(null)
                                }}
                                disabled={busy}
                                className={secondaryButton}
                            >
                                <ArrowLeft size={15} /> Indietro
                            </button>
                        )}
                        {stage === 0 && (
                            <span className="text-[11px] text-stone-500">
                                Nessun dato salvato prima della conferma.
                            </span>
                        )}
                        {stage === 3 && (
                            <button
                                type="button"
                                className={secondaryButton}
                                onClick={() => {
                                    setStage(0)
                                    setDocument(null)
                                    setSource('')
                                    setFilename('')
                                    setResults([])
                                    setError(null)
                                    setProgress({
                                        completed: 0,
                                        total: 0,
                                        results: [],
                                    })
                                }}
                            >
                                <RotateCcw size={15} /> Altro CSV
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {stage === 0 && (
                            <button
                                type="button"
                                className={primaryButton}
                                disabled={!document || busy}
                                onClick={() => setStage(1)}
                            >
                                Associa i campi <ArrowRight size={16} />
                            </button>
                        )}
                        {stage === 1 && (
                            <button
                                type="button"
                                className={primaryButton}
                                disabled={!!missingRequired.length || busy}
                                onClick={() => void preview()}
                            >
                                {checking ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}
                                {checking
                                    ? 'Controllo catalogo…'
                                    : 'Controlla anteprima'}
                            </button>
                        )}
                        {stage === 2 &&
                            (importing ? (
                                <button
                                    type="button"
                                    disabled={stopping}
                                    className={secondaryButton}
                                    onClick={() => {
                                        stopRef.current = true
                                        setStopping(true)
                                    }}
                                >
                                    Interrompi
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={primaryButton}
                                    disabled={
                                        !(counts.create + counts.update) ||
                                        (!!counts.invalid && !skipInvalid)
                                    }
                                    onClick={() => void startImport()}
                                >
                                    <FileUp size={16} /> Importa{' '}
                                    {counts.create + counts.update} prodotti
                                </button>
                            ))}
                        {stage === 3 && (
                            <button
                                type="button"
                                onClick={onClose}
                                className={primaryButton}
                            >
                                Torna al catalogo <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </dialog>,
        window.document.body,
    )
}
