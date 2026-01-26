import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2, ExternalLink, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_SCHEME, isNativePlatform } from "@/lib/capacitor-auth";

/**
 * AuthCallback handles OAuth redirects from Supabase.
 * 
 * KEY INSIGHT: On Android, Supabase OAuth flow works like this:
 * 1. App opens Chrome Custom Tab with Supabase OAuth URL
 * 2. User authenticates with Google
 * 3. Google redirects to Supabase callback
 * 4. Supabase exchanges code and redirects to our redirect_to URL
 * 
 * The problem: If Supabase doesn't have the custom scheme in redirect URLs,
 * it falls back to the web URL. The Chrome Custom Tab then loads this web page.
 * 
 * Solution: This page detects it's running in a mobile context and immediately
 * redirects to the app's custom scheme with the session tokens.
 */

/**
 * Check if we're on a mobile device (regardless of native app or browser)
 */
const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
};

/**
 * Check if we're likely in a Chrome Custom Tab or similar embedded browser
 * These are the scenarios where we want to redirect back to the app
 */
const isEmbeddedMobileBrowser = (): boolean => {
  // If running in native Capacitor WebView, we don't need to redirect
  if (isNativePlatform()) {
    return false;
  }
  
  // Check if on mobile device
  if (!isMobileDevice()) {
    return false;
  }
  
  // On mobile but not in native app = Chrome Custom Tab or mobile browser
  // In either case, we want to redirect to the app
  return true;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "error" | "success" | "mobile-redirect">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showManualButton, setShowManualButton] = useState(false);
  const redirectAttempted = useRef(false);
  const sessionRef = useRef<{ access_token: string; refresh_token: string } | null>(null);

  /**
   * Build the app redirect URL with tokens
   */
  const buildAppRedirectUrl = (accessToken: string, refreshToken: string): string => {
    return `${APP_SCHEME}://auth/callback#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&token_type=bearer`;
  };

  /**
   * Trigger redirect to the native app
   */
  const redirectToApp = () => {
    if (!sessionRef.current) {
      console.log("[AuthCallback] No session to redirect with");
      return;
    }
    
    const appRedirectUrl = buildAppRedirectUrl(
      sessionRef.current.access_token, 
      sessionRef.current.refresh_token
    );
    console.log("[AuthCallback] Redirecting to app:", appRedirectUrl.substring(0, 80) + "...");
    
    // Method 1: Direct location change (works in most cases)
    window.location.href = appRedirectUrl;
    
    // Method 2: Create and click a link (backup for some browsers)
    setTimeout(() => {
      try {
        const link = document.createElement('a');
        link.href = appRedirectUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("[AuthCallback] Fallback link click executed");
      } catch (e) {
        console.log("[AuthCallback] Fallback link click failed:", e);
      }
    }, 500);

    // Method 3: Use window.open as last resort
    setTimeout(() => {
      try {
        window.open(appRedirectUrl, '_self');
        console.log("[AuthCallback] Fallback window.open executed");
      } catch (e) {
        console.log("[AuthCallback] Fallback window.open failed:", e);
      }
    }, 1000);
  };

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

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[AuthCallback] Starting callback handling");
        console.log("[AuthCallback] URL:", window.location.href);
        console.log("[AuthCallback] Is embedded mobile browser:", isEmbeddedMobileBrowser());
        console.log("[AuthCallback] Is native platform:", isNativePlatform());

        // Check for tokens in hash (from OAuth implicit flow or our redirect)
        const hash = location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const hashAccessToken = hashParams.get('access_token');
          const hashRefreshToken = hashParams.get('refresh_token');
          
          if (hashAccessToken && hashRefreshToken) {
            console.log("[AuthCallback] Found tokens in hash, setting session...");
            
            const { error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });
            
            if (!error) {
              console.log("[AuthCallback] Session set from hash tokens");
              setStatus("success");
              
              // Check profile and navigate
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("id")
                  .eq("user_id", session.user.id)
                  .maybeSingle();

                window.history.replaceState({}, document.title, window.location.pathname);
                navigate(profile ? "/dashboard" : "/onboarding", { replace: true });
              }
              return;
            }
          }
        }

        // Get the code from URL parameters
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        console.log("[AuthCallback] Code present:", !!code, "Error:", errorParam);

        // Check for error in URL
        if (errorParam) {
          console.error("[AuthCallback] Auth error:", errorParam, errorDescription);
          setStatus("error");
          setErrorMessage(getReadableErrorMessage(errorParam, errorDescription));
          return;
        }

        // If there's a code, exchange it for a session
        if (code) {
          console.log("[AuthCallback] Exchanging code for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("[AuthCallback] Session exchange error:", error);
            setStatus("error");
            setErrorMessage(getReadableErrorMessage(error.message));
            return;
          }

          if (data.session) {
            console.log("[AuthCallback] Session obtained successfully");
            
            // Check if we're in an embedded mobile browser (Chrome Custom Tab)
            // and need to redirect back to the native app
            if (isEmbeddedMobileBrowser() && !redirectAttempted.current) {
              redirectAttempted.current = true;
              console.log("[AuthCallback] Detected embedded mobile browser, redirecting to app...");
              setStatus("mobile-redirect");
              
              // Store session for redirect
              sessionRef.current = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
              };
              
              // Attempt automatic redirect after a short delay
              setTimeout(() => {
                redirectToApp();
                
                // Show manual button after 3 seconds if still on this page
                setTimeout(() => {
                  setShowManualButton(true);
                }, 3000);
              }, 100);
              return;
            }
            
            // Web flow or native app: continue with normal navigation
            setStatus("success");
            
            // Check if user has a profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", data.session.user.id)
              .maybeSingle();

            // Clean URL and redirect
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate(profile ? "/dashboard" : "/onboarding", { replace: true });
            return;
          }
        }

        // Check if user already has a session (e.g., clicked link multiple times)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("[AuthCallback] Existing session found");
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          setStatus("success");
          navigate(profile ? "/dashboard" : "/onboarding", { replace: true });
          return;
        }

        // No code and no session - redirect to auth
        console.log("[AuthCallback] No code or session found");
        setStatus("error");
        setErrorMessage("Link-ul de confirmare nu este valid. Te rugăm să te autentifici.");
        
      } catch (err) {
        console.error("[AuthCallback] Exception:", err);
        setStatus("error");
        setErrorMessage("A apărut o eroare neașteptată. Te rugăm să încerci din nou.");
      }
    };

    handleCallback();
  }, [searchParams, navigate, location.hash]);

  const handleGoToLogin = () => {
    navigate("/auth", { replace: true });
  };

  const handleManualRedirect = () => {
    console.log("[AuthCallback] Manual redirect button clicked");
    redirectToApp();
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
                {status === "mobile-redirect" && (showManualButton 
                  ? "Apasă butonul pentru a reveni în aplicație" 
                  : "Te redirecționăm către aplicație...")}
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

              {status === "mobile-redirect" && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  {!showManualButton ? (
                    <>
                      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                      <p className="text-muted-foreground text-sm text-center">
                        Se deschide aplicația Pași de Pelerin...
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <Smartphone className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-foreground font-medium text-center">
                        Te-ai autentificat cu succes!
                      </p>
                      <p className="text-muted-foreground text-sm text-center">
                        Apasă butonul de mai jos pentru a continua în aplicație.
                      </p>
                      <Button 
                        onClick={handleManualRedirect} 
                        className="w-full mt-4"
                        size="lg"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Deschide în aplicație
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-4">
                        Dacă aplicația nu se deschide, poți închide această fereastră și te vei regăsi autentificat în aplicație.
                      </p>
                    </>
                  )}
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
