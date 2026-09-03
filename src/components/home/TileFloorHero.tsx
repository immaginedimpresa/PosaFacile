import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'

/*
 * DIREZIONE — Hero homepage
 *
 * THESIS: il pavimento si posa davanti a chi guarda. Rifiuta la hero di
 *   categoria: fotografia stock d'interni, velo scuro, titolo centrato sopra.
 * OWN-WORLD: fondo grafite quasi nero, un solo arancio come segnale d'azione,
 *   materiali resi come materiali (venatura, fuga, riflesso radente) e non come
 *   campioni di colore. Nessuna card: la struttura è il piano in prospettiva.
 * STORY: "posso vedere il mio pavimento prima di sceglierlo, e il prezzo che
 *   vedo è quello del posatore che verrà davvero" → apre il configuratore.
 * FIRST VIEWPORT: piano prospettico a tutta larghezza ancorato in basso, che
 *   fugge verso l'orizzonte; titolo in alto a sinistra sul cielo vuoto; azione
 *   primaria subito sotto; i tre materiali sono controlli reali sul piano.
 * FORM: piano prospettico in CSS 3D con posa a cascata diagonale. Direzione
 *   fissata dall'utente (pavimento che si trasforma), quindi nessuna estrazione.
 */

interface Material {
    id: string
    nome: string
    formato: string
    /** Superficie della piastrella: gradienti sovrapposti, non un colore piatto. */
    face: string
    /** Colore della fuga, sempre un poco più scuro del materiale. */
    grout: string
    /** Tinta della luce riflessa dal pavimento sul fondo della scena. */
    bounce: string
}

const MATERIALI: Material[] = [
    {
        id: 'rovere',
        nome: 'Rovere Naturale',
        formato: '20×120',
        face:
            'repeating-linear-gradient(92deg, rgba(120,72,32,.22) 0 2px, rgba(255,255,255,0) 2px 9px),' +
            'repeating-linear-gradient(88deg, rgba(60,32,10,.16) 0 1px, rgba(255,255,255,0) 1px 17px),' +
            'linear-gradient(105deg, #c08a4e 0%, #a9723c 38%, #bb8449 62%, #9c6733 100%)',
        grout: '#6b4a24',
        bounce: 'rgba(196,138,78,.20)',
    },
    {
        id: 'statuario',
        nome: 'Marmo Statuario',
        formato: '80×80',
        face:
            'linear-gradient(118deg, rgba(90,98,112,0) 34%, rgba(90,98,112,.42) 36%, rgba(90,98,112,0) 39%),' +
            'linear-gradient(102deg, rgba(70,78,92,0) 58%, rgba(70,78,92,.30) 60%, rgba(70,78,92,0) 63%),' +
            'linear-gradient(150deg, #f6f6f4 0%, #e6e7e6 55%, #f2f2f0 100%)',
        grout: '#b9bab6',
        bounce: 'rgba(238,239,236,.24)',
    },
    {
        id: 'antracite',
        nome: 'Gres Antracite',
        formato: '60×120',
        face:
            'radial-gradient(circle at 22% 32%, rgba(255,255,255,.10) 0 1px, rgba(255,255,255,0) 2px),' +
            'radial-gradient(circle at 68% 71%, rgba(255,255,255,.08) 0 1px, rgba(255,255,255,0) 2px),' +
            'linear-gradient(128deg, #3d4249 0%, #2c3036 60%, #363b42 100%)',
        grout: '#1d2024',
        bounce: 'rgba(90,100,112,.20)',
    },
]

const COLS = 9
const ROWS = 11

