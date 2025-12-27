import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Flame, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { z } from "zod";
import Footer from "@/components/Footer";
import { translateAuthError } from "@/lib/onboarding-error-handler";

const passwordSchema = z
  .string()
  .min(8, { message: "Parola trebuie să aibă cel puțin 8 caractere" })
  .max(100, { message: "Parola este prea lungă" })
  .refine((val) => /[a-z]/.test(val), { message: "Parola trebuie să conțină cel puțin o literă mică" })
  .refine((val) => /[A-Z]/.test(val), { message: "Parola trebuie să conțină cel puțin o literă mare" })
  .refine((val) => /[0-9]/.test(val), { message: "Parola trebuie să conțină cel puțin o cifră" })
  .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(val), { message: "Parola trebuie să conțină cel puțin un caracter special (!@#$%^&* etc.)" });

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (type === 'recovery' && accessToken && refreshToken) {
        // Set the session from recovery tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (!error) {
          setHasValidSession(true);
          // Clean the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (session) {
        setHasValidSession(true);
      }
      
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const validatePassword = (password: string): string | null => {
    try {
      passwordSchema.parse(password);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return "Parolă invalidă";
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Eroare validare",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Eroare",
        description: "Parolele nu coincid",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Eroare la resetarea parolei",
        description: translateAuthError(error),
        variant: "destructive",
      });
    } else {
      setResetSuccess(true);
      toast({
        title: "Parolă actualizată",
        description: "Parola ta a fost schimbată cu succes.",
      });
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Se verifică sesiunea...</p>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Flame className="w-12 h-12 text-accent mx-auto mb-4" />
              <CardTitle className="text-destructive">Link invalid sau expirat</CardTitle>
              <CardDescription>
                Linkul de resetare a parolei este invalid sau a expirat. Te rugăm să soliciți un nou link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Înapoi la autentificare
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle>Parolă actualizată</CardTitle>
              <CardDescription>
                Parola ta a fost schimbată cu succes. Acum te poți autentifica cu noua parolă.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Mergi la autentificare
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Flame className="w-16 h-16 text-accent mx-auto mb-4 animate-flicker" />
            <h1 className="text-3xl font-bold text-primary mb-2">Pași de Pelerin</h1>
            <p className="text-muted-foreground">Resetează-ți parola</p>
          </div>

          <Card className="glow-soft">
            <CardHeader>
              <CardTitle>Setează o parolă nouă</CardTitle>
              <CardDescription>
                Introdu noua ta parolă pentru a-ți reseta accesul la cont.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Parola nouă</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      maxLength={100}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minim 8 caractere, cu literă mică, literă mare, cifră și caracter special
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmă parola nouă</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      maxLength={100}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Se procesează...
                    </>
                  ) : (
                    "Resetează parola"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ResetPassword;
