-- ====================================================================
-- NOTIFICHE: TIMELINE ORDINE, PREFERENZE PER RUOLO E CODA EMAIL
-- ====================================================================
--
-- Tre problemi del sistema notifiche esistente:
--
-- 1. Le preferenze di default (user_id NULL) non venivano mai lette: il
--    dispatcher cercava solo la preferenza personale dell'utente. Erano righe
--    morte. E il vincolo UNIQUE(user_id, event_type) non le protegge, perché
--    in Postgres NULL non è uguale a NULL: rieseguire la migrazione le
--    avrebbe duplicate.
--
-- 2. Tutta la timeline dell'ordine era muta. Materiale spedito, materiale
--    ricevuto, "prepara la stanza", richiesta di informazioni: nessuno di
--    questi passaggi avvisava nessuno, pur essendo i momenti in cui il cliente
--    si aspetta di sapere qualcosa.
--
-- 3. Il canale email non esisteva: il dispatcher scriveva channel='both' e si
--    fermava lì. Ora ogni notifica con email abilitata finisce in una coda che
--    una Edge Function svuota via Resend.

-- ====================================================================
-- 1. CODA EMAIL
-- ====================================================================

-- L'invio non avviene dentro al trigger: una transazione di ordine non deve
-- dipendere dalla raggiungibilità di un servizio esterno. Il trigger accoda,
-- una Edge Function svuota la coda e registra l'esito.
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    to_email TEXT NOT NULL,
    to_name TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    event_type VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    -- Id restituito dal provider: serve a ritrovare l'invio nei suoi log.
    provider_message_id TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_pending
  ON public.email_outbox (created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- La coda contiene indirizzi email: la legge solo l'admin. La Edge Function
-- usa la service role e non passa da RLS.
DROP POLICY IF EXISTS "email_outbox_admin_only" ON public.email_outbox;
CREATE POLICY "email_outbox_admin_only"
  ON public.email_outbox FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_email_outbox()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_touch_email_outbox ON public.email_outbox;
CREATE TRIGGER trigger_touch_email_outbox
BEFORE UPDATE ON public.email_outbox
FOR EACH ROW EXECUTE FUNCTION public.touch_email_outbox();

-- ====================================================================
-- 2. PREFERENZE: DEFAULT PER RUOLO USATI DAVVERO
-- ====================================================================

-- Il vincolo originale UNIQUE(user_id, event_type) tratta i NULL come uguali:
-- il risultato era una sola riga di default per evento, con il ruolo deciso
-- dall'ordine di inserimento. Le preferenze per ruolo erano impossibili.
ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS uq_notif_pref_user_event;

-- Preferenza personale: una per utente ed evento.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_pref_user_event
  ON public.notification_preferences (user_id, event_type)
  WHERE user_id IS NOT NULL;

-- Rimuove eventuali duplicati fra i default globali, tenendo il più recente.
DELETE FROM public.notification_preferences a
USING public.notification_preferences b
WHERE a.user_id IS NULL
  AND b.user_id IS NULL
  AND a.event_type = b.event_type
  AND a.role = b.role
  AND a.ctid < b.ctid;

-- UNIQUE(user_id, event_type) non copre le righe con user_id NULL: serve un
-- indice parziale, altrimenti i default si moltiplicano a ogni deploy.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_pref_global_default
  ON public.notification_preferences (event_type, role)
  WHERE user_id IS NULL;

-- Il dispatcher ora consulta, in ordine: preferenza personale dell'utente →
-- default del suo ruolo → tutto abilitato.
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
    v_email TEXT;
    v_name TEXT;
BEGIN
    IF p_user_id IS NOT NULL THEN
        -- Preferenza personale dell'utente.
        SELECT platform_enabled, email_enabled INTO v_pref
        FROM public.notification_preferences
        WHERE user_id = p_user_id AND event_type = p_type;

        -- Altrimenti il default del ruolo di destinazione.
        IF NOT FOUND THEN
            SELECT platform_enabled, email_enabled INTO v_pref
            FROM public.notification_preferences
            WHERE user_id IS NULL AND event_type = p_type AND role = p_target_role;
        END IF;
    ELSE
        -- Notifica di ruolo (tipicamente agli admin): vale il default.
        SELECT platform_enabled, email_enabled INTO v_pref
        FROM public.notification_preferences
        WHERE user_id IS NULL AND event_type = p_type AND role = p_target_role;
    END IF;

    IF FOUND THEN
        v_platform_enabled := v_pref.platform_enabled;
        v_email_enabled := v_pref.email_enabled;
    END IF;

    IF v_platform_enabled THEN
        INSERT INTO public.notifications (
            user_id, target_role, title, message, type, link, channel, metadata
        ) VALUES (
            p_user_id, p_target_role, p_title, p_message, p_type, p_link,
            CASE WHEN v_email_enabled THEN 'both' ELSE 'in_app' END,
            p_metadata
        )
        RETURNING id INTO v_notification_id;
    END IF;

    -- Accodamento email: destinatario singolo, oppure tutti gli admin quando
    -- la notifica è indirizzata al ruolo e non a una persona.
    IF v_email_enabled THEN
        IF p_user_id IS NOT NULL THEN
            SELECT email, COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email)
              INTO v_email, v_name
              FROM public.users WHERE id = p_user_id;

            IF v_email IS NOT NULL THEN
                INSERT INTO public.email_outbox (
                    notification_id, user_id, to_email, to_name, subject, body, link, event_type, metadata
                ) VALUES (
                    v_notification_id, p_user_id, v_email, v_name, p_title, p_message, p_link, p_type, p_metadata
                );
            END IF;
        ELSIF p_target_role = 'admin' THEN
            INSERT INTO public.email_outbox (
                notification_id, user_id, to_email, to_name, subject, body, link, event_type, metadata
            )
            SELECT
                v_notification_id, u.id, u.email,
                COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.email),
                p_title, p_message, p_link, p_type, p_metadata
            FROM public.users u
            WHERE u.role = 'admin' AND u.email IS NOT NULL;
        END IF;
    END IF;

    RETURN v_notification_id;
