 import { useQueryClient } from "@tanstack/react-query";
 import { useCallback } from "react";
 import { Comment } from "@/components/comments/types";
 
 // Cache keys for comments
 export const getCommentsQueryKey = (postId: string) => ["comments", postId];
 export const getRepliesQueryKey = (commentId: string) => ["replies", commentId];
 
 // Stale times
 export const COMMENTS_STALE_TIME = 2 * 60 * 1000; // 2 minutes
 export const COMMENTS_GC_TIME = 5 * 60 * 1000; // 5 minutes
 export const REPLIES_STALE_TIME = 3 * 60 * 1000; // 3 minutes
 export const REPLIES_GC_TIME = 10 * 60 * 1000; // 10 minutes
 
 export function useCommentCache() {
   const queryClient = useQueryClient();
 
   const invalidateComments = useCallback(
     (postId: string) => {
       queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(postId) });
     },
     [queryClient]
   );
 
   const invalidateReplies = useCallback(
     (commentId: string) => {
       queryClient.invalidateQueries({ queryKey: getRepliesQueryKey(commentId) });
     },
     [queryClient]
   );
 
   const addCommentToCache = useCallback(
     (postId: string, comment: Comment) => {
       queryClient.setQueryData(
         getCommentsQueryKey(postId),
         (old: { comments: Comment[]; total: number } | undefined) => {
           if (!old) return { comments: [comment], total: 1 };
           return {
             comments: [comment, ...old.comments],
             total: old.total + 1,
           };
         }
       );
     },
     [queryClient]
   );
 
   const addReplyToCache = useCallback(
     (parentCommentId: string, reply: Comment) => {
       queryClient.setQueryData(
         getRepliesQueryKey(parentCommentId),
         (old: Comment[] | undefined) => {
           if (!old) return [reply];
           return [...old, reply];
         }
       );
     },
     [queryClient]
   );
 
   const prefetchComments = useCallback(
     async (postId: string, fetchFn: () => Promise<{ comments: Comment[]; total: number }>) => {
       await queryClient.prefetchQuery({
         queryKey: getCommentsQueryKey(postId),
         queryFn: fetchFn,
         staleTime: COMMENTS_STALE_TIME,
       });
     },
     [queryClient]
   );
 
   return {
     invalidateComments,
     invalidateReplies,
     addCommentToCache,
     addReplyToCache,
     prefetchComments,
   };
 }