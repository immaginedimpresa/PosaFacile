-- ====================================================================
-- TRASPORTO MATERIALE AL PIANO DA PARTE DEL POSATORE
-- ====================================================================
--
-- Il posatore può scegliere se offrire o meno il servizio di portare il
-- materiale dal punto di scarico (strada o box/garage) al piano dei lavori,
-- e quanto richiedere al metro quadro per ciascun piano.

ALTER TABLE public.professional_rates
    ADD COLUMN IF NOT EXISTS porto_piano NUMERIC(10,2) DEFAULT 2.00,
    ADD COLUMN IF NOT EXISTS porto_piano_attivo BOOLEAN NOT NULL DEFAULT true;

UPDATE public.professional_rates SET porto_piano = 2.00 WHERE porto_piano IS NULL;
UPDATE public.professional_rates SET porto_piano_attivo = true WHERE porto_piano_attivo IS NULL;

COMMENT ON COLUMN public.professional_rates.porto_piano IS
    'Tariffa del posatore per portare il materiale al piano (€ al metro quadro per piano)';

COMMENT ON COLUMN public.professional_rates.porto_piano_attivo IS
    'Indica se il posatore effettua o meno il servizio di trasporto materiale al piano (switch ON/OFF)';
