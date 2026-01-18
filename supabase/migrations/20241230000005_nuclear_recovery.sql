-- ====================================================================
-- ULTIMATE RECOVERY: NUCLEAR CLEANUP & ADMIN SYNC
-- ====================================================================

-- 1. KILL ALL RLS (IMMEDIATE UNBLOCK)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. NUCLEAR CLEANUP OF CONFLICTING FUNCTIONS
-- CASCADE is used to force drop everything related to is_admin to fix "not unique"
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 3. RECREATE SECURITY DEFINER ADMIN CHECK (THE SAFE WAY)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = check_user_id AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- 4. AGGIORNAMENTO DATI (CRUCIALE)
-- Imposta admin nel DB pubblico
UPDATE public.users SET role = 'admin' WHERE email = 'immaginedimpresa@gmail.com';

-- Imposta admin nei METADATI SUPABASE (Così il sito ti riconosce subito)
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb 
WHERE email = 'immaginedimpresa@gmail.com';

-- 5. RESET POLICY SULLA TABELLA USERS
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Policy semplici e anti-loop
CREATE POLICY "users_read_self" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_admin_read_all" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "users_update_self" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 6. RI-ABILITA RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verifica finale: deve restituire 'admin'
SELECT email, role FROM public.users WHERE email = 'immaginedimpresa@gmail.com';
