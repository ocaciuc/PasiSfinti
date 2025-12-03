-- Drop the current policy that exposes full profile to co-pilgrims
DROP POLICY IF EXISTS "Users can view own profile and co-pilgrims" ON public.profiles;

-- Create new policy: users can ONLY see their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a public_profiles view with limited fields for co-pilgrims
CREATE VIEW public.public_profiles AS
SELECT 
  user_id,
  first_name,
  avatar_url
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;