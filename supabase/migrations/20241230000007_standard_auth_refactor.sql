-- ====================================================================
-- STANDARD AUTHENTICATION REFACTOR (CLEAN ARCHITECTURE)
-- ====================================================================

-- 1. CLEANUP OLD HACKS & FUNCTIONS
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 2. DISABLE RLS TEMPORARILY
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 3. DROP ALL OLD POLICIES
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

-- 4. CREATE SYNC TRIGGER (Public.User Role -> Auth.User Metadata)
-- This ensures that when we set a user as 'admin' in the database, 
-- Supabase automatically updates the JWT token metadata.
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_role_change ON public.users;
CREATE TRIGGER on_user_role_change
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_to_metadata();

-- 5. IMPLEMENT JWT-BASED RLS POLICIES (Recursion-Proof)
-- We check permissions using specific keys in the JWT, not by querying tables.

-- --- USERS TABLE ---
CREATE POLICY "users_read_self" ON public.users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_read_admin" ON public.users 
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "users_update_self" ON public.users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_update_admin" ON public.users 
FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "users_insert_public" ON public.users 
FOR INSERT WITH CHECK (true);

-- --- ORDERS TABLE ---
CREATE POLICY "orders_read_own" ON public.orders 
FOR SELECT USING (
  auth.uid() = customer_id OR 
  auth.uid() = professional_id OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "orders_admin_all" ON public.orders 
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- --- PRODUCTS TABLE ---
CREATE POLICY "products_read_public" ON public.products 
FOR SELECT USING (true);

CREATE POLICY "products_admin_manage" ON public.products 
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 6. RE-ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 7. FORCE SYNC EXISTING ADMIN
-- Triggers the sync function to update metadata for the admin
UPDATE public.users SET role = 'admin' WHERE email = 'immaginedimpresa@gmail.com';

-- Manual fallback if trigger doesn't fire on same value update
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb 
WHERE email = 'immaginedimpresa@gmail.com';

-- Verification
SELECT email, role FROM public.users WHERE email = 'immaginedimpresa@gmail.com';
