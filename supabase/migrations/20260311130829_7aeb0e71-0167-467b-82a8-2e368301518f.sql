
-- Update notify_on_comment_reply to include route data for push deep linking
CREATE OR REPLACE FUNCTION public.notify_on_comment_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_user_id uuid;
  replier_name text;
  pilgrimage_title text;
  pilgrimage_id_val uuid;
  reply_preview text;
  should_notify boolean;
  supabase_url text;
  anon_key text;
  route_path text;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.user_id INTO parent_user_id
  FROM public.comments c
  WHERE c.id = NEW.parent_comment_id AND c.deleted_at IS NULL;

  IF parent_user_id IS NULL OR parent_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ns.comment_replies, true) INTO should_notify
  FROM public.notification_settings ns
  WHERE ns.user_id = parent_user_id;

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

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    parent_user_id,
    'comment_reply',
    COALESCE(replier_name, 'Cineva') || ' ți-a răspuns',
    reply_preview,
    jsonb_build_object(
      'pilgrimage_title', COALESCE(pilgrimage_title, ''),
      'pilgrimage_id', COALESCE(pilgrimage_id_val::text, ''),
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'replier_name', COALESCE(replier_name, 'Cineva')
    )
  );

  SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.settings.anon_key', true) INTO anon_key;

  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://yanjhfqqdcevlzmwsrnj.supabase.co';
  END IF;
  IF anon_key IS NULL OR anon_key = '' THEN
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbmpoZnFxZGNldmx6bXdzcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNDcyNDMsImV4cCI6MjA3OTcyMzI0M30.DQ6QVhTfyzjnm5PriySvRfY1D8X6XsIJYStCQ6tX_Rc';
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'user_ids', jsonb_build_array(parent_user_id),
      'title', COALESCE(replier_name, 'Cineva') || ' ți-a răspuns',
      'body', reply_preview,
      'data', jsonb_build_object('type', 'comment_reply', 'route', route_path)
    )
  );

  RETURN NEW;
END;
$function$;
