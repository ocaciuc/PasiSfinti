
-- 1. Fix v_profiles_active: enable security_invoker so RLS from profiles applies
CREATE OR REPLACE VIEW public.v_profiles_active
WITH (security_invoker = true)
AS
SELECT id, user_id, first_name, last_name, age, religion, city, parish, avatar_url, created_at, updated_at, bio, deleted_at, is_deleted
FROM profiles
WHERE deleted_at IS NULL AND is_deleted = false;

-- 2. Fix user_badges: replace open INSERT policy with service_role only
DROP POLICY IF EXISTS "System can award badges" ON public.user_badges;
CREATE POLICY "Only service role can award badges"
ON public.user_badges
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Fix user_roles: add explicit deny for non-admin INSERT
-- The existing ALL policy for admins covers admin inserts.
-- Add a restrictive INSERT policy that blocks everyone else.
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
