import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CommentList from "@/components/comments/CommentList";
import { Comment, Badge, CommentSectionProps, COMMENTS_LIMIT, COMMENT_MAX_LENGTH } from "@/components/comments/types";

// Re-export types for backward compatibility
export type { Comment, Badge, CommentSectionProps };

const CommentSection = ({ postId, userId, userBadges, onCommentAdded }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [showTopLevelComment, setShowTopLevelComment] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [totalCommentCount, setTotalCommentCount] = useState(0);

  const fetchComments = useCallback(async (currentOffset: number, append = false) => {
    if (currentOffset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // OPTIMIZATION: Fetch comments with reply counts in one query, no replies yet
      const [commentsResult, countResult] = await Promise.all([
        supabase
          .from("comments")
          .select("id, post_id, user_id, content, created_at, parent_comment_id")
          .eq("post_id", postId)
          .is("parent_comment_id", null)
          .order("created_at", { ascending: false })
          .range(currentOffset, currentOffset + COMMENTS_LIMIT - 1),
        currentOffset === 0
          ? supabase
              .from("comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", postId)
              .is("parent_comment_id", null)
          : Promise.resolve({ count: null }),
      ]);

      if (commentsResult.error) throw commentsResult.error;
      const commentsData = commentsResult.data || [];
      const totalCount = countResult.count;

      // Fetch reply counts for each comment in one query
      const commentIds = commentsData.map(c => c.id);
      let replyCounts: Record<string, number> = {};
      
      if (commentIds.length > 0) {
        const { data: replyCountData } = await supabase
          .from("comments")
          .select("parent_comment_id")
          .eq("post_id", postId)
          .in("parent_comment_id", commentIds);
        
        (replyCountData || []).forEach(r => {
          replyCounts[r.parent_comment_id!] = (replyCounts[r.parent_comment_id!] || 0) + 1;
        });
      }

      // Fetch profiles for comment authors
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const profileMap = new Map<string, { first_name: string; avatar_url: string | null }>();

      if (userIds.length > 0 && currentUserId) {
        const { data: profilesData } = await supabase.rpc("get_profiles_by_ids", {
          requesting_user_id: currentUserId,
          target_user_ids: userIds,
        });
        (profilesData || []).forEach((p: any) => {
          profileMap.set(p.user_id, { first_name: p.first_name, avatar_url: p.avatar_url });
        });
      }

      const commentsWithAuthors: Comment[] = commentsData.map(comment => {
        const author = profileMap.get(comment.user_id);
        return {
          id: comment.id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          parent_comment_id: comment.parent_comment_id,
          author_name: author?.first_name || "Utilizator",
          author_avatar: author?.avatar_url || null,
          reply_count: replyCounts[comment.id] || 0,
          post_id: postId,
        };
      });

      if (append) {
        setComments(prev => [...prev, ...commentsWithAuthors]);
      } else {
        setComments(commentsWithAuthors);
      }

      setOffset(currentOffset + commentsData.length);
      if (totalCount !== null) {
        setHasMore(currentOffset + commentsData.length < totalCount);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setInitialLoad(false);
    }
  }, [postId]);

  useEffect(() => {
    if (expanded && initialLoad) {
      fetchComments(0);
    }
  }, [expanded, fetchComments, initialLoad]);

  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const { count } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", postId);
        setTotalCommentCount(count || 0);
      } catch (error) {
        console.error("Error fetching comment count:", error);
      }
    };
    fetchCommentCount();
  }, [postId]);

  const handleLoadMore = () => {
    fetchComments(offset, true);
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || !userId) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: userId,
          content: text,
          parent_comment_id: null,
        })
        .select("id, user_id, content, created_at, parent_comment_id")
        .single();

      if (error) throw error;

      let authorName = "Utilizator";
      let authorAvatar: string | null = null;

      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("first_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (authorProfile) {
        authorName = authorProfile.first_name;
        authorAvatar = authorProfile.avatar_url;
      }

      const newComment: Comment = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        parent_comment_id: data.parent_comment_id,
        author_name: authorName,
        author_avatar: authorAvatar,
        reply_count: 0,
        post_id: postId,
      };

      setComments(prev => [newComment, ...prev]);
      onCommentAdded(newComment, null);
      setTotalCommentCount(prev => prev + 1);

      setCommentText("");
      setShowTopLevelComment(false);
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };

  const handleReplyAdded = useCallback((reply: Comment, parentId: string) => {
    setTotalCommentCount(prev => prev + 1);
    onCommentAdded(reply, parentId);
  }, [onCommentAdded]);

  if (!expanded) {
    return (
      <div className="mt-3">
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {totalCommentCount > 0 
            ? `Vezi ${totalCommentCount} ${totalCommentCount === 1 ? 'comentariu' : 'comentarii'}...`
            : 'Adaugă un comentariu...'}
        </button>
      </div>
    );
  }

  if (initialLoad && loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {!showTopLevelComment && (
        <button
          onClick={() => setShowTopLevelComment(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Adaugă un comentariu...
        </button>
      )}

      {showTopLevelComment && (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Textarea
              placeholder="Scrie un comentariu..."
              value={commentText}
              onChange={e => setCommentText(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
              maxLength={COMMENT_MAX_LENGTH}
              className="min-h-[60px] text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">
              {commentText.length}/{COMMENT_MAX_LENGTH}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              size="sm"
            >
              Comentează
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowTopLevelComment(false);
                setCommentText("");
              }}
            >
              Anulează
            </Button>
          </div>
        </div>
      )}

      <CommentList
        comments={comments}
        userId={userId}
        userBadges={userBadges}
        onReplyAdded={handleReplyAdded}
      />

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors w-full justify-center py-2"
        >
          {loadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Se încarcă...
            </>
          ) : (
            "Vezi mai multe comentarii"
          )}
        </button>
      )}
    </div>
  );
};

export default CommentSection;
