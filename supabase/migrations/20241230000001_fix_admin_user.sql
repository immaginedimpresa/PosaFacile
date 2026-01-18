-- Fix admin user: ensure public.users row exists for authenticated users

-- Step 1: Sync all auth.users to public.users that are missing
INSERT INTO public.users (id, email, role, first_name, last_name, status, created_at)
SELECT 
    au.id, 
    au.email, 
    COALESCE((au.raw_user_meta_data->>'role')::user_role, 'customer'),
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    'active'::user_status,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 2: Ensure customers table has entries for all users
INSERT INTO public.customers (id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT id FROM public.customers)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Set first authenticated user as admin if no admin exists
UPDATE public.users
SET role = 'admin'::user_role
WHERE id = (
    SELECT id FROM public.users 
    ORDER BY created_at ASC 
    LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin');

-- Step 4: Specifically set admin role for the email if exists
UPDATE public.users
SET role = 'admin'::user_role
WHERE email = 'immaginedimpresa@gmail.com';

-- Show result (for debugging in SQL editor)
SELECT id, email, role, status, created_at FROM public.users;
