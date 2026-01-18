-- Fix: Drop the trigger, create admin user manually, then recreate trigger

-- Step 1: Drop the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create the admin user directly (bypassing trigger)
-- This will be done via the Supabase Dashboard Auth panel

-- Step 3: After user is created in Auth, manually insert into public.users
-- INSERT INTO public.users (id, email, role, first_name, last_name) 
-- SELECT id, email, 'admin', '', '' FROM auth.users WHERE email = 'immaginedimpresa@gmail.com';

-- Step 4: Create customers record for the user
-- INSERT INTO public.customers (id) 
-- SELECT id FROM auth.users WHERE email = 'immaginedimpresa@gmail.com';
