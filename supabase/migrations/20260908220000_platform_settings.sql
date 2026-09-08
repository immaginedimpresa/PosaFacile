-- Impostazioni di piattaforma condivise.
--
-- Finora la pagina Impostazioni salvava solo in localStorage: un valore
-- inserito dall'admin restava nel suo browser e non poteva influenzare nulla
-- di quello che vede il cliente. I tempi di approvvigionamento devono invece
-- bloccare le date selezionabili nel calendario, quindi vanno sul database.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica: il calendario del configuratore è usabile anche da chi
-- non ha ancora un account, e questi valori non sono riservati.
DROP POLICY IF EXISTS "Platform settings are readable by everyone" ON public.platform_settings;
CREATE POLICY "Platform settings are readable by everyone"
  ON public.platform_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can change platform settings" ON public.platform_settings;
CREATE POLICY "Only admins can change platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Valori di partenza: 10 giorni dall'ordine alla spedizione, 2 di trasporto.
INSERT INTO public.platform_settings (key, value)
VALUES ('logistics', jsonb_build_object(
  'materialLeadDays', 10,
  'shippingTransitDays', 2
))
ON CONFLICT (key) DO NOTHING;
