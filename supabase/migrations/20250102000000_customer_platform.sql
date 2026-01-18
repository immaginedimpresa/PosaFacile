-- Customer Platform Tables Migration
-- Creates: order_services, reviews, saved_quotes, wishlist

-- ============================================
-- ORDER_SERVICES - Servizi accessori per ordine
-- ============================================

-- Ensure is_admin exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin';
END;
$$;

CREATE TABLE IF NOT EXISTS public.order_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'mq',
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVIEWS - Recensioni clienti
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT TRUE,
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAVED_QUOTES - Preventivi salvati (bozze)
-- ============================================
CREATE TABLE IF NOT EXISTS public.saved_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  
  -- Dati configuratore
  project_type VARCHAR(50),
  product_id UUID REFERENCES public.products(id),
  floor_sqm DECIMAL(10,2),
  wall_sqm DECIMAL(10,2),
  laying_type VARCHAR(50),
  services JSONB DEFAULT '[]'::jsonb,
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  provincia VARCHAR(10),
  cap VARCHAR(10),
  
  -- Professional & Date
  professional_id UUID REFERENCES public.users(id),
  scheduled_date DATE,
  
  -- Totali calcolati
  material_total DECIMAL(10,2),
  laying_total DECIMAL(10,2),
  services_total DECIMAL(10,2),
  total DECIMAL(10,2),
  
  -- AI visualization
  ai_result_image TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'converted')),
  converted_order_id UUID REFERENCES public.orders(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WISHLIST - Prodotti preferiti
-- ============================================
CREATE TABLE IF NOT EXISTS public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.order_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - ORDER_SERVICES
-- ============================================
CREATE POLICY "Users can view order services for own orders"
  ON public.order_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (o.customer_id = auth.uid() OR o.professional_id = auth.uid())
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins can manage order services"
  ON public.order_services FOR ALL
  USING (public.is_admin());

-- ============================================
-- RLS POLICIES - REVIEWS
-- ============================================
CREATE POLICY "Public reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (is_public = TRUE OR customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Customers can create reviews for own orders"
  ON public.reviews FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND o.customer_id = auth.uid()
      AND o.status = 'completed'
    )
  );

CREATE POLICY "Customers can update own reviews"
  ON public.reviews FOR UPDATE
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin());

-- ============================================
-- RLS POLICIES - SAVED_QUOTES
-- ============================================
CREATE POLICY "Customers can view own quotes"
  ON public.saved_quotes FOR SELECT
  USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Customers can create quotes"
  ON public.saved_quotes FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own quotes"
  ON public.saved_quotes FOR UPDATE
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can delete own quotes"
  ON public.saved_quotes FOR DELETE
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage quotes"
  ON public.saved_quotes FOR ALL
  USING (public.is_admin());

-- ============================================
-- RLS POLICIES - WISHLIST
-- ============================================
CREATE POLICY "Customers can view own wishlist"
  ON public.wishlist FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can add to wishlist"
  ON public.wishlist FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can remove from wishlist"
  ON public.wishlist FOR DELETE
  USING (customer_id = auth.uid());

-- ============================================
-- TRIGGER: Update professional rating on review
-- ============================================
CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.professional_profiles SET
    rating = (SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE professional_id = NEW.professional_id),
    reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE professional_id = NEW.professional_id)
  WHERE user_id = NEW.professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_professional_rating();

-- ============================================
-- INDEX per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_saved_quotes_customer ON public.saved_quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_status ON public.saved_quotes(status);
CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON public.wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON public.reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews(customer_id);
