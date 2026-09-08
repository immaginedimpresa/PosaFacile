-- Aggiunge la tappa "Materiale spedito" alla timeline dell'ordine.
--
-- Fino a qui la spedizione era implicita: si passava da "data confermata" a
-- "materiale consegnato" senza che il cliente sapesse se la merce fosse
-- partita. Sono due momenti distinti, con responsabili diversi: la spedizione
-- la fa PosaFacile, la ricezione la verifica chi è in cantiere.

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
    'material_shipped',
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

-- Crea la tappa mancante sugli ordini già esistenti e la chiude dove lo stato
-- dell'ordine dice che la spedizione è già avvenuta.
DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN SELECT id, status, created_at FROM public.orders LOOP
    INSERT INTO public.order_milestones (order_id, step, status)
    VALUES (v_order.id, 'material_shipped', 'pending')
    ON CONFLICT (order_id, step) DO NOTHING;

    UPDATE public.order_milestones
       SET status = 'done', occurred_at = COALESCE(v_order.created_at, NOW())
     WHERE order_id = v_order.id
       AND step = 'material_shipped'
       AND status = 'pending'
       AND v_order.status::TEXT IN (
         'material_shipped', 'material_delivered', 'in_progress', 'completed'
       );
  END LOOP;
END $$;
