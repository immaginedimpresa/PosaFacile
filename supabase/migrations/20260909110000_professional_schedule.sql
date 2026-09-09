-- ====================================================================
-- REGOLE DI DISPONIBILITÀ DEL PROFESSIONISTA
-- ====================================================================
--
-- Finora esisteva solo professional_availability: una riga per ogni giorno
-- NON disponibile. Un modello per eccezioni, in cui il posatore non dichiara
-- quando lavora ma cancella i giorni in cui non lavora, uno per uno. Per dire
-- "il sabato non lavoro" doveva marcare cinquantadue sabati.
--
-- Qui stanno le regole permanenti: si impostano una volta e valgono sempre.
-- Le eccezioni puntuali restano in professional_availability.

CREATE TABLE IF NOT EXISTS public.professional_schedule (
    professional_id UUID PRIMARY KEY
        REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    -- Giorni lavorativi, notazione ISO: 1 = lunedì, 7 = domenica.
    working_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}',
    -- Preavviso minimo prima che un cliente possa fissare l'inizio.
    min_notice_days SMALLINT NOT NULL DEFAULT 2 CHECK (min_notice_days BETWEEN 0 AND 90),
    -- Margine fra la fine di un cantiere e l'inizio del successivo.
    buffer_days SMALLINT NOT NULL DEFAULT 0 CHECK (buffer_days BETWEEN 0 AND 14),
    -- Cantieri apribili nello stesso giorno: con una squadra sola resta 1.
    max_concurrent_jobs SMALLINT NOT NULL DEFAULT 1 CHECK (max_concurrent_jobs BETWEEN 1 AND 10),
    -- Fin dove nel tempo si accettano prenotazioni.
    booking_horizon_weeks SMALLINT NOT NULL DEFAULT 12 CHECK (booking_horizon_weeks BETWEEN 1 AND 104),
    -- Sospensione temporanea: fino a questa data niente proposte.
    paused_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.professional_schedule ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica: il calendario del configuratore deve disattivare i giorni
-- non prenotabili anche per un visitatore senza account. Sono informazioni di
-- disponibilità commerciale, non dati personali.
DROP POLICY IF EXISTS "Schedule readable by everyone" ON public.professional_schedule;
CREATE POLICY "Schedule readable by everyone"
    ON public.professional_schedule FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Professionals manage own schedule" ON public.professional_schedule;
CREATE POLICY "Professionals manage own schedule"
    ON public.professional_schedule FOR ALL
    TO authenticated
    USING (professional_id = auth.uid() OR public.is_admin())
    WITH CHECK (professional_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_professional_schedule()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_touch_professional_schedule ON public.professional_schedule;
CREATE TRIGGER trigger_touch_professional_schedule
BEFORE UPDATE ON public.professional_schedule
FOR EACH ROW EXECUTE FUNCTION public.touch_professional_schedule();

REVOKE EXECUTE ON FUNCTION public.touch_professional_schedule() FROM PUBLIC, anon, authenticated;

-- Ogni professionista parte con le regole predefinite: senza riga il
-- calendario dovrebbe indovinare, e indovinerebbe male.
INSERT INTO public.professional_schedule (professional_id)
SELECT id FROM public.professional_profiles
ON CONFLICT (professional_id) DO NOTHING;
