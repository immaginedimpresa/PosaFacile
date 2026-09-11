-- ====================================================================
-- IL POSATORE RICEVE SOLO I DATI DEL LAVORO
-- ====================================================================
--
-- Finora il professionista assegnato leggeva l'intera riga di `orders`:
-- importi pagati dal cliente, dati di pagamento, note interne dell'admin.
-- Nascondere quei campi nell'interfaccia non basta: arrivavano comunque al
-- browser. Da qui in poi:
--
--  - il posatore non legge più `orders` direttamente;
--  - riceve i dati del lavoro dalla vista `pro_orders`: superfici, posa,
--    piastrella, servizi, logistica, date, durata e compenso;
--  - del cliente riceve solo nome, telefono e via del cantiere, e solo dopo
--    aver accettato l'incarico. Prima vede città e CAP. Email, anagrafica e
--    dati fiscali non escono dal database;
--  - le policy che chiedevano "sei il posatore di questo ordine?" leggendo
--    `orders` passano da funzioni SECURITY DEFINER, altrimenti smetterebbero
--    di funzionare insieme alla lettura diretta.

-- --------------------------------------------------------------------
-- 1. CHI PARTECIPA A UN ORDINE, SENZA PASSARE DALLA RLS DI ORDERS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_order_professional(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.orders o
         WHERE o.id = p_order_id
           AND (o.professional_id = auth.uid() OR o.installation_professional_id = auth.uid())
    )
$$;

CREATE OR REPLACE FUNCTION public.is_order_customer(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.orders o
         WHERE o.id = p_order_id
           AND (o.customer_id = auth.uid() OR o.user_id = auth.uid())
    )
$$;

REVOKE ALL ON FUNCTION public.is_order_professional(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_order_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_order_professional(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_customer(uuid) TO authenticated;

-- --------------------------------------------------------------------
-- 2. ORDERS: IL POSATORE NON LEGGE PIÙ LA RIGA COMPLETA
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "orders_read_own" ON public.orders;
CREATE POLICY "orders_read_own" ON public.orders
    FOR SELECT
    USING (auth.uid() = customer_id OR auth.uid() = user_id OR public.is_admin());

-- --------------------------------------------------------------------
-- 3. POLICY CHE DIPENDEVANO DALLA LETTURA DI ORDERS DA PARTE DEL POSATORE
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Order items visible to order participants" ON public.order_items;
CREATE POLICY "Order items visible to order participants" ON public.order_items
    FOR SELECT
    USING (
        public.is_admin()
        OR public.is_order_customer(order_id)
        OR public.is_order_professional(order_id)
    );

DROP POLICY IF EXISTS "Admins and assigned pros can write timeline" ON public.order_milestones;
CREATE POLICY "Admins and assigned pros can write timeline" ON public.order_milestones
    FOR ALL
    USING (public.is_admin() OR public.is_order_professional(order_id))
    WITH CHECK (public.is_admin() OR public.is_order_professional(order_id));

DROP POLICY IF EXISTS "Timeline visible to order participants" ON public.order_milestones;
CREATE POLICY "Timeline visible to order participants" ON public.order_milestones
    FOR SELECT
    USING (
        public.is_admin()
        OR public.is_order_customer(order_id)
        OR public.is_order_professional(order_id)
    );

DROP POLICY IF EXISTS "Users can view order services for own orders" ON public.order_services;
CREATE POLICY "Users can view order services for own orders" ON public.order_services
    FOR SELECT
    USING (
        public.is_admin()
        OR public.is_order_customer(order_id)
        OR public.is_order_professional(order_id)
    );

-- --------------------------------------------------------------------
-- 4. VISTA PRO_ORDERS: I DATI DEL LAVORO, E DEL CLIENTE SOLO I CONTATTI
-- --------------------------------------------------------------------
-- La vista gira con i permessi del proprietario (non security_invoker): è
-- il filtro sul posatore autenticato, qui dentro, a decidere quali righe
-- escono. security_barrier impedisce che un filtro passato dal client venga
-- valutato prima di quello.

DROP VIEW IF EXISTS public.pro_orders;
CREATE VIEW public.pro_orders
WITH (security_barrier = true)
AS
SELECT
    o.id,
    o.order_number,
    o.status,
    o.project_type,
    o.intervention_type,
    o.laying_type,
    o.floor_sqm,
    o.wall_sqm,
    o.scheduled_date,
    o.scheduled_time_slot,
    o.installation_date,
    o.work_start_date,
    o.work_end_date,
    o.laying_total,
    o.services_total,
    o.professional_payout,
    -- Note del cliente per la logistica. Le note interne dell'admin restano fuori.
    o.notes,
    o.estimated_work_days,
    o.estimated_calendar_days,
    o.duration_breakdown,
    o.confirmed_work_days,
    o.confirmed_calendar_days,
    o.duration_confirmed_at,
    o.duration_pro_note,
    o.professional_id,
    o.installation_professional_id,
    o.created_at,
    o.updated_at,
    o.completed_at,
    -- Indirizzo del cantiere: città, CAP e logistica sempre; la via solo dopo l'accettazione.
    CASE WHEN jsonb_typeof(o.installation_address) = 'object' THEN
        jsonb_strip_nulls(jsonb_build_object(
            'city', o.installation_address -> 'city',
            'province', o.installation_address -> 'province',
            'cap', o.installation_address -> 'cap',
            'postal_code', o.installation_address -> 'postal_code',
            'delivery_access', o.installation_address -> 'delivery_access',
            'street', CASE WHEN acc.accepted THEN o.installation_address -> 'street' END,
            'address', CASE WHEN acc.accepted THEN o.installation_address -> 'address' END,
            'civico', CASE WHEN acc.accepted THEN o.installation_address -> 'civico' END,
            'street_name', CASE WHEN acc.accepted THEN o.installation_address -> 'street_name' END
        ))
    END AS installation_address,
    -- Il preventivo del configuratore, limitato ai dati del lavoro.
    (
        SELECT coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'product', e -> 'product',
            'dimensions', e -> 'dimensions',
            'services', e -> 'services',
            'layingType', e -> 'layingType',
            'projectInfo', e -> 'projectInfo',
            'delivery_access', e -> 'delivery_access'
        ))), '[]'::jsonb)
        FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END
        ) AS e
    ) AS items,
    -- Contatti del cliente: solo nome e telefono, solo a incarico accettato.
    CASE WHEN acc.accepted THEN
        nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '')
    END AS customer_name,
    CASE WHEN acc.accepted THEN u.phone END AS customer_phone
FROM public.orders o
CROSS JOIN LATERAL (
    SELECT EXISTS (
        SELECT 1 FROM public.jobs j
         WHERE j.order_id = o.id
           AND j.professional_id = auth.uid()
           AND j.status IN ('accepted', 'in_progress', 'completed')
    ) AS accepted
) AS acc
LEFT JOIN public.users u ON u.id = coalesce(o.customer_id, o.user_id)
WHERE auth.uid() IS NOT NULL
  AND (o.professional_id = auth.uid() OR o.installation_professional_id = auth.uid());

COMMENT ON VIEW public.pro_orders IS
    'Ordini visti dal posatore assegnato: dati del lavoro e, dopo l''accettazione, nome, telefono e via del cliente. Nessun dato fiscale, email o importo pagato dal cliente.';

REVOKE ALL ON public.pro_orders FROM PUBLIC, anon;
GRANT SELECT ON public.pro_orders TO authenticated;
