-- =============================================
-- SPIRITUAL DIARY (Jurnal Spiritual) TABLES
-- =============================================

-- Create spiritual_diaries table
CREATE TABLE public.spiritual_diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pilgrimage_id UUID NOT NULL REFERENCES public.pilgrimages(id) ON DELETE CASCADE,
  reflections TEXT,
  visited_places TEXT,
  people_met TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, pilgrimage_id)
);

-- Create spiritual_diary_photos table
CREATE TABLE public.spiritual_diary_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES public.spiritual_diaries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on spiritual diary tables
ALTER TABLE public.spiritual_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spiritual_diary_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spiritual_diaries
CREATE POLICY "Users can view own spiritual diaries"
  ON public.spiritual_diaries FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create own spiritual diaries"
  ON public.spiritual_diaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spiritual diaries"
  ON public.spiritual_diaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spiritual diaries"
  ON public.spiritual_diaries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for spiritual_diary_photos
CREATE POLICY "Users can view own diary photos"
  ON public.spiritual_diary_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.spiritual_diaries sd
    WHERE sd.id = spiritual_diary_photos.diary_id
    AND sd.user_id = auth.uid()
    AND sd.deleted_at IS NULL
  ));

CREATE POLICY "Users can add photos to own diaries"
  ON public.spiritual_diary_photos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.spiritual_diaries sd
    WHERE sd.id = spiritual_diary_photos.diary_id
    AND sd.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own diary photos"
  ON public.spiritual_diary_photos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.spiritual_diaries sd
    WHERE sd.id = spiritual_diary_photos.diary_id
    AND sd.user_id = auth.uid()
  ));

-- Trigger for updating updated_at on spiritual_diaries
CREATE TRIGGER update_spiritual_diaries_updated_at
  BEFORE UPDATE ON public.spiritual_diaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- BADGES (Insigne) TABLES
-- =============================================

-- Create badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_ro TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges join table
CREATE TABLE public.user_badges (
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- Enable RLS on badge tables
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges (public read)
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_badges
CREATE POLICY "Users can view all earned badges"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "System can award badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true);

-- =============================================
-- INSERT PREDEFINED BADGES
-- =============================================

INSERT INTO public.badges (name, name_ro, description, icon_name, priority) VALUES
  ('first_pilgrimage', 'Primul Pelerinaj', 'Acordată după finalizarea primului pelerinaj.', 'footprints', 1),
  ('five_monasteries', '5 Mănăstiri Vizitate', 'Acordată după participarea la 5 pelerinaje diferite.', 'church', 2),
  ('weekly_pilgrim', 'Pelerin Săptămânal', 'Acordată pentru participarea la pelerinaje în 3 săptămâni consecutive.', 'calendar-check', 3),
  ('community_helper', 'Ajutătorul Comunității', 'Acordată pentru contribuții valoroase în comunitate.', 'heart-handshake', 4);

-- =============================================
-- BADGE AWARDING FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.evaluate_and_award_badges(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_pilgrimages_count INTEGER;
  weekly_streak_count INTEGER;
  helpful_interactions_count INTEGER;
  badge_first_pilgrimage UUID;
  badge_five_monasteries UUID;
  badge_weekly_pilgrim UUID;
  badge_community_helper UUID;
BEGIN
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
$$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_spiritual_diaries_user_id ON public.spiritual_diaries(user_id);
CREATE INDEX idx_spiritual_diaries_pilgrimage_id ON public.spiritual_diaries(pilgrimage_id);
CREATE INDEX idx_spiritual_diary_photos_diary_id ON public.spiritual_diary_photos(diary_id);
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON public.user_badges(badge_id);

-- =============================================
-- STORAGE BUCKET FOR DIARY PHOTOS
-- =============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('diary-photos', 'diary-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for diary photos
CREATE POLICY "Authenticated users can upload diary photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'diary-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view diary photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'diary-photos');

CREATE POLICY "Users can delete own diary photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'diary-photos' AND auth.uid()::text = (storage.foldername(name))[1]);