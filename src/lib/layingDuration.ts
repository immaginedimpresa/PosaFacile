/**
 * Stima della durata di un cantiere di posa.
 *
 * Il modello distingue tre grandezze che nei preventivi vengono spesso confuse,
 * ed è proprio quella confusione a produrre stime assurde sui cantieri grandi:
 *
 *  - GIORNATE-UOMO (laborDays): il lavoro complessivo da fare. È la base del
 *    compenso e non dipende da quante persone lo eseguono.
 *  - GIORNATE DI CANTIERE (workDays): quanti giorni la squadra sta in cantiere.
 *    Dipende da quanti sono e da quali lavorazioni si sovrappongono.
 *  - GIORNI DI CALENDARIO (calendarDays): giornate di cantiere più le attese
 *    tecniche (maturazione massetto, asciugatura guaina). È la durata che il
 *    cliente percepisce.
 *
 * Sommare tutte le lavorazioni in fila, con un solo operatore e senza economie
 * di scala, porta a numeri fuori dalla realtà: 260 mq con demolizione, massetto
 * e impermeabilizzazione diventerebbero quasi tre mesi di lavoro. In cantiere si
 * va in squadra, si carica mentre si demolisce e si stucca mentre si posa.
 */

import type { AdditionalServices, LayingType, ProjectInfo } from '@/store/configuratorStore'

/* ------------------------------------------------------------------ */
/* 1. Classi di formato                                                */
/* ------------------------------------------------------------------ */

/**
 * La resa di posa non cresce con la dimensione della piastrella: il 60x60 è
 * l'ottimo di mercato, mentre le lastre grandi coprono più superficie ma
 * richiedono due operatori, ventose e tagli in opera.
 */
export type TileFormatClass = 'mosaico' | 'piccolo' | 'medio' | 'grande' | 'lastra'

export const TILE_FORMAT_LABELS: Record<TileFormatClass, string> = {
    mosaico: 'Mosaico / micro formato',
    piccolo: 'Piccolo formato (fino a 30x30)',
    medio: 'Medio formato (fino a 60x60)',
    grande: 'Grande formato (fino a 60x120)',
    lastra: 'Lastra (oltre 1 mq)',
}

/** Resa base di posa a pavimento, mq al giorno per un posatore, posa dritta. */
export const BASE_FLOOR_YIELD: Record<TileFormatClass, number> = {
    mosaico: 5,
    piccolo: 14,
    medio: 22,
    grande: 17,
    lastra: 11,
}

/** Il rivestimento a parete costa più tempo del pavimento a parità di formato. */
export const WALL_YIELD_RATIO = 0.62

/** Classifica il formato dall'area della singola piastrella in mq. */
export function tileFormatClass(widthMm?: number | null, heightMm?: number | null): TileFormatClass {
    const w = Number(widthMm)
    const h = Number(heightMm)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        // Formato ignoto: si assume il caso più frequente a catalogo.
        return 'medio'
    }
    const areaMq = (w / 1000) * (h / 1000)
    if (areaMq <= 0.01) return 'mosaico'   // fino a 10x10
    if (areaMq <= 0.09) return 'piccolo'   // fino a 30x30
    if (areaMq <= 0.40) return 'medio'     // fino a 60x60
    if (areaMq < 1.00) return 'grande'     // 60x120, 80x80, 100x100
    return 'lastra'
}

/* ------------------------------------------------------------------ */
/* 2. Coefficienti di complessità                                      */
/* ------------------------------------------------------------------ */

/** Moltiplicatore di tempo dello schema di posa (1.00 = posa dritta). */
export const PATTERN_TIME_FACTOR: Record<LayingType, number> = {
    dritta: 1.00,
    correre: 1.08,
    diagonale: 1.22,
    spina: 1.50,
    mosaico: 1.35,
}

type Ambiente = NonNullable<ProjectInfo['ambiente']>

/**
 * Moltiplicatore d'ambiente: bagni e cucine sono pieni di ostacoli
 * (sanitari, scarichi, angoli, zoccolature) e generano molti tagli.
 */
export const ROOM_TIME_FACTOR: Record<Ambiente, number> = {
    bagno: 1.35,
    cucina: 1.20,
    esterno: 1.10,
    soggiorno: 1.00,
    camera: 1.00,
    altro: 1.05,
}

