import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Church, Calendar, Edit, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  firstName: string;
  lastName: string;
  age: number;
  religion: string;
  city: string;
  parish: string;
  profilePhoto: string | null;
}

interface PastPilgrimage {
  id: string;
  place: string;
  period: string;
  impressions: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pastPilgrimages, setPastPilgrimages] = useState<PastPilgrimage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate("/auth");
          return;
        }

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          if (profileError.code === "PGRST116") {
            // No profile found, redirect to onboarding
            navigate("/onboarding");
          } else {
            toast.error("Eroare la încărcarea profilului");
          }
          return;
        }

        setProfile({
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          age: profileData.age || 0,
          religion: profileData.religion || "Ortodox",
          city: profileData.city || "",
          parish: profileData.parish || "",
          profilePhoto: profileData.avatar_url,
        });

        // Fetch past pilgrimages
        const { data: pilgrimagesData, error: pilgrimagesError } = await supabase
          .from("past_pilgrimages")
          .select("*")
          .eq("user_id", user.id)
          .order("period", { ascending: false });

        if (!pilgrimagesError && pilgrimagesData) {
          setPastPilgrimages(pilgrimagesData);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("A apărut o eroare neprevăzută");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Eroare la deconectare: " + error.message);
    } else {
      toast.success("Te-ai deconectat cu succes");
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground p-6 glow-soft">
          <h1 className="text-2xl font-bold text-center">Profilul Meu</h1>
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <Card className="glow-soft">
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 glow-soft">
        <h1 className="text-2xl font-bold text-center">Profilul Meu</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Profile Card */}
        <Card className="glow-soft">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="w-24 h-24 border-4 border-accent">
                <AvatarImage src={profile.profilePhoto || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile.firstName[0]}
                  {profile.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-primary">
                  {profile.firstName} {profile.lastName}
                </h2>
                {profile.age > 0 && (
                  <p className="text-muted-foreground">{profile.age} ani</p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {profile.religion && (
                <div className="flex items-center gap-3 text-sm">
                  <Church className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium">{profile.religion}</p>
                    {profile.parish && (
                      <p className="text-muted-foreground">{profile.parish}</p>
                    )}
                  </div>
                </div>
              )}
              {profile.city && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-5 h-5 text-accent" />
                  <p className="font-medium">{profile.city}</p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => navigate("/onboarding")}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editează profilul
            </Button>
            <Button
              variant="destructive"
              className="w-full mt-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Deconectare
            </Button>
          </CardContent>
        </Card>

        {/* Past Pilgrimages */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="w-5 h-5" />
              Pelerinaje Anterioare
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pastPilgrimages.length > 0 ? (
              <div className="space-y-3">
                {pastPilgrimages.map((pilgrimage) => (
                  <div
                    key={pilgrimage.id}
                    className="border-l-4 border-accent pl-4 py-2"
                  >
                    <p className="font-medium">{pilgrimage.place}</p>
                    <p className="text-sm text-muted-foreground">{pilgrimage.period}</p>
                    {pilgrimage.impressions && (
                      <p className="text-sm mt-1">{pilgrimage.impressions}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  Nu ai adăugat încă pelerinaje anterioare
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate("/onboarding")}
                >
                  Adaugă pelerinaje
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Pilgrimages */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="w-5 h-5" />
              Pelerinaje Viitoare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm mb-4">
                Nu ești înscris la niciun pelerinaj încă
              </p>
              <Button onClick={() => navigate("/pilgrimages")}>
                Explorează pelerinajele
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Profile;
