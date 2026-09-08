import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabaseConfig'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
