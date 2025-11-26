import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, ArrowLeft, MessageCircle, Flame } from "lucide-react";

interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  timestamp: string;
}

const PilgrimageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<Post[]>([
    {
      id: "1",
      author: "Maria Ionescu",
      avatar: "",
      content: "Este prima mea dată la Putna. Poate cineva să-mi spună care e cel mai bun loc de cazare în apropiere?",
      likes: 3,
      timestamp: "acum 2 ore",
    },
    {
      id: "2",
      author: "Ion Popescu",
      avatar: "",
      content: "Am fost anul trecut, recomand pensiunea din Putna sat. Foarte ospitalieri și aproape de mănăstire.",
      likes: 5,
      timestamp: "acum 1 oră",
    },
  ]);

  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegister = () => {
    setIsRegistered(true);
    toast({
      title: "Înregistrare reușită!",
      description: "Te-ai înscris la acest pelerinaj. Drum bun!",
    });
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
          <h1 className="text-2xl font-bold">Bobotează 2025</h1>
          <p className="text-sm opacity-90 mt-1">Mănăstirea Putna</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Details Card */}
        <Card className="glow-soft">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <span>6 Ianuarie 2025</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span>Mănăstirea Putna, Suceava</span>
            </div>
            <div className="flex items-center gap-2 text-accent font-medium">
              <Users className="w-5 h-5" />
              <span>2.400 pelerini înregistrați</span>
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Alătură-te comunității de pelerini pentru sărbătoarea Bobotezei la sfânta 
                Mănăstire Putna. Program: Vecernie 6 ianuarie ora 18:00, Sfânta Liturghie 
                7 ianuarie ora 9:00, urmată de procesiunea Bobotezei.
              </p>

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
