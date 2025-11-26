import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Cross } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    religion: "Ortodox",
    city: "",
    parish: "",
    profilePhoto: "",
    pastPilgrimages: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Save profile to localStorage
      localStorage.setItem("pilgrimProfile", JSON.stringify(formData));
      toast({
        title: "Bun venit în comunitate!",
        description: "Profilul tău a fost creat cu succes.",
      });
      navigate("/");
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.firstName && formData.lastName && formData.age;
      case 2:
        return formData.city && formData.parish;
      case 3:
        return true; // Photo is optional
      case 4:
        return true; // Past pilgrimages are optional
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nume</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Popescu"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Oraș</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="București"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parish">Parohie</Label>
                <Input
                  id="parish"
                  value={formData.parish}
                  onChange={(e) => handleInputChange("parish", e.target.value)}
                  placeholder="Biserica Sfântul Nicolae"
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
              <Label htmlFor="pastPilgrimages">Pelerinaje anterioare (opțional)</Label>
              <Textarea
                id="pastPilgrimages"
                value={formData.pastPilgrimages}
                onChange={(e) => handleInputChange("pastPilgrimages", e.target.value)}
                placeholder="Ex: Putna 2023 - Experiență minunată, oameni frumoși&#10;Nicula 2022 - Prima mea călătorie de pelerin"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Descrie locul, perioada și impresiile tale din fiecare pelerinaj
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Înapoi
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              {step === 4 ? "Finalizează" : "Continuă"}
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
