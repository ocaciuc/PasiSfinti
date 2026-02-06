
-- Fix: Restrict post_likes SELECT to only enrolled pilgrimage participants
-- Previously allowed any authenticated user to view all likes

DROP POLICY IF EXISTS "Users can view all likes" ON public.post_likes;

CREATE POLICY "Enrolled users can view post likes"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.posts p
      JOIN public.user_pilgrimages up ON up.pilgrimage_id = p.pilgrimage_id
      WHERE p.id = post_likes.post_id
        AND up.user_id = auth.uid()
        AND up.deleted_at IS NULL
        AND p.deleted_at IS NULL
    )
  );
