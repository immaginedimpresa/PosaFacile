import type { ReactNode } from 'react'
import { useConfiguratorStore, type ProjectInfo } from '@/store/configuratorStore'
import { servizioEscluso } from '@/services/ratesService'
import { SubStepProgress } from '@/components/configurator/SubStepProgress'
import {
    Bath,
    UtensilsCrossed,
    Sofa,
    Bed,
    TreePine,
    LayoutGrid,
    Home,
    Building2,
    Hammer,
    Scissors,
    Layers,
    Trash2,
    ClipboardList,
    CheckCircle2,
    Info,
    type LucideIcon,
} from 'lucide-react'

type Ambiente = NonNullable<ProjectInfo['ambiente']>
type Intervento = NonNullable<ProjectInfo['intervento']>

const PROJECT_PHASES = ['Ambiente del progetto', 'Tipo di intervento', 'Lavori prima della posa']

// Le descrizioni seguono i fattori di layingDuration: sono quelli che allungano o accorciano il cantiere.
const AMBIENTI: { value: Ambiente; label: string; hint: string; icon: LucideIcon }[] = [
    { value: 'bagno', label: 'Bagno', hint: 'Molti tagli attorno a sanitari e scarichi', icon: Bath },
    { value: 'cucina', label: 'Cucina', hint: 'Tagli attorno a mobili e impianti', icon: UtensilsCrossed },
    { value: 'soggiorno', label: 'Soggiorno', hint: 'Superfici ampie e regolari', icon: Sofa },
    { value: 'camera', label: 'Camera', hint: 'Superfici ampie e regolari', icon: Bed },
    { value: 'esterno', label: 'Esterno', hint: 'Terrazzi, balconi e vialetti', icon: TreePine },
    { value: 'altro', label: 'Altro', hint: 'Corridoi, ingressi, locali tecnici', icon: LayoutGrid },
]

const INTERVENTI: { value: Intervento; label: string; desc: string; icon: LucideIcon }[] = [
    {
        value: 'nuova_costruzione',
        label: 'Nuova costruzione',
        desc: 'Posa su un fondo nuovo: non c’è un pavimento da togliere.',
        icon: Building2,
    },
    {
        value: 'ristrutturazione',
        label: 'Ristrutturazione',
        desc: 'Si toglie il pavimento esistente e si posa il nuovo.',
        icon: Hammer,
    },
    {
        value: 'sostituzione',
        label: 'Sostituzione parziale',
        desc: 'Si rifà solo una parte: alcune zone o una sola stanza.',
        icon: Scissors,
    },
]

function SectionHeader({ id, icon: Icon, title, aside }: { id?: string; icon: LucideIcon; title: string; aside?: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                </div>
                <h3 id={id} className="font-bold text-stone-900 text-base">{title}</h3>
            </div>
            {aside && <span className="text-xs text-stone-400 font-medium hidden sm:inline">{aside}</span>}
        </div>
    )
}

const optionClass = (selected: boolean) =>
    `rounded-xl border-2 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${selected
        ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/10'
        : 'border-stone-200 bg-stone-50/40 hover:border-stone-300 hover:bg-white'
    }`

const iconTileClass = (selected: boolean) =>
    `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-orange-500 text-white' : 'bg-stone-200/70 text-stone-600'
    }`

