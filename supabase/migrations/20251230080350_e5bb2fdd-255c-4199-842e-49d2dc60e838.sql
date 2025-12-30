-- Fix infinite recursion in user_pilgrimages RLS policy
-- The current policy references user_pilgrimages from within itself, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own and co-participant enrollments" ON public.user_pilgrimages;

-- Create a security definer function to check if user is enrolled in a pilgrimage
CREATE OR REPLACE FUNCTION public.is_enrolled_in_pilgrimage(_user_id uuid, _pilgrimage_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_pilgrimages
    WHERE user_id = _user_id
      AND pilgrimage_id = _pilgrimage_id
      AND deleted_at IS NULL
  )
$$;

-- Create a new policy that uses the security definer function
CREATE POLICY "Users can view own and co-participant enrollments" 
ON public.user_pilgrimages 
FOR SELECT 
USING (
  deleted_at IS NULL 
  AND (
    -- Users can always see their own enrollment records
    user_id = auth.uid()
    OR
    -- Users can see co-participants if they are enrolled in the same pilgrimage
    public.is_enrolled_in_pilgrimage(auth.uid(), pilgrimage_id)
  )
);