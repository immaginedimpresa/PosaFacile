-- ====================================================================
-- MESSA IN SICUREZZA
-- ====================================================================
--
-- Audit completo di RLS, policy e superficie RPC. I problemi trovati, in
-- ordine di gravità:
--
-- 1. ESCALATION A ADMIN, per due strade indipendenti:
--    a) registrandosi con role='admin' nei metadata, che handle_new_user
--       copiava in public.users senza filtrare;
--    b) aggiornando la propria riga in public.users, perché users_update_self
--       aveva USING (auth.uid() = id) e nessun WITH CHECK.
-- 2. POLICY BASATE SUI METADATA DEL JWT: auth.jwt() -> 'user_metadata' ->>
--    'role' è modificabile dall'utente con una updateUser. Riguardava orders,
--    products, users, notifications e notification_preferences.
-- 3. TABELLE SENZA RLS: addresses e order_items erano leggibili e scrivibili
--    da chiunque avesse la chiave anon, che sta nel bundle pubblico.
-- 4. NOTIFICHE INSERIBILI DA CHIUNQUE: WITH CHECK (true).
-- 5. FUNZIONI INTERNE ESPOSTE COME RPC: in particolare dispatch_notification,
--    che permetteva di inviare a qualsiasi utente notifiche ed email con
--    testo arbitrario dal dominio di PosaFacile.
--
-- Nota su PostgreSQL: le funzioni nascono con EXECUTE concesso a PUBLIC.
-- Revocare da anon/authenticated non basta, va revocato da PUBLIC.

-- ====================================================================
-- 1. IL RUOLO NON SI AUTO-ASSEGNA
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Il ruolo arriva da dati che l'utente controlla: si accettano solo i
  -- valori che ha senso auto-assegnarsi.
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer');
  IF v_role NOT IN ('customer', 'professional') THEN
    v_role := 'customer';
  END IF;

  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role',
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('customer', 'professional') THEN
      NEW.role := 'customer';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Non autorizzato a modificare il ruolo utente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_user_role ON public.users;
CREATE TRIGGER trigger_guard_user_role
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_user_role();

-- Aveva WITH CHECK (true): essendo le policy permissive valutate in OR,
-- annullava il vincolo dell'altra policy di INSERT.
DROP POLICY IF EXISTS "users_insert_public" ON public.users;

DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ====================================================================
-- 2. POLICY SENZA METADATA DEL JWT
-- ====================================================================

DROP POLICY IF EXISTS "orders_read_own" ON public.orders;
CREATE POLICY "orders_read_own" ON public.orders
FOR SELECT USING (
  auth.uid() = customer_id OR auth.uid() = user_id
  OR auth.uid() = professional_id OR auth.uid() = installation_professional_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_admin_manage" ON public.products;
CREATE POLICY "products_admin_manage" ON public.products
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "users_read_admin" ON public.users;
CREATE POLICY "users_read_admin" ON public.users
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
FOR SELECT USING (
  auth.uid() = user_id OR (target_role = 'admin' AND public.is_admin())
  OR target_role = 'all'
);

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id OR (target_role = 'admin' AND public.is_admin()))
WITH CHECK (auth.uid() = user_id OR (target_role = 'admin' AND public.is_admin()));

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Chiunque poteva inserire notifiche per chiunque: phishing dentro
-- l'applicazione. Quelle legittime nascono dai trigger, che sono SECURITY
-- DEFINER e non passano da questa policy.
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "preferences_select_policy" ON public.notification_preferences;
CREATE POLICY "preferences_select_policy" ON public.notification_preferences
FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "preferences_modify_policy" ON public.notification_preferences;
CREATE POLICY "preferences_modify_policy" ON public.notification_preferences
FOR ALL USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ====================================================================
-- 3. RLS SULLE TABELLE ESPOSTE
-- ====================================================================

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage addresses" ON public.addresses;
DROP POLICY IF EXISTS "Owner or admin can manage addresses" ON public.addresses;
CREATE POLICY "Owner or admin can manage addresses"
  ON public.addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order items visible to order participants" ON public.order_items;
CREATE POLICY "Order items visible to order participants"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.customer_id = auth.uid() OR o.user_id = auth.uid()
             OR o.professional_id = auth.uid() OR o.installation_professional_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Aveva RLS attiva e nessuna policy: tabella inaccessibile a tutti.
DROP POLICY IF EXISTS "Skills are publicly viewable" ON public.professional_skills;
CREATE POLICY "Skills are publicly viewable"
  ON public.professional_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professionals manage own skills" ON public.professional_skills;
CREATE POLICY "Professionals manage own skills"
  ON public.professional_skills FOR ALL TO authenticated
  USING (professional_id = auth.uid() OR public.is_admin())
  WITH CHECK (professional_id = auth.uid() OR public.is_admin());

-- ====================================================================
-- 4. SUPERFICIE RPC RIDOTTA
-- ====================================================================
--
-- Ogni funzione in public è esposta come /rest/v1/rpc/<nome>. Revocare
-- EXECUTE non impedisce ai trigger di funzionare: Postgres non verifica
-- quel permesso per le funzioni invocate da trigger, e le chiamate interne
-- avvengono dentro funzioni SECURITY DEFINER.

REVOKE EXECUTE ON FUNCTION public.dispatch_notification(UUID, VARCHAR, TEXT, TEXT, VARCHAR, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_order_milestones(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_customer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_order_milestones() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_order_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_order_updated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_milestone_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_duration_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_professional_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_role_to_metadata() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_order_milestone() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_email_outbox() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_working_days(DATE, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_service_role() FROM PUBLIC, anon, authenticated;

-- Le sole RPC chiamate dal client.
REVOKE EXECUTE ON FUNCTION public.confirm_order_duration(UUID, NUMERIC, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.confirm_order_duration(UUID, NUMERIC, INTEGER, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_as_read(VARCHAR) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_all_notifications_as_read(VARCHAR) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.professionals_for_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.distance_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;

-- is_admin() è valutata dalle policy per conto dell'utente che interroga:
-- senza EXECUTE ogni policy che la richiama fallirebbe.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ====================================================================
-- 5. SEARCH_PATH FISSATO
-- ====================================================================
-- Senza search_path esplicito una funzione SECURITY DEFINER può essere
-- indotta a risolvere un nome su un oggetto di un altro schema.
ALTER FUNCTION public.handle_new_customer() SET search_path = public;
ALTER FUNCTION public.update_professional_rating() SET search_path = public;
ALTER FUNCTION public.distance_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) SET search_path = public;
ALTER FUNCTION public.professionals_for_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION) SET search_path = public;
ALTER FUNCTION public.touch_order_milestone() SET search_path = public;
ALTER FUNCTION public.touch_email_outbox() SET search_path = public;
ALTER FUNCTION public.add_working_days(DATE, INTEGER) SET search_path = public;
