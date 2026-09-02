// Invita un professionista via email e ne crea il profilo.
// Il link dell'invito riporta l'utente su /invite-accept, dove imposta la password
// e accede all'area professionisti.

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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let createdUserId: string | null = null
    let admin: ReturnType<typeof createClient> | null = null

    try {
        admin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, meta, zones } = await req.json()
        if (!email) throw new Error('Email mancante')

        // Il redirect deve puntare alla pagina che raccoglie la password, non alla home:
        // senza redirectTo Supabase usa la Site URL e il token resta inutilizzato.
        // In produzione si imposta il secret SITE_URL; in sviluppo si ricade sull'origin
        // del chiamante. In entrambi i casi Supabase valida l'URL contro la sua allowlist.
        const siteUrl = (Deno.env.get('SITE_URL') || req.headers.get('origin') || '').replace(/\/$/, '')
        if (!siteUrl) throw new Error('Impossibile determinare l\'URL del sito: imposta il secret SITE_URL')
        const redirectTo = `${siteUrl}/invite-accept`

        // Il trigger on_auth_user_created popola public.users leggendo first_name/last_name:
        // il form invia solo full_name, quindi lo scomponiamo qui.
        const fullName: string = (meta?.full_name ?? '').trim()
        const spaceAt = fullName.lastIndexOf(' ')
        const firstName = spaceAt > 0 ? fullName.slice(0, spaceAt) : fullName
        const lastName = spaceAt > 0 ? fullName.slice(spaceAt + 1) : ''

        const priceRaw = meta?.price_per_sqm
        const pricePerSqm =
            priceRaw === undefined || priceRaw === null || priceRaw === '' ? null : Number(priceRaw)
        if (pricePerSqm !== null && !Number.isFinite(pricePerSqm)) {
            throw new Error('Prezzo/mq non valido')
        }

        // 1. Invito via email
        const { data: userData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: {
                ...meta,
                first_name: firstName,
                last_name: lastName,
                role: 'professional',
            },
        })
        if (inviteError) throw inviteError
        createdUserId = userData.user.id

        // 2. Profilo professionista
        const { error: profileError } = await admin
            .from('professional_profiles')
            .insert({
                id: userData.user.id,
                company_name: meta.company_name,
                vat_number: meta.vat_number,
                phone: meta.phone,
                fiscal_code: meta.fiscal_code,
                sdi_code: meta.sdi_code,
                pec: meta.pec,
                billing_address: meta.billing_address,
                billing_city: meta.billing_city,
                billing_cap: meta.billing_cap,
                billing_province: meta.billing_province,
                full_name: meta.full_name,
                price_per_sqm: pricePerSqm,
                verified: true, // invitato dall'admin, quindi già attendibile
            })

        // Un profilo mancante lascerebbe un account inutilizzabile: meglio annullare
        // l'invito e riportare l'errore all'admin invece di fingere successo.
        if (profileError) throw profileError

        // 3. Zone di lavoro
        if (Array.isArray(zones) && zones.length > 0) {
            const zoneRecords = zones.map((provinceCode: string) => ({
                professional_id: userData.user.id,
                province_code: provinceCode,
            }))
            const { error: zonesError } = await admin.from('professional_zones').insert(zoneRecords)
            if (zonesError) throw zonesError
        }

        return json({ success: true, user: userData.user, redirectTo })

    } catch (error: any) {
        // Rollback: senza questo un secondo tentativo fallirebbe con "email già registrata"
        if (createdUserId && admin) {
            const { error: cleanupError } = await admin.auth.admin.deleteUser(createdUserId)
            if (cleanupError) console.error('Rollback fallito per', createdUserId, cleanupError.message)
        }
        console.error('invite-user error:', error)
        return json({ success: false, error: error.message }, 400)
    }
})
