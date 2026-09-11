-- ====================================================================
-- CHAT DI CANTIERE: IL CLIENTE LEGGE E SCRIVE, TUTTI VEDONO I NOMI
-- ====================================================================
--
-- Sostituisce 20260911150000_enable_customer_chat_messages e
-- 20260911160000_fix_chat_notifications_link_and_targets, mai applicate.
-- Finora sulla chat esistevano solo le policy di admin e posatore:
--
--  - il cliente non poteva leggere né scrivere messaggi, e nemmeno vedere
--    il cantiere (jobs) a cui la chat è agganciata. La sua scheda chat non
--    trovava il cantiere e ne apriva una vuota;
--  - messages non era nella pubblicazione realtime: nessuno vedeva arrivare
--    i messaggi senza ricaricare;
--  - i nomi dei mittenti si leggevano da users, che ognuno legge solo per sé.
--
-- Le policy passano da funzioni SECURITY DEFINER, come quelle degli ordini.

-- --------------------------------------------------------------------
-- 1. IL CLIENTE VEDE IL CANTIERE DEI SUOI ORDINI
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_job_customer(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1
          FROM public.jobs j
          JOIN public.orders o ON o.id = j.order_id
         WHERE j.id = p_job_id
           AND (o.customer_id = auth.uid() OR o.user_id = auth.uid())
    )
$$;

REVOKE ALL ON FUNCTION public.is_job_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_job_customer(uuid) TO authenticated;

DROP POLICY IF EXISTS "Customers can view jobs of their orders" ON public.jobs;
CREATE POLICY "Customers can view jobs of their orders" ON public.jobs
    FOR SELECT
    USING (public.is_order_customer(order_id));

-- --------------------------------------------------------------------
-- 2. IL CLIENTE LEGGE E SCRIVE I MESSAGGI DEL SUO CANTIERE
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Customers can view messages of their jobs" ON public.messages;
CREATE POLICY "Customers can view messages of their jobs" ON public.messages
    FOR SELECT
    USING (public.is_job_customer(job_id));

DROP POLICY IF EXISTS "Customers can send messages to their jobs" ON public.messages;
CREATE POLICY "Customers can send messages to their jobs" ON public.messages
    FOR INSERT
    WITH CHECK (sender_id = auth.uid() AND public.is_job_customer(job_id));

-- --------------------------------------------------------------------
-- 3. NOMI DEI MITTENTI, SOLO PER CHI PARTECIPA ALLA CHAT
-- --------------------------------------------------------------------
-- Restituisce nome e ruolo di chi ha scritto in quella chat, e nient'altro.
-- Il posatore vede il nome del cliente solo dopo aver accettato l'incarico,
-- come nel resto della piattaforma; prima vede "Cliente".