export function TileFloorHero() {
    const [materialIndex, setMaterialIndex] = useState(0)
    const [laid, setLaid] = useState(false)
    const [reduced, setReduced] = useState(false)
    const [interacted, setInteracted] = useState(false)
    const sceneRef = useRef<HTMLDivElement>(null)

    const material = MATERIALI[materialIndex]

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const apply = () => setReduced(query.matches)
        apply()
        query.addEventListener('change', apply)
        return () => query.removeEventListener('change', apply)
    }, [])

    // La posa parte a ogni cambio di materiale: le piastrelle si ribaltano dal
    // massetto grezzo al materiale scelto, in diagonale come una posa vera.
    useEffect(() => {
        if (reduced) { setLaid(true); return }
        setLaid(false)
        const id = window.setTimeout(() => setLaid(true), 80)
        return () => window.clearTimeout(id)
    }, [materialIndex, reduced])

    // Rotazione automatica finché il visitatore non sceglie da sé.
    useEffect(() => {
        if (reduced || interacted) return
        const id = window.setInterval(
            () => setMaterialIndex(i => (i + 1) % MATERIALI.length),
            5200,
        )
        return () => window.clearInterval(id)
    }, [reduced, interacted])

    // Parallasse: il piano si inclina seguendo il puntatore, come se ci si
    // spostasse nella stanza. Un frame per movimento, e niente su touch.
    useEffect(() => {
        const scene = sceneRef.current
        if (!scene || reduced) return

        let frame = 0
        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return
            if (frame) return
            frame = requestAnimationFrame(() => {
                frame = 0
                const x = (e.clientX / window.innerWidth - 0.5) * 2
                const y = (e.clientY / window.innerHeight - 0.5) * 2
                scene.style.setProperty('--tilt-x', (-y * 1.6).toFixed(3))
                scene.style.setProperty('--tilt-y', (x * 2.4).toFixed(3))
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
        <section className="relative isolate overflow-hidden bg-[#0e1012] text-white">
            <style>{`
                .pf-scene {
                    --tilt-x: 0;
                    --tilt-y: 0;
                    perspective: 780px;
                    perspective-origin: 50% 12%;
                }
                .pf-plane {
                    transform-style: preserve-3d;
                    transform:
                        translateZ(0)
                        rotateX(calc(66deg + var(--tilt-x) * 1deg))
                        rotateZ(calc(var(--tilt-y) * 1deg));
                    transition: transform 420ms cubic-bezier(.22,.61,.36,1);
                    /* Il fondo del piano sfuma nel buio invece di tagliarsi netto */
                    -webkit-mask-image: linear-gradient(to top, #000 34%, rgba(0,0,0,.55) 62%, transparent 96%);
                    mask-image: linear-gradient(to top, #000 34%, rgba(0,0,0,.55) 62%, transparent 96%);
                }
                .pf-cell { transform-style: preserve-3d; }
                .pf-tile {
                    position: relative;
                    width: 100%;
                    padding-top: 62%;
                    transform-style: preserve-3d;
                    transform: rotateX(0deg);
                    transition: transform 620ms cubic-bezier(.16,.84,.28,1);
                }
                .pf-tile[data-laid='true'] { transform: rotateX(180deg); }
                .pf-face {
                    position: absolute;
                    inset: 0;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    border-radius: 1px;
                }
                /* Massetto grezzo: com'è il pavimento prima dell'intervento */
                .pf-face--screed {
                    background:
                        radial-gradient(circle at 30% 40%, rgba(255,255,255,.05) 0 1px, transparent 2px),
                        linear-gradient(140deg, #4a4a48 0%, #3a3a39 60%, #444442 100%);
                }
                .pf-face--tile { transform: rotateX(180deg); }
                @media (prefers-reduced-motion: reduce) {
                    .pf-plane, .pf-tile { transition: none; }
                }
            `}</style>

            {/* Luce radente che stacca il titolo dal piano */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] z-0"
                style={{
                    background:
                        'radial-gradient(120% 80% at 22% 0%, rgba(255,255,255,.09) 0%, transparent 62%)',
                }}
            />

            {/* Il piano: decorativo, la scelta materiale è nei controlli sotto */}
            <div
                ref={sceneRef}
                aria-hidden="true"
                className="pf-scene pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[56vh] sm:h-[58vh]"
            >
                <div
                    className="pf-plane absolute left-1/2 bottom-[-14%] w-[180%] max-w-none -translate-x-1/2 sm:w-[130%] lg:w-[112%]"
                    style={{ background: material.grout }}
                >
                    <div
                        className="grid gap-[2px] p-[2px]"
                        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
                    >
                        {Array.from({ length: COLS * ROWS }, (_, i) => {
                            const row = Math.floor(i / COLS)
                            const col = i % COLS
                            // Cascata diagonale: la posa avanza dal fondo verso chi guarda.
                            const delay = (ROWS - 1 - row) * 52 + col * 26
                            return (
                                <div key={i} className="pf-cell">
                                    <div
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
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Riflesso del pavimento sull'aria della stanza */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[46vh] transition-colors duration-700"
                style={{ background: `linear-gradient(to top, ${material.bounce}, transparent 72%)` }}
            />

            {/* Velo: porta il testo a contrasto pieno sopra qualunque materiale */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                    background:
                        'linear-gradient(to bottom, #0e1012 0%, rgba(14,16,18,.92) 30%, rgba(14,16,18,.55) 50%, rgba(14,16,18,.18) 64%, transparent 78%)',
                }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-full lg:w-3/5"
                style={{
                    background:
                        'linear-gradient(to right, rgba(14,16,18,.72) 0%, rgba(14,16,18,.34) 55%, transparent 100%)',
                }}
            />

            <div className="relative z-[2] mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-between px-6 pb-10 pt-28 sm:pt-32">
                <div className="max-w-2xl">
                    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-white/80">
                        <ShieldCheck size={14} className="text-orange-400" />
                        Piastrelle e posatore certificato, in un unico preventivo
                    </p>

                    <h1 className="font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.035em] text-white sm:text-6xl lg:text-[5.25rem]">
                        Il tuo pavimento,
                        <br />
                        <span className="text-white/60">prima di posarlo.</span>
                    </h1>

                    <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/80">
                        Scegli il materiale, guardalo nella tua stanza e ricevi il prezzo finito:
                        materiale, posa e servizi. La tariffa è quella del posatore che verrà
                        davvero a casa tua, non una stima.
                    </p>

                    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to="/configuratore"
                            className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-orange-500 px-8 text-base font-semibold text-white transition-colors hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1012]"
                        >
                            Calcola il preventivo
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link
                            to="/catalog"
                            className="inline-flex h-14 items-center justify-center rounded-full border border-white/20 px-8 text-base font-medium text-white/90 transition-colors hover:border-white/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1012]"
                        >
                            Sfoglia il catalogo
                        </Link>
                    </div>
                </div>

                {/* I materiali sono controlli veri: scegliendone uno il piano si riposa */}
                <div className="mt-16 sm:mt-20">
                    <span className="mb-3 block text-[13px] font-medium text-white/55">
                        Scegli il materiale e guarda la posa
                    </span>
                    <div className="flex flex-wrap gap-2">
                    {MATERIALI.map((m, i) => {
                        const active = i === materialIndex
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => chooseMaterial(i)}
                                aria-pressed={active}
                                className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                                    active
                                        ? 'border-white/35 bg-white/[0.10]'
                                        : 'border-white/12 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]'
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className="h-9 w-9 flex-shrink-0 rounded-lg ring-1 ring-inset ring-black/25"
                                    style={{ backgroundImage: m.face }}
                                />
                                <span className="leading-tight">
                                    <span className={`block text-sm font-medium ${active ? 'text-white' : 'text-white/75'}`}>
                                        {m.nome}
                                    </span>
                                    <span className="block text-xs text-white/45">{m.formato} cm</span>
                                </span>
                            </button>
                        )
                    })}
                    </div>
                </div>
            </div>
        </section>
    )
}