export function Step1ProjectType() {
    const {
        projectInfo,
        setProjectInfo,
        projectSubStep,
        services,
        setServices,
        professionalRates,
        selectedProfessional,
    } = useConfiguratorStore()

    const hasExistingFloor = projectInfo.intervento !== null && projectInfo.intervento !== 'nuova_costruzione'
    const proName = selectedProfessional?.company_name || selectedProfessional?.full_name || 'Il posatore scelto'
    const ambienteLabel = AMBIENTI.find((a) => a.value === projectInfo.ambiente)?.label
    const interventoLabel = INTERVENTI.find((i) => i.value === projectInfo.intervento)?.label

    const selectIntervento = (value: Intervento) => {
        if (value === 'nuova_costruzione') {
            // Su un fondo nuovo non c'è niente da demolire.
            setProjectInfo({ intervento: value, rimuoverePavimento: false })
            if (services.demolizione) setServices({ demolizione: false })
            return
        }
        setProjectInfo({ intervento: value })
    }

    // I lavori preliminari sono gli stessi servizi del passo Servizi: una scelta sola, in due punti.
    const toggleDemolizione = () => {
        const next = !services.demolizione
        setServices({ demolizione: next })
        setProjectInfo({ rimuoverePavimento: next })
    }
    const toggleMassetto = () => {
        const next = !services.massetto
        setServices({ massetto: next })
        setProjectInfo({ fareMassetto: next })
    }

    const preliminari = [
        ...(hasExistingFloor
            ? [{
                key: 'demolizione',
                label: 'Rimozione del pavimento esistente',
                desc: 'Il vecchio pavimento viene tolto prima della posa.',
                icon: Trash2,
                checked: services.demolizione,
                onToggle: toggleDemolizione,
            }]
            : []),
        {
            key: 'massetto',
            label: 'Preparazione del massetto',
            desc: 'Serve se il fondo non è piano o è danneggiato.',
            icon: Layers,
            checked: services.massetto,
            onToggle: toggleMassetto,
        },
    ]

    return (
        <div className="space-y-4">
            <SubStepProgress current={projectSubStep} labels={PROJECT_PHASES} />

            {/* PASSO 1: AMBIENTE */}
            {projectSubStep === 1 && (
                <section className="space-y-5" aria-labelledby="pf-ambiente-title">
                    <SectionHeader id="pf-ambiente-title" icon={Home} title="Quale ambiente vuoi piastrellare?" aside="Scegline uno" />
                    <div role="radiogroup" aria-labelledby="pf-ambiente-title" className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                        {AMBIENTI.map(({ value, label, hint, icon: Icon }) => {
                            const selected = projectInfo.ambiente === value
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setProjectInfo({ ambiente: value })}
                                    className={`${optionClass(selected)} p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3`}
                                >
                                    <div className={iconTileClass(selected)}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-stone-900">{label}</p>
                                        <p className="text-xs text-stone-500 leading-snug mt-0.5">{hint}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start gap-3 text-xs text-stone-600 leading-relaxed">
                        <Info className="w-5 h-5 text-orange-500 shrink-0" />
                        <p>
                            L&apos;ambiente pesa sui giorni di cantiere: un bagno richiede molti più tagli di un soggiorno. Se i locali sono più di uno, scegli quello principale.
                        </p>
                    </div>
                </section>
            )}

            {/* PASSO 2: TIPO DI INTERVENTO */}
            {projectSubStep === 2 && (
                <section className="space-y-5" aria-labelledby="pf-intervento-title">
                    <SectionHeader id="pf-intervento-title" icon={Hammer} title="Che tipo di intervento è?" aside="Scegline uno" />
                    <div role="radiogroup" aria-labelledby="pf-intervento-title" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {INTERVENTI.map(({ value, label, desc, icon: Icon }) => {
                            const selected = projectInfo.intervento === value
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => selectIntervento(value)}
                                    className={`${optionClass(selected)} p-4 flex md:flex-col items-start gap-3`}
                                >
                                    <div className={iconTileClass(selected)}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-stone-900">{label}</p>
                                        <p className="text-xs text-stone-500 leading-relaxed mt-0.5">{desc}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start gap-3 text-xs text-stone-600 leading-relaxed">
                        <Info className="w-5 h-5 text-orange-500 shrink-0" />
                        <p>
                            In una casa abitata servono protezioni e pulizie in più, quindi una ristrutturazione richiede qualche giorno in più di una nuova costruzione.
                        </p>
                    </div>
                </section>
            )}

            {/* PASSO 3: LAVORI PRELIMINARI E RIEPILOGO */}
            {projectSubStep === 3 && (
                <section className="space-y-5">
                    <SectionHeader icon={ClipboardList} title="Servono lavori prima della posa?" aside="Facoltativo" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {preliminari.map(({ key, label, desc, icon: Icon, checked, onToggle }) => {
                            if (servizioEscluso(professionalRates, key)) {
                                return (
                                    <div
                                        key={key}
                                        className="p-4 rounded-xl border-2 border-stone-200 bg-stone-50/70 flex items-start gap-3 opacity-70"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-stone-200 text-stone-400 flex items-center justify-center shrink-0">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-stone-600">{label}</p>
                                            <p className="text-xs text-stone-500 leading-relaxed mt-0.5">
                                                {proName} non esegue questa lavorazione.
                                            </p>
                                        </div>
                                    </div>
                                )
                            }
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={checked}
                                    onClick={onToggle}
                                    className={`${optionClass(checked)} p-4 flex items-start gap-3`}
                                >
                                    <div className={iconTileClass(checked)}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-sm text-stone-900">{label}</p>
                                        <p className="text-xs text-stone-500 leading-relaxed mt-0.5">{desc}</p>
                                    </div>
                                    <CheckCircle2
                                        aria-hidden="true"
                                        className={`w-5 h-5 shrink-0 transition-colors ${checked ? 'text-orange-500' : 'text-stone-300'}`}
                                    />
                                </button>
                            )
                        })}
                    </div>

                    {/* Riepilogo del passo, come nell'ultima fase di Accesso e Scarico */}
                    <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5 flex items-start gap-2.5 text-xs text-stone-600 leading-relaxed">
                        <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <p>
                            <strong className="text-stone-900">{ambienteLabel} · {interventoLabel}.</strong>{' '}
                            Il costo dei lavori preliminari dipende dai metri quadri: lo vedi al passo <strong className="text-stone-700">Servizi</strong>, dove puoi anche cambiare idea.
                        </p>
                    </div>
                </section>
            )}
        </div>
    )
}
