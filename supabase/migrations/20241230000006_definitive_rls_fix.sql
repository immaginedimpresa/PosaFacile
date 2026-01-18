-- ====================================================================
-- DEFINITIVE RLS RECURSION FIX & PERMISSION RESET (NUCLEAR)
-- ====================================================================

-- 1. STOP RLS GLOBALLY (EMERGENCY BRAKE)
-- This stops any ongoing recursion immediately.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 2. NUCLEAR CLEANUP OF FUNCTIONS
-- Drops ALL versions of is_admin to avoid "not unique" errors.
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 3. CREATE NON-RECURSIVE ADMIN CHECK (SECURITY DEFINER)
-- SECURITY DEFINER means this function runs with the privileges of the creator (postgres),
-- which bypasses RLS on the table it queries. This is the ONLY way to prevent recursion
-- when the check depends on the table being checked.
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  u_role user_role;
BEGIN
  -- We query the table directly. SECURITY DEFINER ignores RLS on 'users'.
  SELECT role INTO u_role FROM public.users WHERE id = check_user_id;
  RETURN u_role = 'admin';
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Grant execution to all users so RLS can call it.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- 4. RESET ALL POLICIES (CLEAN SLATE)
-- We use a DO block to dynamically drop all policies on core tables.
DO $$ 
DECLARE
    pol RECORD;
    tabs TEXT[] := ARRAY['users', 'orders', 'products'];
    tab TEXT;
BEGIN
    FOREACH tab IN ARRAY tabs LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tab AND schemaname = 'public' LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tab);
        END LOOP;
    END LOOP;
END $$;

-- 5. APPLY CLEAN, NON-RECURSIVE POLICIES

-- --- USERS TABLE ---
-- Own read (Direct ID check - NO recursion)
CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
-- Admin read all (Uses our safe SECURITY DEFINER function)
CREATE POLICY "users_admin_read_all" ON public.users FOR SELECT USING (public.is_admin(auth.uid()));
-- Own update
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
-- Admin update all
CREATE POLICY "users_admin_update_all" ON public.users FOR UPDATE USING (public.is_admin(auth.uid()));
-- System insert (Allow auth trigger to work)
CREATE POLICY "users_insert_all" ON public.users FOR INSERT WITH CHECK (true);

-- --- ORDERS TABLE ---
-- Users see own orders (customer or professional)
CREATE POLICY "orders_read_own" ON public.orders FOR SELECT 
USING (auth.uid() = customer_id OR auth.uid() = professional_id OR public.is_admin(auth.uid()));
-- Admins see and manage everything
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL 
USING (public.is_admin(auth.uid()));

-- --- PRODUCTS TABLE ---
-- Everyone can read products
CREATE POLICY "products_read_all" ON public.products FOR SELECT USING (true);
-- Admins manage products
CREATE POLICY "products_admin_all" ON public.products FOR ALL 
USING (public.is_admin(auth.uid()));

-- 6. RE-ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 7. ENSURE DATA INTEGRITY
-- Sync admin user explicitly.
UPDATE public.users SET role = 'admin' WHERE email = 'immaginedimpresa@gmail.com';

-- Force sync metadata in auth.users (Ensures the JWT also has the role)
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb 
WHERE email = 'immaginedimpresa@gmail.com';

-- 8. FINAL VERIFICATION
SELECT id, email, role FROM public.users WHERE email = 'immaginedimpresa@gmail.com';
