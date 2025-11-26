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

interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  timestamp: string;
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

  const handlePostSubmit = () => {
    if (!newPost.trim()) return;

    const profile = JSON.parse(localStorage.getItem("pilgrimProfile") || "{}");
    const newPostObj: Post = {
      id: Date.now().toString(),
      author: `${profile.firstName} ${profile.lastName}`,
      avatar: profile.profilePhoto || "",
      content: newPost,
      likes: 0,
      timestamp: "acum",
    };

    setPosts([newPostObj, ...posts]);
    setNewPost("");
    toast({
      title: "Postare publicată!",
      description: "Comunitatea va putea vedea întrebarea ta.",
    });
  };

  const handleLike = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      )
    );
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
                <Button onClick={handleRegister} className="w-full">
                  Înscrie-te la acest pelerinaj
                </Button>
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

            {!isRegistered && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Înscrie-te la pelerinaj pentru a participa la discuții
              </p>
            )}

            {/* Posts */}
            <div className="space-y-4 mt-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={post.avatar} />
                      <AvatarFallback>
                        {post.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{post.author}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.timestamp}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{post.content}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="text-accent hover:text-accent/80"
                  >
                    <Flame className="w-4 h-4 mr-1" />
                    {post.likes} aprinderi
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default PilgrimageDetail;
