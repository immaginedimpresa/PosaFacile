-- ====================================================================
-- FIX: CONFERMA ORDINI, NOTIFICHE PROFESSIONISTA, TABELLA JOBS E TIMELINE
-- ====================================================================
--
-- 1. Il pagamento non passa più da un UPDATE diretto, bloccato dalla RLS
--    (giustamente: il cliente non deve potersi segnare pagato da solo).
-- 2. Introduce la funzione SECURITY DEFINER `confirm_order_payment` per
--    garantire transizioni di pagamento atomiche ed esenti da errori RLS.
-- 3. Crea il trigger di sincronizzazione automatica verso `public.jobs`:
--    ogni ordine confermato con professionista assegnato compare
--    immediatamente nella dashboard del posatore.
-- 4. Aggiorna `order_milestones` (tappe cantiere) in automatico su pagamento
--    ('payment_confirmed') e assegnazione pro ('professional_confirmed').
-- 5. Perfeziona i trigger di notifica: il posatore riceve "Nuovo Cantiere
--    Assegnato" (sia in-app che email) sia alla conferma da bozza, sia alla
--    creazione diretta, sia all'assegnazione da parte dell'amministrazione.

-- --------------------------------------------------------------------
-- 1. RLS SU ORDERS: INVARIATA
-- --------------------------------------------------------------------
-- Il cliente continua a poter modificare solo i propri ordini in bozza.
-- Aprire la policy agli stati 'confirmed'/'pending' gli avrebbe permesso di
-- segnarsi da solo payment_status = 'paid': la conferma del pagamento passa
-- soltanto dalla funzione confirm_order_payment qui sotto.

-- --------------------------------------------------------------------
-- 2. RPC ATOMICA: CONFIRM_ORDER_PAYMENT
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
    p_order_id UUID,
    p_payment_method TEXT DEFAULT 'credit_card',
    p_payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_intent TEXT;
BEGIN
    SELECT * INTO v_order
      FROM public.orders
     WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ordine % non trovato', p_order_id;
    END IF;

    -- Solo il proprietario dell'ordine, un admin o il backend. Un utente
    -- anonimo non passa: altrimenti bastava conoscere l'id di un ordine per
    -- segnarlo come pagato. Il ruolo admin si legge con is_admin() e non dai
    -- user_metadata del JWT, che l'utente può modificare da solo.
    -- IS DISTINCT FROM e non NOT IN: con user_id NULL, NOT IN darebbe NULL e
    -- lascerebbe passare chiunque.
    IF NOT public.is_service_role() AND NOT public.is_admin() THEN
        IF auth.uid() IS NULL
           OR (auth.uid() IS DISTINCT FROM v_order.user_id
               AND auth.uid() IS DISTINCT FROM v_order.customer_id) THEN
            RAISE EXCEPTION 'Non autorizzato ad aggiornare questo ordine';
        END IF;
    END IF;

    -- Già pagato: la transizione non si ripete, e con lei le notifiche.
    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'status', v_order.status,
            'payment_status', 'paid',
            'already_paid', true
        );
    END IF;

    v_intent := COALESCE(p_payment_intent_id, 'pi_' || MD5(p_order_id::text || NOW()::text));

    UPDATE public.orders
       SET status = 'confirmed',
           payment_status = 'paid',
           payment_method = COALESCE(p_payment_method, 'credit_card'),
           payment_intent_id = v_intent,
           updated_at = NOW()
     WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', 'confirmed',
        'payment_status', 'paid'
    );
END;
$$;

-- Il pagamento oggi è simulato: la funzione si fida del client. Con un
-- pagamento vero la conferma dovrà arrivare dal webhook del provider.
REVOKE ALL ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 3. SINCRONIZZAZIONE AUTOMATICA VERSO PUBLIC.JOBS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_order_to_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pro_id UUID;
    v_job_status TEXT;
