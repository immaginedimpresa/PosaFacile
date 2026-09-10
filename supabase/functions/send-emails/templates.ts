// Un template per evento, con i dati dell'ordine dentro.
//
// La coda porta già titolo e messaggio scritti dai trigger: quelli restano la
// rete di sicurezza (template `generic`). Ma "Ordine #1042 confermato" senza
// dire cosa, dove e quando è una notifica, non un'email. Qui ogni evento ha il
// suo testo e la sua scheda dati, costruita dal contesto letto in database al
// momento dell'invio.
//
// Risoluzione della chiave, dal più specifico al più generico:
//   1. `template` scritto in coda dal trigger
//   2. evento.ruolo.variante   (variante = metadata.step oppure metadata.status)
//   3. evento.ruolo
//   4. evento
//   5. generic

import {
    escapeHtml, formatAddress, formatDate, formatDateLong, formatDays,
    formatMoney, formatSqm, layingLabel, projectLabel,
} from './format.ts'
import {
    type Block, type EmailShell,
    checklist, dataTable, heading, panel, paragraph, progress,
} from './layout.ts'

export interface OutboxRow {
    id: string
    to_email: string
    to_name: string | null
    to_role: string | null
    subject: string
    body: string
    link: string | null
    event_type: string | null
    template: string | null
    metadata: Record<string, unknown> | null
    attempts: number
}

export interface Ctx {
    row: OutboxRow
    meta: Record<string, unknown>
    order: Record<string, any> | null
    /** Nome di battesimo del destinatario, quando lo conosciamo. */
    name: string | null
    /** Trasforma un percorso applicativo in URL assoluto. */
    url: (path?: string | null) => string
}

type Template = (c: Ctx) => Omit<EmailShell, 'preheader'> & { preheader?: string }

// ---------------------------------------------------------------------------
// Utilità condivise fra i template
// ---------------------------------------------------------------------------

const greet = (c: Ctx) => (c.name ? `Ciao ${c.name},` : 'Ciao,')

const orderNumber = (c: Ctx): string | null => {
    const n = c.order?.order_number ?? c.meta.order_number
    return n ? `#${n}` : null
}

const eyebrowOrder = (c: Ctx): string | null => {
    const n = orderNumber(c)
    return n ? `Ordine ${n}` : null
}

/** Scheda con cosa è stato ordinato: la stessa in tutte le email di cantiere. */
function orderCard(c: Ctx): Block {
    const o = c.order
    if (!o) return ''
    const items = Array.isArray(o.items) ? o.items : []
    const productName = items.map((i: any) => i?.name ?? i?.product_name).filter(Boolean)[0]
        ?? (c.meta.product_name as string | undefined)

    return dataTable([
        ['Ordine', o.order_number ? `#${o.order_number}` : null],
        ['Ambiente', projectLabel(o.project_type)],
        ['Materiale', productName ?? null],
        ['Superficie a pavimento', formatSqm(o.floor_sqm)],
        ['Superficie a parete', formatSqm(o.wall_sqm)],
        ['Tipo di posa', layingLabel(o.laying_type)],
        ['Indirizzo di posa', formatAddress(o.installation_address)],
        ['Totale', formatMoney(o.total)],
    ])
}

/** Scheda con le date del cantiere. Vuota finché non c'è niente da dire. */
function scheduleCard(c: Ctx): Block {
    const o = c.order
    if (!o) return ''
    return dataTable([
        ['Inizio lavori', formatDateLong(o.work_start_date ?? o.installation_date ?? o.scheduled_date)],
        ['Fine prevista', formatDateLong(o.work_end_date)],
        ['Durata', formatDays(o.confirmed_work_days ?? o.estimated_work_days)],
        ['Posatore', o.professional?.display_name ?? null],
        ['Telefono posatore', o.professional?.phone ?? null],
    ])
}

const STEP_LABELS: Record<string, string> = {
    order_placed: 'Ordine ricevuto',
    payment_confirmed: 'Pagamento confermato',
    material_check: 'Materiale confermato in magazzino',
    professional_confirmed: 'Professionista confermato',
    info_pending: 'Informazioni aggiuntive',
    green_light: 'OK, si parte',
    date_confirmed: 'Data confermata',
    material_shipped: 'Materiale spedito',
    material_delivered: 'Materiale consegnato',
    room_prep_notice: 'Preparazione della stanza',
    work_started: 'Posa iniziata',
    work_completed: 'Posa completata',
    closed: 'Ordine chiuso',
}

