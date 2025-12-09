-- =============================================
-- PART 1: Create Views for Clean Queries
-- =============================================

-- View: Active pilgrimages (future or ongoing, not deleted)
CREATE OR REPLACE VIEW public.v_pilgrimages_active AS
SELECT *
FROM public.pilgrimages
WHERE deleted_at IS NULL
  AND (end_date >= CURRENT_DATE OR (end_date IS NULL AND start_date >= CURRENT_DATE));

-- View: Past pilgrimages (ended, not deleted)
CREATE OR REPLACE VIEW public.v_pilgrimages_passed AS
SELECT *
FROM public.pilgrimages
WHERE deleted_at IS NULL
  AND (end_date < CURRENT_DATE OR (end_date IS NULL AND start_date < CURRENT_DATE));

-- View: Active posts (not deleted, with author info)
CREATE OR REPLACE VIEW public.v_posts_active AS
SELECT p.*, pr.first_name, pr.avatar_url
FROM public.posts p
LEFT JOIN public.profiles pr ON p.user_id = pr.user_id
WHERE p.deleted_at IS NULL;

-- View: Threaded comments (with author info and reply count)
CREATE OR REPLACE VIEW public.v_comments_threaded AS
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

-- View: Active profiles (not deleted)
CREATE OR REPLACE VIEW public.v_profiles_active AS
SELECT *
FROM public.profiles
WHERE deleted_at IS NULL AND is_deleted = false;

-- =============================================
-- PART 2: Create delete_user_account function
-- =============================================

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_timestamp_val timestamp with time zone := now();
BEGIN
  -- Soft delete all user content
  
  -- Soft delete posts
  UPDATE public.posts 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete comments
  UPDATE public.comments 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete post likes
  UPDATE public.post_likes 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete user pilgrimages
  UPDATE public.user_pilgrimages 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete past pilgrimages
  UPDATE public.past_pilgrimages 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Soft delete candle purchases
  UPDATE public.candle_purchases 
  SET deleted_at = current_timestamp_val 
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Hard delete notifications (transient data)
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  
  -- Delete notification settings
  DELETE FROM public.notification_settings WHERE user_id = target_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Soft delete and anonymize profile
  UPDATE public.profiles 
  SET 
    deleted_at = current_timestamp_val,
    is_deleted = true,
    first_name = 'Deleted',
    last_name = 'User',
    bio = NULL,
    avatar_url = NULL,
    city = NULL,
    parish = NULL
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;

-- =============================================
-- PART 3: Update RLS policies to exclude soft-deleted records
-- =============================================

-- Drop and recreate posts SELECT policy
DROP POLICY IF EXISTS "Enrolled users can view posts" ON public.posts;
CREATE POLICY "Enrolled users can view posts"
ON public.posts FOR SELECT
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.user_pilgrimages
    WHERE user_pilgrimages.pilgrimage_id = posts.pilgrimage_id
      AND user_pilgrimages.user_id = auth.uid()
      AND user_pilgrimages.deleted_at IS NULL
  )
);

-- Drop and recreate comments SELECT policy
DROP POLICY IF EXISTS "Enrolled users can view comments" ON public.comments;
CREATE POLICY "Enrolled users can view comments"
ON public.comments FOR SELECT
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.posts
    JOIN public.user_pilgrimages ON user_pilgrimages.pilgrimage_id = posts.pilgrimage_id
    WHERE posts.id = comments.post_id
      AND user_pilgrimages.user_id = auth.uid()
      AND user_pilgrimages.deleted_at IS NULL
      AND posts.deleted_at IS NULL
  )
);

-- Update profiles SELECT policy to exclude deleted profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Add policy for co-pilgrim profile visibility
DROP POLICY IF EXISTS "Co-pilgrims can view limited profile info" ON public.profiles;
CREATE POLICY "Co-pilgrims can view limited profile info"
ON public.profiles FOR SELECT
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.user_pilgrimages up1
    JOIN public.user_pilgrimages up2 ON up1.pilgrimage_id = up2.pilgrimage_id
    WHERE up1.user_id = profiles.user_id
      AND up2.user_id = auth.uid()
      AND up1.deleted_at IS NULL
      AND up2.deleted_at IS NULL
  )
);

-- Update user_pilgrimages SELECT policy
DROP POLICY IF EXISTS "Users can view all pilgrimage participants" ON public.user_pilgrimages;
CREATE POLICY "Users can view all pilgrimage participants"
ON public.user_pilgrimages FOR SELECT
USING (deleted_at IS NULL);

-- Update post_likes SELECT policy
DROP POLICY IF EXISTS "Users can view all likes" ON public.post_likes;
CREATE POLICY "Users can view all likes"
ON public.post_likes FOR SELECT
USING (deleted_at IS NULL);