/** Ristrutturare in un immobile abitato rallenta: protezioni, orari, pulizie. */
export const INTERVENTION_TIME_FACTOR = {
    nuova_costruzione: 0.95,
    ristrutturazione: 1.10,
    sostituzione: 1.05,
} as const

/**
 * Le doghe e i formati molto allungati (15x90, 20x120) hanno più giunti e
 * più allineamenti da controllare per metro quadro di una piastrella quadrata,
 * anche a parità di superficie del pezzo.
 */
export function aspectRatioFactor(widthMm?: number | null, heightMm?: number | null): number {
    const w = Number(widthMm)
    const h = Number(heightMm)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 1
    const ratio = Math.max(w, h) / Math.min(w, h)
    if (ratio < 1.5) return 1.00
    if (ratio < 2.5) return 1.05
    if (ratio < 4) return 1.12
    return 1.20
}

/**
 * Economia di scala.
 *
 * Il lavoro "difficile" sta sul perimetro: tagli, raccordi, battute contro i
 * muri. Il perimetro cresce con la radice dell'area, quindi la sua incidenza
 * per metro quadro cala man mano che la superficie aumenta. Un bagno da 8 mq è
 * quasi tutto perimetro; un open space da 200 mq è quasi tutto campo aperto,
 * dove la squadra posa a ritmo pieno.
 *
 * Superficie di riferimento 40 mq (fattore 1.00), con estremi limitati per non
 * estrapolare la curva oltre i dati che ha senso assumere.
 */
export const SIZE_REFERENCE_SQM = 40
export const SIZE_EXPONENT = 0.12
export const SIZE_FACTOR_RANGE = { min: 0.85, max: 1.20 } as const

export function sizeFactor(totalSqm: number): number {
    if (!(totalSqm > 0)) return 1
    const raw = Math.pow(SIZE_REFERENCE_SQM / totalSqm, SIZE_EXPONENT)
    return Math.min(SIZE_FACTOR_RANGE.max, Math.max(SIZE_FACTOR_RANGE.min, raw))
}

/* ------------------------------------------------------------------ */
/* 3. Dimensione della squadra                                         */
/* ------------------------------------------------------------------ */

/**
 * Quante persone vanno in cantiere.
 *
 * È il parametro che mancava del tutto: assumere sempre un solo posatore
 * significa dire a un cliente con 260 mq che i lavori durano due mesi e mezzo.
 * Nessuna impresa lavora così. La squadra viene proposta in base alla
 * superficie e resta modificabile dal professionista.
 */
export const CREW_BY_SIZE = [
    { upToSqm: 20, crew: 1 },
    { upToSqm: 120, crew: 2 },
    { upToSqm: Infinity, crew: 3 },
] as const

export const MAX_USEFUL_CREW = 3

export function suggestedCrew(totalSqm: number): number {
    return CREW_BY_SIZE.find((r) => totalSqm <= r.upToSqm)?.crew ?? 1
}

/**
 * La squadra non scala in modo lineare: il secondo e il terzo operatore
 * rendono circa il 75% del primo, perché si intralciano, condividono il taglio
 * e devono coordinarsi.
 */
export const CREW_EFFICIENCY = 0.75

export function crewThroughput(crewSize: number): number {
    return 1 + (crewSize - 1) * CREW_EFFICIENCY
}

/* ------------------------------------------------------------------ */
/* 4. Rese delle lavorazioni                                           */
/* ------------------------------------------------------------------ */

export const PHASE_YIELDS = {
    /** Allestimento cantiere: quota fissa più una quota che cresce col volume. */
    allestimentoBase: 0.15,
    allestimentoMqDay: 400,
    /** Demolizione e rimozione del pavimento esistente, mq/giorno. */
    demolizioneMqDay: 26,
    /** Carico e conferimento in discarica: quota fissa + quota a volume. */
    smaltimentoGiorniFissi: 0.2,
    smaltimentoMqDay: 120,
    /** Stesura massetto, mq/giorno. */
    massettoMqDay: 35,
    /** Applicazione guaina impermeabilizzante, mq/giorno. */
    impermeabilizzazioneMqDay: 32,
    /** Stuccatura fughe e siliconature, mq/giorno. */
    stuccaturaMqDay: 45,
    /** Posa battiscopa, metri lineari/giorno. */
    battiscopaMlDay: 28,
    /** Posa soglie e davanzali, pezzi/giorno. */
    soglieQtyDay: 6,
    /** Pulizia finale, ritiro attrezzatura e consegna al cliente. */
    consegnaBase: 0.15,
    consegnaMqDay: 400,
} as const

