-- Il markup era uno solo per professionista, applicato indistintamente a posa
-- e lavorazioni. Ma il margine su una demolizione non è quello su una posa a
-- spina: l'admin deve poter agire sulla singola voce.
--
-- Le eccezioni stanno in una mappa: chiave della voce -> percentuale. Le voci
-- assenti usano markup_percent, che resta il valore predefinito. Così chi non
-- differenzia continua a lavorare con un numero solo.
ALTER TABLE public.professional_profiles
    ADD COLUMN IF NOT EXISTS markup_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.professional_profiles.markup_overrides IS
    'Markup percentuale per singola voce di tariffa (es. {"laying_spina": 22}). '
    'Le voci assenti usano markup_percent.';

-- La ricerca dei posatori restituiva markup_percent ma non le eccezioni per
-- voce: senza, il configuratore applicherebbe il margine generale anche dove
-- l'admin ne ha fissato uno diverso.
DROP FUNCTION IF EXISTS public.professionals_for_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.professionals_for_location(
  p_province TEXT,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lon DOUBLE PRECISION DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  full_name TEXT,
  company_name TEXT,
  rating NUMERIC,
  years_experience INTEGER,
  bio TEXT,
  price_per_sqm NUMERIC,
  markup_percent NUMERIC,
  markup_fixed NUMERIC,
  markup_overrides JSONB,
  coverage_mode TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, p.company_name, p.rating, p.years_experience, p.bio,
    p.price_per_sqm, p.markup_percent, p.markup_fixed, p.markup_overrides,
    p.coverage_mode,
    CASE
      WHEN p_lat IS NULL OR p.center_lat IS NULL THEN NULL
      ELSE public.distance_km(p_lat, p_lon, p.center_lat, p.center_lon)
    END AS distance_km
  FROM public.professional_profiles p
  WHERE p.verified
    AND (
      (p.coverage_mode = 'province' AND EXISTS (
         SELECT 1 FROM public.professional_zones z
          WHERE z.professional_id = p.id
            AND upper(btrim(z.province_code)) = upper(btrim(p_province))
      ))
      OR
      (p.coverage_mode = 'radius'
        AND p_lat IS NOT NULL AND p_lon IS NOT NULL
        AND public.distance_km(p_lat, p_lon, p.center_lat, p.center_lon) <= p.radius_km)
    )
  ORDER BY distance_km ASC NULLS LAST, p.rating DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.professionals_for_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION)
  TO anon, authenticated;
