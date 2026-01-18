-- Add detailed billing and personal fields to professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS fiscal_code TEXT,
ADD COLUMN IF NOT EXISTS sdi_code TEXT,
ADD COLUMN IF NOT EXISTS pec TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_cap TEXT,
ADD COLUMN IF NOT EXISTS billing_province TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT; -- Storing explicit full name for the pro contact

-- Comment on columns
COMMENT ON COLUMN public.professional_profiles.fiscal_code IS 'Codice Fiscale of the professional or company rep';
COMMENT ON COLUMN public.professional_profiles.sdi_code IS 'Codice Destinatario for electronic invoicing';
COMMENT ON COLUMN public.professional_profiles.pec IS 'Posta Elettronica Certificata';
