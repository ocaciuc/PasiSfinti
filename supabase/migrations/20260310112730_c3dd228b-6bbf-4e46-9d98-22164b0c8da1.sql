
-- Add candle_activity column to notification_settings
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS candle_activity boolean DEFAULT true;

-- Create function to generate notification on comment reply
CREATE OR REPLACE FUNCTION public.notify_on_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parent_user_id uuid;
  replier_name text;
  pilgrimage_title text;
  reply_preview text;
  should_notify boolean;
BEGIN
  -- Only trigger for replies (has parent_comment_id)
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the parent comment's author
  SELECT c.user_id INTO parent_user_id
  FROM public.comments c
  WHERE c.id = NEW.parent_comment_id AND c.deleted_at IS NULL;

  -- Don't notify if replying to own comment
  IF parent_user_id IS NULL OR parent_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check if user has comment_replies enabled
  SELECT COALESCE(ns.comment_replies, true) INTO should_notify
  FROM public.notification_settings ns
  WHERE ns.user_id = parent_user_id;

  -- If no settings row, default to true
  IF NOT FOUND THEN
    should_notify := true;
  END IF;

  IF NOT should_notify THEN
    RETURN NEW;
  END IF;

  -- Get replier name
  SELECT p.first_name INTO replier_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id AND p.deleted_at IS NULL;

  -- Get pilgrimage title via post
  SELECT pilg.title INTO pilgrimage_title
  FROM public.posts po
  JOIN public.pilgrimages pilg ON pilg.id = po.pilgrimage_id
  WHERE po.id = NEW.post_id AND po.deleted_at IS NULL;

  -- Truncate content for preview
  reply_preview := LEFT(NEW.content, 100);

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    parent_user_id,
    'comment_reply',
    COALESCE(replier_name, 'Cineva') || ' ți-a răspuns',
    reply_preview,
    jsonb_build_object(
      'pilgrimage_title', COALESCE(pilgrimage_title, ''),
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'replier_name', COALESCE(replier_name, 'Cineva')
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for comment replies
DROP TRIGGER IF EXISTS trg_notify_comment_reply ON public.comments;
CREATE TRIGGER trg_notify_comment_reply
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_reply();

-- Create function to notify on candle expiry (called by scheduled job)
CREATE OR REPLACE FUNCTION public.notify_candle_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  candle_record RECORD;
  should_notify boolean;
BEGIN
  -- Find candles expiring within the next hour that haven't been notified yet
  FOR candle_record IN
    SELECT cp.id, cp.user_id, cp.purpose, cp.expires_at
    FROM public.candle_purchases cp
    WHERE cp.deleted_at IS NULL
      AND cp.expires_at BETWEEN now() AND now() + INTERVAL '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = cp.user_id
          AND n.type = 'candle_expiry'
          AND n.data->>'candle_id' = cp.id::text
      )
  LOOP
    -- Check user preference
    SELECT COALESCE(ns.candle_activity, true) INTO should_notify
    FROM public.notification_settings ns
    WHERE ns.user_id = candle_record.user_id;

    IF NOT FOUND THEN
      should_notify := true;
    END IF;

    IF should_notify THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        candle_record.user_id,
        'candle_expiry',
        'Lumânarea ta se stinge curând',
        COALESCE(candle_record.purpose, 'Lumânarea aprinsă de tine se stinge în curând.'),
        jsonb_build_object('candle_id', candle_record.id)
      );
    END IF;
  END LOOP;
END;
$$;

-- Create function to notify pilgrimage reminders (3 days before)
CREATE OR REPLACE FUNCTION public.notify_pilgrimage_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      AND p.start_date::date = (CURRENT_DATE + INTERVAL '3 days')::date
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = up.user_id
          AND n.type = 'pilgrimage_reminder'
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
        'pilgrimage_reminder',
        'Pelerinaj în 3 zile: ' || enrollment.title,
        enrollment.location || ' • ' || to_char(enrollment.start_date, 'DD.MM.YYYY'),
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
$$;
