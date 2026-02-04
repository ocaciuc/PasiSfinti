import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isValid, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import UserBadge from "@/components/UserBadge";

interface Badge {
  id: string;
  name: string;
  name_ro: string;
  description: string;
  icon_name: string;
  priority: number;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  parent_comment_id: string | null;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  userId: string | null;
  userBadges: Record<string, Badge | null>;
  onCommentAdded: (comment: Comment, parentCommentId: string | null) => void;
}

const COMMENTS_LIMIT = 10;
const COMMENT_MAX_LENGTH = 2000;

const safeFormatDate = (dateString: string | null | undefined, formatStr: string): string => {
  if (!dateString) return "Data necunoscută";
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return "Data necunoscută";
    return format(date, formatStr, { locale: ro });
  } catch {
    return "Data necunoscută";
  }
};

const CommentSection = ({ postId, userId, userBadges, onCommentAdded }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showTopLevelComment, setShowTopLevelComment] = useState(false);
  const [expanded, setExpanded] = useState(false); // Start collapsed for performance
  const [totalCommentCount, setTotalCommentCount] = useState(0);

  const fetchComments = useCallback(async (currentOffset: number, append = false) => {
    if (currentOffset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Get current user ID first (needed for profile fetching)
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // OPTIMIZATION: Run all independent queries in parallel
      const [commentsResult, countResult, ownProfileResult, coProfilesResult] = await Promise.all([
        // 1. Fetch top-level comments with pagination
        supabase
          .from("comments")
          .select("id, post_id, user_id, content, created_at, parent_comment_id")
          .eq("post_id", postId)
          .is("parent_comment_id", null)
          .order("created_at", { ascending: false })
          .range(currentOffset, currentOffset + COMMENTS_LIMIT - 1),
        
        // 2. Get total count (only on first load, reuse cached count for load more)
        currentOffset === 0
          ? supabase
              .from("comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", postId)
              .is("parent_comment_id", null)
          : Promise.resolve({ count: null }),
        
        // 3. Fetch own profile (allowed by RLS)
        currentUserId
          ? supabase
              .from("profiles")
              .select("first_name, avatar_url, user_id")
              .eq("user_id", currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        
        // 4. Fetch co-pilgrim profiles using secure RPC
        currentUserId
          ? supabase.rpc("get_co_pilgrim_profiles", { requesting_user_id: currentUserId })
          : Promise.resolve({ data: [] }),
      ]);

      if (commentsResult.error) throw commentsResult.error;
      const commentsData = commentsResult.data || [];
      const totalCount = countResult.count;
      
      // Build profile map from parallel results
      const profileMap = new Map<string, { first_name: string; avatar_url: string | null }>();
      
      // Add own profile
      if (ownProfileResult.data) {
        profileMap.set(ownProfileResult.data.user_id, {
          first_name: ownProfileResult.data.first_name,
          avatar_url: ownProfileResult.data.avatar_url,
        });
      }
      
      // Add co-pilgrim profiles
      (coProfilesResult.data || []).forEach((p: any) => {
        profileMap.set(p.user_id, { first_name: p.first_name, avatar_url: p.avatar_url });
      });

      // Now fetch replies (depends on commentsData)
      const topLevelCommentIds = commentsData.map((c) => c.id);
      
      let repliesData: any[] = [];
      if (topLevelCommentIds.length > 0) {
        const { data } = await supabase
          .from("comments")
          .select("id, post_id, user_id, content, created_at, parent_comment_id")
          .eq("post_id", postId)
          .in("parent_comment_id", topLevelCommentIds)
          .order("created_at", { ascending: true });
        repliesData = data || [];
      }

      // Build comments with author info
      const commentsWithAuthors: Comment[] = commentsData.map((comment) => {
        const author = profileMap.get(comment.user_id);
        const commentReplies = repliesData
          .filter((r) => r.parent_comment_id === comment.id)
          .map((reply) => {
            const replyAuthor = profileMap.get(reply.user_id);
            return {
              id: reply.id,
              user_id: reply.user_id,
              content: reply.content,
              created_at: reply.created_at,
              parent_comment_id: reply.parent_comment_id,
              author_name: replyAuthor?.first_name || "Utilizator",
              author_avatar: replyAuthor?.avatar_url || null,
            };
          });

        return {
          id: comment.id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          parent_comment_id: comment.parent_comment_id,
          author_name: author?.first_name || "Utilizator",
          author_avatar: author?.avatar_url || null,
          replies: commentReplies,
        };
      });

      if (append) {
        setComments((prev) => [...prev, ...commentsWithAuthors]);
      } else {
        setComments(commentsWithAuthors);
      }

      setOffset(currentOffset + commentsData.length);
      // Use cached count for "load more", only update on first load
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

  // Only load comments when expanded (lazy load for performance)
  useEffect(() => {
    if (expanded && initialLoad) {
      fetchComments(0);
    }
  }, [expanded, fetchComments, initialLoad]);

  // Fetch just the comment count initially (fast query for collapsed state)
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

  const handleSubmitComment = async (parentCommentId: string | null = null) => {
    const text = commentText.trim();
    if (!text || !userId) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: userId,
          content: text,
          parent_comment_id: parentCommentId,
        })
        .select("id, user_id, content, created_at, parent_comment_id")
        .single();

      if (error) throw error;

      // Fetch current user profile (own profile - allowed by RLS)
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
      };

      // Update local state
      if (!parentCommentId) {
        setComments((prev) => [{ ...newComment, replies: [] }, ...prev]);
      } else {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === parentCommentId
              ? { ...comment, replies: [...(comment.replies || []), newComment] }
              : comment
          )
        );
      }

      // Notify parent
      onCommentAdded(newComment, parentCommentId);
      
      // Update comment count
      setTotalCommentCount((prev) => prev + 1);

      setCommentText("");
      setReplyingTo(null);
      setShowTopLevelComment(false);
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className="space-y-2">
      <div className="flex items-start gap-2">
        <Avatar className={isReply ? "w-5 h-5" : "w-6 h-6"}>
          <AvatarImage src={comment.author_avatar || undefined} loading="lazy" />
          <AvatarFallback className="text-xs">
            {comment.author_name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium">{comment.author_name}</p>
            {userBadges[comment.user_id] && (
              <UserBadge badge={userBadges[comment.user_id]!} size="sm" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {safeFormatDate(comment.created_at, "d MMM, HH:mm")}
          </p>
          <p className="text-sm mt-1">{comment.content}</p>
          {!isReply && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              Răspunde
            </button>
          )}
        </div>
      </div>

      {/* Reply input */}
      {replyingTo === comment.id && (
        <div className="flex gap-2 ml-8">
          <div className="flex-1 space-y-1">
            <Textarea
              placeholder="Scrie un răspuns..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
              maxLength={COMMENT_MAX_LENGTH}
              className="min-h-[50px] text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">
              {commentText.length}/{COMMENT_MAX_LENGTH}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => handleSubmitComment(comment.id)}
              disabled={!commentText.trim()}
              size="sm"
            >
              Trimite
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyingTo(null);
                setCommentText("");
              }}
            >
              Anulează
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-4 border-l border-muted/50 space-y-2 mt-2">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  // Collapsed state - show expand button with comment count
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
      {/* Top-level comment button */}
      {!showTopLevelComment && (
        <button
          onClick={() => setShowTopLevelComment(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Adaugă un comentariu...
        </button>
      )}

      {/* Top-level comment input */}
      {showTopLevelComment && (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Textarea
              placeholder="Scrie un comentariu..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
              maxLength={COMMENT_MAX_LENGTH}
              className="min-h-[60px] text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">
              {commentText.length}/{COMMENT_MAX_LENGTH}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => handleSubmitComment(null)}
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

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="pl-4 border-l-2 border-muted space-y-3">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}

      {/* Load more button */}
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

      {comments.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">Niciun comentariu încă.</p>
      )}
    </div>
  );
};

export default CommentSection;
