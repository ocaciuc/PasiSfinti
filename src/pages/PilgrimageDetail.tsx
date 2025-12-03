import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, ArrowLeft, MessageCircle, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

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

  useEffect(() => {
    fetchPilgrimageData();
  }, [id]);

  const fetchPilgrimageData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Fetch pilgrimage details
      const { data: pilgrimageData, error: pilgrimageError } = await supabase
        .from("pilgrimages")
        .select("*")
        .eq("id", id)
        .single();

      if (pilgrimageError) throw pilgrimageError;
      setPilgrimage(pilgrimageData);

      // Check if user has joined this pilgrimage
      if (user) {
        const { data: userPilgrimageData } = await supabase
          .from("user_pilgrimages")
          .select("id")
          .eq("user_id", user.id)
          .eq("pilgrimage_id", id)
          .single();

        setIsRegistered(!!userPilgrimageData);
      }

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("user_pilgrimages")
        .select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url,
            city
          )
        `)
        .eq("pilgrimage_id", id);

      if (participantsError) throw participantsError;

      const formattedParticipants = participantsData
        .map((p: any) => p.profiles)
        .filter(Boolean);
      
      setParticipants(formattedParticipants);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("pilgrimage_id", id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // For each post, fetch author, comments, and check if user has liked
      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post: any) => {
          // Fetch author profile
          const { data: authorProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, avatar_url")
            .eq("user_id", post.user_id)
            .maybeSingle();

          // Check if current user has liked this post
          let userHasLiked = false;
          if (user) {
            const { data: likeData } = await supabase
              .from("post_likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .maybeSingle();
            userHasLiked = !!likeData;
          }

          // Fetch comments for this post
          const { data: commentsData } = await supabase
            .from("comments")
            .select("*")
            .eq("post_id", post.id)
            .order("created_at", { ascending: true });

          // For each comment, fetch author profile and organize into threads
          const commentsWithAuthors = await Promise.all(
            (commentsData || []).map(async (comment: any) => {
              const { data: commentAuthor } = await supabase
                .from("profiles")
                .select("first_name, last_name, avatar_url")
                .eq("user_id", comment.user_id)
                .maybeSingle();

              return {
                id: comment.id,
                user_id: comment.user_id,
                content: comment.content,
                created_at: comment.created_at,
                parent_comment_id: comment.parent_comment_id,
                author_name: commentAuthor
                  ? `${commentAuthor.first_name} ${commentAuthor.last_name}`
                  : "Utilizator",
                author_avatar: commentAuthor?.avatar_url || null,
              };
            })
          );

          // Organize comments into threads
          const topLevelComments = commentsWithAuthors.filter(c => !c.parent_comment_id);
          const threadedComments = topLevelComments.map(comment => ({
            ...comment,
            replies: commentsWithAuthors.filter(c => c.parent_comment_id === comment.id)
          }));

          return {
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            likes_count: post.likes_count || 0,
            created_at: post.created_at,
            author_name: authorProfile
              ? `${authorProfile.first_name} ${authorProfile.last_name}`
              : "Utilizator",
            author_avatar: authorProfile?.avatar_url || null,
            user_has_liked: userHasLiked,
            comments: threadedComments,
          };
        })
      );

      setPosts(postsWithDetails);

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
      const { error } = await supabase
        .from("user_pilgrimages")
        .insert({
          user_id: userId,
          pilgrimage_id: id!,
        });

      if (error) throw error;

      setIsRegistered(true);
      fetchPilgrimageData(); // Refresh to update participant count
      
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
        .select("*")
        .single();

      if (error) throw error;

      // Fetch author profile
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      const newPostObj: Post = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        likes_count: 0,
        created_at: data.created_at,
        author_name: authorProfile
          ? `${authorProfile.first_name} ${authorProfile.last_name}`
          : "Utilizator",
        author_avatar: authorProfile?.avatar_url || null,
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
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

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
              : p
          )
        );
      } else {
        // Like: insert into post_likes
        const { error } = await supabase
          .from("post_likes")
          .insert({
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
              : p
          )
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
        .select("*")
        .single();

      if (error) throw error;

      // Fetch author profile
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      const newComment: Comment = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        parent_comment_id: data.parent_comment_id,
        author_name: authorProfile
          ? `${authorProfile.first_name} ${authorProfile.last_name}`
          : "Utilizator",
        author_avatar: authorProfile?.avatar_url || null,
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
              comments: post.comments.map(comment => 
                comment.id === parentCommentId
                  ? { ...comment, replies: [...(comment.replies || []), newComment] }
                  : comment
              )
            };
          }
        })
      );

      // Clear comment input and reply state
      setCommentTexts({ ...commentTexts, [postId]: "" });
      setReplyingTo({ ...replyingTo, [postId]: null });

      toast({
        title: parentCommentId ? "Răspuns adăugat!" : "Comentariu adăugat!",
        description: parentCommentId ? "Răspunsul tău a fost publicat." : "Comentariul tău a fost publicat.",
      });
    } catch (error: any) {
      console.error("Error creating comment:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut publica comentariul.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground p-4 glow-soft">
          <div className="max-w-lg mx-auto">
            <Skeleton className="h-8 w-20 mb-2 bg-primary-foreground/20" />
            <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
            <Skeleton className="h-4 w-32 mt-1 bg-primary-foreground/20" />
          </div>
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-32 w-full" />
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
        <header className="bg-primary text-primary-foreground p-4 glow-soft">
          <div className="max-w-lg mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pilgrimages")}
              className="text-primary-foreground hover:text-primary-foreground/80 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi
            </Button>
            <h1 className="text-2xl font-bold">Pelerinaj negăsit</h1>
          </div>
        </header>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 glow-soft">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pilgrimages")}
            className="text-primary-foreground hover:text-primary-foreground/80 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi
          </Button>
          <h1 className="text-2xl font-bold">{pilgrimage.title}</h1>
          <p className="text-sm opacity-90 mt-1">{pilgrimage.location}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Details Card */}
        <Card className="glow-soft">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <span>
                {format(new Date(pilgrimage.start_date), "d MMMM yyyy", { locale: ro })}
                {pilgrimage.end_date && ` - ${format(new Date(pilgrimage.end_date), "d MMMM yyyy", { locale: ro })}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span>{pilgrimage.location}{pilgrimage.city && `, ${pilgrimage.city}`}</span>
            </div>
            <div className="flex items-center gap-2 text-accent font-medium">
              <Users className="w-5 h-5" />
              <span>{pilgrimage.participant_count} pelerini înregistrați</span>
            </div>

            {pilgrimage.description && (
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {pilgrimage.description}
                </p>
              </div>
            )}

            {pilgrimage.map_url && (
              <div className="pt-2">
                <a
                  href={pilgrimage.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-4 h-4" />
                  Vezi pe hartă
                </a>
              </div>
            )}

            <div className="pt-4">
              {!isRegistered ? (
                pilgrimage && new Date(pilgrimage.start_date) >= new Date(new Date().setHours(0, 0, 0, 0)) ? (
                  <Button onClick={handleRegister} className="w-full">
                    Înscrie-te la acest pelerinaj
                  </Button>
                ) : (
                  <div className="bg-muted border border-border rounded-lg p-4 text-center">
                    <p className="text-muted-foreground font-medium">
                      Înregistrarea nu este disponibilă
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acest pelerinaj a avut loc în trecut
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-accent/10 border border-accent rounded-lg p-4 text-center">
                  <p className="text-accent font-medium">
                    Ești înregistrat pentru acest pelerinaj
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drum bun pe calea ta spirituală!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Participants List */}
        {participants.length > 0 && (
          <Card className="glow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="w-5 h-5" />
                Pelerini Înscriși ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {participants.slice(0, 8).map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 p-2 border border-border rounded-lg"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={participant.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {participant.first_name[0]}{participant.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {participant.first_name} {participant.last_name}
                      </p>
                      {participant.city && (
                        <p className="text-xs text-muted-foreground truncate">
                          {participant.city}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {participants.length > 8 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  +{participants.length - 8} pelerini
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Community Discussion */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <MessageCircle className="w-5 h-5" />
              Comunitatea Pelerinilor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Post Input */}
            {isRegistered && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Împărtășește întrebări sau informații utile..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={3}
                />
                <Button onClick={handlePostSubmit} className="w-full">
                  Publică
                </Button>
              </div>
            )}

            {!isRegistered && userId && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Înscrie-te la pelerinaj pentru a participa la discuții
              </p>
            )}

            {!userId && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Autentifică-te și înscrie-te pentru a participa la discuții
              </p>
            )}

            {/* Posts - Only visible to enrolled users */}
            {isRegistered ? (
              <div className="space-y-4 mt-6">
                {posts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Fii primul care împărtășește ceva cu comunitatea
                  </p>
                )}
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={post.author_avatar || ""} />
                        <AvatarFallback>
                          {post.author_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{post.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(post.created_at), "d MMM yyyy, HH:mm", { locale: ro })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{post.content}</p>
                    
                    {/* Like Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`${
                        post.user_has_liked
                          ? "text-accent"
                          : "text-muted-foreground"
                      } hover:text-accent`}
                    >
                      <Flame className={`w-4 h-4 mr-1 ${post.user_has_liked ? "fill-current" : ""}`} />
                      {post.likes_count} aprinderi
                    </Button>

                    {/* Comments Section */}
                    {post.comments.length > 0 && (
                      <div className="mt-4 space-y-4 pl-4 border-l-2 border-border">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={comment.author_avatar || ""} />
                                  <AvatarFallback className="text-xs">
                                    {comment.author_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-medium">{comment.author_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: ro })}
                                </p>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                              {/* Reply button - available for all enrolled users */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo({ ...replyingTo, [post.id]: comment.id })}
                                className="text-xs h-auto py-1 px-2"
                              >
                                Răspunde
                              </Button>
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="ml-6 space-y-2 pl-3 border-l border-border">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-5 h-5">
                                        <AvatarImage src={reply.author_avatar || ""} />
                                        <AvatarFallback className="text-xs">
                                          {reply.author_name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <p className="text-xs font-medium">{reply.author_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(reply.created_at), "d MMM, HH:mm", { locale: ro })}
                                      </p>
                                    </div>
                                    <p className="text-sm">{reply.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment or Reply */}
                    <div className="mt-3 space-y-2">
                      {replyingTo[post.id] && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            Răspunzi la{" "}
                            {post.comments.find(c => c.id === replyingTo[post.id])?.author_name || "comentariu"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo({ ...replyingTo, [post.id]: null })}
                            className="h-auto py-0 px-1"
                          >
                            Anulează
                          </Button>
                        </div>
                      )}
                      <Textarea
                        placeholder={replyingTo[post.id] ? "Scrie răspunsul tău..." : "Adaugă un comentariu..."}
                        value={commentTexts[post.id] || ""}
                        onChange={(e) =>
                          setCommentTexts({ ...commentTexts, [post.id]: e.target.value })
                        }
                        rows={2}
                        className="text-sm"
                      />
                      <Button
                        onClick={() => handleCommentSubmit(post.id, replyingTo[post.id])}
                        size="sm"
                        disabled={!commentTexts[post.id]?.trim()}
                      >
                        {replyingTo[post.id] ? "Răspunde" : "Comentează"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 mt-4 bg-muted/50 rounded-lg">
                <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Înscrie-te la pelerinaj pentru a vedea discuțiile comunității
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default PilgrimageDetail;
