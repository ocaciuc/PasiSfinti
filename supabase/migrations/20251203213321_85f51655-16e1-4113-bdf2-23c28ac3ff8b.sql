-- Drop the problematic view
DROP VIEW IF EXISTS public.public_profiles;

-- Create a security definer function to safely get co-pilgrim profiles
CREATE OR REPLACE FUNCTION public.get_co_pilgrim_profiles(requesting_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.user_id, p.first_name, p.avatar_url
  FROM public.profiles p
  JOIN public.user_pilgrimages up1 ON up1.user_id = p.user_id
  JOIN public.user_pilgrimages up2 ON up1.pilgrimage_id = up2.pilgrimage_id
  WHERE up2.user_id = requesting_user_id
    AND p.user_id != requesting_user_id
$$;