 export interface Badge {
   id: string;
   name: string;
   name_ro: string;
   description: string;
   icon_name: string;
   priority: number;
 }
 
 export interface Comment {
   id: string;
   user_id: string;
   content: string;
   created_at: string;
   author_name: string;
   author_avatar: string | null;
   parent_comment_id: string | null;
   reply_count?: number;
   post_id?: string;
 }
 
 export interface CommentSectionProps {
   postId: string;
   userId: string | null;
   userBadges: Record<string, Badge | null>;
   onCommentAdded: (comment: Comment, parentCommentId: string | null) => void;
 }
 
 export const COMMENTS_LIMIT = 10;
 export const REPLIES_LIMIT = 5;
 export const COMMENT_MAX_LENGTH = 2000;