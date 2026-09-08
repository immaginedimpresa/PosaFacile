-- ====================================================================
-- SISTEMA NOTIFICHE MULTIRUOLO & PREFERENZE CANALI (PIATTAFORMA + EMAIL)
-- ====================================================================

-- 1. TABELLA NOTIFICHE IN-APP
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role VARCHAR(20) DEFAULT 'customer' CHECK (target_role IN ('admin', 'professional', 'customer', 'all')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- order_created, job_assigned, status_changed, message_received, info_pending, pro_approved, pro_registered, low_stock
    link TEXT, -- URL per click-through (es. /admin/orders, /pro/jobs/..., /dashboard?tab=orders)
    read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,
    channel VARCHAR(20) DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indici per query ad alte prestazioni
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role, read, created_at DESC);

-- 2. TABELLA PREFERENZE CANALI (Piattaforma vs Email)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'professional', 'customer')),
    platform_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_pref_role ON public.notification_preferences(role);

-- 3. ABILITAZIONE REALTIME
-- Aggiungiamo notifications alla publication di Supabase Realtime per websocket push
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Pulizia vecchie policy se presenti
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;

DROP POLICY IF EXISTS "preferences_select_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "preferences_modify_policy" ON public.notification_preferences;

-- Policy per NOTIFICATIONS
-- A) SELECT: Ogni utente legge le proprie, oppure gli admin leggono le notifiche destinate ad 'admin'
CREATE POLICY "notifications_select_policy" ON public.notifications
FOR SELECT USING (
    auth.uid() = user_id 
    OR (target_role = 'admin' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    OR target_role = 'all'
);

-- B) UPDATE: L'utente può contrassegnare come letta la propria notifica (o un admin quelle admin)
CREATE POLICY "notifications_update_policy" ON public.notifications
FOR UPDATE USING (
    auth.uid() = user_id 
    OR (target_role = 'admin' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
)
WITH CHECK (
    auth.uid() = user_id 
    OR (target_role = 'admin' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
);

-- C) DELETE: L'utente può rimuovere le proprie notifiche
CREATE POLICY "notifications_delete_policy" ON public.notifications
FOR DELETE USING (
    auth.uid() = user_id 
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
);

-- D) INSERT: Ammessi utenti autenticati e funzioni di sistema
CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Policy per PREFERENCES
CREATE POLICY "preferences_select_policy" ON public.notification_preferences
FOR SELECT USING (
    user_id IS NULL 
    OR auth.uid() = user_id 
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
);

CREATE POLICY "preferences_modify_policy" ON public.notification_preferences
FOR ALL USING (
    auth.uid() = user_id 
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
)
WITH CHECK (
    auth.uid() = user_id 
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
);

