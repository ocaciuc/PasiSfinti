 import { memo } from "react";
 import CommentItem from "./CommentItem";
 import { Comment, Badge } from "./types";
 
 interface CommentListProps {
   comments: Comment[];
   userId: string | null;
   userBadges: Record<string, Badge | null>;
   onReplyAdded: (reply: Comment, parentId: string) => void;
 }
 
 const CommentList = memo(({ comments, userId, userBadges, onReplyAdded }: CommentListProps) => {
   if (comments.length === 0) {
     return <p className="text-xs text-muted-foreground">Niciun comentariu încă.</p>;
   }
 
   return (
     <div className="pl-4 border-l-2 border-muted space-y-3">
       {comments.map(comment => (
         <CommentItem
           key={comment.id}
           comment={comment}
           userId={userId}
           userBadges={userBadges}
           onReplyAdded={onReplyAdded}
         />
       ))}
     </div>
   );
 });
 
 CommentList.displayName = "CommentList";
 
 export default CommentList;