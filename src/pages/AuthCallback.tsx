import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "error" | "success">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL parameters
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // Check for error in URL
        if (errorParam) {
          console.error("Auth callback error:", errorParam, errorDescription);
          setStatus("error");
          setErrorMessage(getReadableErrorMessage(errorParam, errorDescription));
          return;
        }

        // If there's a code, exchange it for a session
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Session exchange error:", error);
            setStatus("error");
            setErrorMessage(getReadableErrorMessage(error.message));
            return;
          }

          if (data.session) {
            setStatus("success");
            
            // Check if user has a profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", data.session.user.id)
              .maybeSingle();

            // Clean URL and redirect
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if (profile) {
              navigate("/", { replace: true });
            } else {
              navigate("/onboarding", { replace: true });
            }
            return;
          }
        }

        // Check if user already has a session (e.g., clicked link multiple times)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // User already has a valid session
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          setStatus("success");
          
          if (profile) {
            navigate("/", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
          return;
        }

        // No code and no session - redirect to auth
        setStatus("error");
        setErrorMessage("Link-ul de confirmare nu este valid. Te rugăm să te autentifici.");
        
      } catch (err) {
        console.error("Auth callback exception:", err);
        setStatus("error");
        setErrorMessage("A apărut o eroare neașteptată. Te rugăm să încerci din nou.");
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const getReadableErrorMessage = (error: string, description?: string | null): string => {
    const lowerError = error.toLowerCase();
    const lowerDesc = description?.toLowerCase() || "";
    
    if (lowerError.includes("expired") || lowerDesc.includes("expired")) {
      return "Link-ul de confirmare a expirat. Te rugăm să soliciți un nou email de confirmare.";
    }
    if (lowerError.includes("invalid") || lowerDesc.includes("invalid")) {
      return "Link-ul de confirmare nu mai este valid. Te rugăm să te autentifici.";
    }
    if (lowerError.includes("already") || lowerDesc.includes("already")) {
      return "Contul a fost deja confirmat. Te poți autentifica.";
    }
    if (lowerError.includes("signature")) {
      return "Link-ul de confirmare nu este valid. Te rugăm să te autentifici.";
    }
    
    return description || "A apărut o eroare la confirmarea contului. Te rugăm să încerci din nou.";
  };

  const handleGoToLogin = () => {
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Flame className="w-16 h-16 text-accent mx-auto mb-4 animate-flicker" />
            <h1 className="text-3xl font-bold text-primary mb-2">Pași de Pelerin</h1>
          </div>

          <Card className="glow-soft">
            <CardHeader>
              <CardTitle>
                {status === "processing" && "Se confirmă contul..."}
                {status === "success" && "Confirmare reușită!"}
                {status === "error" && "Confirmare nereușită"}
              </CardTitle>
              <CardDescription>
                {status === "processing" && "Te rugăm să aștepți câteva momente"}
                {status === "success" && "Vei fi redirecționat în curând"}
                {status === "error" && "Nu am putut confirma contul tău"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === "processing" && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground text-sm">
                    Procesăm confirmarea contului tău...
                  </p>
                </div>
              )}

              {status === "success" && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Contul tău a fost confirmat cu succes!
                  </p>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground text-sm text-center">
                    {errorMessage}
                  </p>
                  <Button onClick={handleGoToLogin} className="w-full">
                    Mergi la autentificare
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
