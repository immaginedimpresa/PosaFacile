-- Add admin DELETE policy for professional_profiles
CREATE POLICY "Admins can delete professional profiles" ON public.professional_profiles
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Also add admin UPDATE policy if not exists (for verify/unverify functionality)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.professional_profiles;
CREATE POLICY "Admins can update all profiles" ON public.professional_profiles
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
