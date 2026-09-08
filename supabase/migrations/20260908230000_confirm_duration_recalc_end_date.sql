-- La correzione del professionista deve riverberarsi sulla data di fine.
--
-- Il modello è: PosaFacile calcola le giornate, il professionista le corregge
-- se il preventivo è sbagliato. Finché la correzione non ricalcolava anche
-- `work_end_date`, l'agenda restava appesa a un numero che il posatore aveva
-- già smentito. Il ricalcolo sta qui perché il posatore non ha (e non deve
-- avere) il permesso di aggiornare la riga ordine.

-- Somma giorni di calendario saltando sabato e domenica, come fa il frontend.
CREATE OR REPLACE FUNCTION public.add_working_days(p_start DATE, p_days INTEGER)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cursor DATE := p_start;
  v_remaining INTEGER := GREATEST(COALESCE(p_days, 0) - 1, 0);
BEGIN
  IF p_start IS NULL THEN
    RETURN NULL;
  END IF;

  WHILE v_remaining > 0 LOOP
    v_cursor := v_cursor + 1;
    -- ISODOW: 6 = sabato, 7 = domenica.
    IF EXTRACT(ISODOW FROM v_cursor) < 6 THEN
      v_remaining := v_remaining - 1;
    END IF;
  END LOOP;

  RETURN v_cursor;
END;
$$;

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
  v_start DATE;
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

  SELECT COALESCE(work_start_date, installation_date) INTO v_start
    FROM public.orders WHERE id = p_order_id;

  UPDATE public.orders
     SET confirmed_work_days = p_work_days,
         confirmed_calendar_days = p_calendar_days,
         duration_confirmed_by = auth.uid(),
         duration_confirmed_at = NOW(),
         duration_pro_note = p_note,
         -- Se la data di inizio è già fissata, la fine si sposta di conseguenza.
         work_end_date = CASE
           WHEN v_start IS NOT NULL AND p_calendar_days IS NOT NULL
             THEN public.add_working_days(v_start, p_calendar_days)
           ELSE work_end_date
         END,
         updated_at = NOW()
   WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_duration(UUID, NUMERIC, INTEGER, TEXT) TO authenticated;
