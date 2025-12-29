-- Fix user_pilgrimages RLS policy to allow users to see their own enrollment records
-- The current policy has a circular dependency bug

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view co-participants only" ON public.user_pilgrimages;

-- Create a new policy that allows users to see:
-- 1. Their own enrollment records (to check if they're enrolled)
-- 2. Co-participants' records (for enrolled users)
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
    EXISTS (
      SELECT 1
      FROM user_pilgrimages my_enrollment
      WHERE my_enrollment.pilgrimage_id = user_pilgrimages.pilgrimage_id
        AND my_enrollment.user_id = auth.uid()
        AND my_enrollment.deleted_at IS NULL
    )
  )
);