BEGIN
    -- Escludi le bozze: il lavoro viene sincronizzato quando l'ordine è confermato/attivo
    IF NEW.status IS NULL OR NEW.status = 'draft' THEN
        RETURN NEW;
    END IF;

    v_pro_id := COALESCE(NEW.professional_id, NEW.installation_professional_id);
    IF v_pro_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_job_status := CASE 
        WHEN NEW.status = 'completed' THEN 'completed'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        WHEN NEW.status = 'in_progress' THEN 'in_progress'
        ELSE 'assigned'
    END;

    -- Inserisci o aggiorna solo se esiste il profilo professionale corrispondente
    IF EXISTS (SELECT 1 FROM public.professional_profiles WHERE id = v_pro_id) THEN
        IF EXISTS (SELECT 1 FROM public.jobs WHERE order_id = NEW.id) THEN
            UPDATE public.jobs
               SET professional_id = v_pro_id,
                   scheduled_date = COALESCE(NEW.work_start_date, NEW.installation_date, scheduled_date),
                   notes = COALESCE(NEW.notes, notes),
                   status = CASE 
                       WHEN NEW.status = 'completed' THEN 'completed'
                       WHEN NEW.status = 'cancelled' THEN 'cancelled'
                       WHEN NEW.status = 'in_progress' AND status IN ('assigned', 'accepted') THEN 'in_progress'
                       ELSE status
                   END,
                   updated_at = NOW()
             WHERE order_id = NEW.id;
        ELSE
            INSERT INTO public.jobs (
                order_id,
                professional_id,
                status,
                scheduled_date,
                notes,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                v_pro_id,
                v_job_status,
                COALESCE(NEW.work_start_date, NEW.installation_date),
                NEW.notes,
                NOW(),
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_order_to_jobs ON public.orders;
CREATE TRIGGER trigger_sync_order_to_jobs
AFTER INSERT OR UPDATE OF status, professional_id, installation_professional_id, work_start_date, installation_date ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_to_jobs();

-- Sincronizzazione inversa dallo stato di jobs a quello di orders
CREATE OR REPLACE FUNCTION public.sync_job_status_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.order_id IS NOT NULL THEN
        UPDATE public.orders
           SET status = CASE 
               WHEN NEW.status = 'in_progress' THEN 'in_progress'
               WHEN NEW.status = 'completed' THEN 'completed'
               WHEN NEW.status = 'cancelled' THEN 'cancelled'
               ELSE status
           END,
           updated_at = NOW()
         WHERE id = NEW.order_id
           AND status IS DISTINCT FROM (CASE 
               WHEN NEW.status = 'in_progress' THEN 'in_progress'
               WHEN NEW.status = 'completed' THEN 'completed'
               WHEN NEW.status = 'cancelled' THEN 'cancelled'
               ELSE status
           END);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_job_status_to_order ON public.jobs;
CREATE TRIGGER trigger_sync_job_status_to_order
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.sync_job_status_to_order();

-- Backfill jobs per ordini già confermati/attivi
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT o.id, COALESCE(o.professional_id, o.installation_professional_id) AS pro_id,
               o.work_start_date, o.installation_date, o.notes, o.status
        FROM public.orders o
        WHERE o.status <> 'draft'
          AND COALESCE(o.professional_id, o.installation_professional_id) IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.order_id = o.id)
    LOOP
        IF EXISTS (SELECT 1 FROM public.professional_profiles WHERE id = r.pro_id) THEN
            INSERT INTO public.jobs (order_id, professional_id, status, scheduled_date, notes)
            VALUES (
                r.id,
                r.pro_id,
                CASE WHEN r.status = 'completed' THEN 'completed' WHEN r.status = 'cancelled' THEN 'cancelled' ELSE 'assigned' END,
                COALESCE(r.work_start_date, r.installation_date),
                r.notes
            );
        END IF;
    END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 4. SINCRONIZZAZIONE AUTOMATICA TAPPE CANTIERE (ORDER_MILESTONES)
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_order_milestones_on_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pro_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.order_milestones WHERE order_id = NEW.id) THEN
        PERFORM public.seed_order_milestones(NEW.id);
    END IF;

    -- Tappa: Ordine confermato / inviato
    IF NEW.status IS NOT NULL AND NEW.status <> 'draft' THEN
        UPDATE public.order_milestones
           SET status = 'done',
               occurred_at = COALESCE(occurred_at, NEW.created_at, NOW()),
               updated_at = NOW()
         WHERE order_id = NEW.id
           AND step = 'order_placed'
           AND status <> 'done';
    END IF;

    -- Tappa: Pagamento confermato
    IF NEW.payment_status = 'paid' OR NEW.status IN ('confirmed', 'in_progress', 'completed') THEN
        UPDATE public.order_milestones
           SET status = 'done',
               occurred_at = COALESCE(occurred_at, NOW()),
               updated_at = NOW()
         WHERE order_id = NEW.id
           AND step = 'payment_confirmed'
           AND status <> 'done';
    END IF;

    -- Tappa: Professionista confermato / assegnato
    v_pro_id := COALESCE(NEW.professional_id, NEW.installation_professional_id);
    IF v_pro_id IS NOT NULL AND NEW.status IS NOT NULL AND NEW.status <> 'draft' THEN
        UPDATE public.order_milestones
           SET status = 'done',
               occurred_at = COALESCE(occurred_at, NOW()),
               updated_at = NOW()
         WHERE order_id = NEW.id
           AND step = 'professional_confirmed'
           AND status <> 'done';
    END IF;

    -- Tappa: Lavori iniziati
    IF NEW.status = 'in_progress' THEN
        UPDATE public.order_milestones
           SET status = 'done',
               occurred_at = COALESCE(occurred_at, NOW()),
               updated_at = NOW()
         WHERE order_id = NEW.id
           AND step = 'work_started'
           AND status <> 'done';
    END IF;

    -- Tappa: Lavori completati
    IF NEW.status = 'completed' THEN
        UPDATE public.order_milestones
           SET status = 'done',
               occurred_at = COALESCE(occurred_at, NOW()),
               updated_at = NOW()
         WHERE order_id = NEW.id
           AND step = 'work_completed'
           AND status <> 'done';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_order_milestones ON public.orders;
