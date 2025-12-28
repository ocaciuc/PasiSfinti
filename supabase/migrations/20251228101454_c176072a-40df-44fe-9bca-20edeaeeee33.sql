-- Drop the existing co-pilgrim policy that exposes too much data
DROP POLICY IF EXISTS "Co-pilgrims can view limited profile info" ON public.profiles;

-- Create a new, more restrictive policy that only allows viewing own profile
-- Co-pilgrims should use the get_co_pilgrim_profiles() function instead which only returns first_name and avatar_url
-- The "Users can view own profile" policy already exists, so we just remove the broad co-pilgrim access

-- Note: The get_co_pilgrim_profiles() SECURITY DEFINER function already exists and 
-- properly limits data exposure to only user_id, first_name, and avatar_url