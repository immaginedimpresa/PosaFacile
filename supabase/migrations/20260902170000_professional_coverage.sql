-- Copertura del professionista: per province oppure per raggio da un punto.
-- Le zone provinciali restano in professional_zones; qui si aggiunge l'alternativa
-- a raggio e il campo che dice quale delle due vale.

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS coverage_mode TEXT NOT NULL DEFAULT 'province',
  ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS center_lon DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS radius_km INTEGER;

COMMENT ON COLUMN public.professional_profiles.coverage_mode
  IS 'province = copre le province in professional_zones; radius = copre un cerchio attorno a center_lat/center_lon';

ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS professional_profiles_coverage_mode_valid;
ALTER TABLE public.professional_profiles
  ADD CONSTRAINT professional_profiles_coverage_mode_valid
  CHECK (coverage_mode IN ('province', 'radius'));

-- In modalità raggio, centro e raggio devono esserci: senza, il professionista
-- non risulterebbe da nessuna parte e la cosa passerebbe inosservata.
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS professional_profiles_radius_complete;
ALTER TABLE public.professional_profiles
  ADD CONSTRAINT professional_profiles_radius_complete
  CHECK (
    coverage_mode <> 'radius'
    OR (center_lat IS NOT NULL AND center_lon IS NOT NULL AND radius_km IS NOT NULL AND radius_km > 0)
  );

-- Distanza in km sulla sfera terrestre. Basta la formula dell'emisenoverso:
-- l'errore rispetto all'ellissoide è sotto il mezzo punto percentuale, del tutto
-- irrilevante rispetto a un raggio di copertura espresso in chilometri interi.
CREATE OR REPLACE FUNCTION public.distance_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT 2 * 6371 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

-- Professionisti che coprono un indirizzo, con qualunque delle due modalità.
-- Non è SECURITY DEFINER: le policy di professional_profiles continuano a valere.
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
  coverage_mode TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id, p.full_name, p.company_name, p.rating, p.years_experience, p.bio,
    p.price_per_sqm, p.markup_percent, p.markup_fixed, p.coverage_mode,
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
  -- Prima chi è più vicino quando la distanza è nota, poi il punteggio.
  ORDER BY distance_km ASC NULLS LAST, p.rating DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.professionals_for_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION)
  TO anon, authenticated;
