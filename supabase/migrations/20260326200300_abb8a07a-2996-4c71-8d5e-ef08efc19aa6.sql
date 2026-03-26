CREATE OR REPLACE FUNCTION public.fail_stale_pending_candles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stale_record RECORD;
  should_notify boolean;
BEGIN
  FOR stale_record IN
    SELECT cp.id, cp.user_id, cp.purpose, cp.purchase_token
    FROM public.candle_purchases cp
    WHERE cp.payment_status = 'pending'
      AND cp.deleted_at IS NULL
      AND cp.lit_at < now() - INTERVAL '3 days'
  LOOP
    UPDATE public.candle_purchases
    SET payment_status = 'failed',
        expires_at = now()
    WHERE id = stale_record.id;

    SELECT COALESCE(ns.candle_activity, true) INTO should_notify
    FROM public.notification_settings ns
    WHERE ns.user_id = stale_record.user_id;

    IF NOT FOUND THEN
      should_notify := true;
    END IF;

    IF should_notify THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = stale_record.user_id
          AND n.type = 'candle_payment_failed'
          AND n.data->>'candle_id' = stale_record.id::text
      ) THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
          stale_record.user_id,
          'candle_payment_failed',
          'Lumânarea nu a putut fi aprinsă',
          'Plata nu a fost aprobată. Te rugăm să încerci din nou.',
          jsonb_build_object('candle_id', stale_record.id)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$