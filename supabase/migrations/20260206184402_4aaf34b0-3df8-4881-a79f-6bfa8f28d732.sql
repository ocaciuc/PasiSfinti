
-- Create a targeted profile fetch function that only returns profiles for specific user IDs.
-- This replaces the expensive get_co_pilgrim_profiles() which returns ALL co-pilgrims (~6MB).
-- The new function accepts an array of user_ids and returns only those profiles,
-- but still validates that the requesting user shares at least one pilgrimage with each target.

CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(
  requesting_user_id UUID,
  target_user_ids UUID[]
)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.user_id,
    p.first_name,
    p.avatar_url
  FROM profiles p
  WHERE p.user_id = ANY(target_user_ids)
    AND p.deleted_at IS NULL
    AND (p.is_deleted IS NULL OR p.is_deleted = false)
    AND (
      -- The target user IS the requesting user (always allowed to see own profile)
      p.user_id = requesting_user_id
      OR
      -- The target user shares at least one pilgrimage with the requesting user
      EXISTS (
        SELECT 1
        FROM user_pilgrimages up1
        JOIN user_pilgrimages up2 ON up1.pilgrimage_id = up2.pilgrimage_id
        WHERE up1.user_id = requesting_user_id
          AND up2.user_id = p.user_id
          AND up1.deleted_at IS NULL
          AND up2.deleted_at IS NULL
      )
    );
$$;
