-- ====================================================================
-- NUCLEAR REPAIR: RLS RECURSION & METADATA SYNC (ULTIMATE FIX)
-- ====================================================================

-- 1. FERMA IL LOOP IMMEDIATAMENTE (STATO DI EMERGENZA)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. PULIZIA TOTALE FUNZIONI
-- CASCADE garantisce che ogni dipendenza o versione precedente venga eliminata.
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 3. CREAZIONE FUNZIONE ADMIN "GOD MODE" (SECURITY DEFINER)
-- Questa funzione legge il ruolo bypassando RLS e loop.
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  u_role user_role;
BEGIN
  IF check_user_id IS NULL THEN RETURN false; END IF;
  
  -- Legge direttamente dalla tabella ignorando RLS
  SELECT role INTO u_role FROM public.users WHERE id = check_user_id;
  RETURN u_role = 'admin';
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- 4. RESET POLICY PULITE SULLA TABELLA USERS
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Policy Non-Ricorsive: Semplici e veloci
CREATE POLICY "users_read_self" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_admin_read_all" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "users_update_self" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 5. AGGIORNAMENTO DATI (DB + AUTH METADATA)
-- Forza il ruolo admin nel database pubblico
UPDATE public.users SET role = 'admin' WHERE email = 'immaginedimpresa@gmail.com';

-- Forza il ruolo admin nei METADATI di Supabase Auth (Cruciale per i JWT)
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb 
WHERE email = 'immaginedimpresa@gmail.com';

-- Sincronizzazione finale degli utenti
INSERT INTO public.users (id, email, role, status)
SELECT id, email, 'admin', 'active' FROM auth.users WHERE email = 'immaginedimpresa@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 6. RI-ABILITA SICUREZZA
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verifica finale: DEVE restituire una riga con ruolo 'admin'
SELECT email, role FROM public.users WHERE email = 'immaginedimpresa@gmail.com';
