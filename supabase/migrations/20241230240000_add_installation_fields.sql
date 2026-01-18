-- Add installation-related fields to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS installation_address JSONB,
  ADD COLUMN IF NOT EXISTS installation_professional_id UUID REFERENCES public.professional_profiles(id),
  ADD COLUMN IF NOT EXISTS installation_date DATE;

-- Add index for faster queries on installation_professional_id
CREATE INDEX IF NOT EXISTS idx_orders_installation_professional 
  ON public.orders(installation_professional_id);

-- Add index for installation_date
CREATE INDEX IF NOT EXISTS idx_orders_installation_date 
  ON public.orders(installation_date);