-- 5. FUNZIONE DISPATCHER CENTRALE (Verifica preferenze e inserisce notifica)
CREATE OR REPLACE FUNCTION public.dispatch_notification(
    p_user_id UUID,
    p_target_role VARCHAR(20),
    p_title TEXT,
    p_message TEXT,
    p_type VARCHAR(50),
    p_link TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_platform_enabled BOOLEAN := TRUE;
    v_email_enabled BOOLEAN := TRUE;
    v_notification_id UUID := NULL;
    v_pref RECORD;
BEGIN
    -- Se è specificato un user_id, controlliamo se l'utente ha personalizzato le preferenze
    IF p_user_id IS NOT NULL THEN
        SELECT platform_enabled, email_enabled 
        INTO v_pref 
        FROM public.notification_preferences 
        WHERE user_id = p_user_id AND event_type = p_type;

        IF FOUND THEN
            v_platform_enabled := v_pref.platform_enabled;
            v_email_enabled := v_pref.email_enabled;
        END IF;
    END IF;

    -- Se abilitata su piattaforma, creiamo il record che fa trigger su Realtime
    IF v_platform_enabled THEN
        INSERT INTO public.notifications (
            user_id,
            target_role,
            title,
            message,
            type,
            link,
            channel,
            metadata
        ) VALUES (
            p_user_id,
            p_target_role,
            p_title,
            p_message,
            p_type,
            p_link,
            CASE WHEN v_email_enabled THEN 'both' ELSE 'in_app' END,
            p_metadata
        )
        RETURNING id INTO v_notification_id;
    END IF;

    -- Nota per il canale email: se v_email_enabled è TRUE, il record indica channel = 'both' o 'email'
    -- consentendo a un eventuale cron o Edge Function di prelevare l'evento e inviare l'email effettiva.

    RETURN v_notification_id;
END;
$$;

-- 6. RPC: SEGNA TUTTE LE NOTIFICHE COME LETTE
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(p_target_role VARCHAR DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET read = TRUE, read_at = NOW()
    WHERE read = FALSE
      AND (
          user_id = auth.uid()
          OR (p_target_role = 'admin' AND target_role = 'admin' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
      );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- 7. TRIGGER AUTOMATICI LATO DATABASE

-- A) Trigger su creazione nuovo ordine
CREATE OR REPLACE FUNCTION public.notify_on_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_num TEXT;
    v_total TEXT;
BEGIN
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
        jsonb_build_object('order_id', NEW.id, 'total', NEW.total)
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
            jsonb_build_object('order_id', NEW.id, 'total', NEW.total)
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

-- B) Trigger su assegnazione professionista o cambio stato ordine
CREATE OR REPLACE FUNCTION public.notify_on_order_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_num TEXT;
    v_pro_name TEXT := 'un professionista certificato';
BEGIN
    v_order_num := COALESCE(NEW.order_number, SUBSTRING(NEW.id::TEXT, 1, 8));

    -- B1) Assegnazione o cambio professionista
    IF NEW.professional_id IS NOT NULL AND (OLD.professional_id IS NULL OR OLD.professional_id <> NEW.professional_id) THEN
        -- Recupera nome professionista se disponibile
        SELECT COALESCE(company_name, first_name || ' ' || last_name, 'Professionista Assegnato')
        INTO v_pro_name
        FROM public.users
        WHERE id = NEW.professional_id;

        -- Notifica al Professionista Assegnato
        PERFORM public.dispatch_notification(
            NEW.professional_id,
            'professional',
            'Nuovo Cantiere Assegnato #' || v_order_num,
            'Ti è stato assegnato un nuovo cantiere di posa per l''ordine #' || v_order_num || '. Controlla date e scheda tecnica.',
            'job_assigned',
            '/pro/jobs/' || NEW.id,
            jsonb_build_object('order_id', NEW.id)
        );

        -- Notifica al Cliente
        IF NEW.customer_id IS NOT NULL THEN
            PERFORM public.dispatch_notification(
                NEW.customer_id,
                'customer',
                'Posatore Assegnato al tuo Cantiere',
                'Il posatore ' || v_pro_name || ' è stato assegnato al tuo ordine #' || v_order_num || '.',
                'pro_assigned',
                '/dashboard?tab=orders',
                jsonb_build_object('order_id', NEW.id, 'pro_id', NEW.professional_id)
            );
        END IF;

        -- Notifica all'Admin
        PERFORM public.dispatch_notification(
            NULL,
            'admin',
            'Cantiere Assegnato #' || v_order_num,
            'L''ordine #' || v_order_num || ' è stato assegnato a ' || v_pro_name || '.',
            'job_assigned',
            '/admin/orders',
            jsonb_build_object('order_id', NEW.id, 'pro_id', NEW.professional_id)
        );
    END IF;

    -- B2) Cambio Stato Operativo dell'Ordine
    IF NEW.status IS NOT NULL AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
        IF NEW.status = 'in_progress' THEN
            -- Inizio Lavori
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.customer_id,
                    'customer',
                    'Cantiere Avviato #' || v_order_num,
                    'I lavori di posa per il tuo ordine #' || v_order_num || ' sono ufficialmente iniziati.',
                    'status_changed',
                    '/dashboard?tab=orders',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
                );
            END IF;
            PERFORM public.dispatch_notification(
                NULL,
                'admin',
                'Cantiere Avviato #' || v_order_num,
                'Il posatore ha avviato le lavorazioni per l''ordine #' || v_order_num || '.',
                'status_changed',
                '/admin/orders',
                jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
            );
        ELSIF NEW.status = 'completed' THEN
            -- Cantiere Completato
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.customer_id,
                    'customer',
                    'Posa Completata con Successo! #' || v_order_num,
                    'I lavori di posa per l''ordine #' || v_order_num || ' sono terminati. Verifica il risultato e lascia la tua recensione.',
                    'status_changed',
                    '/dashboard?tab=orders',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
                );
            END IF;
            PERFORM public.dispatch_notification(
                NULL,
                'admin',
                'Cantiere Completato #' || v_order_num,
                'Il cantiere per l''ordine #' || v_order_num || ' è stato completato dal posatore.',
                'status_changed',
                '/admin/orders',
                jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
            );
        ELSIF NEW.status = 'cancelled' THEN
            -- Ordine Annullato
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.customer_id,
                    'customer',
                    'Ordine Annullato #' || v_order_num,
                    'Il tuo ordine #' || v_order_num || ' è stato annullato.',
                    'status_changed',
                    '/dashboard?tab=orders',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
                );
            END IF;
            IF NEW.professional_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.professional_id,
                    'professional',
                    'Cantiere Annullato #' || v_order_num,
                    'L''incarico di posa per l''ordine #' || v_order_num || ' è stato annullato.',
                    'status_changed',
                    '/pro/jobs',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_order_updated ON public.orders;
