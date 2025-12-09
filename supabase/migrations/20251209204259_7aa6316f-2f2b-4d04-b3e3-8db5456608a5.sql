-- Fix Security Definer Views - Set to SECURITY INVOKER so RLS applies correctly

-- Recreate views with SECURITY INVOKER (default, but explicit for clarity)

-- View: Active pilgrimages
DROP VIEW IF EXISTS public.v_pilgrimages_active;
CREATE VIEW public.v_pilgrimages_active 
WITH (security_invoker = true)
AS
SELECT *
FROM public.pilgrimages
WHERE deleted_at IS NULL
  AND (end_date >= CURRENT_DATE OR (end_date IS NULL AND start_date >= CURRENT_DATE));

-- View: Past pilgrimages
DROP VIEW IF EXISTS public.v_pilgrimages_passed;
CREATE VIEW public.v_pilgrimages_passed 
WITH (security_invoker = true)
AS
SELECT *
FROM public.pilgrimages
WHERE deleted_at IS NULL
  AND (end_date < CURRENT_DATE OR (end_date IS NULL AND start_date < CURRENT_DATE));

-- View: Active posts
DROP VIEW IF EXISTS public.v_posts_active;
CREATE VIEW public.v_posts_active 
WITH (security_invoker = true)
AS
SELECT p.*, pr.first_name, pr.avatar_url
FROM public.posts p
LEFT JOIN public.profiles pr ON p.user_id = pr.user_id
WHERE p.deleted_at IS NULL;

-- View: Threaded comments
DROP VIEW IF EXISTS public.v_comments_threaded;
CREATE VIEW public.v_comments_threaded 
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.post_id,
  c.user_id,
  c.content,
  c.parent_comment_id,
  c.created_at,
  c.updated_at,
  pr.first_name AS author_name,
  pr.avatar_url AS author_avatar,
  (SELECT COUNT(*) FROM public.comments rc WHERE rc.parent_comment_id = c.id AND rc.deleted_at IS NULL) AS reply_count
FROM public.comments c
LEFT JOIN public.profiles pr ON c.user_id = pr.user_id
WHERE c.deleted_at IS NULL
ORDER BY c.parent_comment_id NULLS FIRST, c.created_at ASC;

-- View: Active profiles
DROP VIEW IF EXISTS public.v_profiles_active;
CREATE VIEW public.v_profiles_active 
WITH (security_invoker = true)
AS
SELECT *
FROM public.profiles
WHERE deleted_at IS NULL AND is_deleted = false;