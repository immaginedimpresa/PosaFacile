import { useState } from 'react'
import { Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/store/cartStore'
import { useNavigate } from 'react-router-dom'

interface PreventivoWizardProps {
    product: {
        id: string
        name: string
        price_per_sqm: number
        image: string
    }
    onClose?: () => void
}

const STEPS = [
    { id: 1, title: 'Misure' },
    { id: 2, title: 'Posa' },
    { id: 3, title: 'Servizi' },
    { id: 4, title: 'Riepilogo' }
]

export function PreventivoWizard({ product, onClose }: PreventivoWizardProps) {
    const navigate = useNavigate()
    const { addItem } = useCartStore()
    const [step, setStep] = useState(1)

    // State
    const [sqm, setSqm] = useState<number>(20)
    const [waste, setWaste] = useState<number>(10)
    const [pattern, setPattern] = useState<string>('dritta')
    const [installation, setInstallation] = useState<boolean>(true)

    // Calculations
    const totalSqm = sqm * (1 + waste / 100)
    const materialPrice = totalSqm * product.price_per_sqm
    const installationPricePerSqm = 25 // Hardcoded for demo
    const installationTotal = installation ? totalSqm * installationPricePerSqm : 0
    const totalPrice = materialPrice + installationTotal

    const handleNext = () => setStep((s) => Math.min(s + 1, 4))
    const handleBack = () => setStep((s) => Math.max(s - 1, 1))

    const handleAddToCart = () => {
        addItem({
            id: Date.now().toString(),
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            pricePerSqm: product.price_per_sqm,
            sqm,
            wastePercentage: waste,
            totalSqm,
            layingPattern: pattern,
            includeInstallation: installation,
            installationPrice: installationTotal,
            totalPrice
        })
        if (onClose) onClose()
        navigate('/cart')
    }

    return (
        <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-auto">
            {/* Steps Indicator */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
                {STEPS.map((s) => (
                    <div key={s.id} className="flex flex-col items-center gap-2 bg-white px-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors
              ${step >= s.id ? 'border-primary bg-black text-white' : 'border-gray-200 text-gray-400'}
            `}>
                            {s.id}
                        </div>
                        <span className={`text-xs ${step >= s.id ? 'text-black font-medium' : 'text-gray-400'}`}>{s.title}</span>
                    </div>
                ))}
            </div>

            <div className="min-h-[300px]">
                {/* Step 1: Dimensions */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Quanto spazio devi coprire?</h3>
                        <div>
                            <label className="block text-sm font-medium mb-2">Metri Quadri (mq)</label>
                            <Input
                                type="number"
                                value={sqm}
                                onChange={(e) => setSqm(Number(e.target.value))}
                                min={1}
                                className="text-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Sfrido (Scarto) - Consigliato 10%</label>
                            <div className="flex gap-4">
                                {[0, 10, 15].map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setWaste(w)}
                                        className={`flex-1 py-3 border rounded-lg text-sm font-medium transition-all
                      ${waste === w ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-300'}
                    `}
                                    >
                                        {w}%
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                            <span className="text-gray-600">Totale ordine (incluso sfrido):</span>
                            <span className="text-xl font-bold">{totalSqm.toFixed(2)} mq</span>
                        </div>
                    </div>
                )}

                {/* Step 2: Pattern */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Come vuoi posare le piastrelle?</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: 'dritta', name: 'Posa Dritta', desc: 'Classica e pulita' },
                                { id: 'diagonale', name: 'Posa Diagonale', desc: '+ Elegante, + sfrido' },
                                { id: 'sfalsata', name: 'Posa Sfalsata', desc: 'Ideale per listoni' },
                                { id: 'spina', name: 'Spina di Pesce', desc: 'Classica di pregio' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setPattern(p.id)}
                                    className={`p-4 border rounded-lg text-left transition-all
                    ${pattern === p.id ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}
                  `}
                                >
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Installation */}
                {step === 3 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Vuoi includere la posa certificata?</h3>
                        <div className="space-y-4">
                            <button
                                onClick={() => setInstallation(true)}
                                className={`w-full p-4 border rounded-lg text-left flex items-start gap-4 transition-all
                    ${installation ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}
                  `}
                            >
                                <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center ${installation ? 'border-black bg-black text-white' : 'border-gray-300'}`}>
                                    {installation && <Check size={12} />}
                                </div>
                                <div>
                                    <div className="font-medium">Sì, voglio il servizio "Chiavi in mano"</div>
                                    <div className="text-sm text-gray-500 mt-1">Include posatori certificati PosaFacile, collanti e garanzia sulla posa.</div>
                                    <div className="text-lg font-bold mt-2 text-primary">+ €{installationTotal.toFixed(2)}</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setInstallation(false)}
                                className={`w-full p-4 border rounded-lg text-left flex items-start gap-4 transition-all
                    ${!installation ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}
                  `}
                            >
                                <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center ${!installation ? 'border-black bg-black text-white' : 'border-gray-300'}`}>
                                    {!installation && <Check size={12} />}
                                </div>
                                <div>
                                    <div className="font-medium">No, acquisto solo il materiale</div>
                                    <div className="text-sm text-gray-500 mt-1">Mi occuperò io di trovare un posatore.</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Summary */}
                {step === 4 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Riepilogo Preventivo</h3>
                        <div className="bg-gray-50 p-6 rounded-lg space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span>Materiale ({totalSqm.toFixed(2)} mq)</span>
                                <span>€ {materialPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Posa ({installation ? 'Inclusa' : 'Esclusa'})</span>
                                <span>€ {installationTotal.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-4 flex justify-between text-lg font-bold">
                                <span>Totale Stimato</span>
                                <span>€ {totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                            Il prezzo finale potrebbe variare leggermente in base alla disponibilità e promozioni attive.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={step === 1}
                >
                    <ArrowLeft size={16} className="mr-2" /> Indietro
                </Button>

                {step < 4 ? (
                    <Button onClick={handleNext}>
                        Continua <ArrowRight size={16} className="ml-2" />
                    </Button>
                ) : (
                    <Button onClick={handleAddToCart} className="bg-black text-white hover:bg-gray-800">
                        Aggiungi al Carrello
                    </Button>
                )}
            </div>
        </div>
    )
}
