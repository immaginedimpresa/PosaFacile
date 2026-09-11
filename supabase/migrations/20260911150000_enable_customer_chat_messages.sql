-- Abilita le policy RLS per i clienti sulla tabella public.messages
-- Finora solo admin e professionisti potevano leggere e scrivere messaggi.

-- 1. I clienti possono LEGGERE i messaggi relativi ai cantieri dei loro ordini
DROP POLICY IF EXISTS "Customers can view messages of their jobs" ON public.messages;
CREATE POLICY "Customers can view messages of their jobs" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            JOIN public.orders o ON o.id = j.order_id
            WHERE j.id = messages.job_id 
            AND (o.customer_id = auth.uid() OR o.user_id = auth.uid())
        )
    );

-- 2. I clienti possono INVIARE messaggi per i cantieri dei loro ordini
DROP POLICY IF EXISTS "Customers can send messages to their jobs" ON public.messages;
CREATE POLICY "Customers can send messages to their jobs" ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            JOIN public.orders o ON o.id = j.order_id
            WHERE j.id = job_id 
            AND (o.customer_id = auth.uid() OR o.user_id = auth.uid())
        )
        AND sender_id = auth.uid()
    );

-- 3. I clienti possono LEGGERE il record del job associato ai loro ordini (necessario per visualizzare la chat)
DROP POLICY IF EXISTS "Customers can view jobs of their orders" ON public.jobs;
CREATE POLICY "Customers can view jobs of their orders" ON public.jobs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = jobs.order_id
            AND (o.customer_id = auth.uid() OR o.user_id = auth.uid())
        )
    );

-- 4. Funzione di utilità per recuperare o creare il job_id garantendo che la chat sia operativa
CREATE OR REPLACE FUNCTION public.get_or_create_order_job(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job_id UUID;
    v_order RECORD;
    v_pro_id UUID;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Controllo autorizzazione: cliente, professionista o admin
    IF auth.uid() IS NOT NULL AND auth.uid() NOT IN (v_order.user_id, v_order.customer_id, v_order.professional_id, v_order.installation_professional_id) THEN
        IF COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') <> 'admin' THEN
            RETURN NULL;
        END IF;
    END IF;

    -- 1. Cerca job esistente
    SELECT id INTO v_job_id FROM public.jobs WHERE order_id = p_order_id ORDER BY created_at DESC LIMIT 1;
    IF v_job_id IS NOT NULL THEN
        RETURN v_job_id;
    END IF;

    -- 2. Se non esiste e c'è un professionista valido, crealo
    v_pro_id := COALESCE(v_order.professional_id, v_order.installation_professional_id);
    IF v_pro_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.professional_profiles WHERE id = v_pro_id) THEN
        INSERT INTO public.jobs (
            order_id,
            professional_id,
            status,
            scheduled_date,
            notes,
            created_at,
            updated_at
        ) VALUES (
            p_order_id,
            v_pro_id,
            'assigned',
            COALESCE(v_order.work_start_date, v_order.installation_date),
            v_order.notes,
            NOW(),
            NOW()
        ) RETURNING id INTO v_job_id;
        RETURN v_job_id;
    END IF;

    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_order_job(UUID) TO authenticated, anon;


