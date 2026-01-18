-- Allow customers to insert their own profile (needed for manual sync if trigger fails)
DROP POLICY IF EXISTS "Customers can insert own profile" ON public.customers;
CREATE POLICY "Customers can insert own profile" 
ON public.customers FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure users can also insert (should exist, but reinforcing)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);
