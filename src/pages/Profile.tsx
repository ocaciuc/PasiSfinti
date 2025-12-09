import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MapPin, Church, Calendar, Edit, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

const profileSchema = z.object({
  firstName: z.string().min(1, "Prenumele este obligatoriu"),
  lastName: z.string().min(1, "Numele este obligatoriu"),
  age: z.coerce.number().min(1, "Vârsta trebuie să fie mai mare de 0").max(150, "Vârstă invalidă"),
  city: z.string().min(1, "Orașul este obligatoriu"),
  parish: z.string().optional(),
  profilePhoto: z.any().optional(),
});

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
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  participant_count: number;
  type: string;
}

interface UpcomingPilgrimage {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  participant_count: number;
  type: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pastPilgrimages, setPastPilgrimages] = useState<PastPilgrimage[]>([]);
  const [upcomingPilgrimages, setUpcomingPilgrimages] = useState<UpcomingPilgrimage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      age: 0,
      city: "",
      parish: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate("/auth");
          return;
        }

        setUserId(user.id);

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

        const profileState = {
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          age: profileData.age || 0,
          religion: profileData.religion || "Ortodox",
          city: profileData.city || "",
          parish: profileData.parish || "",
          profilePhoto: profileData.avatar_url,
        };

        setProfile(profileState);
        
        // Set form default values
        form.reset({
          firstName: profileState.firstName,
          lastName: profileState.lastName,
          age: profileState.age,
          city: profileState.city,
          parish: profileState.parish || "",
        });

        // Fetch user's enrolled pilgrimages
        const { data: enrolledData, error: enrolledError } = await supabase
          .from("user_pilgrimages")
          .select(`
            pilgrimage_id,
            pilgrimages (
              id,
              title,
              location,
              start_date,
              end_date,
              participant_count,
              type
            )
          `)
          .eq("user_id", user.id);

        if (!enrolledError && enrolledData) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Filter for past pilgrimages (start_date OR end_date before today)
          const past = enrolledData
            .map((item: any) => item.pilgrimages)
            .filter((p: any) => {
              if (!p) return false;
              const startDate = new Date(p.start_date);
              const endDate = p.end_date ? new Date(p.end_date) : null;
              return startDate < today || (endDate && endDate < today);
            })
            .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
          setPastPilgrimages(past);

          // Filter for upcoming pilgrimages (start_date >= today)
          const upcoming = enrolledData
            .map((item: any) => item.pilgrimages)
            .filter((p: any) => p && new Date(p.start_date) >= today)
            .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
          setUpcomingPilgrimages(upcoming);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("A apărut o eroare neprevăzută");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, form]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Eroare la deconectare: " + error.message);
    } else {
      toast.success("Te-ai deconectat cu succes");
      navigate("/auth");
    }
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!userId) return;

    setSaving(true);
    try {
      let avatarUrl = profile?.profilePhoto || null;

      // Handle photo upload if file is provided
      if (values.profilePhoto && values.profilePhoto[0]) {
        const file = values.profilePhoto[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        // Convert file to base64 for storage (MVP approach)
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            avatarUrl = reader.result as string;
            resolve(avatarUrl);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          age: values.age,
          city: values.city,
          parish: values.parish || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      setProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        age: values.age,
        religion: profile?.religion || "Ortodox",
        city: values.city,
        parish: values.parish || "",
        profilePhoto: avatarUrl,
      });

      toast.success("Profilul a fost actualizat cu succes");
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Eroare la actualizarea profilului");
    } finally {
      setSaving(false);
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
              onClick={() => setEditDialogOpen(true)}
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
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <h3 className="font-semibold text-lg">{pilgrimage.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {pilgrimage.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(pilgrimage.start_date), 'd MMMM yyyy', { locale: ro })}
                      {pilgrimage.end_date && ` - ${format(new Date(pilgrimage.end_date), 'd MMMM yyyy', { locale: ro })}`}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {pilgrimage.participant_count || 0} participanți
                    </div>
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                      {pilgrimage.type === 'national' ? 'Național' : 'Local'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  Nu ai încă pelerinaje încheiate. Înscrie-te la un pelerinaj viitor pentru a începe călătoria!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/pilgrimages")}
                >
                  Explorează pelerinajele
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Pilgrimages */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="w-5 h-5" />
              Pelerinaje Viitoare
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPilgrimages.length > 0 ? (
              <div className="space-y-3">
                {upcomingPilgrimages.map((pilgrimage) => (
                  <div
                    key={pilgrimage.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <h3 className="font-semibold text-lg">{pilgrimage.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {pilgrimage.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(pilgrimage.start_date), 'd MMMM yyyy', { locale: ro })}
                      {pilgrimage.end_date && ` - ${format(new Date(pilgrimage.end_date), 'd MMMM yyyy', { locale: ro })}`}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {pilgrimage.participant_count || 0} participanți
                    </div>
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {pilgrimage.type === 'national' ? 'Național' : 'Local'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-4">
                  Nu ești înscris la niciun pelerinaj încă
                </p>
                <Button onClick={() => navigate("/pilgrimages")}>
                  Explorează pelerinajele
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Editează profilul</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prenume</FormLabel>
                    <FormControl>
                      <Input placeholder="Ion" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nume</FormLabel>
                    <FormControl>
                      <Input placeholder="Popescu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vârsta</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oraș</FormLabel>
                    <FormControl>
                      <Input placeholder="București" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parish"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parohie (opțional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Biserica Sfântul Nicolae" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="profilePhoto"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Fotografie de profil (opțional)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onChange(e.target.files)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                  disabled={saving}
                >
                  Anulează
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Se salvează..." : "Salvează"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Profile;
