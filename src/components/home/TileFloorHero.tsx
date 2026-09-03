import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'

/*
 * DIREZIONE — Hero homepage
 *
 * THESIS: la stanza è aperta come un plastico e il pavimento si posa dentro,
 *   davanti a chi guarda. Rifiuta la hero di categoria: fotografia stock
 *   d'interni, velo scuro, titolo centrato sopra.
 * OWN-WORLD: fondo chiaro caldo, un solo arancio come segnale d'azione, materiali
 *   resi come materiali (venatura, fuga, battiscopa, luce dall'alto) e non come
 *   campioni di colore. Nessuna card: la struttura è la stanza stessa.
 * STORY: "vedo il mio pavimento prima di sceglierlo, e il prezzo è quello del
 *   posatore che verrà davvero" → apre il configuratore.
 * FIRST VIEWPORT: testo a sinistra su fondo chiaro pieno, a destra la stanza in
 *   prospettiva — tre pareti, soffitto aperto — con il pavimento che si posa a
 *   cascata; i tre materiali sono controlli reali sotto la stanza.
 * FORM: scatola CSS 3D senza soffitto né quarta parete. Direzione fissata
 *   dall'utente (stanza frontale a tre pareti), quindi nessuna estrazione.
 */

interface Material {
    id: string
    nome: string
    formato: string
    /** Superficie della piastrella: gradienti sovrapposti, non un colore piatto. */
    face: string
    /** Fuga, sempre un poco più scura del materiale. */
    grout: string
    /** Luce che il pavimento rimanda sulle pareti. */
    bounce: string
}

const MATERIALI: Material[] = [
    {
        id: 'rovere',
        nome: 'Rovere Naturale',
        formato: '20×120',
        face:
            'repeating-linear-gradient(92deg, rgba(120,72,32,.20) 0 2px, rgba(255,255,255,0) 2px 9px),' +
            'repeating-linear-gradient(88deg, rgba(60,32,10,.14) 0 1px, rgba(255,255,255,0) 1px 17px),' +
            'linear-gradient(105deg, #c08a4e 0%, #a9723c 38%, #bb8449 62%, #9c6733 100%)',
        grout: '#6b4a24',
        bounce: 'rgba(196,138,78,.16)',
    },
    {
        id: 'statuario',
        nome: 'Marmo Statuario',
        formato: '80×80',
        face:
            'linear-gradient(118deg, rgba(90,98,112,0) 34%, rgba(90,98,112,.38) 36%, rgba(90,98,112,0) 39%),' +
            'linear-gradient(102deg, rgba(70,78,92,0) 58%, rgba(70,78,92,.26) 60%, rgba(70,78,92,0) 63%),' +
            'linear-gradient(150deg, #f6f6f4 0%, #e6e7e6 55%, #f2f2f0 100%)',
        grout: '#b9bab6',
        bounce: 'rgba(238,239,236,.18)',
    },
    {
        id: 'antracite',
        nome: 'Gres Antracite',
        formato: '60×120',
        face:
            'radial-gradient(circle at 22% 32%, rgba(255,255,255,.09) 0 1px, rgba(255,255,255,0) 2px),' +
            'radial-gradient(circle at 68% 71%, rgba(255,255,255,.07) 0 1px, rgba(255,255,255,0) 2px),' +
            'linear-gradient(128deg, #3d4249 0%, #2c3036 60%, #363b42 100%)',
        grout: '#1d2024',
        bounce: 'rgba(90,100,112,.16)',
    },
]

const COLS = 7
const ROWS = 9

