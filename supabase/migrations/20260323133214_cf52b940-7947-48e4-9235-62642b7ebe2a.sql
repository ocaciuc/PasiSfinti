
-- 1. Restrict notifications INSERT to service_role only
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Only service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Update the trigger function to pass SEND_PUSH_SECRET header
CREATE OR REPLACE FUNCTION public.notify_on_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  replier_name text;
  pilgrimage_title text;
  pilgrimage_id_val uuid;
  reply_preview text;
  should_notify boolean;
  supabase_url text;
  anon_key text;
  push_secret text;
  route_path text;
  notif_title text;
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT c.user_id INTO target_user_id
    FROM public.comments c
    WHERE c.id = NEW.parent_comment_id AND c.deleted_at IS NULL;
  ELSE
    SELECT po.user_id INTO target_user_id
    FROM public.posts po
    WHERE po.id = NEW.post_id AND po.deleted_at IS NULL;
  END IF;

  IF target_user_id IS NULL OR target_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ns.comment_replies, true) INTO should_notify
  FROM public.notification_settings ns
  WHERE ns.user_id = target_user_id;

  IF NOT FOUND THEN
    should_notify := true;
  END IF;

  IF NOT should_notify THEN
    RETURN NEW;
  END IF;

  SELECT p.first_name INTO replier_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id AND p.deleted_at IS NULL;

  SELECT pilg.id, pilg.title INTO pilgrimage_id_val, pilgrimage_title
  FROM public.posts po
  JOIN public.pilgrimages pilg ON pilg.id = po.pilgrimage_id
  WHERE po.id = NEW.post_id AND po.deleted_at IS NULL;

  reply_preview := LEFT(NEW.content, 100);
  route_path := '/pilgrimage/' || COALESCE(pilgrimage_id_val::text, '');

  IF NEW.parent_comment_id IS NOT NULL THEN
    notif_title := COALESCE(replier_name, 'Cineva') || ' ți-a răspuns la comentariu';
  ELSE
    notif_title := COALESCE(replier_name, 'Cineva') || ' a comentat la postarea ta';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    target_user_id,
    'comment_reply',
    notif_title,
    reply_preview,
    jsonb_build_object(
      'pilgrimage_title', COALESCE(pilgrimage_title, ''),
      'pilgrimage_id', COALESCE(pilgrimage_id_val::text, ''),
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'replier_name', COALESCE(replier_name, 'Cineva')
    )
  );

  supabase_url := 'https://yanjhfqqdcevlzmwsrnj.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbmpoZnFxZGNldmx6bXdzcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNDcyNDMsImV4cCI6MjA3OTcyMzI0M30.DQ6QVhTfyzjnm5PriySvRfY1D8X6XsIJYStCQ6tX_Rc';
  
  -- Read SEND_PUSH_SECRET from vault
  SELECT decrypted_secret INTO push_secret
  FROM vault.decrypted_secrets
  WHERE name = 'SEND_PUSH_SECRET'
  LIMIT 1;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-send-push-secret', COALESCE(push_secret, '')
    ),
    body := jsonb_build_object(
      'user_ids', jsonb_build_array(target_user_id),
      'title', notif_title,
      'body', reply_preview,
      'data', jsonb_build_object('type', 'comment_reply', 'route', route_path)
    )
  );

  RETURN NEW;
END;
$$;
