-- Migration: Admin Customers Management
-- Adds admin_notes, is_active to public.customers, admin RLS policies, and auto-sync trigger

-- 1. Add admin columns to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Ensure admin policies on customers
DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own profile" ON public.customers;

CREATE POLICY "Customers can view own profile or admins view all"
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Customers can update own profile or admins update all"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Customers or admins can insert customer profile"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can delete customer profile"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3. Ensure admin policies on addresses
DROP POLICY IF EXISTS "Admins can manage addresses" ON public.addresses;
CREATE POLICY "Admins can manage addresses"
  ON public.addresses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 4. Auto-provision customer profile for customer users
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    INSERT INTO public.customers (id, customer_type)
    VALUES (NEW.id, 'private')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_customer_user_created ON public.users;
CREATE TRIGGER on_customer_user_created
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer();

-- 5. Backfill existing customers for customer users
INSERT INTO public.customers (id, customer_type)
SELECT id, 'private'
FROM public.users
WHERE role = 'customer'
ON CONFLICT (id) DO NOTHING;