export function TileFloorHero() {
    const [materialIndex, setMaterialIndex] = useState(0)
    // Quale materiale risulta già posato: derivarne 'laid' evita di azzerare e
    // riaccendere uno stato dentro un effect a ogni cambio.
    const [laidFor, setLaidFor] = useState<number | null>(null)
    const [reduced, setReduced] = useState(
        () => typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    const [interacted, setInteracted] = useState(false)
    const roomRef = useRef<HTMLDivElement>(null)

    const material = MATERIALI[materialIndex]
    const laid = laidFor === materialIndex

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const apply = () => setReduced(query.matches)
        query.addEventListener('change', apply)
        return () => query.removeEventListener('change', apply)
    }, [])

    // A ogni cambio materiale il pavimento si riposa: le piastrelle si ribaltano
    // dal massetto grezzo al materiale scelto, in diagonale come una posa vera.
    useEffect(() => {
        // Senza attesa il ribaltamento non parte: le piastrelle devono comparire
        // sul massetto per un frame prima di girarsi.
        const id = window.setTimeout(() => setLaidFor(materialIndex), reduced ? 0 : 90)
        return () => window.clearTimeout(id)
    }, [materialIndex, reduced])

    useEffect(() => {
        if (reduced || interacted) return
        const id = window.setInterval(
            () => setMaterialIndex(i => (i + 1) % MATERIALI.length),
            5400,
        )
        return () => window.clearInterval(id)
    }, [reduced, interacted])

    // La stanza ruota appena seguendo il puntatore, come un plastico che si gira.
    useEffect(() => {
        const room = roomRef.current
        if (!room || reduced) return

        let frame = 0
        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse' || frame) return
            frame = requestAnimationFrame(() => {
                frame = 0
                const rect = room.getBoundingClientRect()
                const x = (e.clientX - (rect.left + rect.width / 2)) / rect.width
                const y = (e.clientY - (rect.top + rect.height / 2)) / rect.height
                room.style.setProperty('--spin-y', (Math.max(-1, Math.min(1, x)) * 7).toFixed(2))
                room.style.setProperty('--spin-x', (Math.max(-1, Math.min(1, y)) * -3.5).toFixed(2))
            })
        }

        window.addEventListener('pointermove', onMove, { passive: true })
        return () => {
            window.removeEventListener('pointermove', onMove)
            if (frame) cancelAnimationFrame(frame)
        }
    }, [reduced])

    const chooseMaterial = (index: number) => {
        setInteracted(true)
        setMaterialIndex(index)
    }

    return (
        <section className="relative overflow-hidden bg-[#f5f2ec] text-[#14171a]">
            <style>{`
                .pf-stage {
                    --w: 430px; --h: 268px; --d: 340px; --lift: 26px;
                    perspective: 820px;
                    perspective-origin: 50% 34%;
                    height: 430px;
                    /* La stanza è un oggetto guardato dentro, non uno sfondo:
                       il riquadro la contiene e la tiene fuori dalla colonna di testo. */
                    overflow: hidden;
                    border-radius: 20px;
                    border: 1px solid rgba(20,23,26,.10);
                    /* Sopra le pareti si vede la luce che entra dal soffitto tolto */
                    background: linear-gradient(to bottom, #dfe6ec 0%, #eceae5 55%, #e4e0d9 100%);
                    box-shadow: 0 24px 60px -28px rgba(20,23,26,.35);
                }
                @media (max-width: 1023px) {
                    .pf-stage { --w: 400px; --h: 250px; --d: 320px; --lift: 24px; perspective: 760px; height: 400px; }
                }
                @media (max-width: 479px) {
                    .pf-stage { --w: 300px; --h: 190px; --d: 240px; --lift: 18px; perspective: 580px; height: 320px; }
                }

                .pf-room {
                    --spin-x: 0; --spin-y: 0;
                    position: absolute;
                    left: 50%; top: 50%;
                    width: 0; height: 0;
                    transform-style: preserve-3d;
                    transform:
                        translateY(var(--lift))
                        rotateX(calc(var(--spin-x) * 1deg))
                        rotateY(calc(var(--spin-y) * 1deg));
                    transition: transform 480ms cubic-bezier(.22,.61,.36,1);
                }
                .pf-surface {
                    position: absolute;
                    left: 0; top: 0;
                    transform-style: preserve-3d;
                }
                /* Scatola senza soffitto e senza quarta parete: si guarda dentro */
                .pf-back {
                    width: var(--w); height: var(--h);
                    margin-left: calc(var(--w) / -2); margin-top: calc(var(--h) / -2);
                    transform: translateZ(calc(var(--d) / -2));
                }
                .pf-left {
                    width: var(--d); height: var(--h);
                    margin-left: calc(var(--d) / -2); margin-top: calc(var(--h) / -2);
                    transform: rotateY(90deg) translateZ(calc(var(--w) / -2));
                }
                .pf-right {
                    width: var(--d); height: var(--h);
                    margin-left: calc(var(--d) / -2); margin-top: calc(var(--h) / -2);
                    transform: rotateY(-90deg) translateZ(calc(var(--w) / -2));
                }
                .pf-floor {
                    width: var(--w); height: var(--d);
                    margin-left: calc(var(--w) / -2); margin-top: calc(var(--d) / -2);
                    transform: rotateX(90deg) translateZ(calc(var(--h) / -2));
                }

                /* Intonaco: la luce entra dal soffitto aperto, quindi il muro
                   è più chiaro in alto e si spegne verso il battiscopa. */
                .pf-wall {
                    background: linear-gradient(to bottom, #e6e0d6 0%, #cfc8bc 46%, #a9a196 100%);
                }
                .pf-wall--side { filter: brightness(.82); }
                .pf-wall--side-right { filter: brightness(.90); }
                .pf-skirting {
                    position: absolute;
                    left: 0; right: 0; bottom: 0;
                    height: 4.5%;
                    background: linear-gradient(to bottom, #f2efe9, #ddd8d0);
                    box-shadow: 0 -1px 0 rgba(0,0,0,.18);
                }
                /* Finestra sulla parete di fondo: giustifica la luce della scena */
                .pf-window {
                    position: absolute;
                    left: 12%; top: 16%;
                    width: 30%; height: 46%;
                    background: linear-gradient(160deg, #eaf0f4 0%, #cfdde6 55%, #b9ccd8 100%);
                    box-shadow:
                        0 0 0 6px #e8e4dd,
                        0 18px 44px rgba(226,236,243,.30);
                }
                .pf-window::after {
                    content: '';
                    position: absolute; inset: 0;
                    background:
                        linear-gradient(to right, rgba(120,140,155,.5) 0 2px, transparent 2px),
                        linear-gradient(to bottom, rgba(120,140,155,.5) 0 2px, transparent 2px);
                    background-position: 50% 0, 0 46%;
                    background-size: 100% 100%, 100% 100%;
                    background-repeat: no-repeat;
                }

                .pf-tile {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transform-style: preserve-3d;
                    transform: rotateX(0deg);
                    transition: transform 640ms cubic-bezier(.16,.84,.28,1);
                }
                .pf-tile[data-laid='true'] { transform: rotateX(180deg); }
                .pf-face {
                    position: absolute; inset: 0;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                /* Massetto grezzo: com'è il pavimento prima dell'intervento */
                .pf-face--screed {
                    background:
                        radial-gradient(circle at 30% 40%, rgba(255,255,255,.05) 0 1px, transparent 2px),
                        linear-gradient(140deg, #55534f 0%, #444240 60%, #4d4b47 100%);
                }
                .pf-face--tile { transform: rotateX(180deg); }

                @media (prefers-reduced-motion: reduce) {
                    .pf-room, .pf-tile { transition: none; }
                }
            `}</style>

            <div className="mx-auto grid max-w-6xl items-center gap-y-12 px-6 pb-20 pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-12 lg:pb-24 lg:pt-32">

                {/* Testo: fondo scuro pieno, nessuna immagine sotto */}
                <div>
                    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#14171a]/12 bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#3c4249]">
                        <ShieldCheck size={14} className="text-orange-600" />
                        Piastrelle e posatore certificato, un unico preventivo
                    </p>

                    <h1 className="font-display text-[2.6rem] font-bold leading-[1] tracking-[-0.035em] text-[#14171a] sm:text-[3.4rem] lg:text-[4rem]">
                        Il tuo pavimento,
                        <br />
                        <span className="text-[#857f76]">prima di posarlo.</span>
                    </h1>

                    <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#4b5158]">
                        Scegli il materiale, guardalo nella tua stanza e ricevi il prezzo finito:
                        materiale, posa e servizi. La tariffa è quella del posatore che verrà
                        davvero a casa tua, non una stima.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to="/configuratore"
                            className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-orange-500 px-8 text-base font-semibold text-white transition-colors hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f2ec]"
                        >
                            Calcola il preventivo
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link
                            to="/catalog"
                            className="inline-flex h-14 items-center justify-center rounded-full border border-[#14171a]/20 px-8 text-base font-medium text-[#14171a] transition-colors hover:border-[#14171a]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f2ec]"
                        >
                            Sfoglia il catalogo
                        </Link>
                    </div>
                </div>

                {/* La stanza */}
                <div>
                    <div className="pf-stage relative" aria-hidden="true">
                        {/* Luce che scende dal soffitto aperto */}
                        <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                            style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(255,255,255,.55), transparent 72%)' }}
                        />

                        <div ref={roomRef} className="pf-room">
                            <div className="pf-surface pf-back pf-wall">
                                <div className="pf-window" />
                                <div className="pf-skirting" />
                            </div>
                            <div className="pf-surface pf-left pf-wall pf-wall--side">
                                <div className="pf-skirting" />
                            </div>
                            <div className="pf-surface pf-right pf-wall pf-wall--side-right">
                                <div className="pf-skirting" />
                            </div>

                            <div
                                className="pf-surface pf-floor"
                                style={{ background: material.grout }}
                            >
                                <div
                                    className="grid h-full w-full gap-[2px] p-[2px]"
                                    style={{
                                        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                                        gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                                    }}
                                >
                                    {Array.from({ length: COLS * ROWS }, (_, i) => {
                                        const row = Math.floor(i / COLS)
                                        const col = i % COLS
                                        // La posa avanza dal fondo della stanza verso chi guarda.
                                        const delay = row * 54 + col * 26
                                        return (
                                            <div
                                                key={i}
                                                className="pf-tile"
                                                data-laid={laid}
                                                style={{ transitionDelay: laid ? `${delay}ms` : '0ms' }}
                                            >
                                                <div className="pf-face pf-face--screed" />
                                                <div
                                                    className="pf-face pf-face--tile"
                                                    style={{ backgroundImage: material.face }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Luce che il pavimento rimanda nell'aria della stanza */}
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 transition-colors duration-700"
                            style={{ background: `linear-gradient(to top, ${material.bounce}, transparent)` }}
                        />
                    </div>

                    {/* I materiali sono controlli veri: scegliendone uno la stanza si riposa */}
                    <div className="mt-6">
                        <span className="mb-3 block text-[13px] font-medium text-[#6b7178]">
                            Scegli il materiale e guarda la posa
                        </span>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {MATERIALI.map((m, i) => {
                                const active = i === materialIndex
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => chooseMaterial(i)}
                                        aria-pressed={active}
                                        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14171a]/40 ${
                                            active
                                                ? 'border-[#14171a]/30 bg-white shadow-sm'
                                                : 'border-[#14171a]/10 bg-white/60 hover:border-[#14171a]/25 hover:bg-white'
                                        }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="h-9 w-9 flex-shrink-0 rounded-lg ring-1 ring-inset ring-black/15"
                                            style={{ backgroundImage: m.face }}
                                        />
                                        <span className="leading-tight">
                                            <span className={`block text-sm font-medium ${active ? 'text-[#14171a]' : 'text-[#4b5158]'}`}>
                                                {m.nome}
                                            </span>
                                            <span className="block text-xs text-[#7b8189]">{m.formato} cm</span>
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
