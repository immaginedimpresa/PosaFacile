-- ====================================================================
-- EMAIL: CONTESTO PER I TEMPLATE E INSTRADAMENTO
-- ====================================================================
--
-- La coda `email_outbox` nasceva con un solo template: titolo, paragrafo,
-- bottone. Il `metadata` c'era ma nessuno lo leggeva, quindi ogni email
-- diceva "Ordine #1234 confermato" senza mai dire cosa fosse stato ordinato.
--
-- Qui si aggiunge quello che serve per avere un template per evento:
--
--  * `to_role` sulla riga di coda, perché lo stesso evento va scritto in modo
--    diverso al cliente, al posatore e all'ufficio;
--  * `get_email_order_context()`, che raccoglie in un colpo solo i dati
--    dell'ordine (prodotto, metri, indirizzo, posatore, date, importi) che i
--    template mostrano. La Edge Function la chiama al momento dell'invio: così
--    l'email riporta lo stato di adesso, non quello di quando fu accodata.

-- ====================================================================
-- 1. DESTINATARIO: RUOLO E TEMPLATE
-- ====================================================================

ALTER TABLE public.email_outbox
  ADD COLUMN IF NOT EXISTS to_role VARCHAR(20),
  -- Forzatura esplicita del template. Serve agli eventi che condividono
  -- l'event_type ma non il testo (es. 'status_changed'); di norma resta NULL e
  -- il template si deduce da event_type + to_role.
  ADD COLUMN IF NOT EXISTS template VARCHAR(80);

-- ====================================================================
-- 2. DISPATCHER: SCRIVE IL RUOLO NELLA CODA
-- ====================================================================

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
    v_template TEXT;
BEGIN
    IF p_user_id IS NOT NULL THEN
        SELECT platform_enabled, email_enabled INTO v_pref
        FROM public.notification_preferences
        WHERE user_id = p_user_id AND event_type = p_type;

        IF NOT FOUND THEN
            SELECT platform_enabled, email_enabled INTO v_pref
            FROM public.notification_preferences
            WHERE user_id IS NULL AND event_type = p_type AND role = p_target_role;
        END IF;
    ELSE
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

    -- Il trigger può imporre il template quando l'event_type da solo non basta
    -- a distinguere il testo.
    v_template := NULLIF(p_metadata->>'email_template', '');

    IF v_email_enabled THEN
        IF p_user_id IS NOT NULL THEN
            SELECT email, COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email)
              INTO v_email, v_name
              FROM public.users WHERE id = p_user_id;

            IF v_email IS NOT NULL THEN
                INSERT INTO public.email_outbox (
                    notification_id, user_id, to_email, to_name, to_role,
                    subject, body, link, event_type, template, metadata
                ) VALUES (
                    v_notification_id, p_user_id, v_email, v_name, p_target_role,
                    p_title, p_message, p_link, p_type, v_template, p_metadata
                );
            END IF;
        ELSIF p_target_role = 'admin' THEN
            INSERT INTO public.email_outbox (
                notification_id, user_id, to_email, to_name, to_role,
                subject, body, link, event_type, template, metadata
            )
            SELECT
                v_notification_id, u.id, u.email,
                COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.email),
                'admin', p_title, p_message, p_link, p_type, v_template, p_metadata
            FROM public.users u
            WHERE u.role = 'admin' AND u.email IS NOT NULL;
        END IF;
    END IF;

    RETURN v_notification_id;
END;
$$;

-- Le righe già in coda non hanno il ruolo: si deduce da quello dell'utente.
UPDATE public.email_outbox o
SET to_role = u.role
FROM public.users u
WHERE o.user_id = u.id AND o.to_role IS NULL;

-- ====================================================================
-- 3. CONTESTO ORDINE PER I TEMPLATE
-- ====================================================================

-- Un solo giro di query invece di sei chiamate REST dalla Edge Function.
-- SECURITY DEFINER perché legge users e professional_profiles: la chiama solo
-- la service role, che non passa comunque da RLS, ma la funzione resta
-- inaccessibile agli altri ruoli (vedi le REVOKE in fondo).
CREATE OR REPLACE FUNCTION public.get_email_order_context(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', o.id,
        'order_number', COALESCE(o.order_number, SUBSTRING(o.id::TEXT, 1, 8)),
        'status', o.status,
        'payment_status', o.payment_status,
        'payment_method', o.payment_method,
        'project_type', o.project_type,
        'laying_type', o.laying_type,
        'floor_sqm', o.floor_sqm,
        'wall_sqm', o.wall_sqm,
        'material_total', o.material_total,
        'laying_total', o.laying_total,
        'services_total', o.services_total,
        'subtotal', o.subtotal,
        'vat_amount', o.vat_amount,
        'total', o.total,
        'professional_payout', o.professional_payout,
        'notes', o.notes,
        'items', o.items,
        'scheduled_date', o.scheduled_date,
        'installation_date', o.installation_date,
        'work_start_date', o.work_start_date,
        'work_end_date', o.work_end_date,
        'estimated_work_days', o.estimated_work_days,
        'confirmed_work_days', o.confirmed_work_days,
        'duration_pro_note', o.duration_pro_note,
        'created_at', o.created_at,
        'installation_address', o.installation_address,
        'customer', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', c.id,
            'email', c.email,
            'first_name', c.first_name,
            'last_name', c.last_name,
            'full_name', NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''),
            'phone', c.phone
        ) END,
        'professional', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', p.id,
            'email', p.email,
            'full_name', NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
            'company_name', pp.company_name,
            'display_name', COALESCE(
                NULLIF(pp.company_name, ''),
                NULLIF(pp.full_name, ''),
                NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
                'Posatore PosaFacile'
            ),
            'phone', COALESCE(pp.phone, p.phone),
            'rating', pp.rating
        ) END,
        -- Le tappe servono al riepilogo "a che punto siamo" in fondo alle email
        -- di avanzamento.
        'milestones', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'step', m.step, 'status', m.status,
                       'occurred_at', m.occurred_at, 'note', m.note
                   ) ORDER BY m.created_at)
            FROM public.order_milestones m
            WHERE m.order_id = o.id
        ), '[]'::jsonb)
    )
    INTO v
    FROM public.orders o
    LEFT JOIN public.users c ON c.id = o.customer_id
    LEFT JOIN public.users p ON p.id = o.professional_id
    LEFT JOIN public.professional_profiles pp ON pp.id = o.professional_id
    WHERE o.id = p_order_id;

    RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_order_context(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_order_context(UUID) TO service_role;
