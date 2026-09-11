/**
 * Barra di avanzamento dei passi divisi in fasi.
 * Niente tab cliccabili: si va avanti e indietro solo con i pulsanti in fondo.
 */
export function SubStepProgress({ current, labels }: { current: number; labels: string[] }) {
    const total = labels.length
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs text-stone-500 font-medium">
                <span className="font-semibold text-stone-700">Passaggio {current} di {total}</span>
                <span className="text-orange-600 font-bold text-right">{labels[current - 1]}</span>
            </div>
            <div
                role="progressbar"
                aria-label={`Passaggio ${current} di ${total}: ${labels[current - 1]}`}
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={current}
                className="w-full h-1.5 bg-stone-200/70 rounded-full overflow-hidden"
            >
                <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${(current / total) * 100}%` }}
                />
            </div>
        </div>
    )
}
