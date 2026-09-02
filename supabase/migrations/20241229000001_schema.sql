-- PosaFacile Database Schema
-- Compatible with existing Supabase project

-- ENUMS (only create if they don't exist - Supabase doesn't support IF NOT EXISTS for types easily, so we use DO blocks)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'professional', 'customer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
        CREATE TYPE customer_type AS ENUM ('private', 'business');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_status') THEN
        CREATE TYPE professional_status AS ENUM ('pending', 'documents', 'training', 'trial', 'active');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
        CREATE TYPE product_category AS ENUM ('floor', 'wall', 'outdoor', 'mosaic');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_material') THEN
        CREATE TYPE product_material AS ENUM ('gres', 'ceramic', 'cotto', 'natural_stone');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_finish') THEN
        CREATE TYPE product_finish AS ENUM ('matt', 'glossy', 'textured', 'lappato');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
        CREATE TYPE product_status AS ENUM ('draft', 'active', 'out_of_stock', 'discontinued');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('new', 'confirmed', 'assigned', 'material_shipped', 'material_delivered', 'in_progress', 'completed', 'disputed', 'refunded');
    END IF;
END $$;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  street VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  country VARCHAR(50) DEFAULT 'Italy',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS PROFILES
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  customer_type customer_type NOT NULL DEFAULT 'private',
  company_name VARCHAR(255),
  vat_number VARCHAR(20),
  fiscal_code VARCHAR(16),
  billing_address_id UUID REFERENCES public.addresses(id),
  newsletter_consent BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFESSIONALS PROFILES
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  vat_number VARCHAR(20),
  fiscal_code VARCHAR(16),
  iban VARCHAR(34),
  insurance_expiry DATE,
  insurance_doc_url TEXT,
  durc_expiry DATE,
  durc_doc_url TEXT,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  base_rate_per_sqm DECIMAL(10,2),
  max_radius_km INTEGER DEFAULT 50,
  onboarding_status professional_status DEFAULT 'pending',
  badges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category product_category,
  material product_material,
  format_width INTEGER,
  format_height INTEGER,
  thickness DECIMAL(5,2),
  finish product_finish,
  color_name VARCHAR(100),
  color_hex VARCHAR(7),
  style_tags TEXT[], 
  price_per_sqm DECIMAL(10,2) NOT NULL,
  cost_per_sqm DECIMAL(10,2),
  min_order_sqm DECIMAL(10,2) DEFAULT 1,
  stock_qty DECIMAL(10,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 7,
  supplier_id UUID,
  images JSONB DEFAULT '[]'::jsonb,
  tileable_image_url TEXT,
  datasheet_url TEXT,
  certifications TEXT[],
  status product_status DEFAULT 'draft',
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.users(id),
  professional_id UUID REFERENCES public.users(id),
  status order_status DEFAULT 'new',
  project_type VARCHAR(50),
  intervention_type VARCHAR(50),
  laying_type VARCHAR(50),
  floor_sqm DECIMAL(10,2),
  wall_sqm DECIMAL(10,2),
  delivery_address_id UUID REFERENCES public.addresses(id),
  scheduled_date DATE,
  scheduled_time_slot VARCHAR(50),
  material_total DECIMAL(10,2),
  laying_total DECIMAL(10,2),
  services_total DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  vat_amount DECIMAL(10,2),
  total DECIMAL(10,2),
  professional_payout DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50),
  payment_intent_id VARCHAR(100),
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity_sqm DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER FOR NEW USER CREATION (Sync Auth -> Public Users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  
  -- Initialize profile based on role
  IF (NEW.raw_user_meta_data->>'role') = 'professional' THEN
    INSERT INTO public.professionals (id, vat_number, fiscal_code) VALUES (NEW.id, '', '');
  ELSE
    INSERT INTO public.customers (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY - CORRECTED VERSION
-- Uses auth.jwt() to avoid recursion on users table
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER function to safely check admin status
-- This bypasses RLS when checking the users table
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role user_role;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = check_user_id;
  RETURN user_role = 'admin';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- ============================================
-- PRODUCTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" 
  ON public.products FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
  ON public.products FOR ALL 
  USING (public.is_admin());

-- ============================================
-- USERS POLICIES (No recursion)
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "admins_read_all" ON public.users;
DROP POLICY IF EXISTS "admins_update_all" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;

-- Users can always read their own row (simple, no recursion)
CREATE POLICY "Users can read own row" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own row
CREATE POLICY "Users can update own row" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- Service role and triggers can insert
CREATE POLICY "Allow insert for authenticated" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================
-- CUSTOMERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customers;
CREATE POLICY "Customers can view own profile" 
  ON public.customers FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Customers can update own profile" ON public.customers;
CREATE POLICY "Customers can update own profile" 
  ON public.customers FOR UPDATE 
  USING (auth.uid() = id);

-- ============================================
-- PROFESSIONALS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Professionals can view own profile" ON public.professionals;
CREATE POLICY "Professionals can view own profile" 
  ON public.professionals FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Professionals can update own profile" ON public.professionals;
CREATE POLICY "Professionals can update own profile" 
  ON public.professionals FOR UPDATE 
  USING (auth.uid() = id);

-- ============================================
-- ORDERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" 
  ON public.orders FOR SELECT 
  USING (auth.uid() = customer_id OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders" 
  ON public.orders FOR ALL 
  USING (public.is_admin());

