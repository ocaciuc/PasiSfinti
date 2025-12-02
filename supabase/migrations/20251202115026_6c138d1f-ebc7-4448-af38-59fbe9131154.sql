-- Add parent_comment_id to comments table for threaded replies
ALTER TABLE public.comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_comments_parent_comment_id ON public.comments(parent_comment_id);