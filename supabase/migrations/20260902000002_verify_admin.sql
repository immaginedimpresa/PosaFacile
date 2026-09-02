-- Verifica stato admin - questa migration è solo di lettura/audit
-- Assicura che il record esista con ruolo admin
DO $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_auth_exists BOOLEAN;
BEGIN
    -- Controlla in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'immaginedimpresa@gmail.com') INTO v_auth_exists;
    
    -- Controlla in public.users
    SELECT id, role::TEXT INTO v_user_id, v_role 
    FROM public.users 
    WHERE email = 'immaginedimpresa@gmail.com';
    
    IF v_auth_exists AND v_user_id IS NOT NULL AND v_role = 'admin' THEN
        RAISE NOTICE 'SUCCESS: immaginedimpresa@gmail.com is admin (id: %)', v_user_id;
    ELSIF v_auth_exists AND v_user_id IS NULL THEN
        RAISE NOTICE 'WARNING: User exists in auth but NOT in public.users - forcing insert...';
        INSERT INTO public.users (id, email, role, status, first_name, last_name)
        SELECT id, email, 'admin'::user_role, 'active'::user_status, '', ''
        FROM auth.users WHERE email = 'immaginedimpresa@gmail.com'
        ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';
        RAISE NOTICE 'FIXED: User inserted as admin.';
    ELSIF NOT v_auth_exists THEN
        RAISE NOTICE 'ERROR: immaginedimpresa@gmail.com does NOT exist in auth.users - create it from Supabase Dashboard > Auth > Add User';
    END IF;
END $$;
