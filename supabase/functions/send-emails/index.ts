// Svuota la coda `email_outbox` inviando le email tramite Resend.
//
// L'invio non sta dentro ai trigger: una transazione di ordine non deve
// dipendere dalla raggiungibilità di un servizio esterno. I trigger accodano,
// questa funzione consuma la coda e registra l'esito riga per riga.
//
// Invocata dal cron (`cron.schedule` + pg_net, ogni 2 minuti) oppure a mano
// dal pannello admin.
//
// Modi:
//   POST /                        svuota la coda
//   POST /  {"dry_run": true}     rende l'HTML senza inviare né toccare la coda
//   POST /  {"preview": "chiave"} rende un template con dati di esempio
//   POST /  {"test_to": "a@b.c"}  invia a quell'indirizzo il template di preview
//
// Variabili d'ambiente richieste:
//   RESEND_API_KEY   chiave API di Resend
//   RESEND_FROM      mittente verificato, es. "PosaFacile <no-reply@posafacile.com>"
//   RESEND_REPLY_TO  indirizzo a cui rispondono i clienti (facoltativo)
//   APP_BASE_URL     base per i link nelle email, es. "https://posafacile.com"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

import { firstName } from './format.ts'
import { renderShell } from './layout.ts'
import { resolveTemplate, TEMPLATE_KEYS, type Ctx, type OutboxRow } from './templates.ts'
import { SAMPLE_CONTEXT } from './sample.ts'

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

/**
 * Chi può far partire un invio: il cron (service role) e gli amministratori.
 * `verify_jwt` da solo non basta, perché accetterebbe anche la anon key, che è
 * pubblica: chiunque potrebbe svuotare la coda o leggere un'anteprima.
 */
async function isAuthorized(req: Request, admin: SupabaseClient): Promise<boolean> {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return false

    // Il progetto ha due formati di chiave di servizio conviventi: la JWT
    // storica e la `sb_secret_...` nuova. Il cron può presentare l'una o
    // l'altra, quindi si accettano entrambe.
    for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS']) {
        const value = Deno.env.get(name)
        if (value && (value === token || value.split(',').includes(token))) return true
    }

    // Una JWT firmata dal progetto con ruolo service_role vale come chiave di
    // servizio anche se non coincide con il secret configurato qui.
    const claims = decodeJwtPayload(token)
    if (claims?.role === 'service_role') return true

    const { data, error } = await admin.auth.getUser(token)
    if (error || !data.user) return false

    const { data: profile } = await admin
        .from('users').select('role').eq('id', data.user.id).single()

    return profile?.role === 'admin'
}

