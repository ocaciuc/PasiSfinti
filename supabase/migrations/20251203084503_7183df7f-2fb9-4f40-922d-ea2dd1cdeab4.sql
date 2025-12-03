-- Drop existing public SELECT policies
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;

-- Create new SELECT policies - only enrolled users can view posts
CREATE POLICY "Enrolled users can view posts" 
ON public.posts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_pilgrimages
    WHERE user_pilgrimages.pilgrimage_id = posts.pilgrimage_id
    AND user_pilgrimages.user_id = auth.uid()
  )
);

-- Create new SELECT policies - only enrolled users can view comments
CREATE POLICY "Enrolled users can view comments" 
ON public.comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    JOIN public.user_pilgrimages ON user_pilgrimages.pilgrimage_id = posts.pilgrimage_id
    WHERE posts.id = comments.post_id
    AND user_pilgrimages.user_id = auth.uid()
  )
);