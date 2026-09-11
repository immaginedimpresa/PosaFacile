-- Aggiornamento trigger per le notifiche della chat di cantiere
-- Assicura che:
-- 1. Il cliente riceva la notifica sia se il campo è customer_id sia se è user_id
-- 2. Il link porti direttamente all'ancora della chat nell'ordine del cliente (/dashboard/orders/{order_id}#chat-cantiere)
-- 3. Il link per il posatore porti alla scheda cantiere (/pro/jobs/{job_id}#chat-cantiere)
-- 4. Se un admin invia un messaggio di supporto, vengano notificati sia il cliente che il posatore
-- 5. L'evento 'message_received' accodi l'email in public.email_outbox con il template dedicato

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
    -- Trova il job e l'ordine associato
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

    -- Trova nome mittente
    SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email, 'Supporto PosaFacile')
    INTO v_sender_name
    FROM public.users
    WHERE id = NEW.sender_id;

    -- CASO 1: Il mittente è il Posatore -> Notifica il Cliente
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

    -- CASO 2: Il mittente è il Cliente -> Notifica il Posatore
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

    -- CASO 3: Il mittente è l'Ufficio Operativo/Admin -> Notifica ENTRAMBI
    ELSE
        -- Notifica al cliente
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

        -- Notifica al posatore
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

-- Riassegna permessi di sicurezza
REVOKE EXECUTE ON FUNCTION public.notify_on_message_created() FROM PUBLIC, anon, authenticated;