/** Riepilogo dell'avanzamento, con la tappa di questa email evidenziata. */
function progressBlock(c: Ctx): Block {
    const milestones = Array.isArray(c.order?.milestones) ? c.order!.milestones : []
    if (milestones.length === 0) return ''
    const current = String(c.meta.step ?? '')

    const steps = milestones
        .filter((m: any) => m.step !== 'closed' && STEP_LABELS[m.step])
        .map((m: any) => ({
            label: STEP_LABELS[m.step],
            state: (m.step === current
                ? 'current'
                : m.status === 'done'
                    ? 'done'
                    : 'todo') as 'done' | 'current' | 'todo',
        }))

    return progress(steps)
}

const orderCta = (c: Ctx, label = 'Apri il tuo ordine') => ({
    label,
    url: c.url(c.row.link ?? (c.order?.id ? `/dashboard/orders/${c.order.id}` : '/dashboard')),
})

const linkFootnote = (c: Ctx) => {
    const href = c.url(c.row.link)
    return `Se il bottone non funziona, copia questo indirizzo nel browser:<br>
        <span style="word-break:break-all">${escapeHtml(href)}</span>`
}

// ---------------------------------------------------------------------------
// CLIENTE
// ---------------------------------------------------------------------------

const welcomeCustomer: Template = (c) => ({
    eyebrow: 'Il tuo account è attivo',
    title: 'Benvenuto in PosaFacile',
    preheader: 'Configura un pavimento, ottieni il preventivo e segui la posa da un unico posto.',
    greeting: greet(c),
    blocks: [
        paragraph(`Da oggi hai un posto solo in cui scegliere le piastrelle, sapere quanto costa
            posarle e seguire il cantiere giorno per giorno. Nessun sopralluogo per avere un prezzo.`),
        heading('Come si comincia'),
        checklist([
            '<b>Configura l’ambiente</b>: metri quadri, tipo di posa, servizi accessori. Il preventivo si aggiorna mentre scegli.',
            '<b>Scegli il posatore</b> fra i professionisti verificati che coprono la tua zona, con tariffa e disponibilità già visibili.',
            '<b>Fissa la data</b> dal calendario e segui l’avanzamento del cantiere dalla tua area personale.',
        ]),
        paragraph(`Se hai già un’idea di quello che ti serve, il preventivo richiede meno di due minuti.`),
    ],
    cta: { label: 'Configura il tuo pavimento', url: c.url('/configuratore') },
})

const quoteCreatedCustomer: Template = (c) => ({
    eyebrow: 'Preventivo salvato',
    title: 'Il tuo preventivo ti aspetta',
    preheader: `Configurazione salvata${c.meta.total ? ` · ${formatMoney(c.meta.total)}` : ''}. Riaprila quando vuoi.`,
    greeting: greet(c),
    blocks: [
        paragraph(`Abbiamo messo da parte la configurazione: la ritrovi identica nella tua area
            personale, con gli stessi prezzi, e puoi confermarla senza rifare i calcoli.`),
        dataTable([
            ['Materiale', (c.meta.product_name as string) ?? null],
            ['Superficie a pavimento', formatSqm(c.meta.floor_sqm)],
            ['Superficie a parete', formatSqm(c.meta.wall_sqm)],
            ['Località', (c.meta.city as string) ?? null],
            ['Materiale', formatMoney(c.meta.material_total)],
            ['Posa', formatMoney(c.meta.laying_total)],
            ['Servizi', formatMoney(c.meta.services_total)],
            ['Totale preventivo', formatMoney(c.meta.total)],
            ['Durata stimata del cantiere', formatDays(c.meta.estimated_work_days)],
        ]),
        panel('amber', 'Da sapere', `I prezzi del materiale seguono il listino dei fornitori:
            confermando ora blocchi la cifra che vedi qui.`),
    ],
    cta: { label: 'Riapri il preventivo', url: c.url(c.row.link ?? '/dashboard?tab=quotes') },
})

const orderCreatedCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Ordine confermato',
    preheader: `Abbiamo ricevuto il tuo ordine${orderNumber(c) ? ` ${orderNumber(c)}` : ''}. Ecco cosa succede adesso.`,
    greeting: greet(c),
    blocks: [
        paragraph(`Grazie: il tuo ordine è registrato e preso in carico. Qui sotto trovi il
            riepilogo di quello che hai scelto.`),
        orderCard(c),
        heading('Cosa succede adesso'),
        checklist([
            'Verifichiamo la disponibilità del materiale in magazzino e lo riserviamo per il tuo cantiere.',
            'Confermiamo l’incarico con il posatore e la durata reale delle lavorazioni.',
            'Ti scriviamo con la data di inizio: da lì in poi ricevi un avviso a ogni passaggio.',
        ]),
        paragraph(`Non devi fare nulla: se ci servisse qualcosa da te, te lo chiediamo per email.`),
    ],
    cta: orderCta(c),
    footnote: linkFootnote(c),
})

const paymentReceivedCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Pagamento ricevuto',
    preheader: `Pagamento registrato${c.order?.total ? ` · ${formatMoney(c.order.total)}` : ''}.`,
    greeting: greet(c),
    blocks: [
        paragraph(`Abbiamo registrato il pagamento. Da adesso partono le verifiche sul materiale
            e la programmazione del cantiere.`),
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Imponibile', formatMoney(c.order?.subtotal)],
            ['IVA', formatMoney(c.order?.vat_amount)],
            ['Totale pagato', formatMoney(c.order?.total)],
            ['Metodo', (c.order?.payment_method as string) ?? null],
            ['Data', formatDate(new Date().toISOString())],
        ]),
        paragraph(`La fattura arriva separatamente, appena il cantiere viene chiuso.`),
        progressBlock(c),
    ],
    cta: orderCta(c),
})

const proAssignedCustomer: Template = (c) => {
    const pro = c.order?.professional
    return {
        eyebrow: eyebrowOrder(c),
        title: 'Il tuo posatore è stato assegnato',
        preheader: pro?.display_name
            ? `${pro.display_name} seguirà la posa del tuo ambiente.`
            : 'Un professionista verificato seguirà la posa.',
        greeting: greet(c),
        blocks: [
            paragraph(`Abbiamo abbinato al tuo cantiere un professionista verificato: sarà lui a
                occuparsi della posa e il tuo riferimento per qualsiasi domanda tecnica.`),
            dataTable([
                ['Posatore', pro?.display_name ?? null],
                ['Telefono', pro?.phone ?? null],
                ['Indirizzo di posa', formatAddress(c.order?.installation_address)],
                ['Inizio previsto', formatDateLong(c.order?.work_start_date ?? c.order?.scheduled_date)],
                ['Durata stimata', formatDays(c.order?.confirmed_work_days ?? c.order?.estimated_work_days)],
            ]),
            panel('blue', 'Puoi scrivergli', `Dalla pagina dell’ordine trovi la chat di cantiere:
                domande sulle fughe, sui battiscopa o sull’orario di arrivo si risolvono lì,
                senza telefonate.`),
            progressBlock(c),
        ],
        cta: orderCta(c),
        footnote: linkFootnote(c),
    }
}

const materialCheckCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Materiale confermato',
    preheader: 'Le piastrelle e i materiali di posa sono disponibili e riservati per te.',
    greeting: greet(c),
    blocks: [
        paragraph(`Le piastrelle e i materiali di posa sono disponibili: li abbiamo riservati per
            il tuo cantiere, quindi il prezzo e le quantità non cambiano più.`),
        orderCard(c),
        progressBlock(c),
    ],
    cta: orderCta(c),
})

const greenLightCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Tutto pronto per partire',
    preheader: 'Le verifiche sono chiuse: stiamo fissando la data con il posatore.',
    greeting: greet(c),
    blocks: [
        paragraph(`Le verifiche sono concluse: materiale, posatore e documenti sono a posto.
            Stiamo concordando la data di inizio e te la comunichiamo appena è fissata.`),
        scheduleCard(c),
        progressBlock(c),
    ],
    cta: orderCta(c),
})

const dateConfirmedCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Data dei lavori confermata',
    preheader: c.order?.work_start_date
        ? `Si comincia ${formatDateLong(c.order.work_start_date)}.`
        : 'La data di inizio dei lavori è confermata.',
    greeting: greet(c),
    blocks: [
        paragraph(String(c.meta.note ?? '') || `La data di inizio è fissata. Qui sotto trovi il
            calendario del cantiere e il riferimento del posatore.`),
        scheduleCard(c),
        panel('amber', 'Segnati questa data', `Il giorno prima dell’inizio ti scriviamo con la
            lista di cosa preparare nella stanza.`),
        progressBlock(c),
    ],
    cta: orderCta(c),
    footnote: linkFootnote(c),
})

const materialShippedCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Materiale spedito',
    preheader: 'Il materiale è partito dal magazzino verso l’indirizzo di posa.',
    greeting: greet(c),
    blocks: [
        paragraph(`Il materiale ha lasciato il magazzino ed è diretto all’indirizzo di posa.`),
        dataTable([
            ['Destinazione', formatAddress(c.order?.installation_address)],
            ['Inizio lavori previsto', formatDateLong(c.order?.work_start_date)],
        ]),
        panel('amber', 'Serve qualcuno alla consegna', `Il corriere scarica a bordo strada:
            assicurati che ci sia una persona a ricevere i pallet e uno spazio coperto dove
            appoggiarli.`),
        progressBlock(c),
    ],
    cta: orderCta(c),
})

const materialDeliveredCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Materiale consegnato',
    preheader: 'Il materiale è arrivato in cantiere ed è stato verificato.',
    greeting: greet(c),
    blocks: [
        paragraph(`Il materiale è arrivato all’indirizzo di posa ed è stato verificato: quantità
            e lotti corrispondono all’ordine.`),
        scheduleCard(c),
        progressBlock(c),
    ],
    cta: orderCta(c),
})

const roomPrepCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Prepara la stanza',
    preheader: c.order?.work_start_date
        ? `I lavori iniziano ${formatDateLong(c.order.work_start_date)}: ecco cosa fare prima.`
        : 'I lavori stanno per iniziare: ecco cosa fare prima.',
    greeting: greet(c),
    blocks: [
        paragraph(String(c.meta.note ?? '') || `I lavori stanno per iniziare. Mezz’ora di
            preparazione adesso evita mezza giornata di ritardo alla squadra.`),
        scheduleCard(c),
        heading('Prima dell’arrivo della squadra'),
        checklist([
            'Svuota l’ambiente da mobili, tappeti e oggetti: quello che resta va spostato, e il tempo si paga.',
            'Smonta o libera sanitari, elettrodomestici e mobili fissati a parete, se previsto dal preventivo.',
            'Lascia libero un percorso dall’ingresso alla stanza per il trasporto dei materiali.',
            'Assicurati che ci siano corrente elettrica e un punto acqua raggiungibili.',
            'Proteggi con teli quello che non può essere spostato.',
        ]),
        panel('rose', 'Se qualcosa non è pronto', `Avvisa subito il posatore in chat: spostare
            di un giorno costa meno che trovare il cantiere bloccato la mattina stessa.`),
    ],
    cta: orderCta(c),
    footnote: linkFootnote(c),
})

const workStartedCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'I lavori sono iniziati',
    preheader: 'Il cantiere è partito. Puoi seguire l’avanzamento dalla tua area personale.',
    greeting: greet(c),
    blocks: [
        paragraph(`La squadra ha avviato la posa. Il posatore aggiorna la scheda del cantiere man
            mano che avanza, foto comprese.`),
        scheduleCard(c),
        panel('blue', null, `Per qualsiasi domanda durante i lavori usa la chat di cantiere:
            resta scritta e la vediamo anche noi.`),
        progressBlock(c),
    ],
    cta: orderCta(c, 'Segui il cantiere'),
})

const workCompletedCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'La posa è completata',
    preheader: 'Lavori terminati. Controlla il risultato e lascia la tua valutazione.',
    greeting: greet(c),
    blocks: [
        paragraph(`I lavori sono terminati. Prenditi il tempo di guardare il risultato con
            calma, meglio con luce naturale e da più angolazioni.`),
        heading('Cosa vale la pena controllare'),
        checklist([
            'Planarità e allineamento delle fughe, soprattutto lungo le pareti lunghe.',
            'Tenuta dei bordi, dei battiscopa e dei profili sugli angoli.',
            'Pulizia finale: residui di stucco o collante vanno tolti prima che induriscano.',
        ]),
        panel('emerald', 'Prima di calpestare', `Rispetta i tempi di indurimento indicati dal
            posatore: sono la differenza fra un pavimento che dura vent’anni e uno che si muove
            al primo inverno.`),
        paragraph(`Se qualcosa non ti convince, scrivilo dalla pagina dell’ordine: interveniamo noi.`),
    ],
    cta: orderCta(c, 'Valuta il lavoro'),
    footnote: linkFootnote(c),
})

const orderCancelledCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Ordine annullato',
    preheader: 'Il tuo ordine è stato annullato.',
    greeting: greet(c),
    blocks: [
        paragraph(`Il tuo ordine è stato annullato e non ci saranno ulteriori lavorazioni.`),
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Importo', formatMoney(c.order?.total)],
        ]),
        paragraph(`Se era pagato, l’eventuale rimborso segue il metodo di pagamento originale e
            richiede qualche giorno lavorativo. Se l’annullamento non ti risulta, rispondi a
            questa email.`),
    ],
    cta: orderCta(c),
})

const infoPendingCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Ci servono alcune informazioni',
    preheader: 'Il tuo ordine è in attesa: mancano dati per procedere.',
    greeting: greet(c),
    blocks: [
        panel('rose', 'Il cantiere è fermo qui', escapeHtml(
            String(c.meta.note ?? c.row.body ?? 'Per procedere abbiamo bisogno di alcune informazioni.'),
        )),
        paragraph(`Finché non riceviamo quello che serve non possiamo fissare la data né spedire
            il materiale. Bastano pochi minuti dalla pagina dell’ordine.`),
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Indirizzo di posa', formatAddress(c.order?.installation_address)],
        ]),
    ],
    cta: orderCta(c, 'Invia le informazioni'),
    footnote: linkFootnote(c),
})

const infoResolvedCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Informazioni ricevute',
    preheader: 'Abbiamo tutto quello che serve: il tuo ordine riparte.',
    greeting: greet(c),
    blocks: [
        paragraph(`Grazie: abbiamo ricevuto quello che mancava e il tuo ordine è ripartito.
            Torniamo a scriverti con il prossimo passaggio.`),
        progressBlock(c),
    ],
    cta: orderCta(c),
})

const messageCustomer: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Nuovo messaggio dal tuo cantiere',
    preheader: c.row.body.slice(0, 110),
    greeting: greet(c),
    blocks: [
        paragraph(escapeHtml(c.row.subject)),
        panel('blue', null, escapeHtml(c.row.body)),
        paragraph(`Rispondi dalla chat di cantiere: così la conversazione resta insieme
            all’ordine e la vediamo anche noi.`),
    ],
    cta: orderCta(c, 'Rispondi in chat'),
})

// ---------------------------------------------------------------------------
// PROFESSIONISTA
// ---------------------------------------------------------------------------

const welcomeProfessional: Template = (c) => ({
    eyebrow: 'Account professionista attivo',
    title: 'Benvenuto nella rete posatori',
    preheader: 'Completa tariffe, zone e disponibilità: sono i dati con cui ti assegniamo i cantieri.',
    greeting: greet(c),
    blocks: [
        paragraph(`Il tuo account è attivo. Prima di ricevere incarichi servono tre informazioni:
            senza di quelle non compari nelle proposte ai clienti.`),
        checklist([
            '<b>Tariffe</b>: prezzo al metro quadro per tipo di posa e maggiorazioni. È il numero che il cliente vede in preventivo.',
            '<b>Zone di copertura</b>: province servite oppure raggio in chilometri dalla tua sede.',
            '<b>Disponibilità</b>: giorni e orari lavorativi, più le assenze programmate.',
        ]),
        paragraph(`Da lì in poi i cantieri compatibili ti arrivano in dashboard e per email.`),
    ],
    cta: { label: 'Completa il profilo', url: c.url('/pro/profile') },
})

const proApprovedProfessional: Template = (c) => ({
    eyebrow: 'Verifica completata',
    title: 'Il tuo profilo è abilitato',
    preheader: 'Da ora puoi ricevere incarichi di posa nelle tue zone.',
    greeting: greet(c),
    blocks: [
        paragraph(`La verifica dei tuoi documenti è conclusa: il profilo è attivo e da ora
            compari fra i posatori proposti ai clienti nelle zone che hai indicato.`),
        panel('emerald', 'Cosa cambia', `I nuovi ordini compatibili con le tue zone e la tua
            disponibilità ti arrivano in dashboard. Tieni aggiornato il calendario: è quello che
            decide se ti proponiamo o no.`),
    ],
    cta: { label: 'Vai alla dashboard', url: c.url(c.row.link ?? '/pro/dashboard') },
})

