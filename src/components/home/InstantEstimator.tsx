import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, Minus, Plus, Ruler } from 'lucide-react'
import {
    SERVICE_PRICES,
    layingRateFor,
    useConfiguratorStore,
} from '@/store/configuratorStore'

const finishes = [
    { name: 'Effetto legno', price: 28, swatch: 'wood' },
    { name: 'Effetto pietra', price: 35, swatch: 'stone' },
    { name: 'Effetto marmo', price: 42, swatch: 'marble' },
]
const euro = (value: number) =>
    new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(value)

export function InstantEstimator() {
    const [sqm, setSqm] = useState(40)
    const [selected, setSelected] = useState(0)
    const [removal, setRemoval] = useState(false)
    const navigate = useNavigate()
    const finish = finishes[selected]
    const material = sqm * 1.1 * finish.price
    const laying = sqm * layingRateFor(null)
    const services = removal
        ? sqm * (SERVICE_PRICES.demolizione + SERVICE_PRICES.smaltimento)
        : 0
    const subtotal = material + laying + services
    const total = subtotal * 1.22

    const proceed = () => {
        const store = useConfiguratorStore.getState()
        store.reset()
        store.setDimensions({
            pavimentoMq: sqm,
            paretiMq: 0,
            sfridoPercent: 10,
        })
        store.setProjectInfo({ rimuoverePavimento: removal })
        store.setServices({ demolizione: removal, smaltimento: removal })
        navigate('/configuratore')
    }

    return (
        <section id="stima" className="pf-section pf-container">
            <div className="pf-section-heading">
                <div>
                    <p className="pf-eyebrow">
                        DAL “MI PIACE” AL “QUANTO COSTA?”
                    </p>
                    <h2>
                        Una prima idea.
                        <br />
                        Anche del budget.
                    </h2>
                </div>
                <p>
                    Muovi il cursore, esplora le finiture.
                    <br />
                    La tua stima prende forma in tempo reale.
                </p>
            </div>
            <div className="pf-estimator">
                <div className="pf-estimator-controls">
                    <div className="pf-estimator-label">
                        <label htmlFor="floor-sqm">
                            <Ruler size={18} /> Quanto spazio vuoi rinnovare?
                        </label>
                        <output htmlFor="floor-sqm">
                            {sqm}
                            <small> m²</small>
                        </output>
                    </div>
                    <input
                        id="floor-sqm"
                        type="range"
                        min="10"
                        max="160"
                        step="1"
                        value={sqm}
                        onChange={(event) => setSqm(Number(event.target.value))}
                        style={{
                            background: `linear-gradient(to right, #f97316 ${((sqm - 10) / 150) * 100}%, #e7e5e4 ${((sqm - 10) / 150) * 100}%)`,
                        }}
                    />
                    <div className="pf-range-labels">
                        <span>10 m² · Una stanza</span>
                        <div>
                            <button
                                aria-label="Riduci superficie di un metro quadro"
                                onClick={() => setSqm(Math.max(10, sqm - 1))}
                                disabled={sqm === 10}
                            >
                                <Minus size={14} />
                            </button>
                            <button
                                aria-label="Aumenta superficie di un metro quadro"
                                onClick={() => setSqm(Math.min(160, sqm + 1))}
                                disabled={sqm === 160}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        <span>160 m² · Tutta casa</span>
                    </div>
                    <fieldset>
                        <legend>Quale effetto ti ispira?</legend>
                        <div className="pf-finish-options">
                            {finishes.map((item, index) => (
                                <button
                                    key={item.name}
                                    aria-pressed={selected === index}
                                    onClick={() => setSelected(index)}
                                    className={
                                        selected === index ? 'is-selected' : ''
                                    }
                                >
                                    <span
                                        className={`pf-finish-swatch ${item.swatch}`}
                                    >
                                        {selected === index && (
                                            <Check size={17} />
                                        )}
                                    </span>
                                    <strong>{item.name}</strong>
                                    <small>Riferimento {item.price} €/m²</small>
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <label className="pf-removal-option">
                        <input
                            type="checkbox"
                            checked={removal}
                            onChange={(event) =>
                                setRemoval(event.target.checked)
                            }
                        />
                        <span>
                            <strong>Via il vecchio pavimento</strong>
                            <small>Aggiungi demolizione e smaltimento</small>
                        </span>
                        <span>
                            +
                            {SERVICE_PRICES.demolizione +
                                SERVICE_PRICES.smaltimento}{' '}
                            €/m²
                        </span>
                    </label>
                </div>
                <div className="pf-estimator-result">
                    <div className="pf-result-heading">
                        <span>IL TUO PUNTO DI PARTENZA</span>
                        <span>Stima indicativa</span>
                    </div>
                    <div
                        className="pf-estimate-total"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        <strong>{euro(total)}</strong>
                        <span>per {sqm} m² · IVA 22% inclusa</span>
                    </div>
                    <dl>
                        <div>
                            <dt>
                                Materiale <small>(+10% di sfrido)</small>
                            </dt>
                            <dd>{euro(material)}</dd>
                        </div>
                        <div>
                            <dt>Posa standard</dt>
                            <dd>{euro(laying)}</dd>
                        </div>
                        {removal && (
                            <div>
                                <dt>Demolizione e smaltimento</dt>
                                <dd>{euro(services)}</dd>
                            </div>
                        )}
                        <div>
                            <dt>IVA 22%</dt>
                            <dd>{euro(subtotal * 0.22)}</dd>
                        </div>
                    </dl>
                    <button
                        onClick={proceed}
                        className="pf-button pf-button-orange"
                    >
                        Personalizza il preventivo <ArrowUpRight size={19} />
                    </button>
                    <p>
                        Trasferiamo metratura e rimozione nel configuratore. Lì
                        scegli il prodotto reale e il posatore: il prezzo
                        dipende da zona, posa e servizi. Trasporto e altre
                        lavorazioni esclusi da questa stima.
                    </p>
                </div>
            </div>
        </section>
    )
}
