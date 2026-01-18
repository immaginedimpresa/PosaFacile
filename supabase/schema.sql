-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For location features if needed

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'professional', 'customer');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE customer_type AS ENUM ('private', 'business');
CREATE TYPE professional_status AS ENUM ('pending', 'documents', 'training', 'trial', 'active');
CREATE TYPE product_category AS ENUM ('floor', 'wall', 'outdoor', 'mosaic');
CREATE TYPE product_material AS ENUM ('gres', 'ceramic', 'cotto', 'natural_stone');
CREATE TYPE product_finish AS ENUM ('matt', 'glossy', 'textured', 'lappato');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'out_of_stock', 'discontinued');
CREATE TYPE order_status AS ENUM ('new', 'confirmed', 'assigned', 'material_shipped', 'material_delivered', 'in_progress', 'completed', 'disputed', 'refunded');

-- USERS TABLE (Extends Supabase Auth or Standalone)
-- Note: In Supabase, usually we link to auth.users using a trigger. 
-- For simplicity in this script, we create a public.users table that mimics the spec.
CREATE TABLE public.users (
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

-- ADDRESSES TABLE (Common for both)
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE public.customers (
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
CREATE TABLE public.professionals (
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
  -- home_location GEOGRAPHY(POINT, 4326), -- Requires PostGIS, commenting out to avoid errors if extension not enabled
  onboarding_status professional_status DEFAULT 'pending',
  badges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS TABLE
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  cost_per_sqm DECIMAL(10,2), -- Visible only to admin
  min_order_sqm DECIMAL(10,2) DEFAULT 1,
  stock_qty DECIMAL(10,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 7,
  supplier_id UUID, -- Foreign key to a suppliers table if exists
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
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL, -- Human readable ID e.g. ORD-2024-001
  customer_id UUID REFERENCES public.users(id),
  professional_id UUID REFERENCES public.users(id),
  status order_status DEFAULT 'new',
  
  -- Project Details
  project_type VARCHAR(50),
  intervention_type VARCHAR(50),
  laying_type VARCHAR(50),
  floor_sqm DECIMAL(10,2),
  wall_sqm DECIMAL(10,2),
  
  -- Delivery
  delivery_address_id UUID REFERENCES public.addresses(id),
  scheduled_date DATE,
  scheduled_time_slot VARCHAR(50),
  
  -- Financials
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
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity_sqm DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- TRIGGER FOR NEW USER CREATION (Sync Auth -> Public Users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  
  -- Initialize profile based on role
  IF (NEW.raw_user_meta_data->>'role') = 'professional' THEN
    INSERT INTO public.professionals (id, vat_number, fiscal_code) VALUES (NEW.id, '', '');
  ELSIF (NEW.raw_user_meta_data->>'role') = 'customer' OR (NEW.raw_user_meta_data->>'role') IS NULL THEN
    INSERT INTO public.customers (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Products area readable by everyone
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

