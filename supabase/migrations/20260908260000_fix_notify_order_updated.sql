-- notify_on_order_updated leggeva company_name da public.users, dove quella
-- colonna non esiste: il trigger andava in errore e faceva fallire l'intero
-- UPDATE. In pratica assegnare un posatore a un ordine era impossibile.
-- Il nome commerciale sta su professional_profiles.
--
-- Emerso durante l'audit di sicurezza, testando che le funzionalità
-- legittime continuassero a funzionare dopo le nuove policy.
CREATE OR REPLACE FUNCTION public.notify_on_order_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_order_num TEXT;
    v_pro_name TEXT := 'un professionista certificato';
BEGIN
    v_order_num := COALESCE(NEW.order_number, SUBSTRING(NEW.id::TEXT, 1, 8));

    IF NEW.professional_id IS NOT NULL AND (OLD.professional_id IS NULL OR OLD.professional_id <> NEW.professional_id) THEN
        SELECT COALESCE(
                 NULLIF(TRIM(p.company_name), ''),
                 NULLIF(TRIM(p.full_name), ''),
                 NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''),
                 'Professionista Assegnato'
               )
          INTO v_pro_name
          FROM public.users u
          LEFT JOIN public.professional_profiles p ON p.id = u.id
         WHERE u.id = NEW.professional_id;

        v_pro_name := COALESCE(v_pro_name, 'un professionista certificato');

        PERFORM public.dispatch_notification(
            NEW.professional_id, 'professional',
            'Nuovo Cantiere Assegnato #' || v_order_num,
            'Ti è stato assegnato un nuovo cantiere di posa per l''ordine #' || v_order_num || '. Controlla date e scheda tecnica.',
            'job_assigned', '/pro/jobs/' || NEW.id,
            jsonb_build_object('order_id', NEW.id)
        );

        IF NEW.customer_id IS NOT NULL THEN
            PERFORM public.dispatch_notification(
                NEW.customer_id, 'customer',
                'Posatore Assegnato al tuo Cantiere',
                'Il posatore ' || v_pro_name || ' è stato assegnato al tuo ordine #' || v_order_num || '.',
                'pro_assigned', '/dashboard?tab=orders',
                jsonb_build_object('order_id', NEW.id, 'pro_id', NEW.professional_id)
            );
        END IF;

        PERFORM public.dispatch_notification(
            NULL, 'admin',
            'Cantiere Assegnato #' || v_order_num,
            'L''ordine #' || v_order_num || ' è stato assegnato a ' || v_pro_name || '.',
            'job_assigned', '/admin/orders',
            jsonb_build_object('order_id', NEW.id, 'pro_id', NEW.professional_id)
        );
    END IF;

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
            IF NEW.professional_id IS NOT NULL THEN
                PERFORM public.dispatch_notification(
                    NEW.professional_id, 'professional', 'Cantiere Annullato #' || v_order_num,
                    'L''incarico di posa per l''ordine #' || v_order_num || ' è stato annullato.',
                    'status_changed', '/pro/jobs',
                    jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
