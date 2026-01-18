
// Follow this setup guide to integrate:
// 1. Run "supabase functions new invite-user"
// 2. Paste this code into "supabase/functions/invite-user/index.ts"
// 3. Run "supabase functions deploy invite-user"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, meta, zones } = await req.json()

        // 1. Invite User by Email
        const { data: userData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: { ...meta, role: 'professional' }
        })

        if (inviteError) throw inviteError

        // 2. Create Professional Profile
        // We insert all the extended metadata provided by the admin form
        const { error: profileError } = await supabaseClient
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
                verified: true // Trusted because invited by admin
            })

        if (profileError) {
            // If profile creation fails (e.g. unique constraint), we should probably warn or try update
            console.error('Profile creation error:', profileError)
            // Optionally rollback user deletion if needed, but for MVP we just log
        }

        // 3. Insert Work Zones if provided
        if (zones && zones.length > 0) {
            const zoneRecords = zones.map((provinceCode: string) => ({
                professional_id: userData.user.id,
                province_code: provinceCode
            }))

            const { error: zonesError } = await supabaseClient
                .from('professional_zones')
                .insert(zoneRecords)

            if (zonesError) {
                console.error('Zones creation error:', zonesError)
            }
        }

        return new Response(
            JSON.stringify(userData),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
    }
})