/** Legge i claim senza verificare la firma: la verifica la fa già il gateway. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    try {
        const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        return JSON.parse(atob(padded + '='.repeat((4 - padded.length % 4) % 4)))
    } catch {
        return null
    }
}

/** Costruisce il contesto e rende l'HTML per una riga di coda. */
function render(row: OutboxRow, order: Record<string, any> | null, baseUrl: string) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const { key, template } = resolveTemplate(row, meta)

    const ctx: Ctx = {
        row,
        meta,
        order,
        name: firstName(row.to_name),
        // I link arrivano dai trigger come percorsi applicativi; il dominio lo
        // conosce solo l'ambiente di esecuzione.
        url: (path?: string | null) => {
            const p = path ?? '/'
            if (/^https?:\/\//i.test(p)) return p
            return `${baseUrl}${p.startsWith('/') ? p : `/${p}`}`
        },
    }

    const shell = template(ctx)
    return {
        templateKey: key,
        // Il soggetto del template vince su quello accodato: il primo è scritto
        // per la casella di posta, il secondo per la campanella in-app.
        subject: shell.title,
        html: renderShell({ ...shell, preheader: shell.preheader ?? row.body.slice(0, 110) }),
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('RESEND_FROM') ?? 'PosaFacile <no-reply@posafacile.com>'
    const replyTo = Deno.env.get('RESEND_REPLY_TO') || undefined
    const baseUrl = (Deno.env.get('APP_BASE_URL') ?? 'https://posafacile.com').replace(/\/$/, '')

    const admin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    if (!(await isAuthorized(req, admin))) {
        return json({ error: 'Non autorizzato' }, 401)
    }

    const body = await req.json().catch(() => ({})) as {
        dry_run?: boolean
        preview?: string
        test_to?: string
        limit?: number
    }

    // ---- Anteprima: rende un template con dati di esempio ------------------
    if (body.preview || body.test_to) {
        const key = body.preview ?? 'order_created.customer'
        const sample = SAMPLE_CONTEXT(key, body.test_to ?? 'anteprima@posafacile.com')
        const { subject, html, templateKey } = render(sample.row, sample.order, baseUrl)

        if (!body.test_to) {
            return new Response(html, {
                headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
            })
        }
        if (!apiKey) return json({ error: 'RESEND_API_KEY non configurata' }, 503)

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from, to: [body.test_to], subject: `[TEST] ${subject}`, html,
                ...(replyTo ? { reply_to: replyTo } : {}),
            }),
        })
        const payload = await response.json().catch(() => ({}))
        return json({ template: templateKey, ok: response.ok, resend: payload },
            response.ok ? 200 : 502)
    }

    // Senza chiave non si fallisce in silenzio: la coda resta intatta e il
    // chiamante sa perché non è partito niente.
    if (!apiKey) {
        return json({
            error: 'RESEND_API_KEY non configurata',
            hint: 'supabase secrets set RESEND_API_KEY=... RESEND_FROM=... APP_BASE_URL=...',
            templates: TEMPLATE_KEYS.length,
        }, 503)
    }

    try {
        const limit = Math.min(Math.max(body.limit ?? BATCH_SIZE, 1), 100)

        const { data: candidates, error } = await admin
            .from('email_outbox')
            .select('id')
            .eq('status', 'pending')
            .lt('attempts', MAX_ATTEMPTS)
            .order('created_at', { ascending: true })
            .limit(limit)

        if (error) throw error
        if (!candidates || candidates.length === 0) {
            return json({ sent: 0, failed: 0, message: 'Nessuna email in coda' })
        }

        // Prenotazione atomica: il filtro su status='pending' fa sì che due
        // esecuzioni sovrapposte non possano prendere la stessa riga. Chi
        // arriva secondo trova zero righe e non spedisce doppioni.
        const { data: claimed, error: claimError } = await admin
            .from('email_outbox')
            .update({ status: 'sending' })
            .in('id', candidates.map(c => c.id))
            .eq('status', 'pending')
            .select('id, to_email, to_name, to_role, subject, body, link, event_type, template, metadata, attempts')

        if (claimError) throw claimError
        const rows = (claimed ?? []) as OutboxRow[]
        if (rows.length === 0) {
            return json({ sent: 0, failed: 0, message: 'Coda già presa in carico' })
        }

        // Il contesto dell'ordine si legge una volta per ordine, non per riga:
        // lo stesso evento genera spesso più email (cliente, posatore, admin).
        const orderIds = [...new Set(
            rows.map(r => (r.metadata as any)?.order_id).filter(Boolean) as string[],
        )]
        const orders = new Map<string, Record<string, any> | null>()
        await Promise.all(orderIds.map(async (id) => {
            const { data } = await admin.rpc('get_email_order_context', { p_order_id: id })
            orders.set(id, (data as Record<string, any>) ?? null)
        }))

        let sent = 0
        let failed = 0
        const results: Array<Record<string, unknown>> = []

        for (const row of rows) {
            const orderId = (row.metadata as any)?.order_id as string | undefined
            const order = orderId ? (orders.get(orderId) ?? null) : null

            let rendered
            try {
                rendered = render(row, order, baseUrl)
            } catch (err) {
                // Un template rotto non deve bloccare la coda: la riga fallisce
                // da sola e le altre partono.
                failed++
                await admin.from('email_outbox').update({
                    status: 'failed',
                    attempts: row.attempts + 1,
                    last_error: `render: ${String(err instanceof Error ? err.message : err)}`.slice(0, 500),
                }).eq('id', row.id)
                continue
            }

            if (body.dry_run) {
                results.push({ id: row.id, to: row.to_email, template: rendered.templateKey, subject: rendered.subject })
                await admin.from('email_outbox').update({ status: 'pending' }).eq('id', row.id)
                continue
            }

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
                        subject: rendered.subject,
                        html: rendered.html,
                        ...(replyTo ? { reply_to: replyTo } : {}),
                        tags: [{ name: 'event', value: (row.event_type ?? 'generic').slice(0, 50) }],
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
                        attempts: row.attempts + 1,
                        sent_at: new Date().toISOString(),
                        provider_message_id: payload?.id ?? null,
                        template: rendered.templateKey,
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
                        attempts,
                        last_error: String(err instanceof Error ? err.message : err).slice(0, 500),
                    })
                    .eq('id', row.id)

                failed++
            }
        }

        return json(body.dry_run
            ? { dry_run: true, processed: rows.length, results }
            : { sent, failed, processed: rows.length })
    } catch (err) {
        console.error('send-emails:', err)
        return json({ error: String(err instanceof Error ? err.message : err) }, 500)
    }
})
