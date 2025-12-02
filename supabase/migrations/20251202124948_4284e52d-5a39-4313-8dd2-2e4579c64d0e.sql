-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view posts for pilgrimages they joined" ON public.posts;
DROP POLICY IF EXISTS "Users can view comments on posts they can see" ON public.comments;

-- Create new public SELECT policies for posts
CREATE POLICY "Anyone can view posts" 
ON public.posts 
FOR SELECT 
USING (true);

-- Create new public SELECT policies for comments
CREATE POLICY "Anyone can view comments" 
ON public.comments 
FOR SELECT 
USING (true);