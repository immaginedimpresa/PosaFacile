-- ====================================================================
-- GOD MODE REPAIR: RLS RECURSION & STRUCTURAL INTEGRITY FIX
-- ====================================================================

-- 1. STOP ALL RLS (THE BLEEDING STOPPER)
-- This stops any ongoing infinite recursion by temporarily suspending security checks.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals DISABLE ROW LEVEL SECURITY;

-- 2. NUCLEAR CLEANUP OF FUNCTIONS
-- CASCADE ensures all dependencies (including policies using these functions) are dropped.
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 3. RECREATE STRUCTURAL ADMIN CHECK (SECURITY DEFINER)
-- Bypasses RLS to read 'users' table safely. This is the only recursive-proof way.
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
  
  -- Query user role directly from the table
  SELECT role INTO u_role FROM public.users WHERE id = check_user_id;
  
  RETURN u_role = 'admin';
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- 4. APPLY CLEAN POLICIES ON USERS TABLE
-- Drop any remaining policies just in case
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Policy 1: Users can see themselves (Simple ID check, no recursion)
CREATE POLICY "users_self_read" ON public.users FOR SELECT USING (auth.uid() = id);
-- Policy 2: Admins can see everyone (Uses our safe function)
CREATE POLICY "users_admin_read_all" ON public.users FOR SELECT USING (public.is_admin());
-- Policy 3: Users update themselves
CREATE POLICY "users_self_update" ON public.users FOR UPDATE USING (auth.uid() = id);
-- Policy 4: Admins update everyone
CREATE POLICY "users_admin_update_all" ON public.users FOR UPDATE USING (public.is_admin());
-- Policy 5: System insertion
CREATE POLICY "users_system_insert" ON public.users FOR INSERT WITH CHECK (true);

-- 5. APPLY CLEAN POLICIES ON ORDERS TABLE
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "orders_read_access" ON public.orders FOR SELECT 
USING (auth.uid() = customer_id OR auth.uid() = professional_id OR public.is_admin());

CREATE POLICY "orders_admin_manage" ON public.orders FOR ALL 
USING (public.is_admin());

-- 6. APPLY CLEAN POLICIES ON PRODUCTS TABLE
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "products_public_view" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_admin_manage" ON public.products FOR ALL USING (public.is_admin());

-- 7. RE-ENABLE RLS EVERYWHERE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- 8. ENSURE DATA CONSISTENCY
-- Sync admin user explicitly
UPDATE public.users SET role = 'admin' WHERE email = 'immaginedimpresa@gmail.com';

-- Ensure it exists in users from auth.users (Sync from Auth to Public)
INSERT INTO public.users (id, email, role, status)
SELECT id, email, 'admin', 'active' FROM auth.users WHERE email = 'immaginedimpresa@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Verification
SELECT id, email, role FROM public.users WHERE email = 'immaginedimpresa@gmail.com';
