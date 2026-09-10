// Impalcatura HTML delle email.
//
// Tabelle annidate e stili inline: non è nostalgia, è l'unico modo di ottenere
// lo stesso risultato su Outlook, Gmail e Apple Mail. Niente <style> nella
// head (Gmail su Android lo ignora in parte), niente webfont (bloccati quasi
// ovunque), niente flexbox.
//
// La palette è quella dello STYLE_GUIDE: neutri caldi `stone` e arancio brand.

import { escapeHtml } from './format.ts'

export const COLORS = {
    canvas: '#f5f2ec',
    surface: '#ffffff',
    ink: '#1c1917',      // stone-900
    body: '#57534e',     // stone-600
    muted: '#a8a29e',    // stone-400
    hairline: '#e7e5e4', // stone-200
    brand: '#f97316',    // orange-500
    brandDark: '#9a3412',
    brandSoft: '#fff7ed',
    emerald: '#047857',
    emeraldSoft: '#ecfdf5',
    amber: '#b45309',
    amberSoft: '#fffbeb',
    rose: '#be123c',
    roseSoft: '#fff1f2',
    blue: '#1d4ed8',
    blueSoft: '#eff6ff',
} as const

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

export type Tone = 'brand' | 'emerald' | 'amber' | 'rose' | 'blue' | 'stone'

const TONE_MAP: Record<Tone, { fg: string; bg: string }> = {
    brand: { fg: COLORS.brandDark, bg: COLORS.brandSoft },
    emerald: { fg: COLORS.emerald, bg: COLORS.emeraldSoft },
    amber: { fg: COLORS.amber, bg: COLORS.amberSoft },
    rose: { fg: COLORS.rose, bg: COLORS.roseSoft },
    blue: { fg: COLORS.blue, bg: COLORS.blueSoft },
    stone: { fg: COLORS.body, bg: '#fafaf9' },
}

/** Un blocco è già HTML pronto: i template li compongono in un array. */
export type Block = string

const PAD = 'padding-left:32px;padding-right:32px'

export const paragraph = (html: string): Block =>
    `<tr><td style="${PAD};padding-top:0;padding-bottom:14px;font-family:${FONT};
        font-size:15px;line-height:1.7;color:${COLORS.body}">${html}</td></tr>`

export const heading = (text: string): Block =>
    `<tr><td style="${PAD};padding-top:10px;padding-bottom:10px;font-family:${FONT};
        font-size:13px;font-weight:700;letter-spacing:.02em;color:${COLORS.ink};
        text-transform:uppercase">${escapeHtml(text)}</td></tr>`

export const divider = (): Block =>
    `<tr><td style="${PAD};padding-top:6px;padding-bottom:20px">
        <div style="height:1px;background:${COLORS.hairline};line-height:1px;font-size:0">&nbsp;</div>
    </td></tr>`

/**
 * Righe etichetta/valore. Le coppie con valore vuoto spariscono: meglio una
 * scheda corta che una riga "Data: —" che sembra un errore.
 */
export function dataTable(rows: Array<[string, string | null | undefined]>): Block {
    const visible = rows.filter(([, value]) => value !== null && value !== undefined && value !== '')
    if (visible.length === 0) return ''

    const body = visible.map(([label, value], index) => `
        <tr>
          <td style="padding:${index === 0 ? '0' : '10px'} 12px 10px 0;font-family:${FONT};
              font-size:13px;line-height:1.5;color:${COLORS.muted};white-space:nowrap;
              vertical-align:top;border-top:${index === 0 ? 'none' : `1px solid ${COLORS.hairline}`}">
            ${escapeHtml(label)}
          </td>
          <td style="padding:${index === 0 ? '0' : '10px'} 0 10px 0;font-family:${FONT};
              font-size:14px;line-height:1.5;font-weight:600;color:${COLORS.ink};
              vertical-align:top;text-align:right;
              border-top:${index === 0 ? 'none' : `1px solid ${COLORS.hairline}`}">
            ${escapeHtml(value as string)}
          </td>
        </tr>`).join('')

    return `<tr><td style="${PAD};padding-top:0;padding-bottom:20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:#fafaf9;border:1px solid ${COLORS.hairline};border-radius:14px">
          <tr><td style="padding:16px 18px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
          </td></tr>
        </table>
    </td></tr>`
}

/** Riquadro colorato per ciò che richiede un'azione o segnala un esito. */
export function panel(tone: Tone, title: string | null, body: string): Block {
    const c = TONE_MAP[tone]
    const head = title
        ? `<div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.12em;
             text-transform:uppercase;color:${c.fg};padding-bottom:8px">${escapeHtml(title)}</div>`
        : ''
    return `<tr><td style="${PAD};padding-top:0;padding-bottom:20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${c.bg};border-radius:14px">
          <tr><td style="padding:16px 18px;border-left:3px solid ${c.fg};border-radius:14px">
            ${head}
            <div style="font-family:${FONT};font-size:14px;line-height:1.65;color:${COLORS.ink}">${body}</div>
          </td></tr>
        </table>
    </td></tr>`
}

/** Elenco puntato con il segno di spunta arancione: usato per le istruzioni. */
export function checklist(items: string[]): Block {
    if (items.length === 0) return ''
    const rows = items.map(item => `
        <tr>
          <td style="padding:0 10px 10px 0;font-family:${FONT};font-size:15px;
              line-height:1.6;color:${COLORS.brand};vertical-align:top;width:16px">&#10003;</td>
          <td style="padding:0 0 10px 0;font-family:${FONT};font-size:14px;
              line-height:1.6;color:${COLORS.body}">${item}</td>
        </tr>`).join('')
    return `<tr><td style="${PAD};padding-top:0;padding-bottom:12px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
    </td></tr>`
}

