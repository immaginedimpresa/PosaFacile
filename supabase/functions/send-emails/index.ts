// Svuota la coda `email_outbox` inviando le email tramite Resend.
//
// L'invio non sta dentro ai trigger: una transazione di ordine non deve
// dipendere dalla raggiungibilità di un servizio esterno. I trigger accodano,
// questa funzione consuma la coda e registra l'esito riga per riga.
//
// Da invocare periodicamente (cron di Supabase, ogni 2-5 minuti) oppure a mano
// dal pannello admin.
//
// Variabili d'ambiente richieste:
//   RESEND_API_KEY   chiave API di Resend
//   RESEND_FROM      mittente verificato, es. "PosaFacile <no-reply@posafacile.it>"
//   APP_BASE_URL     base per i link nelle email, es. "https://posafacile.it"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
    })

/** Quante email per invocazione: tiene la funzione dentro il tempo massimo. */
const BATCH_SIZE = 25
/** Oltre questo numero di tentativi la riga resta 'failed' e non si riprova. */
const MAX_ATTEMPTS = 3

interface OutboxRow {
    id: string
    to_email: string
    to_name: string | null
    subject: string
    body: string
    link: string | null
    event_type: string | null
    attempts: number
}

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

/**
 * Template email. Volutamente sobrio e a tabella singola: i client di posta
 * non sono browser, e un layout complesso si rompe più di quanto aggiunga.
 */
function renderEmail(row: OutboxRow, baseUrl: string): string {
    const greeting = row.to_name ? `Ciao ${escapeHtml(row.to_name.split(' ')[0])},` : 'Ciao,'
    const cta = row.link
        ? `<tr><td style="padding:8px 32px 32px">
             <a href="${baseUrl}${escapeHtml(row.link)}"
                style="display:inline-block;background:#f97316;color:#1c1917;text-decoration:none;
                       font-weight:700;font-size:14px;padding:14px 22px;border-radius:12px">
               Apri in PosaFacile
             </a>
           </td></tr>`
        : ''

    return `<!doctype html>
<html lang="it"><body style="margin:0;background:#f5f2ec;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
        <tr><td style="padding:28px 32px 0">
          <span style="font-size:11px;font-weight:700;letter-spacing:.14em;color:#995b32">POSAFACILE</span>
        </td></tr>
        <tr><td style="padding:18px 32px 0">
          <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:600;color:#1c1917;letter-spacing:-.02em">
            ${escapeHtml(row.subject)}
          </h1>
        </td></tr>
        <tr><td style="padding:18px 32px 0;font-size:15px;line-height:1.7;color:#57534e">
          <p style="margin:0 0 14px">${greeting}</p>
          <p style="margin:0">${escapeHtml(row.body)}</p>
        </td></tr>
        ${cta}
        <tr><td style="padding:0 32px 28px;border-top:1px solid #e7e5e4">
          <p style="margin:18px 0 0;font-size:11px;line-height:1.7;color:#a8a29e">
            Ricevi questa email perché hai un ordine attivo su PosaFacile.
            Puoi scegliere quali avvisi ricevere dalla tua area personale.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('RESEND_FROM') ?? 'PosaFacile <no-reply@posafacile.it>'
    const baseUrl = (Deno.env.get('APP_BASE_URL') ?? '').replace(/\/$/, '')

    // Senza chiave non si fallisce in silenzio: la coda resta intatta e il
    // chiamante sa perché non è partito niente.
    if (!apiKey) {
        return json({
            error: 'RESEND_API_KEY non configurata',
            hint: 'supabase secrets set RESEND_API_KEY=... RESEND_FROM=... APP_BASE_URL=...',
        }, 503)
    }

    const admin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    try {
        const { data: rows, error } = await admin
            .from('email_outbox')
            .select('id, to_email, to_name, subject, body, link, event_type, attempts')
            .eq('status', 'pending')
            .lt('attempts', MAX_ATTEMPTS)
            .order('created_at', { ascending: true })
            .limit(BATCH_SIZE)

        if (error) throw error
        if (!rows || rows.length === 0) {
            return json({ sent: 0, failed: 0, message: 'Nessuna email in coda' })
        }

        let sent = 0
        let failed = 0

        for (const row of rows as OutboxRow[]) {
            // Marcata prima dell'invio: se la funzione muore a metà, la riga
            // non viene ripresa all'infinito da un'esecuzione parallela.
            await admin
                .from('email_outbox')
                .update({ status: 'sending', attempts: row.attempts + 1 })
                .eq('id', row.id)

            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from,
                        to: [row.to_email],
                        subject: row.subject,
                        html: renderEmail(row, baseUrl),
                    }),
                })

                const payload = await response.json().catch(() => ({}))

                if (!response.ok) {
                    throw new Error(payload?.message || `Resend ha risposto ${response.status}`)
                }

                await admin
                    .from('email_outbox')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        provider_message_id: payload?.id ?? null,
                        last_error: null,
                    })
                    .eq('id', row.id)

                sent++
            } catch (err) {
                const attempts = row.attempts + 1
                await admin
                    .from('email_outbox')
                    .update({
                        // Si riprova finché restano tentativi; poi la riga si ferma
                        // in 'failed' e resta visibile all'admin.
                        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
                        last_error: String(err instanceof Error ? err.message : err).slice(0, 500),
                    })
                    .eq('id', row.id)

                failed++
            }
        }

        return json({ sent, failed, processed: rows.length })
    } catch (err) {
        console.error('send-emails:', err)
        return json({ error: String(err instanceof Error ? err.message : err) }, 500)
    }
})
