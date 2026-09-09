import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { eachDayOfInterval, format, isValid, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface AddAbsenceModalProps {
    isOpen: boolean
    onClose: () => void
    /** Salva le date indicate come assenza. */
    onConfirm: (dates: string[]) => Promise<void>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 '
    + 'focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 '
    + 'text-sm font-bold transition-all outline-none'

const oggi = () => format(new Date(), 'yyyy-MM-dd')

/**
 * Aggiunta di un'assenza.
 *
 * Un giorno solo o un periodo: sono la stessa cosa con una data in più, e
 * tenerli in due strumenti separati era metà della confusione. Qui è un
 * interruttore, e l'anteprima dice quante giornate si stanno per chiudere.
 */
export function AddAbsenceModal({ isOpen, onClose, onConfirm }: AddAbsenceModalProps) {
    const [modo, setModo] = useState<'giorno' | 'periodo'>('giorno')
    const [dal, setDal] = useState(oggi())
    const [al, setAl] = useState(oggi())
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setModo('giorno')
            setDal(oggi())
            setAl(oggi())
        }
    }, [isOpen])

    if (!isOpen) return null

    const inizio = parseISO(dal)
    const fine = modo === 'giorno' ? inizio : parseISO(al)
    const valido = isValid(inizio) && isValid(fine) && fine >= inizio
    const giornate = valido ? eachDayOfInterval({ start: inizio, end: fine }) : []

    const conferma = async () => {
        if (!valido || giornate.length === 0) {
            toast.error('Controlla le date: la fine non può precedere l’inizio.')
            return
        }
        setSaving(true)
        try {
            await onConfirm(giornate.map((d) => format(d, 'yyyy-MM-dd')))
            onClose()
        } catch (err: any) {
            toast.error(err.message || 'Non sono riuscito a salvare l’assenza')
        } finally {
            setSaving(false)
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-stone-100"
                >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                <CalendarOff size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-stone-900">Aggiungi assenza</h2>
                                <p className="text-xs text-stone-500">Non riceverai proposte in queste date</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="p-1.5 bg-stone-100/80 rounded-xl border border-stone-200/60 grid grid-cols-2 gap-1">
                            {(['giorno', 'periodo'] as const).map((valore) => (
                                <button
                                    key={valore}
                                    type="button"
                                    onClick={() => setModo(valore)}
                                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        modo === valore
                                            ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                                            : 'text-stone-500 hover:text-stone-900'
                                    }`}
                                >
                                    {valore === 'giorno' ? 'Un giorno' : 'Un periodo'}
                                </button>
                            ))}
                        </div>

                        <div className={modo === 'periodo' ? 'grid grid-cols-2 gap-3' : ''}>
                            <div>
                                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                                    {modo === 'giorno' ? 'Data' : 'Dal'}
                                </label>
                                <input
                                    type="date"
                                    value={dal}
                                    min={oggi()}
                                    onChange={(e) => {
                                        setDal(e.target.value)
                                        if (modo === 'periodo' && e.target.value > al) setAl(e.target.value)
                                    }}
                                    className={INPUT}
                                />
                            </div>
                            {modo === 'periodo' && (
                                <div>
                                    <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                                        Al
                                    </label>
                                    <input
                                        type="date"
                                        value={al}
                                        min={dal}
                                        onChange={(e) => setAl(e.target.value)}
                                        className={INPUT}
                                    />
                                </div>
                            )}
                        </div>

                        {valido && (
                            <p className="text-xs font-medium text-stone-600 bg-stone-50 border border-stone-200/80 rounded-xl px-3.5 py-2.5">
                                {giornate.length === 1
                                    ? `${format(inizio, 'EEEE d MMMM', { locale: it })}: una giornata.`
                                    : `${giornate.length} giornate, da ${format(inizio, 'd MMM', { locale: it })} a ${format(fine, 'd MMM', { locale: it })}.`}
                            </p>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={conferma}
                                disabled={saving || !valido}
                                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                <CalendarOff size={15} />
                                {saving ? 'Salvo…' : 'Segna assenza'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
