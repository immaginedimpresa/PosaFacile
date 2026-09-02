-- Imposta immaginedimpresa@gmail.com come ADMIN
-- Aggiorna se esiste già, inserisce se non esiste

-- 1. Aggiorna se già presente in public.users
UPDATE public.users 
SET role = 'admin', status = 'active'
WHERE email = 'immaginedimpresa@gmail.com';

-- 2. Inserisci da auth.users se non ancora sincronizzato
INSERT INTO public.users (id, email, role, status, first_name, last_name)
SELECT id, email, 'admin', 'active', '', ''
FROM auth.users 
WHERE email = 'immaginedimpresa@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'immaginedimpresa@gmail.com'
  )
ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';
