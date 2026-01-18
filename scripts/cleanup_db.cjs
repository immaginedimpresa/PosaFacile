
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://ykpeonpzkzowtvonrspw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcGVvbnB6a3pvd3R2b25yc3B3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxNTY0NSwiZXhwIjoyMDc4NzkxNjQ1fQ.1PzL7_M-fgtU0pKKAZlUi74CEv39lp-qj70_GNKL_VY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function cleanupOrphans() {
    console.log('🔍 Starting Database Cleanup...');

    try {
        // 1. Fetch all users
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }

        const validUserIds = new Set(users.map(u => u.id));
        console.log(`📊 Found ${validUserIds.size} valid users.`);

        // 2. Fetch all professional profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('professional_profiles')
            .select('id, full_name');

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError);
            return;
        }

        console.log(`📊 Found ${profiles.length} professional profiles.`);

        // 3. Identify orphans
        const orphans = profiles.filter(p => !validUserIds.has(p.id));

        if (orphans.length === 0) {
            console.log('✅ No orphan profiles found. Database is clean!');
            return;
        }

        console.log(`⚠️ Found ${orphans.length} orphan profiles (missing linked user):`);
        orphans.forEach(o => console.log(`   - ${o.id} (${o.full_name || 'No Name'})`));

        // 4. Delete orphans
        const orphanIds = orphans.map(o => o.id);
        const { error: deleteError } = await supabase
            .from('professional_profiles')
            .delete()
            .in('id', orphanIds);

        if (deleteError) {
            console.error('❌ Error deleting orphans:', deleteError);
        } else {
            console.log('🗑️ Successfully deleted orphan profiles.');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

cleanupOrphans();
