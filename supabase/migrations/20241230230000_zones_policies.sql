-- Add RLS policies for professional_zones table
-- Allow admins full access
CREATE POLICY "Admins can manage all zones" ON public.professional_zones
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Allow professionals to view their own zones
CREATE POLICY "Professionals can view own zones" ON public.professional_zones
  FOR SELECT USING (
    professional_id = auth.uid()
  );

-- Allow professionals to manage their own zones
CREATE POLICY "Professionals can insert own zones" ON public.professional_zones
  FOR INSERT WITH CHECK (
    professional_id = auth.uid()
  );

CREATE POLICY "Professionals can delete own zones" ON public.professional_zones
  FOR DELETE USING (
    professional_id = auth.uid()
  );
