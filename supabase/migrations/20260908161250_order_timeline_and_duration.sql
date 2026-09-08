-- Timeline dell'ordine e stima della durata dei lavori
--
-- 1. `order_milestones`: le tappe del ciclo di vita di un ordine con stato,
--    timestamp e responsabile. `orders.status` resta il riassunto per liste e
--    filtri; il dettaglio operativo (materiale, professionista, attese, avvisi)
--    vive qui perché non è una sequenza lineare e va tracciato singolarmente.
-- 2. Campi di durata su `orders` e `saved_quotes`: giornate stimate in fase di
--    preventivo e giornate confermate dal professionista.

-- ============================================================
-- 1. ORDER MILESTONES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'blocked', 'done', 'skipped')),
  -- Quando la tappa si è effettivamente chiusa.
  occurred_at TIMESTAMPTZ,
  -- Scadenza attesa: usata per gli avvisi automatici (es. "prepara la stanza").
  due_at TIMESTAMPTZ,
  note TEXT,
  -- Chi ha aggiornato la tappa: admin, professionista o cliente.
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Una sola riga per tappa: la milestone è uno stato, non un log.
  UNIQUE (order_id, step)
);

CREATE INDEX IF NOT EXISTS idx_order_milestones_order ON public.order_milestones(order_id);
CREATE INDEX IF NOT EXISTS idx_order_milestones_status ON public.order_milestones(status);
CREATE INDEX IF NOT EXISTS idx_order_milestones_due ON public.order_milestones(due_at)
  WHERE due_at IS NOT NULL;

ALTER TABLE public.order_milestones ENABLE ROW LEVEL SECURITY;

-- Il cliente vede la timeline del proprio ordine, il posatore quella dei
-- cantieri che gli sono assegnati, l'admin tutto.
DROP POLICY IF EXISTS "Timeline visible to order participants" ON public.order_milestones;
CREATE POLICY "Timeline visible to order participants"
  ON public.order_milestones FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (
          o.customer_id = auth.uid()
          OR o.user_id = auth.uid()
          OR o.professional_id = auth.uid()
          OR o.installation_professional_id = auth.uid()
        )
    )
  );

-- Solo admin e professionista assegnato scrivono sulla timeline: il cliente
-- la legge, i suoi passaggi vengono registrati da chi li verifica.
DROP POLICY IF EXISTS "Admins and assigned pros can write timeline" ON public.order_milestones;
CREATE POLICY "Admins and assigned pros can write timeline"
  ON public.order_milestones FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.professional_id = auth.uid() OR o.installation_professional_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.professional_id = auth.uid() OR o.installation_professional_id = auth.uid())
    )
  );

-- ============================================================
-- 2. DURATA DEI LAVORI
-- ============================================================

ALTER TABLE public.orders
  -- Giornate di lavoro effettivo stimate dal configuratore.
  ADD COLUMN IF NOT EXISTS estimated_work_days NUMERIC(5,1),
  -- Durata percepita del cantiere: lavoro + attese tecniche (maturazioni).
  ADD COLUMN IF NOT EXISTS estimated_calendar_days INTEGER,
  -- Dettaglio delle fasi e delle assunzioni, per giustificare la stima.
  ADD COLUMN IF NOT EXISTS duration_breakdown JSONB,
  -- Giornate confermate (o corrette) dal professionista: è questo il dato
  -- che vale per la pianificazione e per il compenso.
  ADD COLUMN IF NOT EXISTS confirmed_work_days NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS confirmed_calendar_days INTEGER,
  ADD COLUMN IF NOT EXISTS duration_confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_pro_note TEXT,
  -- Finestra di cantiere effettiva.
  ADD COLUMN IF NOT EXISTS work_start_date DATE,
  ADD COLUMN IF NOT EXISTS work_end_date DATE;

ALTER TABLE public.saved_quotes
  ADD COLUMN IF NOT EXISTS estimated_work_days NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS estimated_calendar_days INTEGER,
  ADD COLUMN IF NOT EXISTS duration_breakdown JSONB;

CREATE INDEX IF NOT EXISTS idx_orders_work_start ON public.orders(work_start_date)
  WHERE work_start_date IS NOT NULL;

-- ============================================================
-- 3. SEED AUTOMATICO DELLE TAPPE
-- ============================================================

