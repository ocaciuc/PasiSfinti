-- Add indexes to optimize comment loading performance
-- Index for fetching comments by post_id (most common query)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);

-- Index for fetching top-level comments (parent_comment_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_comments_post_parent ON public.comments(post_id, parent_comment_id) 
WHERE deleted_at IS NULL;

-- Index for ordering by created_at
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments(post_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Composite index for the common query pattern: top-level comments ordered by date
CREATE INDEX IF NOT EXISTS idx_comments_toplevel_ordered ON public.comments(post_id, created_at DESC) 
WHERE parent_comment_id IS NULL AND deleted_at IS NULL;