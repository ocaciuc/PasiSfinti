 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 
 interface Badge {
   id: string;
   name: string;
   name_ro: string;
   description: string;
   icon_name: string;
   priority: number;
 }
 
 interface Post {
   id: string;
   user_id: string;
   content: string;
   likes_count: number;
   created_at: string;
   author_name: string;
   author_avatar: string | null;
   user_has_liked: boolean;
 }
 
 interface Pilgrimage {
   id: string;
   title: string;
   description: string;
   location: string;
   city: string;
   start_date: string;
   end_date: string | null;
   participant_count: number;
   map_url: string | null;
 }
 
 interface PilgrimageData {
   pilgrimage: Pilgrimage | null;
   posts: Post[];
   isRegistered: boolean;
   userId: string | null;
   userBadges: Record<string, Badge | null>;
 }
 
 // Stale times for different data types (stale-while-revalidate strategy)
 const PILGRIMAGE_STALE_TIME = 10 * 60 * 1000; // 10 minutes
 const PILGRIMAGE_GC_TIME = 15 * 60 * 1000; // 15 minutes
 
 async function fetchPilgrimageDetails(pilgrimageId: string): Promise<Pilgrimage | null> {
   const { data, error } = await supabase
     .from("pilgrimages")
     .select("id, title, description, location, city, start_date, end_date, participant_count, map_url")
     .eq("id", pilgrimageId)
     .single();
 
   if (error) throw error;
   return data;
 }
 
 async function fetchPilgrimageCommunityData(
   pilgrimageId: string,
   currentUserId: string | null
 ): Promise<{
   posts: Post[];
   isRegistered: boolean;
   userBadges: Record<string, Badge | null>;
 }> {
   // Fetch all community data in parallel
   const [userPilgrimagesResult, postsResult, coProfilesResult, ownProfileResult] = await Promise.all([
     supabase.from("user_pilgrimages").select("user_id").eq("pilgrimage_id", pilgrimageId),
     supabase
       .from("posts")
       .select("id, user_id, content, likes_count, created_at")
       .eq("pilgrimage_id", pilgrimageId)
       .order("created_at", { ascending: false }),
     currentUserId
       ? supabase.rpc("get_co_pilgrim_profiles", { requesting_user_id: currentUserId })
       : Promise.resolve({ data: [], error: null }),
     currentUserId
       ? supabase.from("profiles").select("first_name, avatar_url").eq("user_id", currentUserId).maybeSingle()
       : Promise.resolve({ data: null, error: null }),
   ]);
 
   // Check if current user is enrolled
   const participantUserIds = (userPilgrimagesResult.data || []).map((up: any) => up.user_id);
   const isRegistered = currentUserId ? participantUserIds.includes(currentUserId) : false;
 
   // Build profile map
   const profileMap = new Map<string, { first_name: string; avatar_url: string | null }>();
   (coProfilesResult.data || []).forEach((p: any) => {
     profileMap.set(p.user_id, { first_name: p.first_name, avatar_url: p.avatar_url });
   });
   if (currentUserId && ownProfileResult.data) {
     profileMap.set(currentUserId, {
       first_name: ownProfileResult.data.first_name,
       avatar_url: ownProfileResult.data.avatar_url,
     });
   }
 
   // Get post IDs for likes query
   const postIds = (postsResult.data || []).map((p: any) => p.id);
   const allUserIdsForBadges = [...new Set((postsResult.data || []).map((p: any) => p.user_id))];
 
   // Fetch likes and badges in parallel
   const [userLikesResult, allUserBadgesResult] = await Promise.all([
     currentUserId && postIds.length > 0
       ? supabase.from("post_likes").select("post_id").eq("user_id", currentUserId).in("post_id", postIds)
       : Promise.resolve({ data: [], error: null }),
     allUserIdsForBadges.length > 0
       ? supabase
           .from("user_badges")
           .select(`user_id, badges (id, name, name_ro, description, icon_name, priority)`)
           .in("user_id", allUserIdsForBadges)
       : Promise.resolve({ data: [], error: null }),
   ]);
 
   const likedPostIds = new Set((userLikesResult.data || []).map((l: any) => l.post_id));
 
   // Build posts with all details
   const posts: Post[] = (postsResult.data || []).map((post: any) => {
     const authorProfile = profileMap.get(post.user_id);
     return {
       id: post.id,
       user_id: post.user_id,
       content: post.content,
       likes_count: post.likes_count || 0,
       created_at: post.created_at,
       author_name: authorProfile?.first_name || "Utilizator",
       author_avatar: authorProfile?.avatar_url || null,
       user_has_liked: likedPostIds.has(post.id),
     };
   });
 
   // Process badges
   const badgesMap: Record<string, Badge | null> = {};
   const userBadgesGroup = new Map<string, any[]>();
 
   (allUserBadgesResult.data || []).forEach((ub: any) => {
     if (!userBadgesGroup.has(ub.user_id)) {
       userBadgesGroup.set(ub.user_id, []);
     }
     if (ub.badges) {
       userBadgesGroup.get(ub.user_id)!.push(ub.badges);
     }
   });
 
   userBadgesGroup.forEach((badges, uid) => {
     if (badges.length > 0) {
       badges.sort((a, b) => a.priority - b.priority);
       badgesMap[uid] = badges[0];
     }
   });
 
   allUserIdsForBadges.forEach((uid) => {
     if (!badgesMap[uid]) {
       badgesMap[uid] = null;
     }
   });
 
   return { posts, isRegistered, userBadges: badgesMap };
 }
 
 export function usePilgrimageDetails(pilgrimageId: string | undefined) {
   return useQuery({
     queryKey: ["pilgrimage", pilgrimageId],
     queryFn: () => fetchPilgrimageDetails(pilgrimageId!),
     enabled: !!pilgrimageId,
     staleTime: PILGRIMAGE_STALE_TIME,
     gcTime: PILGRIMAGE_GC_TIME,
   });
 }
 
 export function usePilgrimageCommunity(
   pilgrimageId: string | undefined,
   userId: string | null,
   enabled: boolean = true
 ) {
   return useQuery({
     queryKey: ["pilgrimage-community", pilgrimageId, userId],
     queryFn: () => fetchPilgrimageCommunityData(pilgrimageId!, userId),
     enabled: !!pilgrimageId && enabled,
     staleTime: 2 * 60 * 1000, // 2 minutes for community data
     gcTime: 5 * 60 * 1000, // 5 minutes
   });
 }
 
 export function useInvalidatePilgrimageData() {
   const queryClient = useQueryClient();
 
   return {
     invalidateCommunity: (pilgrimageId: string) => {
       queryClient.invalidateQueries({ queryKey: ["pilgrimage-community", pilgrimageId] });
     },
     invalidatePilgrimage: (pilgrimageId: string) => {
       queryClient.invalidateQueries({ queryKey: ["pilgrimage", pilgrimageId] });
     },
     updatePilgrimageParticipantCount: (pilgrimageId: string, delta: number) => {
       queryClient.setQueryData(["pilgrimage", pilgrimageId], (old: Pilgrimage | null | undefined) => {
         if (!old) return old;
         return { ...old, participant_count: Math.max(0, old.participant_count + delta) };
       });
     },
   };
 }
 
 export type { Badge, Post, Pilgrimage, PilgrimageData };