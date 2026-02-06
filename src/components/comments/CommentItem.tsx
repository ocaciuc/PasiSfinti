import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isValid, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import UserBadge from "@/components/UserBadge";
import CommentAvatar from "./CommentAvatar";
import { Comment, Badge, REPLIES_LIMIT, COMMENT_MAX_LENGTH } from "./types";
 
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
 
 interface CommentItemProps {
   comment: Comment;
   userId: string | null;
   userBadges: Record<string, Badge | null>;
   onReplyAdded: (reply: Comment, parentId: string) => void;
 }
 
 const CommentItem = memo(({ comment, userId, userBadges, onReplyAdded }: CommentItemProps) => {
   const [replies, setReplies] = useState<Comment[]>([]);
   const [repliesExpanded, setRepliesExpanded] = useState(false);
   const [loadingReplies, setLoadingReplies] = useState(false);
   const [hasMoreReplies, setHasMoreReplies] = useState(false);
   const [repliesOffset, setRepliesOffset] = useState(0);
   const [replyingTo, setReplyingTo] = useState(false);
   const [replyText, setReplyText] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [localReplyCount, setLocalReplyCount] = useState(comment.reply_count || 0);
 
   const fetchReplies = useCallback(async (offset: number, append = false) => {
     setLoadingReplies(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       const currentUserId = user?.id;
 
       // Fetch replies with pagination
       const { data: repliesData, error } = await supabase
         .from("comments")
         .select("id, user_id, content, created_at, parent_comment_id")
         .eq("parent_comment_id", comment.id)
         .order("created_at", { ascending: true })
         .range(offset, offset + REPLIES_LIMIT - 1);
 
       if (error) throw error;
 
       // Fetch profiles for reply authors in parallel
       const replyUserIds = [...new Set((repliesData || []).map(r => r.user_id))];
       
        const profileMap = new Map<string, { first_name: string; avatar_url: string | null }>();
        if (currentUserId && replyUserIds.length > 0) {
          const { data: profilesData } = await supabase.rpc("get_profiles_by_ids", {
            requesting_user_id: currentUserId,
            target_user_ids: replyUserIds,
          });
          (profilesData || []).forEach((p: any) => {
            profileMap.set(p.user_id, { first_name: p.first_name, avatar_url: p.avatar_url });
          });
        }
 
       const repliesWithAuthors: Comment[] = (repliesData || []).map(reply => {
         const author = profileMap.get(reply.user_id);
         return {
           id: reply.id,
           user_id: reply.user_id,
           content: reply.content,
           created_at: reply.created_at,
           parent_comment_id: reply.parent_comment_id,
           author_name: author?.first_name || "Utilizator",
           author_avatar: author?.avatar_url || null,
         };
       });
 
       if (append) {
         setReplies(prev => [...prev, ...repliesWithAuthors]);
       } else {
         setReplies(repliesWithAuthors);
       }
 
       setRepliesOffset(offset + (repliesData?.length || 0));
       setHasMoreReplies((repliesData?.length || 0) >= REPLIES_LIMIT);
     } catch (error) {
       console.error("Error fetching replies:", error);
     } finally {
       setLoadingReplies(false);
     }
   }, [comment.id]);
 
   const handleExpandReplies = useCallback(() => {
     if (!repliesExpanded && replies.length === 0) {
       fetchReplies(0);
     }
     setRepliesExpanded(!repliesExpanded);
   }, [repliesExpanded, replies.length, fetchReplies]);
 
   const handleLoadMoreReplies = useCallback(() => {
     fetchReplies(repliesOffset, true);
   }, [fetchReplies, repliesOffset]);
 
   const handleSubmitReply = useCallback(async () => {
     const text = replyText.trim();
     if (!text || !userId) return;
 
     setSubmitting(true);
     try {
       const { data, error } = await supabase
         .from("comments")
         .insert({
           post_id: comment.post_id || "",
           user_id: userId,
           content: text,
           parent_comment_id: comment.id,
         })
         .select("id, user_id, content, created_at, parent_comment_id, post_id")
         .single();
 
       if (error) throw error;
 
       // Fetch current user profile
       const { data: authorProfile } = await supabase
         .from("profiles")
         .select("first_name, avatar_url")
         .eq("user_id", userId)
         .maybeSingle();
 
       const newReply: Comment = {
         id: data.id,
         user_id: data.user_id,
         content: data.content,
         created_at: data.created_at,
         parent_comment_id: data.parent_comment_id,
         author_name: authorProfile?.first_name || "Utilizator",
         author_avatar: authorProfile?.avatar_url || null,
       };
 
       setReplies(prev => [...prev, newReply]);
       setLocalReplyCount(prev => prev + 1);
       setReplyText("");
       setReplyingTo(false);
       setRepliesExpanded(true);
       onReplyAdded(newReply, comment.id);
     } catch (error) {
       console.error("Error creating reply:", error);
     } finally {
       setSubmitting(false);
     }
   }, [replyText, userId, comment.id, comment.parent_comment_id, onReplyAdded]);
 
   return (
     <div className="space-y-2">
      <div className="flex items-start gap-2">
        <CommentAvatar src={comment.author_avatar} name={comment.author_name} size="md" />
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
           <div className="flex items-center gap-3 mt-1">
             <button
               onClick={() => setReplyingTo(!replyingTo)}
               className="text-xs text-muted-foreground hover:text-foreground"
             >
               Răspunde
             </button>
             {localReplyCount > 0 && (
               <button
                 onClick={handleExpandReplies}
                 className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
               >
                 {repliesExpanded ? (
                   <>
                     <ChevronUp className="h-3 w-3" />
                     Ascunde {localReplyCount} {localReplyCount === 1 ? 'răspuns' : 'răspunsuri'}
                   </>
                 ) : (
                   <>
                     <ChevronDown className="h-3 w-3" />
                     Vezi {localReplyCount} {localReplyCount === 1 ? 'răspuns' : 'răspunsuri'}
                   </>
                 )}
               </button>
             )}
           </div>
         </div>
       </div>
 
       {/* Reply input */}
       {replyingTo && (
         <div className="flex gap-2 ml-8">
           <div className="flex-1 space-y-1">
             <Textarea
               placeholder="Scrie un răspuns..."
               value={replyText}
               onChange={(e) => setReplyText(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
               maxLength={COMMENT_MAX_LENGTH}
               className="min-h-[50px] text-sm"
             />
             <p className="text-xs text-muted-foreground text-right">
               {replyText.length}/{COMMENT_MAX_LENGTH}
             </p>
           </div>
           <div className="flex flex-col gap-1">
             <Button
               onClick={handleSubmitReply}
               disabled={!replyText.trim() || submitting}
               size="sm"
             >
               {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Trimite"}
             </Button>
             <Button
               variant="ghost"
               size="sm"
               onClick={() => {
                 setReplyingTo(false);
                 setReplyText("");
               }}
             >
               Anulează
             </Button>
           </div>
         </div>
       )}
 
       {/* Replies section */}
       {repliesExpanded && (
         <div className="pl-4 border-l border-muted/50 space-y-2 mt-2 ml-4">
           {loadingReplies && replies.length === 0 ? (
             <div className="flex items-center gap-2 py-2">
               <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
               <span className="text-xs text-muted-foreground">Se încarcă...</span>
             </div>
           ) : (
             <>
               {replies.map(reply => (
                 <ReplyItem key={reply.id} reply={reply} userBadges={userBadges} />
               ))}
               {hasMoreReplies && (
                 <button
                   onClick={handleLoadMoreReplies}
                   disabled={loadingReplies}
                   className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                 >
                   {loadingReplies ? (
                     <Loader2 className="h-3 w-3 animate-spin" />
                   ) : (
                     "Vezi mai multe răspunsuri"
                   )}
                 </button>
               )}
             </>
           )}
         </div>
       )}
     </div>
   );
 });
 
 CommentItem.displayName = "CommentItem";
 
 // Separate memoized component for replies to prevent re-renders
const ReplyItem = memo(({ reply, userBadges }: { reply: Comment; userBadges: Record<string, Badge | null> }) => (
  <div className="flex items-start gap-2">
    <CommentAvatar src={reply.author_avatar} name={reply.author_name} size="sm" />
     <div className="flex-1">
       <div className="flex items-center gap-1">
         <p className="text-xs font-medium">{reply.author_name}</p>
         {userBadges[reply.user_id] && (
           <UserBadge badge={userBadges[reply.user_id]!} size="sm" />
         )}
       </div>
       <p className="text-xs text-muted-foreground">
         {safeFormatDate(reply.created_at, "d MMM, HH:mm")}
       </p>
       <p className="text-sm mt-1">{reply.content}</p>
     </div>
   </div>
 ));
 
 ReplyItem.displayName = "ReplyItem";
 
 export default CommentItem;