-- Drop the overly permissive policy that allows anyone to view all badges
DROP POLICY IF EXISTS "Users can view all earned badges" ON public.user_badges;

-- Create a more restrictive policy: users can only see their own badges OR badges of co-pilgrims
CREATE POLICY "Users can view own or co-pilgrim badges" 
ON public.user_badges 
FOR SELECT 
USING (
  -- User can see their own badges
  auth.uid() = user_id
  OR
  -- User can see badges of co-pilgrims (people enrolled in the same pilgrimages)
  EXISTS (
    SELECT 1
    FROM public.user_pilgrimages up1
    JOIN public.user_pilgrimages up2 ON up1.pilgrimage_id = up2.pilgrimage_id
    WHERE up1.user_id = user_badges.user_id
      AND up2.user_id = auth.uid()
      AND up1.deleted_at IS NULL
      AND up2.deleted_at IS NULL
  )
);