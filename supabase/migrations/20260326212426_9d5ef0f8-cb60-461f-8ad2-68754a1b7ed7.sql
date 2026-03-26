CREATE OR REPLACE FUNCTION public.notify_pilgrimage_starting_soon()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  enrollment RECORD;
  should_notify boolean;
BEGIN
  FOR enrollment IN
    SELECT up.user_id, p.id as pilgrimage_id, p.title, p.location, p.start_date
    FROM public.user_pilgrimages up
    JOIN public.pilgrimages p ON p.id = up.pilgrimage_id
    WHERE up.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND p.start_date BETWEEN now() AND now() + INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = up.user_id
          AND n.type = 'pilgrimage_starting_soon'
          AND n.data->>'pilgrimage_id' = p.id::text
      )
  LOOP
    SELECT COALESCE(ns.pilgrimage_reminders, true) INTO should_notify
    FROM public.notification_settings ns
    WHERE ns.user_id = enrollment.user_id;

    IF NOT FOUND THEN
      should_notify := true;
    END IF;

    IF should_notify THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        enrollment.user_id,
        'pilgrimage_starting_soon',
        'Pelerinajul începe în curând: ' || enrollment.title,
        enrollment.location || ' • ' || to_char(enrollment.start_date, 'DD.MM.YYYY HH24:MI'),
        jsonb_build_object(
          'pilgrimage_id', enrollment.pilgrimage_id,
          'title', enrollment.title,
          'location', enrollment.location,
          'start_date', enrollment.start_date
        )
      );
    END IF;
  END LOOP;
END;
$function$