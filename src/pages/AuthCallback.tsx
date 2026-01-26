import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_SCHEME } from "@/lib/capacitor-auth";

/**
 * Detect if we're in a mobile browser context (not Capacitor native)
 * This helps identify when OAuth redirected to the web page from a mobile in-app browser
 */
const isMobileBrowserContext = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for common mobile identifiers
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );
  
  // Also check for standalone PWA mode (not applicable here but good to have)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  return isMobile && !isStandalone;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "error" | "success" | "mobile-redirect">("processing");
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
          console.log("[AuthCallback] Exchanging code for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Session exchange error:", error);
            setStatus("error");
            setErrorMessage(getReadableErrorMessage(error.message));
            return;
          }

          if (data.session) {
            console.log("[AuthCallback] Session obtained successfully");
            
            // Check if we're in a mobile browser context (from in-app browser OAuth)
            // If so, redirect to the custom URL scheme to return to the native app
            if (isMobileBrowserContext()) {
              console.log("[AuthCallback] Mobile browser detected, redirecting to app via custom scheme");
              setStatus("mobile-redirect");
              
              // Build the redirect URL with tokens in the hash
              const appRedirectUrl = `${APP_SCHEME}://auth/callback#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&token_type=bearer`;
              
              // Small delay to show the redirect message, then redirect
              setTimeout(() => {
                console.log("[AuthCallback] Redirecting to:", appRedirectUrl);
                window.location.href = appRedirectUrl;
              }, 500);
              return;
            }
            
            // Web flow: continue with normal navigation
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
              navigate("/dashboard", { replace: true });
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
            navigate("/dashboard", { replace: true });
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
                {status === "mobile-redirect" && "Autentificare reușită!"}
              </CardTitle>
              <CardDescription>
                {status === "processing" && "Te rugăm să aștepți câteva momente"}
                {status === "success" && "Vei fi redirecționat în curând"}
                {status === "error" && "Nu am putut confirma contul tău"}
                {status === "mobile-redirect" && "Te redirecționăm către aplicație..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(status === "processing" || status === "mobile-redirect") && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground text-sm">
                    {status === "processing" 
                      ? "Procesăm confirmarea contului tău..." 
                      : "Se deschide aplicația Pași de Pelerin..."}
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