CREATE TRIGGER trigger_notify_order_updated
AFTER UPDATE OF status, professional_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_updated();

-- C) Trigger su nuovo messaggio chat cantiere
CREATE OR REPLACE FUNCTION public.notify_on_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job RECORD;
    v_sender_name TEXT := 'Un utente';
BEGIN
    -- Trova il job e l'ordine associato
    SELECT j.id, j.order_id, j.professional_id, o.customer_id, o.order_number
    INTO v_job
    FROM public.jobs j
    JOIN public.orders o ON o.id = j.order_id
    WHERE j.id = NEW.job_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Trova nome mittente
    SELECT COALESCE(first_name || ' ' || last_name, email)
    INTO v_sender_name
    FROM public.users
    WHERE id = NEW.sender_id;

    -- Se il mittente è il posatore, notifica il cliente
    IF NEW.sender_id = v_job.professional_id AND v_job.customer_id IS NOT NULL THEN
        PERFORM public.dispatch_notification(
            v_job.customer_id,
            'customer',
            'Nuovo messaggio da ' || v_sender_name,
            SUBSTRING(NEW.content FROM 1 FOR 120),
            'message_received',
            '/dashboard?tab=orders',
            jsonb_build_object('job_id', NEW.job_id, 'order_id', v_job.order_id)
        );
    -- Se il mittente è il cliente o admin, notifica il posatore
    ELSIF NEW.sender_id <> v_job.professional_id AND v_job.professional_id IS NOT NULL THEN
        PERFORM public.dispatch_notification(
            v_job.professional_id,
            'professional',
            'Nuovo messaggio da ' || v_sender_name,
            SUBSTRING(NEW.content FROM 1 FOR 120),
            'message_received',
            '/pro/jobs/' || v_job.id,
            jsonb_build_object('job_id', NEW.job_id, 'order_id', v_job.order_id)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_message_created ON public.messages;
CREATE TRIGGER trigger_notify_message_created
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_message_created();

-- D) Inserimento preferenze predefinite per ciascun evento
INSERT INTO public.notification_preferences (user_id, event_type, role, platform_enabled, email_enabled)
VALUES
    (NULL, 'order_created', 'admin', TRUE, TRUE),
    (NULL, 'job_assigned', 'admin', TRUE, TRUE),
    (NULL, 'status_changed', 'admin', TRUE, TRUE),
    (NULL, 'message_received', 'admin', TRUE, TRUE),
    (NULL, 'pro_registered', 'admin', TRUE, TRUE),
    (NULL, 'low_stock', 'admin', TRUE, TRUE),
    (NULL, 'job_assigned', 'professional', TRUE, TRUE),
    (NULL, 'status_changed', 'professional', TRUE, TRUE),
    (NULL, 'message_received', 'professional', TRUE, TRUE),
    (NULL, 'pro_approved', 'professional', TRUE, TRUE),
    (NULL, 'order_created', 'customer', TRUE, TRUE),
    (NULL, 'pro_assigned', 'customer', TRUE, TRUE),
    (NULL, 'status_changed', 'customer', TRUE, TRUE),
    (NULL, 'message_received', 'customer', TRUE, TRUE),
    (NULL, 'room_prep_reminder', 'customer', TRUE, TRUE)
ON CONFLICT (user_id, event_type) DO NOTHING;
