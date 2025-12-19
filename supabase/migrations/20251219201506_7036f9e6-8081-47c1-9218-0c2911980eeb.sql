-- Replace the "Pelerin Săptămânal" (weekly_pilgrim) badge with "Purtător de Lumină" (light_bearer) badge
UPDATE public.badges 
SET 
  name = 'light_bearer',
  name_ro = 'Purtător de Lumină',
  description = 'Acordată pentru aprinderea a cel puțin 10 lumânări în ultima lună.',
  icon_name = 'flame'
WHERE name = 'weekly_pilgrim';

-- Update the evaluate_and_award_badges function to use candle-based logic
CREATE OR REPLACE FUNCTION public.evaluate_and_award_badges(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completed_pilgrimages_count INTEGER;
  candles_last_month_count INTEGER;
  helpful_interactions_count INTEGER;
  badge_first_pilgrimage UUID;
  badge_five_monasteries UUID;
  badge_light_bearer UUID;
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
  SELECT id INTO badge_light_bearer FROM public.badges WHERE name = 'light_bearer';
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

  -- Count candles lit in the last month (30 days)
  SELECT COUNT(*) INTO candles_last_month_count
  FROM public.candle_purchases
  WHERE user_id = target_user_id
    AND deleted_at IS NULL
    AND lit_at >= (now() - INTERVAL '30 days');

  -- Award "Purtător de Lumină" (Light Bearer) badge for 10+ candles in last month
  IF candles_last_month_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (target_user_id, badge_light_bearer)
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