CREATE TRIGGER trigger_sync_order_milestones
AFTER INSERT OR UPDATE OF status, payment_status, professional_id, installation_professional_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_milestones_on_status();

-- Backfill milestones per ordini già confermati/pagati
UPDATE public.order_milestones m
   SET status = 'done',
       occurred_at = COALESCE(m.occurred_at, o.updated_at, NOW()),
       updated_at = NOW()
  FROM public.orders o
 WHERE m.order_id = o.id
   AND m.step = 'payment_confirmed'
   AND m.status <> 'done'
   AND (o.payment_status = 'paid' OR o.status IN ('confirmed', 'in_progress', 'completed'));

-- --------------------------------------------------------------------
-- 5. TRIGGER DI NOTIFICA ORDINI E ASSEGNAZIONE PROFESSIONISTA
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_num TEXT;
    v_total TEXT;
    v_pro_id UUID;
    v_pro_name TEXT := 'un professionista certificato';
BEGIN
    -- Ignora le bozze: le notifiche partiranno alla conferma / pagamento
    IF NEW.status = 'draft' THEN
        RETURN NEW;
    END IF;

    v_order_num := COALESCE(NEW.order_number, SUBSTRING(NEW.id::TEXT, 1, 8));
    v_total := TO_CHAR(COALESCE(NEW.total, 0), 'FM999,990.00');

    -- 1. Notifica agli Admin
    PERFORM public.dispatch_notification(
        NULL,
        'admin',
        'Nuovo Ordine Ricevuto #' || v_order_num,
        'È stato registrato un nuovo ordine per un importo di € ' || v_total || '. Verifica i dettagli operativi.',
        'order_created',
        '/admin/orders',
        jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'email_template', 'order_created.admin')
    );

    -- 2. Notifica di conferma al Cliente (se autenticato)
    IF NEW.customer_id IS NOT NULL THEN
        PERFORM public.dispatch_notification(
            NEW.customer_id,
            'customer',
            'Ordine #' || v_order_num || ' Confermato!',
            'Grazie per il tuo acquisto! Abbiamo ricevuto il tuo ordine di € ' || v_total || ' ed è in elaborazione.',
            'order_created',
            '/dashboard?tab=orders',
            jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'email_template', 'order_created.customer')
        );
    END IF;

    -- 3. Se creato direttamente con professionista assegnato (e non bozza)
    v_pro_id := COALESCE(NEW.professional_id, NEW.installation_professional_id);
    IF v_pro_id IS NOT NULL THEN
        SELECT COALESCE(
                 NULLIF(TRIM(p.company_name), ''),
                 NULLIF(TRIM(p.full_name), ''),
                 NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''),
                 'Professionista Assegnato'
               )
          INTO v_pro_name
          FROM public.professional_profiles p
          LEFT JOIN public.users u ON u.id = p.id
         WHERE p.id = v_pro_id;

        v_pro_name := COALESCE(v_pro_name, 'un professionista certificato');

        PERFORM public.dispatch_notification(
            v_pro_id, 'professional',
            'Nuovo Cantiere Assegnato #' || v_order_num,
            'Ti è stato assegnato un nuovo cantiere di posa per l''ordine #' || v_order_num || '. Controlla date e scheda tecnica.',
            'job_assigned', '/pro/jobs/' || NEW.id,
            jsonb_build_object('order_id', NEW.id, 'email_template', 'job_assigned.professional')
        );

        IF NEW.customer_id IS NOT NULL THEN
            PERFORM public.dispatch_notification(
                NEW.customer_id, 'customer',
                'Posatore Assegnato al tuo Cantiere',
                'Il posatore ' || v_pro_name || ' è stato assegnato al tuo ordine #' || v_order_num || '.',
                'pro_assigned', '/dashboard?tab=orders',
                jsonb_build_object('order_id', NEW.id, 'pro_id', v_pro_id)
            );
        END IF;

        PERFORM public.dispatch_notification(
            NULL, 'admin',
            'Cantiere Assegnato #' || v_order_num,
            'L''ordine #' || v_order_num || ' è stato assegnato a ' || v_pro_name || '.',
            'job_assigned', '/admin/orders',
            jsonb_build_object('order_id', NEW.id, 'pro_id', v_pro_id, 'email_template', 'job_assigned.admin')
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_order_created ON public.orders;
CREATE TRIGGER trigger_notify_order_created
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_created();

CREATE OR REPLACE FUNCTION public.notify_on_order_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_num TEXT;
    v_pro_name TEXT := 'un professionista certificato';
    v_total TEXT;
    v_pro_id UUID;
    v_old_pro_id UUID;
    v_is_first_activation BOOLEAN := FALSE;
    v_pro_changed BOOLEAN := FALSE;
BEGIN
    v_order_num := COALESCE(NEW.order_number, SUBSTRING(NEW.id::TEXT, 1, 8));
    v_total := TO_CHAR(COALESCE(NEW.total, 0), 'FM999,990.00');

    v_pro_id := COALESCE(NEW.professional_id, NEW.installation_professional_id);
    v_old_pro_id := COALESCE(OLD.professional_id, OLD.installation_professional_id);

    -- Transizione da bozza a ordine confermato/attivo
    IF OLD.status = 'draft' AND NEW.status IS NOT NULL AND NEW.status <> 'draft' THEN
        v_is_first_activation := TRUE;

        -- Notifica creazione ordine ad admin e cliente se non già inviata
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE target_role = 'admin' AND type = 'order_created' AND (metadata->>'order_id')::text = NEW.id::text
        ) THEN
            PERFORM public.dispatch_notification(
                NULL, 'admin',
                'Nuovo Ordine Ricevuto #' || v_order_num,
                'È stato registrato un nuovo ordine per un importo di € ' || v_total || '. Verifica i dettagli operativi.',
                'order_created', '/admin/orders',
                jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'email_template', 'order_created.admin')
            );
        END IF;

        IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = NEW.customer_id AND type = 'order_created' AND (metadata->>'order_id')::text = NEW.id::text
        ) THEN
            PERFORM public.dispatch_notification(
                NEW.customer_id, 'customer',
                'Ordine #' || v_order_num || ' Confermato!',
                'Grazie per il tuo acquisto! Abbiamo ricevuto il tuo ordine di € ' || v_total || ' ed è in elaborazione.',
                'order_created', '/dashboard?tab=orders',
                jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'email_template', 'order_created.customer')
            );
        END IF;
    END IF;

    -- Assegnazione professionista:
    -- Scatta se l'ordine è confermato/attivo e:
    -- a) L'ordine era draft ed è appena stato confermato con pro (v_is_first_activation AND v_pro_id IS NOT NULL)
    -- b) Oppure il pro è stato assegnato/modificato su un ordine attivo (v_old_pro_id IS DISTINCT FROM v_pro_id AND v_pro_id IS NOT NULL)
    IF NEW.status IS NOT NULL AND NEW.status <> 'draft' AND v_pro_id IS NOT NULL THEN
        IF v_is_first_activation OR (v_old_pro_id IS DISTINCT FROM v_pro_id) THEN
            v_pro_changed := TRUE;
        END IF;

        IF v_pro_changed AND NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE user_id = v_pro_id AND type = 'job_assigned' AND (metadata->>'order_id')::text = NEW.id::text
        ) THEN
            SELECT COALESCE(
                     NULLIF(TRIM(p.company_name), ''),
                     NULLIF(TRIM(p.full_name), ''),
                     NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''),
                     'Professionista Assegnato'
                   )
              INTO v_pro_name
              FROM public.professional_profiles p
              LEFT JOIN public.users u ON u.id = p.id
             WHERE p.id = v_pro_id;

            v_pro_name := COALESCE(v_pro_name, 'un professionista certificato');

            PERFORM public.dispatch_notification(
                v_pro_id, 'professional',
                'Nuovo Cantiere Assegnato #' || v_order_num,
                'Ti è stato assegnato un nuovo cantiere di posa per l''ordine #' || v_order_num || '. Controlla date e scheda tecnica.',
                'job_assigned', '/pro/jobs/' || NEW.id,
                jsonb_build_object('order_id', NEW.id, 'email_template', 'job_assigned.professional')
            );

            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.customer_id, 'customer',
                    'Posatore Assegnato al tuo Cantiere',
                    'Il posatore ' || v_pro_name || ' è stato assegnato al tuo ordine #' || v_order_num || '.',
                    'pro_assigned', '/dashboard?tab=orders',
                    jsonb_build_object('order_id', NEW.id, 'pro_id', v_pro_id)
                );
            END IF;

            PERFORM public.dispatch_notification(
                NULL, 'admin',
                'Cantiere Assegnato #' || v_order_num,
                'L''ordine #' || v_order_num || ' è stato assegnato a ' || v_pro_name || '.',
                'job_assigned', '/admin/orders',
                jsonb_build_object('order_id', NEW.id, 'pro_id', v_pro_id, 'email_template', 'job_assigned.admin')
            );
        END IF;
    END IF;

    -- Aggiornamenti stato cantiere
    IF NEW.status IS NOT NULL AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
        IF NEW.status = 'in_progress' THEN
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.customer_id, 'customer', 'Cantiere Avviato #' || v_order_num,
                    'I lavori di posa per il tuo ordine #' || v_order_num || ' sono ufficialmente iniziati.',
                    'status_changed', '/dashboard?tab=orders',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
            END IF;
            PERFORM public.dispatch_notification(
                NULL, 'admin', 'Cantiere Avviato #' || v_order_num,
                'Il posatore ha avviato le lavorazioni per l''ordine #' || v_order_num || '.',
                'status_changed', '/admin/orders',
                jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
        ELSIF NEW.status = 'completed' THEN
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.customer_id, 'customer', 'Posa Completata con Successo! #' || v_order_num,
                    'I lavori di posa per l''ordine #' || v_order_num || ' sono terminati. Verifica il risultato e lascia la tua recensione.',
                    'status_changed', '/dashboard?tab=orders',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
            END IF;
            PERFORM public.dispatch_notification(
                NULL, 'admin', 'Cantiere Completato #' || v_order_num,
                'Il cantiere per l''ordine #' || v_order_num || ' è stato completato dal posatore.',
                'status_changed', '/admin/orders',
                jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
        ELSIF NEW.status = 'cancelled' THEN
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.customer_id, 'customer', 'Ordine Annullato #' || v_order_num,
                    'Il tuo ordine #' || v_order_num || ' è stato annullato.',
                    'status_changed', '/dashboard?tab=orders',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
            END IF;
            IF v_pro_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    v_pro_id, 'professional', 'Cantiere Annullato #' || v_order_num,
                    'L''incarico di posa per l''ordine #' || v_order_num || ' è stato annullato.',
                    'status_changed', '/pro/jobs',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_order_updated ON public.orders;
CREATE TRIGGER trigger_notify_order_updated
AFTER UPDATE OF status, professional_id, installation_professional_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_updated();