/**
 * Quota di ogni lavorazione che finisce sul percorso critico del cantiere.
 *
 * Non tutte le fasi allungano la durata: alcune si fanno mentre se ne fa
 * un'altra. Le macerie si caricano durante la demolizione, si stucca il tratto
 * posato ieri mentre si posa quello di oggi, battiscopa e soglie si chiudono in
 * coda alla stuccatura. Le giornate-uomo restano intere — vanno pagate — ma
 * sul calendario pesano meno.
 */
export const PHASE_CRITICAL_SHARE = {
    /** Si carica in discarica mentre la demolizione prosegue. */
    smaltimento: 0.2,
    /** Insegue la posa a un giorno di distanza: resta solo la coda finale. */
    stuccatura: 0.35,
    /** Si sovrappongono alla stuccatura e alle pulizie. */
    battiscopa: 0.5,
    soglie: 0.5,
} as const

/** Attese tecniche non lavorate, in giorni di calendario. */
export const CURING_DAYS = {
    /** Massetto a presa rapida: pedonabile in ~24h, piastrellabile in 3 giorni. */
    massettoRapido: 3,
    /** Massetto tradizionale: circa 7 giorni per cm di spessore (4 cm tipici). */
    massettoTradizionalePerCm: 7,
    massettoTradizionaleSpessoreCm: 4,
    /** Guaina cementizia bicomponente: 24h prima di posare. */
    impermeabilizzazione: 1,
    /**
     * Presa della colla prima di stuccare. Si paga solo sui cantieri che si
     * chiudono in una giornata: se la posa dura di più, la stuccatura del
     * primo tratto avviene mentre si posa il resto.
     */
    presaCollaCantiereBreve: 1,
} as const

/** Oltre questa durata la stuccatura può sovrapporsi alla posa. */
const OVERLAP_THRESHOLD_DAYS = 1.5

/* ------------------------------------------------------------------ */
/* 5. Tipi pubblici                                                    */
/* ------------------------------------------------------------------ */

export interface DurationInput {
    floorSqm: number
    wallSqm: number
    layingType: LayingType
    ambiente?: Ambiente | null
    intervento?: ProjectInfo['intervento']
    /** Formato della piastrella scelta, in millimetri. */
    tileWidthMm?: number | null
    tileHeightMm?: number | null
    services?: Partial<AdditionalServices> | null
    /** Operatori in cantiere. Se assente viene proposto in base alla superficie. */
    crewSize?: number
    /** Il massetto tradizionale ha una maturazione lunghissima: va dichiarato. */
    screedType?: 'rapido' | 'tradizionale'
}

export interface DurationPhase {
    key: string
    label: string
    /** Lavoro della fase in giornate-uomo, indipendente dalla squadra. */
    laborDays: number
    /** Quota della fase che allunga davvero il cantiere (0-1). */
    criticalShare: number
    /** Giornate-uomo che finiscono sul percorso critico. */
    criticalDays: number
    /** Giorni di attesa tecnica successivi alla fase. */
    curingDays: number
    note?: string
}

export interface DurationEstimate {
    phases: DurationPhase[]
    /** Giornate-uomo totali: la misura del lavoro, base del compenso. */
    laborDays: number
    /** Giornate in cui la squadra è in cantiere, arrotondate a mezze giornate. */
    workDays: number
    /** Attese tecniche totali in giorni di calendario. */
    curingDays: number
    /** Durata percepita del cantiere: giornate di lavoro più attese. */
    calendarDays: number
    /** Forchetta comunicabile al cliente, per non promettere il caso migliore. */
    minWorkDays: number
    maxWorkDays: number
    formatClass: TileFormatClass
    /** Moltiplicatore complessivo applicato alla sola posa. */
    complexityFactor: number
    /** Componente di scala del moltiplicatore, isolata per leggibilità. */
    sizeFactor: number
    crewSize: number
    /** Resa della squadra rispetto al singolo posatore. */
    crewThroughput: number
    confidence: 'alta' | 'media' | 'bassa'
    /** Spiegazioni in chiaro, da mostrare in preventivo e in scheda ordine. */
    assumptions: string[]
    /** Anomalie da far notare prima di firmare: input probabilmente sbagliati. */
    warnings: string[]
}

