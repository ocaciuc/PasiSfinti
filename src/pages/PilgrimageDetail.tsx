import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, ArrowLeft, MessageCircle, Flame, ArrowUp, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isValid, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import UserBadge from "@/components/UserBadge";
import CommentSection from "@/components/CommentSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const PilgrimageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [pilgrimage, setPilgrimage] = useState<Pilgrimage | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userBadges, setUserBadges] = useState<Record<string, Badge | null>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

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

      // Check if current user is enrolled
      const participantUserIds = (userPilgrimagesResult.data || []).map((up: any) => up.user_id);
      setIsRegistered(currentUserId ? participantUserIds.includes(currentUserId) : false);

      // Collect all user IDs we need profiles for (post authors)
      const postUserIds = (postsResult.data || []).map((p: any) => p.user_id);
      const allUserIdsForProfiles = [...new Set(postUserIds)];

      // Fetch co-pilgrim profiles using secure function (only returns first_name and avatar)
      // and user likes in parallel
      const [coProfilesResult, userLikesResult] = await Promise.all([
        // Use the secure function that only exposes minimal profile data
        currentUserId
          ? supabase.rpc("get_co_pilgrim_profiles", { requesting_user_id: currentUserId })
          : Promise.resolve({ data: [], error: null }),
        // Fetch user's likes for all posts in one query
        currentUserId && postsResult.data && postsResult.data.length > 0
          ? supabase.from("post_likes").select("post_id").eq("user_id", currentUserId).in("post_id", postsResult.data.map((p: any) => p.id))
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Create a profile lookup map for O(1) access (includes co-pilgrims with minimal data)
      const profileMap = new Map<string, { first_name: string; avatar_url: string | null }>();
      (coProfilesResult.data || []).forEach((p: any) => {
        profileMap.set(p.user_id, { first_name: p.first_name, avatar_url: p.avatar_url });
      });

      // Also fetch current user's own profile for their posts
      if (currentUserId) {
        const { data: ownProfile } = await supabase
          .from("profiles")
          .select("first_name, avatar_url")
          .eq("user_id", currentUserId)
          .maybeSingle();
        if (ownProfile) {
          profileMap.set(currentUserId, { first_name: ownProfile.first_name, avatar_url: ownProfile.avatar_url });
        }
      }

      // Create liked posts set for O(1) lookup
      const likedPostIds = new Set((userLikesResult.data || []).map((l: any) => l.post_id));

      // Build posts with all details - comments are now loaded separately per post
      const postsWithDetails: Post[] = (postsResult.data || []).map((post: any) => {
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

      setPosts(postsWithDetails);

      // Fetch badges for post authors
      const allUserIdsForBadges = new Set<string>();
      postsWithDetails.forEach(post => {
        allUserIdsForBadges.add(post.user_id);
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

  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    // Prevent double-click registration
    if (isRegistering || isRegistered) {
      return;
    }

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

    setIsRegistering(true);

    try {
      // Double-check enrollment status before inserting to prevent duplicate key errors
      const { data: existingEnrollment } = await supabase
        .from("user_pilgrimages")
        .select("id")
        .eq("user_id", userId)
        .eq("pilgrimage_id", id!)
        .maybeSingle();

      if (existingEnrollment) {
        // User is already enrolled, just update the state
        setIsRegistered(true);
        toast({
          title: "Deja înscris",
          description: "Ești deja înscris la acest pelerinaj.",
        });
        setIsRegistering(false);
        return;
      }

      const { error } = await supabase.from("user_pilgrimages").insert({
        user_id: userId,
        pilgrimage_id: id!,
      });

      if (error) throw error;

      setIsRegistered(true);
      
      // Update participant count locally
      if (pilgrimage) {
        setPilgrimage({ ...pilgrimage, participant_count: pilgrimage.participant_count + 1 });
      }

      // Refetch posts so the user can see all comments now that they're enrolled
      // This is needed because RLS policies restrict post visibility to enrolled users
      await fetchPilgrimageData();

      toast({
        title: "Înregistrare reușită!",
        description: "Te-ai înscris la acest pelerinaj. Drum bun!",
      });
    } catch (error: any) {
      console.error("Error registering for pilgrimage:", error);
      // Handle duplicate key error gracefully
      if (error.code === "23505") {
        setIsRegistered(true);
        toast({
          title: "Deja înscris",
          description: "Ești deja înscris la acest pelerinaj.",
        });
      } else {
        toast({
          title: "Eroare",
          description: "Nu s-a putut finaliza înregistrarea.",
          variant: "destructive",
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!userId || !id) return;

    try {
      const { error } = await supabase
        .from("user_pilgrimages")
        .delete()
        .eq("user_id", userId)
        .eq("pilgrimage_id", id);

      if (error) throw error;

      setIsRegistered(false);
      setShowLeaveConfirmation(false);
      
      // Update participant count locally
      if (pilgrimage) {
        setPilgrimage({ ...pilgrimage, participant_count: Math.max(0, pilgrimage.participant_count - 1) });
      }

      toast({
        title: "Succes",
        description: "Ai părăsit pelerinajul cu succes.",
      });
    } catch (error: any) {
      console.error("Error leaving pilgrimage:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut finaliza operațiunea.",
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

      // Fetch current user profile for the new post (own profile - allowed by RLS)
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

      const newPostObj: Post = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        likes_count: 0,
        created_at: data.created_at,
        author_name: authorName,
        author_avatar: authorAvatar,
        user_has_liked: false,
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

  const handleCommentAdded = useCallback(() => {
    toast({
      title: "Comentariu adăugat!",
      description: "Răspunsul tău a fost publicat.",
    });
  }, [toast]);

  const isPastPilgrimage = useMemo(() => {
    if (!pilgrimage) return false;
    return new Date(pilgrimage.start_date) < new Date(new Date().setHours(0, 0, 0, 0));
  }, [pilgrimage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-safe">
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
      <div className="min-h-screen bg-background pb-safe">
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
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <div className="flex items-center relative">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground absolute left-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold line-clamp-1 w-full text-center px-10">{pilgrimage.title}</h1>
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
              <Button onClick={handleRegister} className="w-full mt-4" disabled={!userId || isRegistering}>
                {isRegistering ? "Se înregistrează..." : userId ? "Înscrie-te la pelerinaj" : "Autentifică-te pentru a te înscrie"}
              </Button>
            )}

            {isPastPilgrimage && !isRegistered && (
              <p className="text-sm text-muted-foreground text-center pt-2 border-t">
                Acest pelerinaj a avut loc deja.
              </p>
            )}

            {isRegistered && (
              <div className="pt-2 border-t space-y-3">
                <div className="text-center text-sm text-accent font-medium">
                  ✓ Ești înscris la acest pelerinaj
                </div>
                {!isPastPilgrimage && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowLeaveConfirmation(true)}
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Părăsește pelerinajul
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants Count Card */}
        <Card className="glow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participanți</p>
                <p className="text-lg font-semibold text-foreground">
                  {pilgrimage.participant_count === 0 
                    ? "Niciun pelerin înscris încă" 
                    : `${pilgrimage.participant_count} ${pilgrimage.participant_count === 1 ? 'persoană' : 'persoane'}`}
                </p>
              </div>
            </div>
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
                    onChange={(e) => setNewPost(e.target.value.slice(0, 5000))}
                    maxLength={5000}
                    className="min-h-[80px]"
                  />
                  <div className="flex justify-between items-center">
                    <Button onClick={handlePostSubmit} disabled={!newPost.trim()} size="sm">
                      Publică
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {newPost.length}/5000
                    </span>
                  </div>
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
                        </div>

                        {/* Comments Section - Now paginated */}
                        <CommentSection
                          postId={post.id}
                          userId={userId}
                          userBadges={userBadges}
                          onCommentAdded={handleCommentAdded}
                        />
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

      {/* Leave Pilgrimage Confirmation Dialog */}
      <AlertDialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sigur vrei să părăsești acest pelerinaj?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune te va elimina din lista de participanți.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnregister} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmă
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Navigation />
    </div>
  );
};

export default PilgrimageDetail;
