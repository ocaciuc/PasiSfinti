import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Cross, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleOnboardingError, isDuplicateProfileError } from "@/lib/onboarding-error-handler";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    religion: "Ortodox",
    city: "",
    parish: "",
    profilePhoto: "",
    bio: "",
  });

  // Check if user already has a profile on mount (handles page refresh, re-login scenarios)
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // If there's an auth error or no user, clear session and redirect to auth
        if (userError || !user) {
          console.error("Auth error in onboarding:", userError);
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }

        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        // Handle database errors (e.g., RLS policy errors from deleted user)
        if (profileError) {
          console.error("Profile check error:", profileError);
          // Don't block, let them try onboarding - could be new user
          return;
        }

        if (existingProfile) {
          // Profile already exists, redirect to dashboard
          toast({
            title: "Profilul există deja",
            description: "Te redirecționăm către pagina principală.",
          });
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking existing profile:", error);
        // Clear session on unexpected errors and redirect
        await supabase.auth.signOut();
        navigate("/auth");
      }
    };

    checkExistingProfile();
  }, [navigate, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  /**
   * Upsert profile - creates new or updates existing profile.
   * Safe for retry, refresh, and duplicate submissions.
   */
  const upsertProfile = async (userId: string) => {
    const profileData = {
      user_id: userId,
      first_name: formData.firstName,
      last_name: formData.lastName,
      age: parseInt(formData.age),
      religion: formData.religion,
      city: formData.city,
      parish: formData.parish,
      avatar_url: formData.profilePhoto || null,
      bio: formData.bio || null,
    };

    // Try upsert first (preferred approach)
    const { error } = await supabase
      .from("profiles")
      .upsert(profileData, { 
        onConflict: "user_id",
        ignoreDuplicates: false 
      });

    return { error };
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Sesiune expirată",
          description: "Te rugăm să te autentifici din nou.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Save profile using upsert (idempotent operation)
      const { error: profileError } = await upsertProfile(user.id);

      if (profileError) {
        // Check if it's a duplicate error - user already has profile
        if (isDuplicateProfileError(profileError)) {
          toast({
            title: "Profilul există deja",
            description: "Te redirecționăm către pagina principală.",
          });
          navigate("/");
          return;
        }

        // Handle other errors with recovery actions
        const errorResult = handleOnboardingError(profileError);
        
        toast({
          title: "Informație",
          description: errorResult.userMessage,
          variant: errorResult.shouldBlock ? "destructive" : "default",
        });

        // Execute recovery action with delay to show toast
        const recovery = errorResult.recovery;
        if (recovery.type === "redirect") {
          setTimeout(() => {
            navigate(recovery.to);
          }, 1500);
          return; // Don't reset isSubmitting - we're redirecting
        } else if (recovery.type === "retry") {
          setIsSubmitting(false);
        }
        return;
      }

      // Success!
      toast({
        title: "Bun venit în comunitate!",
        description: "Profilul tău a fost creat cu succes.",
      });
      navigate("/");
      
    } catch (error) {
      console.error("Onboarding error:", error);
      
      // Handle unexpected errors gracefully
      const errorResult = handleOnboardingError(error);
      
      toast({
        title: "Informație",
        description: errorResult.userMessage,
      });

      // Execute recovery action with delay to show toast
      const recovery = errorResult.recovery;
      if (recovery.type === "redirect") {
        setTimeout(() => {
          navigate(recovery.to);
        }, 1500);
        return; // Don't reset isSubmitting - we're redirecting
      } else if (recovery.type === "retry") {
        setIsSubmitting(false);
      }
    }
  };

  const canProceed = () => {
    if (isSubmitting) return false;
    
    switch (step) {
      case 1:
        return formData.firstName && formData.lastName && formData.age;
      case 2:
        return formData.city && formData.parish;
      case 3:
        return true; // Photo is optional
      case 4:
        return true; // Bio is optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glow-soft">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Cross className="w-12 h-12 text-accent" />
          </div>
          <CardTitle className="text-2xl text-primary">Pași de Pelerin</CardTitle>
          <CardDescription>
            Pasul {step} din 4 • Creează-ți profilul de pelerin
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="firstName">Prenume</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Ion"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nume</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Popescu"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Vârsta</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  placeholder="25"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="religion">Religie</Label>
                <Input
                  id="religion"
                  value={formData.religion}
                  onChange={(e) => handleInputChange("religion", e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Oraș</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="București"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parish">Parohie</Label>
                <Input
                  id="parish"
                  value={formData.parish}
                  onChange={(e) => handleInputChange("parish", e.target.value)}
                  placeholder="Biserica Sfântul Nicolae"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Label htmlFor="profilePhoto">Fotografie de profil (opțional)</Label>
              <Input
                id="profilePhoto"
                type="file"
                accept="image/*"
                disabled={isSubmitting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleInputChange("profilePhoto", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {formData.profilePhoto && (
                <div className="mt-4 flex justify-center">
                  <img
                    src={formData.profilePhoto}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-accent"
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <Label htmlFor="bio">Despre tine (opțional)</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                placeholder="Scrie câteva cuvinte despre tine, credința ta și ce te-a adus pe calea pelerinajului..."
                rows={5}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Spune-ne povestea ta de pelerin
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Înapoi
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se salvează...
                </>
              ) : step === 4 ? (
                "Finalizează"
              ) : (
                "Continuă"
              )}
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === step ? "bg-accent" : i < step ? "bg-accent/50" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
