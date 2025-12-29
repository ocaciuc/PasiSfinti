import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Flame, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import Footer from "@/components/Footer";
import { translateAuthError } from "@/lib/onboarding-error-handler";

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Adresa de email nu este validă" });
const passwordSchema = z
  .string()
  .min(8, { message: "Parola trebuie să aibă cel puțin 8 caractere" })
  .max(100, { message: "Parola este prea lungă" })
  .refine((val) => /[a-z]/.test(val), { message: "Parola trebuie să conțină cel puțin o literă mică" })
  .refine((val) => /[A-Z]/.test(val), { message: "Parola trebuie să conțină cel puțin o literă mare" })
  .refine((val) => /[0-9]/.test(val), { message: "Parola trebuie să conțină cel puțin o cifră" })
  .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(val), { message: "Parola trebuie să conțină cel puțin un caracter special (!@#$%^&* etc.)" });

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    // Handle OAuth callback - check URL hash/params for tokens
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      // Check for error in callback
      const error = hashParams.get('error') || queryParams.get('error');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
      
      if (error) {
        // Only show error if it's not a signature/token error (those should go to /auth/callback)
        const isTokenError = error.toLowerCase().includes('token') || 
                            errorDescription?.toLowerCase().includes('token') ||
                            errorDescription?.toLowerCase().includes('signature');
        
        if (!isTokenError) {
          console.error('OAuth error:', error, errorDescription);
          toast({
            title: "Eroare la autentificare",
            description: errorDescription || "A apărut o eroare la autentificare",
            variant: "destructive",
          });
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Check for code in query params - if present, redirect to callback handler
      const code = queryParams.get('code');
      if (code) {
        // Redirect to the callback handler to properly exchange the code
        navigate(`/auth/callback?code=${code}`, { replace: true });
        return;
      }

      // Check for access_token in hash (implicit flow from OAuth)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Set session from hash tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: "Eroare la autentificare",
            description: sessionError.message,
            variant: "destructive",
          });
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleOAuthCallback();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        navigate("/");
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google login error:', error);
        toast({
          title: "Eroare la autentificare",
          description: translateAuthError(error),
          variant: "destructive",
        });
        setGoogleLoading(false);
      }
      // Don't set loading to false here - we're redirecting to Google
    } catch (error) {
      console.error('Google login exception:', error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la autentificarea cu Google",
        variant: "destructive",
      });
      setGoogleLoading(false);
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

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Eroare la înregistrare",
        description: translateAuthError(error),
        variant: "destructive",
      });
    } else {
      toast({
        title: "Înregistrare reușită",
        description: "Contul a fost creat. Verifică emailul pentru confirmare, apoi autentifică-te.",
      });
      
      // Clear form and redirect to login tab after a short delay
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setActiveTab("signin");
      }, 1500);
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
      toast({
        title: "Autentificare eșuată",
        description: translateAuthError(error),
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
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

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setResetLoading(false);

    if (error) {
      toast({
        title: "Eroare",
        description: translateAuthError(error),
        variant: "destructive",
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: "Email trimis",
        description: "Verifică-ți căsuța de email pentru linkul de resetare a parolei.",
      });
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setEmail("");
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Flame className="w-16 h-16 text-accent mx-auto mb-4 animate-flicker" />
            <h1 className="text-3xl font-bold text-primary mb-2">Pași de Pelerin</h1>
            <p className="text-muted-foreground">Bun venit pe drumul tău spiritual</p>
          </div>

          <Card className="glow-soft">
            <CardHeader>
              <CardTitle>
                {showForgotPassword 
                  ? (resetEmailSent ? "Verifică-ți emailul" : "Resetează parola") 
                  : "Intră în comunitate"}
              </CardTitle>
              <CardDescription>
                {showForgotPassword 
                  ? (resetEmailSent 
                      ? "Ți-am trimis un email cu instrucțiuni pentru resetarea parolei" 
                      : "Introdu adresa de email pentru a primi linkul de resetare")
                  : "Creează un cont nou sau autentifică-te pentru a continua"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {showForgotPassword ? (
                resetEmailSent ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Dacă există un cont asociat cu <strong>{email}</strong>, vei primi un email cu un link pentru resetarea parolei.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Nu ai primit emailul? Verifică și folderul de spam.
                      </p>
                    </div>
                    <Button onClick={handleBackToLogin} variant="outline" className="w-full">
                      Înapoi la autentificare
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="exemplu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={resetLoading}
                          maxLength={255}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={resetLoading}>
                      {resetLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Se trimite...
                        </>
                      ) : (
                        "Trimite link de resetare"
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleBackToLogin} 
                      variant="ghost" 
                      className="w-full"
                    >
                      Înapoi la autentificare
                    </Button>
                  </form>
                )
              ) : (
                <>
                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading || loading}
                      variant="outline"
                      className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}
                      <span className="ml-2">Continuă cu Google</span>
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
                          disabled={loading || googleLoading}
                          maxLength={255}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Parola</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading || googleLoading}
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
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Ai uitat parola?
                      </button>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || googleLoading}>
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
                          disabled={loading || googleLoading}
                          maxLength={255}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Parola</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading || googleLoading}
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
                      <Label htmlFor="confirm-password">Confirmă parola</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={loading || googleLoading}
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
                    <Button type="submit" className="w-full" disabled={loading || googleLoading}>
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
