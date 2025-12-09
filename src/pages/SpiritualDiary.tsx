import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookHeart,
  MapPin,
  Users,
  Camera,
  Save,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface DiaryPhoto {
  id: string;
  image_url: string;
}

interface Diary {
  id: string;
  reflections: string | null;
  visited_places: string | null;
  people_met: string | null;
  created_at: string;
  updated_at: string;
}

interface Pilgrimage {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
}

const SpiritualDiary = () => {
  const { pilgrimageId } = useParams();
  const navigate = useNavigate();
  const [pilgrimage, setPilgrimage] = useState<Pilgrimage | null>(null);
  const [diary, setDiary] = useState<Diary | null>(null);
  const [photos, setPhotos] = useState<DiaryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [reflections, setReflections] = useState("");
  const [visitedPlaces, setVisitedPlaces] = useState("");
  const [peopleMet, setPeopleMet] = useState("");
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [pilgrimageId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      // Fetch pilgrimage details
      const { data: pilgrimageData, error: pilgrimageError } = await supabase
        .from("pilgrimages")
        .select("id, title, location, start_date, end_date")
        .eq("id", pilgrimageId)
        .single();

      if (pilgrimageError) throw pilgrimageError;
      setPilgrimage(pilgrimageData);

      // Fetch existing diary for this pilgrimage
      const { data: diaryData, error: diaryError } = await supabase
        .from("spiritual_diaries")
        .select("*")
        .eq("user_id", user.id)
        .eq("pilgrimage_id", pilgrimageId)
        .maybeSingle();

      if (diaryError) throw diaryError;

      if (diaryData) {
        setDiary(diaryData);
        setReflections(diaryData.reflections || "");
        setVisitedPlaces(diaryData.visited_places || "");
        setPeopleMet(diaryData.people_met || "");

        // Fetch diary photos
        const { data: photosData } = await supabase
          .from("spiritual_diary_photos")
          .select("*")
          .eq("diary_id", diaryData.id)
          .order("created_at", { ascending: true });

        setPhotos(photosData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Nu s-au putut încărca datele jurnalului.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setNewPhotos([...newPhotos, ...fileArray]);

    // Create preview URLs
    const urls = fileArray.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...urls]);
  };

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from("spiritual_diary_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      setPhotos(photos.filter((p) => p.id !== photoId));
      toast.success("Fotografia a fost ștearsă.");
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Nu s-a putut șterge fotografia.");
    }
  };

  const handleSave = async () => {
    if (!userId || !pilgrimageId) return;

    setSaving(true);
    try {
      let diaryId = diary?.id;

      if (diary) {
        // Update existing diary
        const { error } = await supabase
          .from("spiritual_diaries")
          .update({
            reflections: reflections || null,
            visited_places: visitedPlaces || null,
            people_met: peopleMet || null,
          })
          .eq("id", diary.id);

        if (error) throw error;
      } else {
        // Create new diary
        const { data, error } = await supabase
          .from("spiritual_diaries")
          .insert({
            user_id: userId,
            pilgrimage_id: pilgrimageId,
            reflections: reflections || null,
            visited_places: visitedPlaces || null,
            people_met: peopleMet || null,
          })
          .select()
          .single();

        if (error) throw error;
        diaryId = data.id;
        setDiary(data);
      }

      // Upload new photos
      if (newPhotos.length > 0 && diaryId) {
        for (const photo of newPhotos) {
          const fileExt = photo.name.split(".").pop();
          const fileName = `${userId}/${diaryId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("diary-photos")
            .upload(fileName, photo);

          if (uploadError) {
            console.error("Error uploading photo:", uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("diary-photos")
            .getPublicUrl(fileName);

          // Save photo reference to database
          await supabase.from("spiritual_diary_photos").insert({
            diary_id: diaryId,
            image_url: publicUrl,
          });
        }

        // Refresh photos
        const { data: photosData } = await supabase
          .from("spiritual_diary_photos")
          .select("*")
          .eq("diary_id", diaryId)
          .order("created_at", { ascending: true });

        setPhotos(photosData || []);
        setNewPhotos([]);
        setPreviewUrls([]);
      }

      // Evaluate badges after saving diary
      await supabase.rpc("evaluate_and_award_badges", { target_user_id: userId });

      toast.success("Jurnalul spiritual a fost salvat cu succes!");
    } catch (error) {
      console.error("Error saving diary:", error);
      toast.error("Nu s-a putut salva jurnalul.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground p-6 glow-soft">
          <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
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
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:text-primary-foreground/80"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi
            </Button>
          </div>
        </header>
        <div className="max-w-lg mx-auto p-4 text-center">
          <p className="text-muted-foreground">Pelerinajul nu a fost găsit.</p>
        </div>
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
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:text-primary-foreground/80 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi
          </Button>
          <div className="flex items-center gap-3">
            <BookHeart className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Jurnal Spiritual</h1>
              <p className="text-sm text-primary-foreground/80">
                {pilgrimage.title}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Pilgrimage Info */}
        <Card className="glow-soft bg-accent/5 border-accent/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="w-4 h-4" />
              {pilgrimage.location}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(pilgrimage.start_date), "d MMMM yyyy", { locale: ro })}
              {pilgrimage.end_date && ` - ${format(new Date(pilgrimage.end_date), "d MMMM yyyy", { locale: ro })}`}
            </p>
          </CardContent>
        </Card>

        {/* Photos Section */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
              <Camera className="w-5 h-5" />
              Fotografii
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Photos */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square">
                    <img
                      src={photo.image_url}
                      alt="Diary photo"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeExistingPhoto(photo.id)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Photo Previews */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, index) => (
                  <div key={url} className="relative aspect-square">
                    <img
                      src={url}
                      alt="New photo preview"
                      className="w-full h-full object-cover rounded-lg opacity-80"
                    />
                    <button
                      onClick={() => removeNewPhoto(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-primary/80 text-primary-foreground text-xs px-2 py-0.5 rounded">
                      Nou
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add Photos Button */}
            <div>
              <Label htmlFor="photos" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Adaugă fotografii din pelerinaj
                  </p>
                </div>
              </Label>
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reflections */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
              <BookHeart className="w-5 h-5" />
              Reflecții Personale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Gânduri, sentimente și învățăminte din acest pelerinaj..."
              value={reflections}
              onChange={(e) => setReflections(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Visited Places */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
              <MapPin className="w-5 h-5" />
              Locuri Vizitate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Mănăstiri, biserici, locuri sfinte vizitate..."
              value={visitedPlaces}
              onChange={(e) => setVisitedPlaces(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* People Met */}
        <Card className="glow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
              <Users className="w-5 h-5" />
              Persoane Întâlnite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Pelerini, călugări sau duhovnici cu care ai interacționat..."
              value={peopleMet}
              onChange={(e) => setPeopleMet(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Se salvează..." : diary ? "Actualizează Jurnalul" : "Salvează Jurnalul"}
        </Button>

        {diary && (
          <p className="text-center text-xs text-muted-foreground">
            Ultima actualizare: {format(new Date(diary.updated_at), "d MMMM yyyy, HH:mm", { locale: ro })}
          </p>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default SpiritualDiary;
