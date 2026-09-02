-- Prezzo di posa al metro quadro del professionista.
-- Stessa convenzione di naming di products.price_per_sqm.
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS price_per_sqm NUMERIC(10,2);

COMMENT ON COLUMN public.professional_profiles.price_per_sqm
  IS 'Tariffa di posa in euro al metro quadro (IVA esclusa)';
