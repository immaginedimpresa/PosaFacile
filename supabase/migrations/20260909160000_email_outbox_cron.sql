-- ====================================================================
-- EMAIL: LO SCHEDULER CHE SVUOTA LA CODA
-- ====================================================================
--
-- Senza questo pezzo tutto il resto è teoria: i trigger accodavano, la Edge
-- Function sapeva spedire, e in mezzo non c'era nessuno a far partire l'invio.
-- La coda è rimasta ferma con dentro un'email di conferma ordine.
--
-- Le credenziali stanno nel Vault, non nel comando del cron: `cron.job` è
-- leggibile e una service role key incollata lì dentro sarebbe una chiave in
-- chiaro in una tabella. I due segreti si creano una volta sola, fuori dalle
-- migrazioni:
--
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-emails',
--                              'send_emails_url', 'URL della Edge Function');
--   select vault.create_secret('<service_role_key>',
--                              'send_emails_key', 'Chiave usata dal cron');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.drain_email_outbox()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_url TEXT;
    v_key TEXT;
    v_pending INTEGER;
    v_request_id BIGINT;
BEGIN
    -- Nessuna email in attesa: si evita una chiamata HTTP ogni due minuti per
    -- tutto il giorno.
    SELECT COUNT(*) INTO v_pending
    FROM public.email_outbox
    WHERE status = 'pending' AND attempts < 3;

    IF v_pending = 0 THEN
        RETURN NULL;
    END IF;

    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'send_emails_url';

    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'send_emails_key';

    IF v_url IS NULL OR v_key IS NULL THEN
        RAISE WARNING 'drain_email_outbox: segreti mancanti nel Vault (send_emails_url / send_emails_key)';
        RETURN NULL;
    END IF;

    SELECT net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 55000
    ) INTO v_request_id;

    RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.drain_email_outbox() FROM PUBLIC, anon, authenticated;

-- Riprogrammazione idempotente: `cron.schedule` da solo fallirebbe al secondo
-- deploy con "job already exists".
DO $$
BEGIN
    PERFORM cron.unschedule('drain-email-outbox')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-email-outbox');
END $$;

-- Ogni due minuti: abbastanza da sembrare istantaneo a chi riceve, abbastanza
-- raro da non pesare.
SELECT cron.schedule('drain-email-outbox', '*/2 * * * *', $job$SELECT public.drain_email_outbox()$job$);
