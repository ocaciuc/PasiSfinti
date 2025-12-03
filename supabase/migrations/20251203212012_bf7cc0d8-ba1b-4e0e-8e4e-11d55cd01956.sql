-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new restrictive policy: users can see own profile OR profiles of users in shared pilgrimages
CREATE POLICY "Users can view own profile and co-pilgrims" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_pilgrimages up1
    JOIN public.user_pilgrimages up2 ON up1.pilgrimage_id = up2.pilgrimage_id
    WHERE up1.user_id = auth.uid()
    AND up2.user_id = profiles.user_id
  )
);