/* ------------------------------------------------------------------ */
/* 6. Utilità numeriche                                                */
/* ------------------------------------------------------------------ */

const num = (value: unknown, fallback = 0): number => {
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** Arrotonda per eccesso alla mezza giornata: non si manda una squadra per 2 ore. */
export const roundToHalfDay = (days: number): number => Math.ceil(days * 2) / 2

/* ------------------------------------------------------------------ */
/* 7. Motore di stima                                                  */
/* ------------------------------------------------------------------ */

/**
 * Calcola la durata del cantiere a partire dai dati del configuratore.
 * È una funzione pura: stessi input, stesso risultato, sia lato cliente
 * sia lato admin sia in fase di ricalcolo.
 */
export function estimateLayingDuration(input: DurationInput): DurationEstimate {
    const floorSqm = num(input.floorSqm)
    const wallSqm = num(input.wallSqm)
    const totalSqm = floorSqm + wallSqm
    const services = input.services ?? {}

    const formatClass = tileFormatClass(input.tileWidthMm, input.tileHeightMm)

    const crewSize = Math.min(
        Math.max(Math.round(num(input.crewSize, 0)) || suggestedCrew(totalSqm), 1),
        MAX_USEFUL_CREW,
    )
    const throughput = crewThroughput(crewSize)

    // --- Complessità della sola posa -------------------------------------
    const patternFactor = PATTERN_TIME_FACTOR[input.layingType] ?? 1
    const roomFactor = input.ambiente ? ROOM_TIME_FACTOR[input.ambiente] ?? 1 : 1
    const interventionFactor = input.intervento
        ? INTERVENTION_TIME_FACTOR[input.intervento] ?? 1
        : 1
    const ratioFactor = aspectRatioFactor(input.tileWidthMm, input.tileHeightMm)
    const scaleFactor = sizeFactor(totalSqm)
    const complexityFactor = patternFactor * roomFactor * interventionFactor * ratioFactor * scaleFactor

    const floorYield = BASE_FLOOR_YIELD[formatClass]
    const wallYield = floorYield * WALL_YIELD_RATIO

    const phases: DurationPhase[] = []
    const assumptions: string[] = []
    const warnings: string[] = []

    /** Registra una fase con il suo peso sul percorso critico. */
    const addPhase = (
        key: string,
        label: string,
        laborDays: number,
        criticalShare = 1,
        curingDays = 0,
        note?: string,
    ) => {
        if (laborDays <= 0 && curingDays <= 0) return
        phases.push({
            key,
            label,
            laborDays,
            criticalShare,
            criticalDays: laborDays * criticalShare,
            curingDays,
            note,
        })
    }

    // --- Allestimento -----------------------------------------------------
    const allestimento = PHASE_YIELDS.allestimentoBase + totalSqm / PHASE_YIELDS.allestimentoMqDay
    if (totalSqm > 0) {
        addPhase('allestimento', 'Allestimento cantiere', allestimento, 1, 0,
            'Scarico materiale, protezioni e tracciamento.')
    }

    // --- Demolizione e smaltimento ---------------------------------------
    if (services.demolizione) {
        addPhase(
            'demolizione',
            'Demolizione pavimento esistente',
            (floorSqm > 0 ? floorSqm : totalSqm) / PHASE_YIELDS.demolizioneMqDay,
            1,
            0,
            'Rimozione del vecchio pavimento e preparazione del sottofondo.',
        )
    }

    if (services.smaltimento) {
        addPhase(
            'smaltimento',
            'Smaltimento macerie',
            PHASE_YIELDS.smaltimentoGiorniFissi + totalSqm / PHASE_YIELDS.smaltimentoMqDay,
            // Si carica e si porta in discarica mentre la demolizione prosegue.
            services.demolizione ? PHASE_CRITICAL_SHARE.smaltimento : 1,
            0,
            'Carico e conferimento in discarica autorizzata.',
        )
    }

    // --- Massetto ---------------------------------------------------------
    if (services.massetto) {
        const tradizionale = input.screedType === 'tradizionale'
        const curing = tradizionale
            ? CURING_DAYS.massettoTradizionalePerCm * CURING_DAYS.massettoTradizionaleSpessoreCm
            : CURING_DAYS.massettoRapido
        addPhase(
            'massetto',
            'Realizzazione massetto',
            (floorSqm || totalSqm) / PHASE_YIELDS.massettoMqDay,
            1,
            curing,
            tradizionale
                ? `Massetto tradizionale: ${curing} giorni di maturazione prima della posa.`
                : `Massetto a presa rapida: ${curing} giorni di maturazione prima della posa.`,
        )
        assumptions.push(
            tradizionale
                ? 'Massetto tradizionale: la maturazione allunga il cantiere ma non è tempo lavorato.'
                : 'Si prevede un massetto a presa rapida; con massetto tradizionale la durata cresce di alcune settimane.',
        )
    }

    // --- Impermeabilizzazione --------------------------------------------
    if (services.impermeabilizzazione) {
        addPhase(
            'impermeabilizzazione',
            'Impermeabilizzazione',
            totalSqm / PHASE_YIELDS.impermeabilizzazioneMqDay,
            1,
            CURING_DAYS.impermeabilizzazione,
            'Guaina liquida con 24 ore di asciugatura prima della posa.',
        )
        // L'impermeabilizzazione serve dove c'è acqua: su un salone da 200 mq
        // è quasi sempre una spunta lasciata per errore, e pesa parecchio.
        const ambienteUmido = input.ambiente === 'bagno' || input.ambiente === 'esterno'
        if (!ambienteUmido && totalSqm > 40) {
            warnings.push(
                `Impermeabilizzazione richiesta su ${totalSqm.toFixed(0)} mq in un ambiente che di norma non la prevede: verifica che serva davvero.`,
            )
        }
    }

    // --- Posa -------------------------------------------------------------
    const floorLayingDays = floorSqm > 0 ? (floorSqm / floorYield) * complexityFactor : 0
    const wallLayingDays = wallSqm > 0 ? (wallSqm / wallYield) * complexityFactor : 0
    const layingLaborDays = floorLayingDays + wallLayingDays

    if (floorLayingDays > 0) {
        addPhase('posa_pavimento', 'Posa pavimento', floorLayingDays, 1, 0, `${floorSqm.toFixed(1)} mq`)
    }
    if (wallLayingDays > 0) {
        addPhase('posa_rivestimento', 'Posa rivestimento', wallLayingDays, 1, 0, `${wallSqm.toFixed(1)} mq`)
    }

    // --- Stuccatura -------------------------------------------------------
    if (totalSqm > 0) {
        // Su un cantiere che si chiude in giornata bisogna aspettare la presa
        // della colla; su cantieri più lunghi si stucca ciò che si è posato il
        // giorno prima, e sul calendario resta solo la coda finale.
        const cantiereBreve = layingLaborDays / throughput <= OVERLAP_THRESHOLD_DAYS
        addPhase(
            'stuccatura',
            'Stuccatura fughe e siliconature',
            (totalSqm / PHASE_YIELDS.stuccaturaMqDay) * Math.min(patternFactor, 1.2),
            cantiereBreve ? 1 : PHASE_CRITICAL_SHARE.stuccatura,
            cantiereBreve ? CURING_DAYS.presaCollaCantiereBreve : 0,
            cantiereBreve
                ? 'Si stucca il giorno dopo la posa, a colla indurita.'
                : 'Si stucca in parallelo alla posa, un tratto per volta.',
        )
    }

    // --- Finiture ---------------------------------------------------------
    const battiscopaMetri = services.battiscopa ? num(services.battiscopaMetri) : 0
    if (battiscopaMetri > 0) {
        addPhase(
            'battiscopa',
            'Posa battiscopa',
            battiscopaMetri / PHASE_YIELDS.battiscopaMlDay,
            PHASE_CRITICAL_SHARE.battiscopa,
            0,
            `${battiscopaMetri} m lineari`,
        )
    }

    const soglieQty = services.soglie ? num(services.soglieQty) : 0
    if (soglieQty > 0) {
        addPhase(
            'soglie',
            'Posa soglie',
            soglieQty / PHASE_YIELDS.soglieQtyDay,
            PHASE_CRITICAL_SHARE.soglie,
            0,
            `${soglieQty} pezzi`,
        )
    }

    // --- Consegna ---------------------------------------------------------
    if (totalSqm > 0) {
        addPhase(
            'consegna',
            'Pulizia e consegna',
            PHASE_YIELDS.consegnaBase + totalSqm / PHASE_YIELDS.consegnaMqDay,
            1,
            0,
            'Pulizia di fine cantiere e verifica con il cliente.',
        )
    }

    // --- Totali -----------------------------------------------------------
    const laborDays = phases.reduce((sum, p) => sum + p.laborDays, 0)
    const criticalLabor = phases.reduce((sum, p) => sum + p.criticalDays, 0)
    const curingDays = phases.reduce((sum, p) => sum + p.curingDays, 0)

    const rawWorkDays = criticalLabor / throughput
    const workDays = totalSqm > 0 ? Math.max(1, roundToHalfDay(rawWorkDays)) : 0
    const calendarDays = workDays > 0 ? Math.ceil(workDays) + curingDays : 0

    // --- Assunzioni dichiarate -------------------------------------------
    assumptions.push(
        `Formato ${TILE_FORMAT_LABELS[formatClass].toLowerCase()}: resa base ${floorYield} mq/giorno a pavimento, per posatore.`,
    )
    assumptions.push(
        crewSize === 1
            ? 'Cantiere svolto da un solo posatore.'
            : `Squadra di ${crewSize} operatori: resa ${throughput.toFixed(2)}× rispetto al singolo.`,
    )
    if (patternFactor > 1) {
        assumptions.push(`Schema di posa non standard: +${Math.round((patternFactor - 1) * 100)}% di tempo.`)
    }
    if (roomFactor > 1 && input.ambiente) {
        assumptions.push(`Ambiente "${input.ambiente}": +${Math.round((roomFactor - 1) * 100)}% per tagli e ostacoli.`)
    }
    if (ratioFactor > 1) {
        assumptions.push(`Formato allungato: +${Math.round((ratioFactor - 1) * 100)}% per giunti e allineamenti.`)
    }
    if (scaleFactor > 1) {
        assumptions.push(
            `Superficie ridotta: +${Math.round((scaleFactor - 1) * 100)}% perché i tagli sul perimetro incidono di più.`,
        )
    } else if (scaleFactor < 1) {
        assumptions.push(
            `Superficie ampia: −${Math.round((1 - scaleFactor) * 100)}% grazie alle campiture continue.`,
        )
    }
    if (criticalLabor < laborDays - 0.01) {
        assumptions.push(
            `${(laborDays - criticalLabor).toFixed(1)} giornate-uomo si svolgono in parallelo ad altre lavorazioni e non allungano il cantiere.`,
        )
    }

    // --- Affidabilità della stima ----------------------------------------
    const formatoIgnoto = !num(input.tileWidthMm) || !num(input.tileHeightMm)
    let confidence: DurationEstimate['confidence'] = 'alta'
    if (formatoIgnoto || !input.ambiente) confidence = 'media'
    if (services.massetto || services.demolizione) confidence = 'media'
    if (formatoIgnoto && (services.massetto || services.demolizione)) confidence = 'bassa'
    if (totalSqm > 150) confidence = confidence === 'alta' ? 'media' : confidence

    if (formatoIgnoto) {
        assumptions.push('Formato piastrella non specificato: stima basata sul formato medio 60x60.')
    }

    // --- Controlli di sanità ---------------------------------------------
    // Un cantiere che supera il mese di lavoro effettivo non si preventiva a
    // distanza: o gli input sono sbagliati, o serve un sopralluogo.
    if (workDays > 22) {
        confidence = 'bassa'
        warnings.push(
            `Stima superiore al mese di lavoro (${workDays} giornate): un cantiere di questa taglia va verificato con un sopralluogo prima di confermare la data.`,
        )
    }
    // Sotto i 40 mq gli oneri fissi (allestimento, consegna, soglie) dominano e
    // una resa bassa è fisiologica: il controllo ha senso solo sui cantieri
    // dove una resa così indica davvero un dato sbagliato.
    if (totalSqm > 40 && workDays > 0) {
        const mqAlGiorno = totalSqm / workDays
        if (mqAlGiorno < 8) {
            warnings.push(
                `Resa complessiva molto bassa (${mqAlGiorno.toFixed(1)} mq al giorno): controlla le lavorazioni selezionate.`,
            )
        }
    }

    return {
        phases,
        laborDays: Math.round(laborDays * 10) / 10,
        workDays,
        curingDays,
        calendarDays,
        minWorkDays: Math.max(1, roundToHalfDay(rawWorkDays * 0.85)),
        maxWorkDays: Math.max(1, roundToHalfDay(rawWorkDays * 1.25)),
        formatClass,
        complexityFactor: Number(complexityFactor.toFixed(3)),
        sizeFactor: Number(scaleFactor.toFixed(3)),
        crewSize,
        crewThroughput: Number(throughput.toFixed(2)),
        confidence,
        assumptions,
        warnings,
    }
}

/* ------------------------------------------------------------------ */
/* 8. Dalla durata al calendario                                       */
/* ------------------------------------------------------------------ */

/** Sabato e domenica non sono giornate di cantiere. */
const isWorkingDay = (date: Date): boolean => {
    const day = date.getDay()
    return day !== 0 && day !== 6
}

/**
 * Data di fine lavori a partire dalla data di inizio.
 * Le attese tecniche consumano calendario esattamente come le giornate
 * lavorate: chi ha il bagno occupato non distingue le due cose.
 */
export function estimateEndDate(startDate: Date | string, estimate: DurationEstimate): Date | null {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    if (!start || Number.isNaN(start.getTime()) || estimate.calendarDays <= 0) return null

    const cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)

    // Il primo giorno è già il giorno di inizio: restano calendarDays - 1 giorni.
    let remaining = estimate.calendarDays - 1
    while (remaining > 0) {
        cursor.setDate(cursor.getDate() + 1)
        if (isWorkingDay(cursor)) remaining -= 1
    }
    return cursor
}

