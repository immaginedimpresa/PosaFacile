-- Utenti presenti in auth.users ma privi della riga in public.users.
--
-- handle_new_user dovrebbe crearla alla registrazione, ma cattura qualsiasi
-- eccezione e si limita a un warning: se fallisce, l'utente resta senza riga
-- e nessuno se ne accorge. Finché il ruolo si leggeva dai metadata del JWT il
-- problema restava invisibile; da quando si legge dal database (necessario per
-- chiudere l'escalation a admin) quell'utente viene trattato come cliente e
-- non entra nella propria area.
--
-- Il ruolo si prende dai metadata ma filtrato: 'admin' non si eredita mai da
-- un campo che l'utente controlla.
INSERT INTO public.users (id, email, first_name, last_name, avatar_url, role)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    au.raw_user_meta_data->>'avatar_url',
    CASE
        WHEN au.raw_user_meta_data->>'role' = 'professional' THEN 'professional'::user_role
        ELSE 'customer'::user_role
    END
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Chi ha un profilo professionale deve risultare professionista anche
-- nell'anagrafica: le due tabelle non possono raccontare cose diverse.
UPDATE public.users u
   SET role = 'professional'
  FROM public.professional_profiles pp
 WHERE pp.id = u.id
   AND u.role = 'customer'
   AND EXISTS (
     SELECT 1 FROM auth.users au
     WHERE au.id = u.id AND au.raw_user_meta_data->>'role' = 'professional'
   );