const jobAssignedProfessional: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Nuovo cantiere assegnato',
    preheader: `${formatSqm(c.order?.floor_sqm) ?? 'Nuovo cantiere'}${
        c.order?.work_start_date ? ` · dal ${formatDate(c.order.work_start_date)}` : ''}`,
    greeting: greet(c),
    blocks: [
        paragraph(`Ti è stato assegnato un cantiere. Controlla scheda tecnica e date, poi
            conferma la durata reale delle lavorazioni.`),
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Ambiente', projectLabel(c.order?.project_type)],
            ['Tipo di posa', layingLabel(c.order?.laying_type)],
            ['Superficie a pavimento', formatSqm(c.order?.floor_sqm)],
            ['Superficie a parete', formatSqm(c.order?.wall_sqm)],
            ['Indirizzo', formatAddress(c.order?.installation_address)],
            ['Inizio previsto', formatDateLong(c.order?.work_start_date ?? c.order?.scheduled_date)],
            ['Durata stimata', formatDays(c.order?.estimated_work_days)],
            ['Compenso posa', formatMoney(c.order?.professional_payout ?? c.order?.laying_total)],
        ]),
        panel('amber', 'Serve la tua conferma', `La durata che vedi è una stima di preventivo.
            Se il cantiere richiede più giornate, correggila subito: la data che comunichiamo al
            cliente parte da quel numero.`),
        c.order?.notes ? panel('stone', 'Note del cliente', escapeHtml(String(c.order.notes))) : '',
    ],
    cta: { label: 'Apri il cantiere', url: c.url(c.row.link ?? '/pro/jobs') },
    footnote: linkFootnote(c),
})

const materialDeliveredProfessional: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Materiale in cantiere',
    preheader: 'Il materiale è stato consegnato: il cantiere è pronto per l’avvio.',
    greeting: greet(c),
    blocks: [
        paragraph(`Il materiale è stato consegnato e verificato all’indirizzo di posa: da parte
            nostra il cantiere è pronto.`),
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Indirizzo', formatAddress(c.order?.installation_address)],
            ['Inizio previsto', formatDateLong(c.order?.work_start_date)],
            ['Durata confermata', formatDays(c.order?.confirmed_work_days ?? c.order?.estimated_work_days)],
        ]),
    ],
    cta: { label: 'Apri il cantiere', url: c.url(c.row.link ?? '/pro/jobs') },
})

const jobCancelledProfessional: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Cantiere annullato',
    preheader: 'L’incarico di posa è stato annullato: puoi liberare le giornate.',
    greeting: greet(c),
    blocks: [
        paragraph(`L’incarico è stato annullato. Le giornate che avevi riservato tornano
            disponibili: aggiorna il calendario se le avevi bloccate a mano.`),
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Indirizzo', formatAddress(c.order?.installation_address)],
            ['Date liberate', formatDateLong(c.order?.work_start_date)],
        ]),
    ],
    cta: { label: 'Vai al calendario', url: c.url('/pro/calendar') },
})

const messageProfessional: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: 'Nuovo messaggio di cantiere',
    preheader: c.row.body.slice(0, 110),
    greeting: greet(c),
    blocks: [
        paragraph(escapeHtml(c.row.subject)),
        panel('blue', null, escapeHtml(c.row.body)),
    ],
    cta: { label: 'Rispondi in chat', url: c.url(c.row.link ?? '/pro/jobs') },
})

// ---------------------------------------------------------------------------
// AMMINISTRAZIONE
// ---------------------------------------------------------------------------

const adminShell = (c: Ctx, title: string, preheader: string, blocks: Block[], ctaLabel: string) => ({
    eyebrow: eyebrowOrder(c) ?? 'Amministrazione',
    title,
    preheader,
    greeting: null,
    blocks,
    cta: { label: ctaLabel, url: c.url(c.row.link ?? '/admin/orders') },
})

const orderCreatedAdmin: Template = (c) => adminShell(
    c,
    'Nuovo ordine ricevuto',
    `${orderNumber(c) ?? 'Nuovo ordine'}${c.order?.total ? ` · ${formatMoney(c.order.total)}` : ''}`,
    [
        orderCard(c),
        dataTable([
            ['Cliente', c.order?.customer?.full_name ?? c.order?.customer?.email ?? null],
            ['Telefono', c.order?.customer?.phone ?? null],
            ['Email', c.order?.customer?.email ?? null],
            ['Data preferita', formatDateLong(c.order?.scheduled_date)],
            ['Durata stimata', formatDays(c.order?.estimated_work_days)],
        ]),
        c.order?.notes ? panel('stone', 'Note del cliente', escapeHtml(String(c.order.notes))) : '',
        panel('amber', 'Prossimo passo', 'Verifica disponibilità materiale e assegna il posatore.'),
    ],
    'Apri in amministrazione',
)

