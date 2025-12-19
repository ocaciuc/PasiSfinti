-- Fix 1: Make diary-photos bucket private and update storage policies
UPDATE storage.buckets SET public = false WHERE id = 'diary-photos';

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view diary photos" ON storage.objects;

-- Create new policy: Users can view their own diary photos (based on folder structure userId/diaryId/filename)
CREATE POLICY "Users can view own diary photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'diary-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 2: Add content length constraints to posts and comments tables
ALTER TABLE public.posts 
ADD CONSTRAINT posts_content_length CHECK (LENGTH(content) <= 5000);

ALTER TABLE public.comments 
ADD CONSTRAINT comments_content_length CHECK (LENGTH(content) <= 2000);

-- Fix 3: Add authorization check to evaluate_and_award_badges function
CREATE OR REPLACE FUNCTION public.evaluate_and_award_badges(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completed_pilgrimages_count INTEGER;
  weekly_streak_count INTEGER;
  helpful_interactions_count INTEGER;
  badge_first_pilgrimage UUID;
  badge_five_monasteries UUID;
  badge_weekly_pilgrim UUID;
  badge_community_helper UUID;
BEGIN
  -- SECURITY: Verify the caller is evaluating their own badges
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only evaluate your own badges';
  END IF;

  -- Get badge IDs
  SELECT id INTO badge_first_pilgrimage FROM public.badges WHERE name = 'first_pilgrimage';
  SELECT id INTO badge_five_monasteries FROM public.badges WHERE name = 'five_monasteries';
  SELECT id INTO badge_weekly_pilgrim FROM public.badges WHERE name = 'weekly_pilgrim';
  SELECT id INTO badge_community_helper FROM public.badges WHERE name = 'community_helper';

  -- Count completed pilgrimages (past pilgrimages the user was enrolled in)
  SELECT COUNT(DISTINCT up.pilgrimage_id) INTO completed_pilgrimages_count
  FROM public.user_pilgrimages up
  JOIN public.pilgrimages p ON up.pilgrimage_id = p.id
  WHERE up.user_id = target_user_id
    AND up.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND (p.end_date < now() OR (p.end_date IS NULL AND p.start_date < now()));

  -- Award "First Pilgrimage" badge
  IF completed_pilgrimages_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (target_user_id, badge_first_pilgrimage)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Award "5 Monasteries" badge
  IF completed_pilgrimages_count >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (target_user_id, badge_five_monasteries)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Check for weekly pilgrim streak (3 consecutive weeks with pilgrimages)
  WITH weekly_participation AS (
    SELECT DISTINCT date_trunc('week', p.start_date) as pilgrimage_week
    FROM public.user_pilgrimages up
    JOIN public.pilgrimages p ON up.pilgrimage_id = p.id
    WHERE up.user_id = target_user_id
      AND up.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND p.start_date < now()
    ORDER BY pilgrimage_week
  ),
  consecutive_weeks AS (
    SELECT pilgrimage_week,
           pilgrimage_week - (ROW_NUMBER() OVER (ORDER BY pilgrimage_week) * INTERVAL '1 week') as grp
    FROM weekly_participation
  )
  SELECT MAX(cnt) INTO weekly_streak_count
  FROM (
    SELECT grp, COUNT(*) as cnt
    FROM consecutive_weeks
    GROUP BY grp
  ) sub;

  IF weekly_streak_count >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (target_user_id, badge_weekly_pilgrim)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Count helpful interactions (posts + comments + received likes)
  SELECT (
    (SELECT COUNT(*) FROM public.posts WHERE user_id = target_user_id AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM public.comments WHERE user_id = target_user_id AND deleted_at IS NULL) +
    (SELECT COALESCE(SUM(likes_count), 0) FROM public.posts WHERE user_id = target_user_id AND deleted_at IS NULL)
  ) INTO helpful_interactions_count;

  -- Award "Community Helper" badge (threshold: 10 interactions)
  IF helpful_interactions_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (target_user_id, badge_community_helper)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$function$;