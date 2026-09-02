-- Markup applicato dalla piattaforma sulla tariffa del professionista.
-- Due leve indipendenti e cumulabili:
--   markup_percent : percentuale sul prezzo/mq del professionista
--   markup_fixed   : importo una tantum aggiunto al preventivo
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup_fixed   NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.professional_profiles.markup_percent
  IS 'Ricarico percentuale sul prezzo/mq del professionista (es. 15.00 = +15%)';
COMMENT ON COLUMN public.professional_profiles.markup_fixed
  IS 'Ricarico fisso una tantum in euro, aggiunto una sola volta al preventivo';

-- Un markup negativo sarebbe uno sconto non previsto dal listino: meglio bloccarlo
-- qui che scoprirlo in un preventivo.
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS professional_profiles_markup_non_negative;
ALTER TABLE public.professional_profiles
  ADD CONSTRAINT professional_profiles_markup_non_negative
  CHECK (markup_percent >= 0 AND markup_fixed >= 0);
