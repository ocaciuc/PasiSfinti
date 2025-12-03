import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Flame, Mail, Loader2 } from "lucide-react";
import { z } from "zod";

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Adresa de email nu este validă" });
const passwordSchema = z
  .string()
  .min(6, { message: "Parola trebuie să aibă cel puțin 6 caractere" })
  .max(100, { message: "Parola este prea lungă" });

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState("signin");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateEmail = (email: string): string | null => {
    try {
      emailSchema.parse(email);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return "Email invalid";
    }
  };

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

  const handleFacebookLogin = async () => {
    setFacebookLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Eroare la autentificare",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la autentificarea cu Facebook",
        variant: "destructive",
      });
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      toast({
        title: "Eroare validare",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

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

    const redirectUrl = `${window.location.origin}/onboarding`;

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: "Cont existent",
          description: "Acest email este deja înregistrat. Te rugăm să te autentifici.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Eroare la înregistrare",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Înregistrare reușită",
        description: "Verifică-ți emailul pentru a confirma contul.",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      toast({
        title: "Eroare validare",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Eroare validare",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast({
          title: "Autentificare eșuată",
          description: "Email sau parolă incorectă",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Eroare",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const FacebookIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Flame className="w-16 h-16 text-accent mx-auto mb-4 animate-flicker" />
          <h1 className="text-3xl font-bold text-primary mb-2">Pași de Pelerin</h1>
          <p className="text-muted-foreground">Bun venit pe drumul tău spiritual</p>
        </div>

        <Card className="glow-soft">
          <CardHeader>
            <CardTitle>Intră în comunitate</CardTitle>
            <CardDescription>
              Creează un cont nou sau autentifică-te pentru a continua
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleFacebookLogin}
                disabled={facebookLoading || loading}
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
              >
                {facebookLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <FacebookIcon />
                )}
                <span className="ml-2">Continuă cu Facebook</span>
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  sau continuă cu email
                </span>
              </div>
            </div>

            {/* Email/Password Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Autentificare</TabsTrigger>
                <TabsTrigger value="signup">Înregistrare</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="exemplu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading || facebookLoading}
                        maxLength={255}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Parola</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading || facebookLoading}
                      maxLength={100}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || facebookLoading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Se încarcă...
                      </>
                    ) : (
                      "Autentifică-te"
                    )}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Nu ai cont?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("signup")}
                      className="text-primary hover:underline font-medium"
                    >
                      Creează unul acum
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="exemplu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading || facebookLoading}
                        maxLength={255}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Parola</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading || facebookLoading}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmă parola</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading || facebookLoading}
                      maxLength={100}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || facebookLoading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Se încarcă...
                      </>
                    ) : (
                      "Creează cont"
                    )}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Ai deja cont?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("signin")}
                      className="text-primary hover:underline font-medium"
                    >
                      Autentifică-te
                    </button>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