const paymentReceivedAdmin: Template = (c) => adminShell(
    c,
    'Pagamento incassato',
    `${orderNumber(c) ?? 'Ordine'} pagato${c.order?.total ? ` · ${formatMoney(c.order.total)}` : ''}`,
    [
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Cliente', c.order?.customer?.full_name ?? c.order?.customer?.email ?? null],
            ['Totale', formatMoney(c.order?.total)],
            ['Metodo', (c.order?.payment_method as string) ?? null],
        ]),
        panel('emerald', 'Prossimo passo', 'Si può procedere con la verifica materiali.'),
    ],
    'Apri in amministrazione',
)

const jobAssignedAdmin: Template = (c) => adminShell(
    c,
    'Cantiere assegnato',
    `${orderNumber(c) ?? 'Ordine'} → ${c.order?.professional?.display_name ?? 'posatore'}`,
    [
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Posatore', c.order?.professional?.display_name ?? null],
            ['Telefono', c.order?.professional?.phone ?? null],
            ['Cliente', c.order?.customer?.full_name ?? null],
            ['Indirizzo', formatAddress(c.order?.installation_address)],
            ['Inizio previsto', formatDateLong(c.order?.work_start_date ?? c.order?.scheduled_date)],
        ]),
        panel('amber', 'In attesa', 'Il posatore deve confermare la durata reale del cantiere.'),
    ],
    'Apri in amministrazione',
)

const durationConfirmedAdmin: Template = (c) => {
    const stima = Number(c.meta.estimated_work_days ?? c.order?.estimated_work_days ?? 0)
    const reale = Number(c.meta.confirmed_work_days ?? c.order?.confirmed_work_days ?? 0)
    const delta = reale - stima
    const rilevante = Math.abs(delta) >= 0.5

    return adminShell(
        c,
        rilevante ? 'Durata corretta dal posatore' : 'Durata confermata dal posatore',
        `${orderNumber(c) ?? 'Ordine'} · ${formatDays(reale) ?? '—'}`,
        [
            dataTable([
                ['Ordine', orderNumber(c)],
                ['Posatore', c.order?.professional?.display_name ?? null],
                ['Stima di preventivo', formatDays(stima)],
                ['Durata confermata', formatDays(reale)],
                ['Scostamento', rilevante
                    ? `${delta > 0 ? '+' : '−'}${formatDays(Math.abs(delta))}`
                    : 'nessuno'],
                ['Nuova fine prevista', formatDateLong(c.order?.work_end_date)],
            ]),
            c.order?.duration_pro_note
                ? panel('stone', 'Nota del posatore', escapeHtml(String(c.order.duration_pro_note)))
                : '',
            rilevante
                ? panel('rose', 'Da rivedere', `Lo scostamento supera la mezza giornata: rivedi il
                    margine e la data comunicata al cliente prima di confermare.`)
                : panel('emerald', null, 'La stima regge: si può fissare la data con il cliente.'),
        ],
        'Apri in amministrazione',
    )
}

const proRegisteredAdmin: Template = (c) => ({
    eyebrow: 'Amministrazione',
    title: 'Nuova iscrizione posatore',
    preheader: `${c.meta.company_name ?? 'Un professionista'} ha creato un profilo da verificare.`,
    greeting: null,
    blocks: [
        paragraph(`Un professionista ha creato un profilo. Non compare fra i posatori proposti
            finché non lo abiliti.`),
        dataTable([
            ['Ragione sociale', (c.meta.company_name as string) ?? null],
            ['Partita IVA', (c.meta.vat_number as string) ?? null],
            ['Telefono', (c.meta.phone as string) ?? null],
            ['Sede', [c.meta.billing_city, c.meta.billing_province ? `(${c.meta.billing_province})` : null]
                .filter(Boolean).join(' ') || null],
        ]),
        panel('amber', 'Da fare', 'Verifica documenti, partita IVA e zone di copertura, poi abilita il profilo.'),
    ],
    cta: { label: 'Apri l’elenco posatori', url: c.url(c.row.link ?? '/admin/professionals') },
})

const statusChangedAdmin: Template = (c) => adminShell(
    c,
    c.row.subject,
    c.row.body.slice(0, 110),
    [
        paragraph(escapeHtml(c.row.body)),
        dataTable([
            ['Ordine', orderNumber(c)],
            ['Cliente', c.order?.customer?.full_name ?? null],
            ['Posatore', c.order?.professional?.display_name ?? null],
            ['Indirizzo', formatAddress(c.order?.installation_address)],
        ]),
    ],
    'Apri in amministrazione',
)

