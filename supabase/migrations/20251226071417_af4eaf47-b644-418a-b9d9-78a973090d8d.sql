-- Fix privacy issue: Restrict user_pilgrimages visibility to co-participants only
-- This prevents tracking of individual users' religious activities

DROP POLICY IF EXISTS "Users can view all pilgrimage participants" ON public.user_pilgrimages;

CREATE POLICY "Users can view co-participants only"
ON public.user_pilgrimages FOR SELECT
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.user_pilgrimages up2
    WHERE up2.pilgrimage_id = user_pilgrimages.pilgrimage_id
    AND up2.user_id = auth.uid()
    AND up2.deleted_at IS NULL
  )
);