CREATE OR REPLACE FUNCTION public.job_chat_senders(p_job_id uuid)
RETURNS TABLE (id uuid, name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH j AS (
        SELECT jb.id AS job_id,
               jb.status AS job_status,
               jb.professional_id AS job_pro,
               o.customer_id,
               o.user_id,
               o.professional_id AS order_pro,
               o.installation_professional_id AS order_install_pro
          FROM public.jobs jb
          JOIN public.orders o ON o.id = jb.order_id
         WHERE jb.id = p_job_id
    )
    SELECT
        u.id,
        CASE
            WHEN u.role = 'admin' THEN 'Supporto PosaFacile'
            WHEN u.role = 'professional' THEN COALESCE(
                NULLIF(TRIM(pp.company_name), ''),
                NULLIF(TRIM(pp.full_name), ''),
                NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
                'Posatore'
            )
            WHEN NOT public.is_admin()
                 AND auth.uid() IS DISTINCT FROM j.customer_id
                 AND auth.uid() IS DISTINCT FROM j.user_id
                 AND j.job_status NOT IN ('accepted', 'in_progress', 'completed')
                THEN 'Cliente'
            ELSE COALESCE(
                NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
                'Cliente'
            )
        END,
        u.role::text
    FROM j
    JOIN public.users u
      ON u.id IN (SELECT m.sender_id FROM public.messages m WHERE m.job_id = j.job_id)
    LEFT JOIN public.professional_profiles pp ON pp.id = u.id
    WHERE auth.uid() IS NOT NULL
      AND (
          public.is_admin()
          OR auth.uid() IN (j.job_pro, j.customer_id, j.user_id, j.order_pro, j.order_install_pro)
      )
$$;

REVOKE ALL ON FUNCTION public.job_chat_senders(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.job_chat_senders(uuid) TO authenticated;

-- --------------------------------------------------------------------
-- 4. MESSAGGI IN TEMPO REALE
-- --------------------------------------------------------------------
-- Il realtime rispetta la RLS: ognuno riceve solo i messaggi che può leggere.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 5. AVVISI DI NUOVO MESSAGGIO (da 20260911160000, mai applicata)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job RECORD;
    v_sender_name TEXT := 'Un utente';
    v_customer_id UUID;
    v_pro_id UUID;
BEGIN
    SELECT
        j.id,
        j.order_id,
        j.professional_id,
        COALESCE(o.customer_id, o.user_id) AS customer_id,
        COALESCE(o.professional_id, o.installation_professional_id, j.professional_id) AS order_pro_id,
        o.order_number
    INTO v_job
    FROM public.jobs j
    JOIN public.orders o ON o.id = j.order_id
    WHERE j.id = NEW.job_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    v_customer_id := v_job.customer_id;
    v_pro_id := COALESCE(v_job.professional_id, v_job.order_pro_id);

    SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email, 'Supporto PosaFacile')
    INTO v_sender_name
    FROM public.users
    WHERE id = NEW.sender_id;

    -- Il mittente è il posatore: si avvisa il cliente
    IF (NEW.sender_id = v_pro_id OR (SELECT role FROM public.users WHERE id = NEW.sender_id) = 'professional')
       AND v_customer_id IS NOT NULL AND NEW.sender_id <> v_customer_id THEN
        PERFORM public.dispatch_notification(
            v_customer_id,
            'customer',
            'Nuovo messaggio dal posatore (' || v_sender_name || ')',
            SUBSTRING(NEW.content FROM 1 FOR 140),
            'message_received',
            '/dashboard/orders/' || v_job.order_id || '#chat-cantiere',
            jsonb_build_object(
                'job_id', NEW.job_id,
                'order_id', v_job.order_id,
                'email_template', 'message_received.customer'
            )
        );

    -- Il mittente è il cliente: si avvisa il posatore
    ELSIF NEW.sender_id = v_customer_id AND v_pro_id IS NOT NULL THEN
        PERFORM public.dispatch_notification(
            v_pro_id,
            'professional',
            'Nuovo messaggio dal cliente (' || v_sender_name || ')',
            SUBSTRING(NEW.content FROM 1 FOR 140),
            'message_received',
            '/pro/jobs/' || v_job.id || '#chat-cantiere',
            jsonb_build_object(
                'job_id', NEW.job_id,
                'order_id', v_job.order_id,
                'email_template', 'message_received.professional'
            )
        );

    -- Il mittente è l'ufficio operativo: si avvisano entrambi
    ELSE
        IF v_customer_id IS NOT NULL AND NEW.sender_id <> v_customer_id THEN
            PERFORM public.dispatch_notification(
                v_customer_id,
                'customer',
                'Nuovo messaggio da ' || v_sender_name || ' (PosaFacile)',
                SUBSTRING(NEW.content FROM 1 FOR 140),
                'message_received',
                '/dashboard/orders/' || v_job.order_id || '#chat-cantiere',
                jsonb_build_object(
                    'job_id', NEW.job_id,
                    'order_id', v_job.order_id,
                    'email_template', 'message_received.customer'
                )
            );
        END IF;

        IF v_pro_id IS NOT NULL AND NEW.sender_id <> v_pro_id THEN
            PERFORM public.dispatch_notification(
                v_pro_id,
                'professional',
                'Nuovo messaggio da ' || v_sender_name || ' (PosaFacile)',
                SUBSTRING(NEW.content FROM 1 FOR 140),
                'message_received',
                '/pro/jobs/' || v_job.id || '#chat-cantiere',
                jsonb_build_object(
                    'job_id', NEW.job_id,
                    'order_id', v_job.order_id,
                    'email_template', 'message_received.professional'
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_message_created ON public.messages;
CREATE TRIGGER trigger_notify_message_created
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_message_created();

REVOKE EXECUTE ON FUNCTION public.notify_on_message_created() FROM PUBLIC, anon, authenticated;