/**
 * Riepilogo dell'avanzamento. Le tappe passate restano visibili: dicono al
 * cliente quanto è già stato fatto, che è la domanda vera dietro "a che punto
 * siamo".
 */
export function progress(steps: Array<{ label: string; state: 'done' | 'current' | 'todo' }>): Block {
    if (steps.length === 0) return ''
    const rows = steps.map(step => {
        const mark = step.state === 'done' ? '&#10003;' : step.state === 'current' ? '&#9679;' : '&#9675;'
        const color = step.state === 'done'
            ? COLORS.emerald
            : step.state === 'current' ? COLORS.brand : COLORS.muted
        const weight = step.state === 'current' ? '700' : '500'
        const text = step.state === 'todo' ? COLORS.muted : COLORS.ink
        return `
        <tr>
          <td style="padding:0 10px 8px 0;font-family:${FONT};font-size:13px;
              color:${color};vertical-align:top;width:16px">${mark}</td>
          <td style="padding:0 0 8px 0;font-family:${FONT};font-size:13px;
              line-height:1.5;font-weight:${weight};color:${text}">${escapeHtml(step.label)}</td>
        </tr>`
    }).join('')

    return `<tr><td style="${PAD};padding-top:0;padding-bottom:22px">
        <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.12em;
             text-transform:uppercase;color:${COLORS.muted};padding-bottom:12px">Avanzamento</div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
    </td></tr>`
}

export interface EmailShell {
    /** Etichetta sopra il titolo: dice di che ordine si parla. */
    eyebrow?: string | null
    title: string
    /** Anteprima in lista messaggi: se manca, i client mostrano l'HTML grezzo. */
    preheader: string
    greeting?: string | null
    blocks: Block[]
    cta?: { label: string; url: string } | null
    /** Riga chiusa sotto al bottone, per l'alternativa al click. */
    footnote?: string | null
}

export function renderShell(shell: EmailShell): string {
    const eyebrow = shell.eyebrow
        ? `<tr><td style="${PAD};padding-top:4px;padding-bottom:6px;font-family:${FONT};
             font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
             color:${COLORS.brandDark}">${escapeHtml(shell.eyebrow)}</td></tr>`
        : ''

    const greeting = shell.greeting
        ? `<tr><td style="${PAD};padding-top:0;padding-bottom:12px;font-family:${FONT};
             font-size:15px;line-height:1.7;color:${COLORS.body}">${escapeHtml(shell.greeting)}</td></tr>`
        : ''

    const cta = shell.cta
        ? `<tr><td style="${PAD};padding-top:4px;padding-bottom:${shell.footnote ? '10px' : '28px'}">
             <table role="presentation" cellpadding="0" cellspacing="0"><tr>
               <td style="background:${COLORS.brand};border-radius:12px">
                 <a href="${shell.cta.url}" style="display:inline-block;padding:14px 26px;
                    font-family:${FONT};font-size:14px;font-weight:700;color:#ffffff;
                    text-decoration:none;letter-spacing:.01em">${escapeHtml(shell.cta.label)}</a>
               </td>
             </tr></table>
           </td></tr>`
        : ''

    const footnote = shell.footnote
        ? `<tr><td style="${PAD};padding-top:0;padding-bottom:26px;font-family:${FONT};
             font-size:12px;line-height:1.6;color:${COLORS.muted}">${shell.footnote}</td></tr>`
        : ''

    return `<!doctype html>
<html lang="it" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(shell.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.canvas};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;
       font-size:1px;line-height:1px">${escapeHtml(shell.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:${COLORS.canvas};padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:${COLORS.surface};border-radius:20px;
                    border:1px solid ${COLORS.hairline};overflow:hidden">

        <tr><td style="${PAD};padding-top:30px;padding-bottom:24px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:36px;height:36px;background:${COLORS.brand};border-radius:11px;
                text-align:center;vertical-align:middle;font-family:${FONT};font-size:17px;
                font-weight:800;color:#ffffff">P</td>
            <td style="padding-left:12px;font-family:${FONT};font-size:16px;font-weight:800;
                letter-spacing:-.01em;color:${COLORS.ink}">PosaFacile</td>
          </tr></table>
        </td></tr>

        ${eyebrow}

        <tr><td style="${PAD};padding-top:0;padding-bottom:18px;font-family:${FONT};
            font-size:24px;line-height:1.3;font-weight:700;letter-spacing:-.02em;
            color:${COLORS.ink}">${escapeHtml(shell.title)}</td></tr>

        ${greeting}
        ${shell.blocks.filter(Boolean).join('\n')}
        ${cta}
        ${footnote}

        <tr><td style="${PAD};padding-top:22px;padding-bottom:28px;
            border-top:1px solid ${COLORS.hairline}">
          <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;
             color:${COLORS.body}">
            Hai bisogno di aiuto? Rispondi a questa email: legge una persona vera.
          </p>
          <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.7;color:${COLORS.muted}">
            PosaFacile &middot; posafacile.com<br>
            Ricevi questo messaggio perché hai un account su PosaFacile.
            Puoi scegliere quali avvisi ricevere dalla tua area personale.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
