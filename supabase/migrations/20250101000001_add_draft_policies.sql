-- Add policy to allow users to create their own draft orders
DROP POLICY IF EXISTS "Users can create draft orders" ON public.orders;
CREATE POLICY "Users can create draft orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND status = 'draft');

-- Add policy to allow users to update their own draft orders
DROP POLICY IF EXISTS "Users can update own draft orders" ON public.orders;
CREATE POLICY "Users can update own draft orders" 
  ON public.orders FOR UPDATE 
  USING (auth.uid() = user_id AND status = 'draft');