const lowStockAdmin: Template = (c) => ({
    eyebrow: 'Magazzino',
    title: 'Giacenza sotto soglia',
    preheader: c.row.body.slice(0, 110),
    greeting: null,
    blocks: [
        panel('rose', 'Scorta in esaurimento', escapeHtml(c.row.body)),
        dataTable([
            ['Prodotto', (c.meta.product_name as string) ?? null],
            ['SKU', (c.meta.sku as string) ?? null],
            ['Giacenza', c.meta.stock_qty != null ? String(c.meta.stock_qty) : null],
        ]),
    ],
    cta: { label: 'Apri il catalogo', url: c.url(c.row.link ?? '/admin/products') },
})

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * Rete di sicurezza: un evento nuovo, o un trigger che non abbiamo previsto,
 * esce comunque impaginato invece di non partire.
 */
const generic: Template = (c) => ({
    eyebrow: eyebrowOrder(c),
    title: c.row.subject,
    preheader: c.row.body.slice(0, 110),
    greeting: greet(c),
    blocks: [
        paragraph(escapeHtml(c.row.body)),
        c.order ? orderCard(c) : '',
    ],
    cta: c.row.link ? { label: 'Apri in PosaFacile', url: c.url(c.row.link) } : null,
})

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

const TEMPLATES: Record<string, Template> = {
    // Cliente
    'welcome.customer': welcomeCustomer,
    'quote_created.customer': quoteCreatedCustomer,
    'order_created.customer': orderCreatedCustomer,
    'payment_received.customer': paymentReceivedCustomer,
    'pro_assigned.customer': proAssignedCustomer,
    'status_changed.customer.material_check': materialCheckCustomer,
    'status_changed.customer.green_light': greenLightCustomer,
    'status_changed.customer.date_confirmed': dateConfirmedCustomer,
    'status_changed.customer.material_shipped': materialShippedCustomer,
    'status_changed.customer.material_delivered': materialDeliveredCustomer,
    'status_changed.customer.info_pending': infoResolvedCustomer,
    'status_changed.customer.in_progress': workStartedCustomer,
    'status_changed.customer.completed': workCompletedCustomer,
    'status_changed.customer.cancelled': orderCancelledCustomer,
    'room_prep_reminder.customer': roomPrepCustomer,
    'info_pending.customer': infoPendingCustomer,
    'info_resolved.customer': infoResolvedCustomer,
    'message_received.customer': messageCustomer,

    // Professionista
    'welcome.professional': welcomeProfessional,
    'pro_approved.professional': proApprovedProfessional,
    'job_assigned.professional': jobAssignedProfessional,
    'status_changed.professional.material_delivered': materialDeliveredProfessional,
    'status_changed.professional.cancelled': jobCancelledProfessional,
    'message_received.professional': messageProfessional,

    // Amministrazione
    'order_created.admin': orderCreatedAdmin,
    'payment_received.admin': paymentReceivedAdmin,
    'job_assigned.admin': jobAssignedAdmin,
    'duration_confirmed.admin': durationConfirmedAdmin,
    'pro_registered.admin': proRegisteredAdmin,
    'status_changed.admin': statusChangedAdmin,
    'low_stock.admin': lowStockAdmin,

    generic,
}

/** Chiavi candidate, dalla più specifica alla più generica. */
export function templateKeys(row: OutboxRow, meta: Record<string, unknown>): string[] {
    const keys: string[] = []
    if (row.template) keys.push(row.template)

    const event = row.event_type
    const role = row.to_role
    const variant = (meta.step ?? meta.status) as string | undefined

    if (event && role && variant) keys.push(`${event}.${role}.${variant}`)
    if (event && role) keys.push(`${event}.${role}`)
    if (event) keys.push(event)
    keys.push('generic')
    return keys
}

export function resolveTemplate(row: OutboxRow, meta: Record<string, unknown>): {
    key: string
    template: Template
} {
    for (const key of templateKeys(row, meta)) {
        const template = REGISTRY.get(key)
        if (template) return { key, template }
    }
    return { key: 'generic', template: generic }
}

/** Lookup per chiave: una Map dice "assente" senza che il tipo debba fingere. */
const REGISTRY = new Map<string, Template>(Object.entries(TEMPLATES))

export const TEMPLATE_KEYS = [...REGISTRY.keys()]
