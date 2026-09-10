-- ====================================================================
-- EMAIL: GLI EVENTI CHE NON AVVISAVANO NESSUNO
-- ====================================================================
--
-- Cinque momenti in cui l'utente si aspetta un'email e non ne riceveva
-- nessuna: la registrazione, il salvataggio di un preventivo, il pagamento
-- incassato, l'iscrizione di un posatore e la sua abilitazione.

-- ====================================================================
-- 1. BENVENUTO
-- ====================================================================

-- Idempotente per costruzione: il benvenuto può essere sollecitato da due
-- punti (creazione del profilo, conferma dell'indirizzo) e l'utente non deve
-- riceverlo due volte.
CREATE OR REPLACE FUNCTION public.notify_welcome(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT id, role, email, first_name INTO v_user
    FROM public.users WHERE id = p_user_id;

    IF NOT FOUND OR v_user.email IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_user_id AND type = 'welcome'
    ) THEN
        RETURN;
    END IF;

    IF v_user.role = 'customer' THEN
        PERFORM public.dispatch_notification(
            p_user_id, 'customer',
            'Benvenuto in PosaFacile',
            'Il tuo account è attivo: da qui puoi configurare un pavimento, ' ||
            'ricevere un preventivo immediato e seguire la posa passo per passo.',
            'welcome',
            '/dashboard',
            jsonb_build_object('email_template', 'welcome.customer')
        );
    ELSIF v_user.role = 'professional' THEN
        PERFORM public.dispatch_notification(
            p_user_id, 'professional',
            'Benvenuto nella rete posatori PosaFacile',
            'Il tuo account professionista è attivo. Completa tariffe, zone di ' ||
            'copertura e disponibilità: sono i dati con cui ti assegniamo i cantieri.',
            'welcome',
            '/pro/profile',
            jsonb_build_object('email_template', 'welcome.professional')
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.notify_welcome(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_welcome ON public.users;
CREATE TRIGGER trigger_notify_welcome
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_welcome();

-- ====================================================================
-- 2. PREVENTIVO SALVATO
-- ====================================================================

-- Un preventivo salvato e mai più ripreso è la perdita più frequente del
-- funnel: l'email è la copia che il cliente ritrova in casella fra due
-- settimane, con il link per riaprirlo.
CREATE OR REPLACE FUNCTION public.notify_on_quote_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product TEXT;
BEGIN
    IF NEW.customer_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT name INTO v_product FROM public.products WHERE id = NEW.product_id;

    PERFORM public.dispatch_notification(
        NEW.customer_id, 'customer',
        'Il tuo preventivo è salvato',
        'Abbiamo messo da parte la configurazione' ||
        COALESCE(' per ' || NULLIF(v_product, ''), '') ||
        '. Puoi riaprirla quando vuoi e confermarla senza rifare i calcoli.',
        'quote_created',
        '/dashboard?tab=quotes',
        jsonb_build_object(
            'email_template', 'quote_created.customer',
            'quote_id', NEW.id,
            'product_name', v_product,
            'floor_sqm', NEW.floor_sqm,
            'wall_sqm', NEW.wall_sqm,
            'total', NEW.total,
            'material_total', NEW.material_total,
            'laying_total', NEW.laying_total,
            'services_total', NEW.services_total,
            'city', NEW.city,
            'estimated_work_days', NEW.estimated_work_days
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_quote_created ON public.saved_quotes;
CREATE TRIGGER trigger_notify_quote_created
AFTER INSERT ON public.saved_quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_quote_created();

-- ====================================================================
-- 3. PAGAMENTO INCASSATO
-- ====================================================================

CREATE OR REPLACE FUNCTION public.notify_on_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_num TEXT;
BEGIN
    IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN
        RETURN NEW;
    END IF;

    v_num := COALESCE(NEW.order_number, SUBSTRING(NEW.id::TEXT, 1, 8));

    IF NEW.customer_id IS NOT NULL THEN
        PERFORM public.dispatch_notification(
            NEW.customer_id, 'customer',
            'Pagamento ricevuto · Ordine #' || v_num,
            'Abbiamo registrato il pagamento del tuo ordine #' || v_num ||
            '. Da adesso partono le verifiche sul materiale e la programmazione del cantiere.',
            'payment_received',
            '/dashboard/orders/' || NEW.id,
            jsonb_build_object('email_template', 'payment_received.customer', 'order_id', NEW.id)
        );
    END IF;

    PERFORM public.dispatch_notification(
        NULL, 'admin',
        'Pagamento incassato · Ordine #' || v_num,
        'L''ordine #' || v_num || ' risulta pagato: si può procedere con la verifica materiali.',
        'payment_received',
        '/admin/orders',
        jsonb_build_object('email_template', 'payment_received.admin', 'order_id', NEW.id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_payment_received ON public.orders;
CREATE TRIGGER trigger_notify_payment_received
AFTER INSERT OR UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_payment_received();

-- ====================================================================
-- 4. POSATORE: ISCRIZIONE E ABILITAZIONE
-- ====================================================================

CREATE OR REPLACE FUNCTION public.notify_on_professional_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name TEXT;
BEGIN
    v_name := COALESCE(NULLIF(NEW.company_name, ''), NULLIF(NEW.full_name, ''), 'Nuovo posatore');

    -- Iscrizione da verificare. I posatori invitati dall'admin nascono già
    -- verificati e non generano la richiesta.
    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.verified, FALSE) = FALSE THEN
            PERFORM public.dispatch_notification(
                NULL, 'admin',
                'Nuova iscrizione posatore · ' || v_name,
                v_name || ' ha creato un profilo professionista. Verifica documenti, ' ||
                'partita IVA e zone di copertura prima di abilitarlo ai cantieri.',
                'pro_registered',
                '/admin/professionals',
                jsonb_build_object(
                    'email_template', 'pro_registered.admin',
                    'professional_id', NEW.id,
                    'company_name', NEW.company_name,
                    'vat_number', NEW.vat_number,
                    'phone', NEW.phone,
                    'billing_city', NEW.billing_city,
                    'billing_province', NEW.billing_province
                )
            );
        END IF;
        RETURN NEW;
    END IF;

    -- Abilitazione: solo il passaggio da non verificato a verificato.
    IF COALESCE(OLD.verified, FALSE) = FALSE AND COALESCE(NEW.verified, FALSE) = TRUE THEN
        PERFORM public.dispatch_notification(
            NEW.id, 'professional',
            'Il tuo profilo è stato abilitato',
            'La verifica è conclusa: il tuo profilo è attivo e da ora puoi ricevere ' ||
            'incarichi di posa nelle zone che hai indicato.',
            'pro_approved',
            '/pro/dashboard',
            jsonb_build_object('email_template', 'pro_approved.professional', 'professional_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_professional_profile ON public.professional_profiles;
CREATE TRIGGER trigger_notify_professional_profile
AFTER INSERT OR UPDATE OF verified ON public.professional_profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_on_professional_profile();

-- ====================================================================
-- 5. PREFERENZE DI DEFAULT PER I NUOVI EVENTI
-- ====================================================================

INSERT INTO public.notification_preferences (user_id, event_type, role, platform_enabled, email_enabled)
VALUES
    (NULL, 'welcome', 'customer', TRUE, TRUE),
    (NULL, 'welcome', 'professional', TRUE, TRUE),
    (NULL, 'quote_created', 'customer', TRUE, TRUE),
    (NULL, 'payment_received', 'customer', TRUE, TRUE),
    (NULL, 'payment_received', 'admin', TRUE, TRUE),
    (NULL, 'pro_registered', 'admin', TRUE, TRUE),
    (NULL, 'pro_approved', 'professional', TRUE, TRUE)
ON CONFLICT (event_type, role) WHERE user_id IS NULL DO NOTHING;

-- ====================================================================
-- 6. NIENTE DI QUESTO È UN'API
-- ====================================================================

-- PostgREST espone su /rest/v1/rpc tutto ciò che sta in `public`. Le funzioni
-- dei trigger non vanno chiamate da fuori, e `notify_welcome(uuid)` accetta un
-- argomento: senza revoca, un anonimo potrebbe accodare email a id utente
-- indovinati.
REVOKE ALL ON FUNCTION public.notify_welcome(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_welcome() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_quote_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_payment_received() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_professional_profile() FROM PUBLIC, anon, authenticated;
