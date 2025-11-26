import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Church, Calendar, Edit } from "lucide-react";

interface Profile {
  firstName: string;
  lastName: string;
  age: string;
  religion: string;
  city: string;
  parish: string;
  profilePhoto: string;
  pastPilgrimages: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem("pilgrimProfile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      navigate("/onboarding");
    }
  }, [navigate]);

  if (!profile) return null;

  const pastPilgrimagesArray = profile.pastPilgrimages
    ? profile.pastPilgrimages.split("\n").filter((p) => p.trim())
    : [];

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
                <AvatarImage src={profile.profilePhoto} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile.firstName[0]}
                  {profile.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-primary">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-muted-foreground">{profile.age} ani</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Church className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium">{profile.religion}</p>
                  <p className="text-muted-foreground">{profile.parish}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-5 h-5 text-accent" />
                <p className="font-medium">{profile.city}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => navigate("/onboarding")}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editează profilul
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
            {pastPilgrimagesArray.length > 0 ? (
              <div className="space-y-3">
                {pastPilgrimagesArray.map((pilgrimage, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-accent pl-4 py-2"
                  >
                    <p className="text-sm">{pilgrimage}</p>
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