/** Elenco delle giornate di cantiere, utile per bloccare l'agenda del posatore. */
export function workCalendarDates(startDate: Date | string, estimate: DurationEstimate): string[] {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    if (!start || Number.isNaN(start.getTime()) || estimate.calendarDays <= 0) return []

    const dates: string[] = []
    const cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)

    while (dates.length < estimate.calendarDays) {
        if (isWorkingDay(cursor)) dates.push(cursor.toISOString().slice(0, 10))
        cursor.setDate(cursor.getDate() + 1)
    }
    return dates
}

/**
 * Prima data di posa proponibile.
 *
 * Non ha senso far scegliere al cliente una data in cui il materiale non può
 * ancora essere in cantiere. Il vincolo si compone di tre pezzi:
 *
 *  - `materialLeadDays`: giorni dall'ordine alla partenza della merce, valore
 *    di piattaforma impostato dall'admin;
 *  - `productLeadTimeDays`: approvvigionamento del singolo prodotto a catalogo.
 *    Se una piastrella richiede 30 giorni, i 10 di piattaforma non bastano:
 *    vince il più lungo dei due;
 *  - `shippingTransitDays`: il trasporto fino all'indirizzo di posa.
 *
 * Il risultato viene poi spostato al primo giorno lavorativo utile.
 */