-- Le tappe obbligatorie esistono da subito in stato 'pending': così la barra
-- di stato del cliente è completa fin dal primo giorno e l'admin ha una
-- checklist da spuntare invece di righe da creare a mano.
CREATE OR REPLACE FUNCTION public.seed_order_milestones(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_steps TEXT[] := ARRAY[
    'order_placed',
    'payment_confirmed',
    'material_check',
    'professional_confirmed',
    'green_light',
    'date_confirmed',
    'material_delivered',
    'room_prep_notice',
    'work_started',
    'work_completed'
  ];
  v_step TEXT;
BEGIN
  FOREACH v_step IN ARRAY v_steps LOOP
    INSERT INTO public.order_milestones (order_id, step, status)
    VALUES (p_order_id, v_step, 'pending')
    ON CONFLICT (order_id, step) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_order_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_order_milestones(NEW.id);
  -- Un ordine nasce già "ricevuto": la prima tappa è chiusa alla creazione.
  UPDATE public.order_milestones
     SET status = 'done', occurred_at = COALESCE(NEW.created_at, NOW()), updated_at = NOW()
   WHERE order_id = NEW.id AND step = 'order_placed';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_created_seed_milestones ON public.orders;
CREATE TRIGGER on_order_created_seed_milestones
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order_milestones();

-- Tiene aggiornato updated_at senza doverlo passare dal client.
CREATE OR REPLACE FUNCTION public.touch_order_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  -- Chiudere una tappa senza timestamp renderebbe la timeline muta.
  IF NEW.status = 'done' AND NEW.occurred_at IS NULL THEN
    NEW.occurred_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_milestone_updated ON public.order_milestones;
CREATE TRIGGER on_order_milestone_updated
  BEFORE INSERT OR UPDATE ON public.order_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_order_milestone();

-- ============================================================
-- 4. BACKFILL DEGLI ORDINI ESISTENTI
-- ============================================================

DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN SELECT id, status, created_at FROM public.orders LOOP
    PERFORM public.seed_order_milestones(v_order.id);

    UPDATE public.order_milestones
       SET status = 'done', occurred_at = COALESCE(v_order.created_at, NOW())
     WHERE order_id = v_order.id
       AND step = 'order_placed'
       AND status = 'pending'
       AND v_order.status <> 'draft';

    -- Le tappe già superate secondo lo stato attuale vengono chiuse in blocco,
    -- con il timestamp di creazione dell'ordine come miglior approssimazione.
    UPDATE public.order_milestones
       SET status = 'done', occurred_at = COALESCE(v_order.created_at, NOW())
     WHERE order_id = v_order.id
       AND status = 'pending'
       AND step = ANY (
         CASE v_order.status::TEXT
           WHEN 'confirmed' THEN ARRAY['payment_confirmed']
           WHEN 'assigned' THEN ARRAY['payment_confirmed', 'material_check', 'professional_confirmed']
           WHEN 'material_shipped' THEN ARRAY['payment_confirmed', 'material_check', 'professional_confirmed', 'green_light', 'date_confirmed']
           WHEN 'material_delivered' THEN ARRAY['payment_confirmed', 'material_check', 'professional_confirmed', 'green_light', 'date_confirmed', 'material_delivered']
           WHEN 'in_progress' THEN ARRAY['payment_confirmed', 'material_check', 'professional_confirmed', 'green_light', 'date_confirmed', 'material_delivered', 'room_prep_notice', 'work_started']
           WHEN 'completed' THEN ARRAY['payment_confirmed', 'material_check', 'professional_confirmed', 'green_light', 'date_confirmed', 'material_delivered', 'room_prep_notice', 'work_started', 'work_completed']
           ELSE ARRAY[]::TEXT[]
         END
       );
  END LOOP;
END $$;

-- ============================================================
-- 5. CONFERMA DELLA DURATA DA PARTE DEL PROFESSIONISTA
-- ============================================================

-- Il posatore non ha (e non deve avere) il permesso di aggiornare la riga
-- ordine: può però confermare le giornate di cantiere. La funzione espone
-- esattamente quelle colonne, dopo aver verificato che sia il professionista
-- assegnato a quell'ordine.
CREATE OR REPLACE FUNCTION public.confirm_order_duration(
  p_order_id UUID,
  p_work_days NUMERIC,
  p_calendar_days INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN;
BEGIN
  IF p_work_days IS NULL OR p_work_days <= 0 THEN
    RAISE EXCEPTION 'Le giornate di lavoro devono essere maggiori di zero';
  END IF;

  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND (o.professional_id = auth.uid() OR o.installation_professional_id = auth.uid())
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Non autorizzato a confermare la durata di questo ordine';
  END IF;

  UPDATE public.orders
     SET confirmed_work_days = p_work_days,
         confirmed_calendar_days = p_calendar_days,
         duration_confirmed_by = auth.uid(),
         duration_confirmed_at = NOW(),
         duration_pro_note = p_note,
         updated_at = NOW()
   WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_duration(UUID, NUMERIC, INTEGER, TEXT) TO authenticated;
