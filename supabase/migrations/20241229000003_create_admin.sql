-- Insert admin user into public.users from auth.users
INSERT INTO public.users (id, email, role, first_name, last_name, status, created_at)
SELECT id, email, 'admin'::user_role, '', '', 'active'::user_status, NOW()
FROM auth.users 
WHERE email = 'immaginedimpresa@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin'::user_role;

-- Also insert into customers table (required by schema)
INSERT INTO public.customers (id)
SELECT id FROM auth.users WHERE email = 'immaginedimpresa@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Recreate the trigger for future users
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
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Initialize customer profile
  INSERT INTO public.customers (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
