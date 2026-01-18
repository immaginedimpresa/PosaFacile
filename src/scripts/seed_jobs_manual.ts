


// Replace with your project URL and Anon Key (or Service Role Key for bypassing RLS)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

async function seed() {
    // 1. You must be logged in in the browser to get your ID, OR we just hardcode an ID if we know it.
    // For this script to work standalone, we might need a Service Role key to bypass RLS and pick a user.
    // Since I can't easily get the logged-in user from here, I'll log a message to run this in the browser console.

    console.log(`
    Per generare un lavoro di test, esegui questo codice nella Console del Browser (dove sei loggato):

    // 1. Assicurati di essere loggato
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        // 2. Crea/Aggiorna profilo professionale
        const { error: profileError } = await supabase
            .from('professional_profiles')
            .upsert({
                id: user.id,
                company_name: 'Edil Test Srl',
                vat_number: 'IT12345678901',
                phone: '3331234567',
                verified: true
            })
        
        console.log('Profilo Pro:', profileError || 'OK')

        // 3. Crea un ordine fittizio (necessario per il vincolo FK)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: user.id, // Self-ordered for test
                status: 'pending',
                total_amount: 1000,
                shipping_address: { city: 'Milano', address: 'Via Test 1' }
            })
            .select()
            .single()

        console.log('Ordine:', orderError || 'OK')

        if (order) {
            // 4. Assegna lavoro
            const { error: jobError } = await supabase
                .from('jobs')
                .insert({
                    order_id: order.id,
                    professional_id: user.id,
                    status: 'assigned',
                    scheduled_date: '2024-01-20',
                    notes: 'Attenzione al cane.'
                })
            
            console.log('Lavoro creato:', jobError || 'OK')
        }
    } else {
        console.log('Devi essere loggato!')
    }
    `)
}

seed()
