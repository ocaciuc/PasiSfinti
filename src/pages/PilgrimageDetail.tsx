import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, ArrowLeft, MessageCircle, Flame, ArrowUp } from "lucide-react";
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

// Helper function to safely format dates
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

interface Post {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  user_has_liked: boolean;
  comments: Comment[];
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

interface Participant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string | null;
}

const PilgrimageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [pilgrimage, setPilgrimage] = useState<Pilgrimage | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [showTopLevelComment, setShowTopLevelComment] = useState<Record<string, boolean>>({});
  const [userBadges, setUserBadges] = useState<Record<string, Badge | null>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    fetchPilgrimageData();
  }, [id]);

  const fetchPilgrimageData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);

      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;
      setUserId(currentUserId);

      // Fetch all data in parallel for better performance
      const [
        pilgrimageResult,
        userPilgrimagesResult,
        postsResult,
      ] = await Promise.all([
        // Fetch pilgrimage details
        supabase.from("pilgrimages").select("id, title, description, location, city, start_date, end_date, participant_count, map_url").eq("id", id).single(),
        // Fetch all user_pilgrimages for this pilgrimage
        supabase.from("user_pilgrimages").select("user_id").eq("pilgrimage_id", id),
        // Fetch posts for this pilgrimage
        supabase.from("posts").select("id, user_id, content, likes_count, created_at").eq("pilgrimage_id", id).order("created_at", { ascending: false }),
      ]);

      if (pilgrimageResult.error) throw pilgrimageResult.error;
      setPilgrimage(pilgrimageResult.data);

      // Process participants
      const participantUserIds = (userPilgrimagesResult.data || []).map((up: any) => up.user_id);
      setIsRegistered(currentUserId ? participantUserIds.includes(currentUserId) : false);

      // Collect all user IDs we need profiles for (participants + post authors)
      const postUserIds = (postsResult.data || []).map((p: any) => p.user_id);
      const allUserIdsForProfiles = [...new Set([...participantUserIds, ...postUserIds])];

      // Fetch profiles and comments in parallel
      const [profilesResult, commentsResult, userLikesResult] = await Promise.all([
        // Batch fetch all profiles we need
        allUserIdsForProfiles.length > 0
          ? supabase.from("profiles").select("id, user_id, first_name, last_name, avatar_url, city").in("user_id", allUserIdsForProfiles)
          : Promise.resolve({ data: [], error: null }),
        // Fetch all comments for all posts in one query
        postsResult.data && postsResult.data.length > 0
          ? supabase.from("comments").select("id, post_id, user_id, content, created_at, parent_comment_id").in("post_id", postsResult.data.map((p: any) => p.id)).order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        // Fetch user's likes for all posts in one query
        currentUserId && postsResult.data && postsResult.data.length > 0
          ? supabase.from("post_likes").select("post_id").eq("user_id", currentUserId).in("post_id", postsResult.data.map((p: any) => p.id))
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Create a profile lookup map for O(1) access
      const profileMap = new Map<string, any>();
      (profilesResult.data || []).forEach((p: any) => {
        profileMap.set(p.user_id, p);
      });

      // Set participants
      const formattedParticipants = participantUserIds
        .map((uid: string) => profileMap.get(uid))
        .filter(Boolean) as Participant[];
      setParticipants(formattedParticipants);

      // Collect comment author user IDs we might be missing
      const commentUserIds = (commentsResult.data || []).map((c: any) => c.user_id);
      const missingProfileIds = commentUserIds.filter((uid: string) => !profileMap.has(uid));
      
      // Fetch missing comment author profiles if any
      if (missingProfileIds.length > 0) {
        const { data: missingProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, first_name, last_name, avatar_url")
          .in("user_id", [...new Set(missingProfileIds)]);
        
        (missingProfiles || []).forEach((p: any) => {
          profileMap.set(p.user_id, p);
        });
      }

      // Create liked posts set for O(1) lookup
      const likedPostIds = new Set((userLikesResult.data || []).map((l: any) => l.post_id));

      // Group comments by post_id for O(1) lookup
      const commentsByPost = new Map<string, any[]>();
      (commentsResult.data || []).forEach((c: any) => {
        if (!commentsByPost.has(c.post_id)) {
          commentsByPost.set(c.post_id, []);
        }
        commentsByPost.get(c.post_id)!.push(c);
      });

      // Build posts with all details - no additional queries needed
      const postsWithDetails: Post[] = (postsResult.data || []).map((post: any) => {
        const authorProfile = profileMap.get(post.user_id);
        const postComments = commentsByPost.get(post.id) || [];

        // Build comments with author info
        const commentsWithAuthors = postComments.map((comment: any) => {
          const commentAuthor = profileMap.get(comment.user_id);
          return {
            id: comment.id,
            user_id: comment.user_id,
            content: comment.content,
            created_at: comment.created_at,
            parent_comment_id: comment.parent_comment_id,
            author_name: commentAuthor ? `${commentAuthor.first_name} ${commentAuthor.last_name}` : "Utilizator",
            author_avatar: commentAuthor?.avatar_url || null,
          };
        });

        // Organize comments into threads
        const topLevelComments = commentsWithAuthors.filter((c: Comment) => !c.parent_comment_id);
        const threadedComments = topLevelComments.map((comment: Comment) => ({
          ...comment,
          replies: commentsWithAuthors.filter((c: Comment) => c.parent_comment_id === comment.id),
        }));

        return {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          likes_count: post.likes_count || 0,
          created_at: post.created_at,
          author_name: authorProfile ? `${authorProfile.first_name} ${authorProfile.last_name}` : "Utilizator",
          author_avatar: authorProfile?.avatar_url || null,
          user_has_liked: likedPostIds.has(post.id),
          comments: threadedComments,
        };
      });

      setPosts(postsWithDetails);

      // Collect all unique user IDs for badge fetching
      const allUserIdsForBadges = new Set<string>();
      formattedParticipants.forEach(p => allUserIdsForBadges.add(p.user_id));
      postsWithDetails.forEach(post => {
        allUserIdsForBadges.add(post.user_id);
        post.comments.forEach((comment: Comment) => {
          allUserIdsForBadges.add(comment.user_id);
          if (comment.replies) {
            comment.replies.forEach((reply: Comment) => allUserIdsForBadges.add(reply.user_id));
          }
        });
      });

      // Batch fetch all user badges in one query
      if (allUserIdsForBadges.size > 0) {
        const { data: allUserBadgesData } = await supabase
          .from("user_badges")
          .select(`user_id, badges (id, name, name_ro, description, icon_name, priority)`)
          .in("user_id", Array.from(allUserIdsForBadges));

        // Group badges by user and find the highest priority one
        const badgesMap: Record<string, Badge | null> = {};
        const userBadgesGroup = new Map<string, any[]>();
        
        (allUserBadgesData || []).forEach((ub: any) => {
          if (!userBadgesGroup.has(ub.user_id)) {
            userBadgesGroup.set(ub.user_id, []);
          }
          if (ub.badges) {
            userBadgesGroup.get(ub.user_id)!.push(ub.badges);
          }
        });

        // For each user, get the highest priority badge
        userBadgesGroup.forEach((badges, uid) => {
          if (badges.length > 0) {
            badges.sort((a, b) => a.priority - b.priority);
            badgesMap[uid] = badges[0];
          }
        });

        // Initialize all users with null if they don't have badges
        allUserIdsForBadges.forEach(uid => {
          if (!badgesMap[uid]) {
            badgesMap[uid] = null;
          }
        });

        setUserBadges(badgesMap);
      }
    } catch (error: any) {
      console.error("Error fetching pilgrimage data:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca detaliile pelerinajului.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!userId) {
      toast({
        title: "Eroare",
        description: "Trebuie să fii autentificat pentru a te înscrie.",
        variant: "destructive",
      });
      return;
    }

    // Check if pilgrimage date is in the past
    if (pilgrimage && new Date(pilgrimage.start_date) < new Date(new Date().setHours(0, 0, 0, 0))) {
      toast({
        title: "Înregistrare indisponibilă",
        description: "Nu te poți înscrie la pelerinaje care au trecut.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("user_pilgrimages").insert({
        user_id: userId,
        pilgrimage_id: id!,
      });

      if (error) throw error;

      setIsRegistered(true);
      
      // Update participant count locally instead of refetching everything
      if (pilgrimage) {
        setPilgrimage({ ...pilgrimage, participant_count: pilgrimage.participant_count + 1 });
      }
      
      // Fetch current user profile and add to participants
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, avatar_url, city")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (userProfile) {
        setParticipants(prev => [...prev, userProfile as Participant]);
      }

      toast({
        title: "Înregistrare reușită!",
        description: "Te-ai înscris la acest pelerinaj. Drum bun!",
      });
    } catch (error: any) {
      console.error("Error registering for pilgrimage:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut finaliza înregistrarea.",
        variant: "destructive",
      });
    }
  };

  const handlePostSubmit = async () => {
    if (!newPost.trim() || !userId) return;

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          pilgrimage_id: id!,
          content: newPost.trim(),
        })
        .select("id, user_id, content, likes_count, created_at")
        .single();

      if (error) throw error;

      // Use cached profile if available, otherwise fetch
      const existingParticipant = participants.find(p => p.user_id === userId);
      let authorName = "Utilizator";
      let authorAvatar: string | null = null;

      if (existingParticipant) {
        authorName = `${existingParticipant.first_name} ${existingParticipant.last_name}`;
        authorAvatar = existingParticipant.avatar_url;
      } else {
        const { data: authorProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (authorProfile) {
          authorName = `${authorProfile.first_name} ${authorProfile.last_name}`;
          authorAvatar = authorProfile.avatar_url;
        }
      }

      const newPostObj: Post = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        likes_count: 0,
        created_at: data.created_at,
        author_name: authorName,
        author_avatar: authorAvatar,
        user_has_liked: false,
        comments: [],
      };

      setPosts([newPostObj, ...posts]);
      setNewPost("");
      toast({
        title: "Postare publicată!",
        description: "Comunitatea va putea vedea mesajul tău.",
      });
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut publica postarea.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (postId: string) => {
    if (!userId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      if (post.user_has_liked) {
        // Unlike: delete from post_likes
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);

        if (error) throw error;

        // Update local state
        setPosts(
          posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes_count: Math.max(0, p.likes_count - 1),
                  user_has_liked: false,
                }
              : p,
          ),
        );
      } else {
        // Like: insert into post_likes
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: userId,
        });

        if (error) throw error;

        // Update local state
        setPosts(
          posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes_count: p.likes_count + 1,
                  user_has_liked: true,
                }
              : p,
          ),
        );
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza aprecierea.",
        variant: "destructive",
      });
    }
  };

  const handleCommentSubmit = async (postId: string, parentCommentId: string | null = null) => {
    const commentText = commentTexts[postId]?.trim();
    if (!commentText || !userId) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: userId,
          content: commentText,
          parent_comment_id: parentCommentId,
        })
        .select("id, user_id, content, created_at, parent_comment_id")
        .single();

      if (error) throw error;

      // Use cached profile if available
      const existingParticipant = participants.find(p => p.user_id === userId);
      let authorName = "Utilizator";
      let authorAvatar: string | null = null;

      if (existingParticipant) {
        authorName = `${existingParticipant.first_name} ${existingParticipant.last_name}`;
        authorAvatar = existingParticipant.avatar_url;
      } else {
        const { data: authorProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (authorProfile) {
          authorName = `${authorProfile.first_name} ${authorProfile.last_name}`;
          authorAvatar = authorProfile.avatar_url;
        }
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

      // Add comment to the post
      setPosts(
        posts.map((post) => {
          if (post.id !== postId) return post;

          if (!parentCommentId) {
            // Top-level comment
            return { ...post, comments: [...post.comments, { ...newComment, replies: [] }] };
          } else {
            // Reply to existing comment
            return {
              ...post,
              comments: post.comments.map((comment) =>
                comment.id === parentCommentId
                  ? { ...comment, replies: [...(comment.replies || []), newComment] }
                  : comment,
              ),
            };
          }
        }),
      );

      setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      setReplyingTo((prev) => ({ ...prev, [postId]: null }));
      setShowTopLevelComment((prev) => ({ ...prev, [postId]: false }));
      toast({
        title: "Comentariu adăugat!",
        description: "Răspunsul tău a fost publicat.",
      });
    } catch (error: any) {
      console.error("Error creating comment:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut adăuga comentariul.",
        variant: "destructive",
      });
    }
  };

  const isPastPilgrimage = useMemo(() => {
    if (!pilgrimage) return false;
    return new Date(pilgrimage.start_date) < new Date(new Date().setHours(0, 0, 0, 0));
  }, [pilgrimage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground p-6 glow-soft">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
          </div>
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <Card className="glow-soft">
            <CardContent className="p-4 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card className="glow-soft">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  if (!pilgrimage) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground p-6 glow-soft">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Pelerinaj</h1>
          </div>
        </header>
        <div className="max-w-lg mx-auto p-4">
          <Card className="glow-soft">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Nu s-a găsit pelerinajul.</p>
              <Button onClick={() => navigate("/pilgrimages")} className="mt-4">
                Înapoi la pelerinaje
              </Button>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold line-clamp-1">{pilgrimage.title}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Pilgrimage Info Card */}
        <Card className="glow-soft">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{pilgrimage.location}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {safeFormatDate(pilgrimage.start_date, "d MMMM yyyy")}
                {pilgrimage.end_date && ` - ${safeFormatDate(pilgrimage.end_date, "d MMMM yyyy")}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-accent font-medium">
              <Users className="w-4 h-4" />
              <span>{pilgrimage.participant_count.toLocaleString()} pelerini înscriși</span>
            </div>

            {pilgrimage.description && (
              <p className="text-sm text-muted-foreground pt-2 border-t">{pilgrimage.description}</p>
            )}

            {pilgrimage.map_url && (
              <div className="pt-2">
                <a
                  href={pilgrimage.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  Vezi pe hartă
                </a>
              </div>
            )}

            {!isRegistered && !isPastPilgrimage && (
              <Button onClick={handleRegister} className="w-full mt-4" disabled={!userId}>
                {userId ? "Înscrie-te la pelerinaj" : "Autentifică-te pentru a te înscrie"}
              </Button>
            )}

            {isPastPilgrimage && !isRegistered && (
              <p className="text-sm text-muted-foreground text-center pt-2 border-t">
                Acest pelerinaj a avut loc deja.
              </p>
            )}

            {isRegistered && (
              <div className="text-center text-sm text-accent font-medium pt-2 border-t">
                ✓ Ești înscris la acest pelerinaj
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants Card */}
        <Card className="glow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pelerini înscriși ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nu sunt pelerini înscriși încă.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {participants.slice(0, 10).map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={participant.avatar_url || undefined} loading="lazy" />
                      <AvatarFallback className="text-xs">
                        {participant.first_name?.[0]}
                        {participant.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium truncate">
                          {participant.first_name} {participant.last_name}
                        </p>
                        {userBadges[participant.user_id] && (
                          <UserBadge badge={userBadges[participant.user_id]!} size="sm" />
                        )}
                      </div>
                      {participant.city && <p className="text-xs text-muted-foreground truncate">{participant.city}</p>}
                    </div>
                  </div>
                ))}
                {participants.length > 10 && (
                  <span className="text-xs text-muted-foreground self-center">+{participants.length - 10} alții</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Community Wall */}
        <Card className="glow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comunitate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRegistered ? (
              <>
                {/* New Post Form */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Scrie un mesaj pentru comunitate..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button onClick={handlePostSubmit} disabled={!newPost.trim()} size="sm">
                    Publică
                  </Button>
                </div>

                {/* Posts */}
                <div className="space-y-4 pt-4 border-t">
                  {posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Fii primul care postează în această comunitate!
                    </p>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className="space-y-3 pb-4 border-b last:border-b-0">
                        {/* Post Author */}
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={post.author_avatar || undefined} loading="lazy" />
                            <AvatarFallback className="text-xs">
                              {post.author_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium">{post.author_name}</p>
                              {userBadges[post.user_id] && (
                                <UserBadge badge={userBadges[post.user_id]!} size="sm" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{safeFormatDate(post.created_at, "d MMM, HH:mm")}</p>
                          </div>
                        </div>

                        {/* Post Content */}
                        <p className="text-sm">{post.content}</p>

                        {/* Post Actions */}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 text-sm ${
                              post.user_has_liked ? "text-accent" : "text-muted-foreground"
                            } hover:text-accent transition-colors`}
                          >
                            <Flame className={`w-4 h-4 ${post.user_has_liked ? "fill-current" : ""}`} />
                            <span>{post.likes_count}</span>
                          </button>
                          <button
                            onClick={() =>
                              setShowTopLevelComment((prev) => ({
                                ...prev,
                                [post.id]: !prev[post.id],
                              }))
                            }
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Răspunde</span>
                          </button>
                        </div>

                        {/* Top-level comment input */}
                        {showTopLevelComment[post.id] && (
                          <div className="flex gap-2 mt-2">
                            <Textarea
                              placeholder="Scrie un comentariu..."
                              value={commentTexts[post.id] || ""}
                              onChange={(e) =>
                                setCommentTexts((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              className="min-h-[60px] text-sm"
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                onClick={() => handleCommentSubmit(post.id, null)}
                                disabled={!commentTexts[post.id]?.trim()}
                                size="sm"
                              >
                                Comentează
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setShowTopLevelComment((prev) => ({
                                    ...prev,
                                    [post.id]: false,
                                  }))
                                }
                              >
                                Anulează
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Comments */}
                        {post.comments.length > 0 && (
                          <div className="pl-4 border-l-2 border-muted space-y-3 mt-3">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <Avatar className="w-6 h-6">
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
                                    <button
                                      onClick={() =>
                                        setReplyingTo((prev) => ({
                                          ...prev,
                                          [post.id]: prev[post.id] === comment.id ? null : comment.id,
                                        }))
                                      }
                                      className="text-xs text-muted-foreground hover:text-foreground mt-1"
                                    >
                                      Răspunde
                                    </button>
                                  </div>
                                </div>

                                {/* Reply input */}
                                {replyingTo[post.id] === comment.id && (
                                  <div className="flex gap-2 ml-8">
                                    <Textarea
                                      placeholder="Scrie un răspuns..."
                                      value={commentTexts[post.id] || ""}
                                      onChange={(e) =>
                                        setCommentTexts((prev) => ({
                                          ...prev,
                                          [post.id]: e.target.value,
                                        }))
                                      }
                                      className="min-h-[50px] text-sm"
                                    />
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        onClick={() => handleCommentSubmit(post.id, comment.id)}
                                        disabled={!commentTexts[post.id]?.trim()}
                                        size="sm"
                                      >
                                        Trimite
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setReplyingTo((prev) => ({
                                            ...prev,
                                            [post.id]: null,
                                          }))
                                        }
                                      >
                                        Anulează
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div className="pl-4 border-l border-muted/50 space-y-2 mt-2">
                                    {comment.replies.map((reply) => (
                                      <div key={reply.id} className="space-y-2">
                                        <div className="flex items-start gap-2">
                                          <Avatar className="w-5 h-5">
                                            <AvatarImage src={reply.author_avatar || undefined} loading="lazy" />
                                            <AvatarFallback className="text-xs">
                                              {reply.author_name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                            </AvatarFallback>
                                          </Avatar>
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
                                            <button
                                              onClick={() =>
                                                setReplyingTo((prev) => ({
                                                  ...prev,
                                                  [post.id]: prev[post.id] === reply.id ? null : reply.id,
                                                }))
                                              }
                                              className="text-xs text-muted-foreground hover:text-foreground mt-1"
                                            >
                                              Răspunde
                                            </button>
                                          </div>
                                        </div>

                                        {/* Reply input for nested reply */}
                                        {replyingTo[post.id] === reply.id && (
                                          <div className="flex gap-2 ml-7">
                                            <Textarea
                                              placeholder="Scrie un răspuns..."
                                              value={commentTexts[post.id] || ""}
                                              onChange={(e) =>
                                                setCommentTexts((prev) => ({
                                                  ...prev,
                                                  [post.id]: e.target.value,
                                                }))
                                              }
                                              className="min-h-[50px] text-sm"
                                            />
                                            <div className="flex flex-col gap-1">
                                              <Button
                                                onClick={() => handleCommentSubmit(post.id, comment.id)}
                                                disabled={!commentTexts[post.id]?.trim()}
                                                size="sm"
                                              >
                                                Trimite
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  setReplyingTo((prev) => ({
                                                    ...prev,
                                                    [post.id]: null,
                                                  }))
                                                }
                                              >
                                                Anulează
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Înscrie-te la pelerinaj pentru a vedea discuțiile comunității.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-4 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      <Navigation />
    </div>
  );
};

export default PilgrimageDetail;
