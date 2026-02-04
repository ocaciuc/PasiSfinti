-- Add indexes to optimize the get_co_pilgrim_profiles RPC function
-- Index on user_pilgrimages for joining
CREATE INDEX IF NOT EXISTS idx_user_pilgrimages_user_id ON public.user_pilgrimages(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_pilgrimages_pilgrimage_id ON public.user_pilgrimages(pilgrimage_id) WHERE deleted_at IS NULL;

-- Composite index for the common join pattern
CREATE INDEX IF NOT EXISTS idx_user_pilgrimages_user_pilgrimage ON public.user_pilgrimages(user_id, pilgrimage_id) WHERE deleted_at IS NULL;

-- Index on profiles for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id) WHERE deleted_at IS NULL;

-- Index on posts for pilgrimage_id
CREATE INDEX IF NOT EXISTS idx_posts_pilgrimage_id ON public.posts(pilgrimage_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_pilgrimage_created ON public.posts(pilgrimage_id, created_at DESC) WHERE deleted_at IS NULL;

-- Index on post_likes for user lookups
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post ON public.post_likes(user_id, post_id) WHERE deleted_at IS NULL;

-- Index on user_badges for faster badge lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);