END;
$$;

-- ====================================================================
-- 3. NOTIFICHE SULLE TAPPE DELL'ORDINE
-- ====================================================================

CREATE OR REPLACE FUNCTION public.notify_on_milestone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_num TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Solo i passaggi che cambiano qualcosa per chi riceve la notifica.
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    IF NEW.status NOT IN ('done', 'blocked') THEN
        RETURN NEW;
    END IF;

    SELECT o.id, o.order_number, o.customer_id, o.professional_id, o.work_start_date
      INTO v_order
      FROM public.orders o WHERE o.id = NEW.order_id;

    IF NOT FOUND OR v_order.customer_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_num := COALESCE(v_order.order_number, SUBSTRING(v_order.id::TEXT, 1, 8));

    -- Una tappa bloccata è sempre una richiesta al cliente.
    IF NEW.status = 'blocked' THEN
        IF NEW.step = 'info_pending' THEN
            PERFORM public.dispatch_notification(
                v_order.customer_id, 'customer',
                'Servono alcune informazioni · Ordine #' || v_num,
                COALESCE(NEW.note, 'Per procedere con il tuo ordine abbiamo bisogno di alcune informazioni.'),
                'info_pending',
                '/dashboard/orders/' || v_order.id,
                jsonb_build_object('order_id', v_order.id, 'step', NEW.step)
            );
        END IF;
        RETURN NEW;
    END IF;

    -- Tappe chiuse: testo specifico per quelle che il cliente aspetta.
    CASE NEW.step
        WHEN 'material_check' THEN
            v_title := 'Materiale confermato · Ordine #' || v_num;
            v_message := 'Le piastrelle e i materiali di posa sono disponibili e riservati per il tuo cantiere.';
        WHEN 'green_light' THEN
            v_title := 'Tutto pronto per partire · Ordine #' || v_num;
            v_message := 'Le verifiche sono concluse: stiamo fissando la data di inizio con il posatore.';
        WHEN 'date_confirmed' THEN
            v_title := 'Data dei lavori confermata · Ordine #' || v_num;
            v_message := COALESCE(NEW.note, 'La data di inizio dei lavori è stata confermata.');
        WHEN 'material_shipped' THEN
            v_title := 'Materiale spedito · Ordine #' || v_num;
            v_message := 'Il materiale è partito dal magazzino verso l''indirizzo di posa.';
        WHEN 'material_delivered' THEN
            v_title := 'Materiale consegnato · Ordine #' || v_num;
            v_message := 'Il materiale è arrivato in cantiere ed è stato verificato.';
        WHEN 'room_prep_notice' THEN
            v_title := 'Prepara la stanza · Ordine #' || v_num;
            v_message := COALESCE(
                NEW.note,
                'I lavori stanno per iniziare: libera l''ambiente da mobili e oggetti prima dell''arrivo della squadra.'
            );
        WHEN 'info_pending' THEN
            v_title := 'Informazioni ricevute · Ordine #' || v_num;
            v_message := 'Grazie: abbiamo tutto quello che serve e il tuo ordine riparte.';
        ELSE
            -- Le altre tappe sono già coperte dai trigger su orders.status.
            RETURN NEW;
    END CASE;

    PERFORM public.dispatch_notification(
        v_order.customer_id, 'customer', v_title, v_message,
        CASE WHEN NEW.step = 'room_prep_notice' THEN 'room_prep_reminder' ELSE 'status_changed' END,
        '/dashboard/orders/' || v_order.id,
        jsonb_build_object('order_id', v_order.id, 'step', NEW.step)
    );

    -- Il posatore deve sapere quando il materiale è in cantiere: è la
    -- condizione che gli permette di iniziare.
    IF NEW.step = 'material_delivered' AND v_order.professional_id IS NOT NULL THEN
        PERFORM public.dispatch_notification(
            v_order.professional_id, 'professional',
            'Materiale in cantiere · Ordine #' || v_num,
            'Il materiale è stato consegnato: il cantiere è pronto per l''avvio.',
            'status_changed',
            '/pro/jobs',
            jsonb_build_object('order_id', v_order.id, 'step', NEW.step)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_milestone_change ON public.order_milestones;
CREATE TRIGGER trigger_notify_milestone_change
AFTER INSERT OR UPDATE OF status ON public.order_milestones
FOR EACH ROW EXECUTE FUNCTION public.notify_on_milestone_change();

-- ====================================================================
-- 4. NOTIFICA QUANDO IL POSATORE CORREGGE LE GIORNATE
-- ====================================================================

-- Se il posatore passa da 6 a 9 giornate, l'ufficio deve saperlo prima di
-- fissare la data con il cliente: è il momento in cui la stima smette di
-- valere.
CREATE OR REPLACE FUNCTION public.notify_on_duration_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_num TEXT;
    v_stima NUMERIC;
    v_scostamento NUMERIC;
BEGIN
    IF NEW.confirmed_work_days IS NULL THEN
        RETURN NEW;
    END IF;
    IF OLD.confirmed_work_days IS NOT DISTINCT FROM NEW.confirmed_work_days THEN
        RETURN NEW;
    END IF;

    v_num := COALESCE(NEW.order_number, SUBSTRING(NEW.id::TEXT, 1, 8));
    v_stima := COALESCE(NEW.estimated_work_days, 0);
    v_scostamento := NEW.confirmed_work_days - v_stima;

    PERFORM public.dispatch_notification(
        NULL, 'admin',
        CASE
            WHEN ABS(v_scostamento) < 0.5 THEN 'Durata confermata dal posatore · Ordine #' || v_num
            ELSE 'Durata corretta dal posatore · Ordine #' || v_num
        END,
        'Il posatore indica ' || TRIM(TO_CHAR(NEW.confirmed_work_days, 'FM990.9')) ||
        ' giornate di cantiere' ||
        CASE
            WHEN v_stima > 0 AND ABS(v_scostamento) >= 0.5
                THEN ' (stima di preventivo: ' || TRIM(TO_CHAR(v_stima, 'FM990.9')) || '). '
            ELSE '. '
        END ||
        COALESCE('Nota: ' || NEW.duration_pro_note, 'Nessuna nota.'),
        'duration_confirmed',
        '/admin/orders',
        jsonb_build_object(
            'order_id', NEW.id,
            'confirmed_work_days', NEW.confirmed_work_days,
            'estimated_work_days', NEW.estimated_work_days
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_duration_confirmed ON public.orders;
CREATE TRIGGER trigger_notify_duration_confirmed
AFTER UPDATE OF confirmed_work_days ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_duration_confirmed();

-- ====================================================================
-- 5. DEFAULT PER I NUOVI EVENTI
-- ====================================================================

INSERT INTO public.notification_preferences (user_id, event_type, role, platform_enabled, email_enabled)
VALUES
    (NULL, 'order_created', 'admin', TRUE, TRUE),
    (NULL, 'job_assigned', 'admin', TRUE, TRUE),
    (NULL, 'status_changed', 'admin', TRUE, FALSE),
    (NULL, 'message_received', 'admin', TRUE, FALSE),
    (NULL, 'pro_registered', 'admin', TRUE, TRUE),
    (NULL, 'low_stock', 'admin', TRUE, TRUE),
    (NULL, 'duration_confirmed', 'admin', TRUE, TRUE),
    (NULL, 'info_pending', 'admin', TRUE, FALSE),
    (NULL, 'job_assigned', 'professional', TRUE, TRUE),
    (NULL, 'status_changed', 'professional', TRUE, TRUE),
    (NULL, 'message_received', 'professional', TRUE, FALSE),
    (NULL, 'pro_approved', 'professional', TRUE, TRUE),
    (NULL, 'order_created', 'customer', TRUE, TRUE),
    (NULL, 'pro_assigned', 'customer', TRUE, TRUE),
    (NULL, 'status_changed', 'customer', TRUE, TRUE),
    (NULL, 'message_received', 'customer', TRUE, FALSE),
    (NULL, 'info_pending', 'customer', TRUE, TRUE),
    (NULL, 'room_prep_reminder', 'customer', TRUE, TRUE)
ON CONFLICT (event_type, role) WHERE user_id IS NULL DO NOTHING;