export interface LeadTimeInput {
    /** Giorni dall'ordine alla spedizione (impostazione di piattaforma). */
    materialLeadDays?: number | null
    /** Giorni di trasporto fino al cantiere. */
    shippingTransitDays?: number | null
    /** Approvvigionamento del prodotto scelto, da `products.lead_time_days`. */
    productLeadTimeDays?: number | null
}

export const DEFAULT_MATERIAL_LEAD_DAYS = 10
export const DEFAULT_SHIPPING_TRANSIT_DAYS = 2

/** Giorni totali di attesa prima che si possa iniziare a posare. */
export function materialWaitDays(lead: LeadTimeInput = {}): number {
    const platform = num(lead.materialLeadDays, DEFAULT_MATERIAL_LEAD_DAYS)
    const product = num(lead.productLeadTimeDays, 0)
    const transit = num(lead.shippingTransitDays, DEFAULT_SHIPPING_TRANSIT_DAYS)
    return Math.max(platform, product) + transit
}

export function earliestStartDate(lead: LeadTimeInput = {}, from: Date = new Date()): Date {
    const cursor = new Date(from)
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(cursor.getDate() + materialWaitDays(lead))
    while (!isWorkingDay(cursor)) cursor.setDate(cursor.getDate() + 1)
    return cursor
}

/** "1 giorno" / "2,5 giorni": formattazione italiana delle mezze giornate. */
export function formatDays(days: number): string {
    if (!Number.isFinite(days) || days <= 0) return '—'
    const label = Number.isInteger(days) ? String(days) : days.toFixed(1).replace('.', ',')
    return `${label} ${days === 1 ? 'giorno' : 'giorni'}`
}
