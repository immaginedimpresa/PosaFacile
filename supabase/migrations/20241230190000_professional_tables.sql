-- Create professional_profiles table
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  vat_number TEXT,
  phone TEXT,
  bio TEXT,
  years_experience INTEGER,
  rating DECIMAL(3,2) DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create skills table (e.g., 'gres', 'parquet', 'mosaico')
CREATE TABLE IF NOT EXISTS public.professional_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL, -- 'gres', 'parquet', 'demolition', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, skill_type)
);

-- Create zones table (provinces covered)
CREATE TABLE IF NOT EXISTS public.professional_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  province_code VARCHAR(2) NOT NULL, -- 'MI', 'TO', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, province_code)
);

-- Create jobs table (assignments)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professional_profiles(id),
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled'
  scheduled_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_logs table (activity tracking)
CREATE TABLE IF NOT EXISTS public.job_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'check_in', 'check_out', 'photo_upload', 'note'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Profiles: Public read, User write own
CREATE POLICY "Public profiles are viewable by everyone" ON public.professional_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.professional_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.professional_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs: 
-- Admins: ALL
-- Pros: View own assigned jobs, Update status of own jobs
CREATE POLICY "Admins can manage all jobs" ON public.jobs
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Professionals can view assigned jobs" ON public.jobs
  FOR SELECT USING (professional_id = auth.uid());

CREATE POLICY "Professionals can update assigned jobs" ON public.jobs
  FOR UPDATE USING (professional_id = auth.uid());

-- Job Logs:
-- Admins: View all
-- Pros: Insert own logs, view own logs
CREATE POLICY "Admins can view all logs" ON public.job_logs
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Professionals can view own job logs" ON public.job_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_logs.job_id AND professional_id = auth.uid())
  );

CREATE POLICY "Professionals can insert logs for own jobs" ON public.job_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_logs.job_id AND professional_id = auth.uid())
  );
