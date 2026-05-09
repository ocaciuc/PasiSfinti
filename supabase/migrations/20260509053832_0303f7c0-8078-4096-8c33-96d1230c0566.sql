
-- 1. Fix diary-photos INSERT policy: enforce path ownership
DROP POLICY IF EXISTS "Authenticated users can upload diary photos" ON storage.objects;
CREATE POLICY "Users can upload own diary photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diary-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2. Add UPDATE policy for diary-photos
CREATE POLICY "Users can update own diary photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diary-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'diary-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 3. Tighten avatars SELECT (listing) to authenticated only.
-- Public CDN file fetch still works because the bucket is public.
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can list avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- 4. Add caller-identity check to profile-fetch RPCs
CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(requesting_user_id uuid, target_user_ids uuid[])
 RETURNS TABLE(user_id uuid, first_name text, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF requesting_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'requesting_user_id must match authenticated user';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.first_name,
    p.avatar_url
  FROM profiles p
  WHERE p.user_id = ANY(target_user_ids)
    AND p.deleted_at IS NULL
    AND (p.is_deleted IS NULL OR p.is_deleted = false)
    AND (
      p.user_id = requesting_user_id
      OR EXISTS (
        SELECT 1
        FROM user_pilgrimages up1
        JOIN user_pilgrimages up2 ON up1.pilgrimage_id = up2.pilgrimage_id
        WHERE up1.user_id = requesting_user_id
          AND up2.user_id = p.user_id
          AND up1.deleted_at IS NULL
          AND up2.deleted_at IS NULL
      )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_co_pilgrim_profiles(requesting_user_id uuid)
 RETURNS TABLE(user_id uuid, first_name text, avatar_url text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF requesting_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'requesting_user_id must match authenticated user';
  END IF;

  RETURN QUERY
  SELECT DISTINCT p.user_id, p.first_name, p.avatar_url
  FROM public.profiles p
  JOIN public.user_pilgrimages up1 ON up1.user_id = p.user_id
  JOIN public.user_pilgrimages up2 ON up1.pilgrimage_id = up2.pilgrimage_id
  WHERE up2.user_id = requesting_user_id
    AND p.user_id != requesting_user_id;
END;
$function$;

-- 5. Revoke EXECUTE from anon on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_profiles_by_ids(uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_co_pilgrim_profiles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.evaluate_and_award_badges(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_enrolled_in_pilgrimage(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- These should never be callable directly from the API
REVOKE EXECUTE ON FUNCTION public.notify_candle_expiry() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_pilgrimage_reminders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_pilgrimage_starting_soon() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_stale_pending_candles() FROM anon, authenticated;
