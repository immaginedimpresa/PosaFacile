-- ====================================================================
-- TARIFFE DEL PROFESSIONISTA
-- ====================================================================
--
-- Il preventivo usava costanti scritte nel codice: 25 €/mq di posa, 12 di
-- demolizione, 18 di massetto. Le stesse per tutti, in tutta Italia. E le
-- tariffe impostabili da Impostazioni erano decorative: nessuno le leggeva.
--
-- Il prezzo della manodopera lo fa chi la esegue. Qui ogni professionista
-- dichiara le proprie: la piattaforma gestisce il materiale e ci aggiunge il
-- proprio margine, già previsto da markup_percent e markup_fixed.
--
-- Le tariffe sono per schema di posa in valore assoluto, non come
-- maggiorazione percentuale: un posatore ragiona per "la spina la faccio a
-- 40", non per "+25% sulla dritta".

CREATE TABLE IF NOT EXISTS public.professional_rates (
    professional_id UUID PRIMARY KEY
        REFERENCES public.professional_profiles(id) ON DELETE CASCADE,

    -- Posa, euro al metro quadro per schema.
    laying_dritta NUMERIC(10,2),
    laying_correre NUMERIC(10,2),
    laying_diagonale NUMERIC(10,2),
    laying_spina NUMERIC(10,2),
    laying_mosaico NUMERIC(10,2),

    -- Lavorazioni accessorie: al metro quadro salvo dove indicato.
    demolizione NUMERIC(10,2),
    massetto NUMERIC(10,2),
    impermeabilizzazione NUMERIC(10,2),
    smaltimento NUMERIC(10,2),
    battiscopa NUMERIC(10,2),   -- al metro lineare
    soglie NUMERIC(10,2),       -- al pezzo

    -- Quali lavorazioni non esegue: non vengono proposte a chi lo sceglie.
    servizi_esclusi TEXT[] NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.professional_rates ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica: il configuratore calcola il preventivo anche per un
-- visitatore senza account, e senza tariffe non può farlo. Sono prezzi di
-- listino della manodopera, non dati riservati.
DROP POLICY IF EXISTS "Rates readable by everyone" ON public.professional_rates;
CREATE POLICY "Rates readable by everyone"
    ON public.professional_rates FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Professionals manage own rates" ON public.professional_rates;
CREATE POLICY "Professionals manage own rates"
    ON public.professional_rates FOR ALL
    TO authenticated
    USING (professional_id = auth.uid() OR public.is_admin())
    WITH CHECK (professional_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_professional_rates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_touch_professional_rates ON public.professional_rates;
CREATE TRIGGER trigger_touch_professional_rates
BEFORE UPDATE ON public.professional_rates
FOR EACH ROW EXECUTE FUNCTION public.touch_professional_rates();

REVOKE EXECUTE ON FUNCTION public.touch_professional_rates() FROM PUBLIC, anon, authenticated;

-- Punto di partenza: la tariffa base già dichiarata diventa la posa dritta, e
-- gli altri schemi ereditano le maggiorazioni finora scritte nel codice. Il
-- professionista le corregge dal proprio pannello: sono una proposta, non un
-- prezzo imposto.
INSERT INTO public.professional_rates (
    professional_id,
    laying_dritta, laying_correre, laying_diagonale, laying_spina, laying_mosaico,
    demolizione, massetto, impermeabilizzazione, smaltimento, battiscopa, soglie
)
SELECT
    p.id,
    ROUND(COALESCE(NULLIF(p.price_per_sqm, 0), 25), 2),
    ROUND(COALESCE(NULLIF(p.price_per_sqm, 0), 25) * 1.08, 2),
    ROUND(COALESCE(NULLIF(p.price_per_sqm, 0), 25) * 1.22, 2),
    ROUND(COALESCE(NULLIF(p.price_per_sqm, 0), 25) * 1.50, 2),
    ROUND(COALESCE(NULLIF(p.price_per_sqm, 0), 25) * 1.35, 2),
    12, 18, 25, 8, 6, 35
FROM public.professional_profiles p
ON CONFLICT (professional_id) DO NOTHING;
