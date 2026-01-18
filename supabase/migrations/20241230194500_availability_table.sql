CREATE TABLE IF NOT EXISTS public.professional_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('busy', 'vacation')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, date)
);

ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Professionals manage own availability" ON public.professional_availability
  FOR ALL USING (professional_id = auth.uid());

CREATE POLICY "Public view availability" ON public.professional_availability
  FOR SELECT USING (true);
