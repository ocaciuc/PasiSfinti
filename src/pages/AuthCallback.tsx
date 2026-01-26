import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_SCHEME } from "@/lib/capacitor-auth";

/**
 * Detect if we're running inside Chrome Custom Tabs or similar in-app browser on Android.
 * Chrome Custom Tabs have specific patterns in the user agent.
 */
const isInAppBrowser = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const ua = userAgent.toLowerCase();
  
  // Check for Android first
  const isAndroid = /android/i.test(ua);
  
  // Check for iOS in-app browsers
  const isIOSInApp = /iphone|ipad|ipod/i.test(ua) && !/safari/i.test(ua);
  
  // Check if NOT the Capacitor native WebView (which has "capacitor" or specific markers)
  // Chrome Custom Tabs on Android appear as Chrome but are NOT the native app WebView
  const isCapacitorWebView = /capacitor/i.test(ua) || window.hasOwnProperty('Capacitor');
  
  // If we're in a mobile context but NOT in Capacitor's WebView, we're likely in an in-app browser
  const isMobileWeb = isAndroid || isIOSInApp;
  
  // Additional check: if referrer includes OAuth providers
  const hasCCTMarkers = document.referrer.includes('accounts.google.com') || 
                        document.referrer.includes('supabase.co');
  
  console.log('[AuthCallback] Browser detection:', {
    isAndroid,
    isIOSInApp,
    isCapacitorWebView,
    isMobileWeb,
    hasCCTMarkers,
    userAgent: ua.substring(0, 100)
  });
  
  // We're in an in-app browser if:
  // 1. We're on mobile AND
  // 2. We're NOT in the native Capacitor WebView
  // 3. OR we came from Google OAuth on mobile
  return (isMobileWeb && !isCapacitorWebView) || (isMobileWeb && hasCCTMarkers);
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "error" | "success" | "mobile-redirect">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showManualButton, setShowManualButton] = useState(false);
  const redirectAttempted = useRef(false);
  const sessionRef = useRef<{ access_token: string; refresh_token: string } | null>(null);

  // Function to trigger app redirect
  const redirectToApp = () => {
    if (!sessionRef.current) return;
    
    const appRedirectUrl = `${APP_SCHEME}://auth/callback#access_token=${sessionRef.current.access_token}&refresh_token=${sessionRef.current.refresh_token}&token_type=bearer`;
    console.log("[AuthCallback] Redirecting to app:", appRedirectUrl);
    
    // Try multiple redirect approaches for better compatibility
    // Method 1: Direct location change
    window.location.href = appRedirectUrl;
    
    // Method 2: If still here after 300ms, try creating a hidden link and clicking it
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = appRedirectUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 300);
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
            
            // Check if we're in an in-app browser context (Chrome Custom Tab from OAuth)
            const inAppBrowser = isInAppBrowser();
            console.log("[AuthCallback] In-app browser detected:", inAppBrowser);
            
            if (inAppBrowser && !redirectAttempted.current) {
              redirectAttempted.current = true;
              console.log("[AuthCallback] Mobile in-app browser detected, redirecting to app via custom scheme");
              setStatus("mobile-redirect");
              
              // Store session for manual redirect button
              sessionRef.current = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
              };
              
              // Attempt automatic redirect
              setTimeout(() => {
                redirectToApp();
                
                // Show manual button after 2 seconds if still on this page
                setTimeout(() => {
                  setShowManualButton(true);
                }, 2000);
              }, 300);
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

  const handleGoToLogin = () => {
    navigate("/auth", { replace: true });
  };

  const handleManualRedirect = () => {
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
                  ? "Apasă butonul de mai jos pentru a reveni în aplicație" 
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
                  {!showManualButton && (
                    <>
                      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                      <p className="text-muted-foreground text-sm">
                        Se deschide aplicația Pași de Pelerin...
                      </p>
                    </>
                  )}
                  
                  {showManualButton && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-muted-foreground text-sm text-center">
                        Te-ai autentificat cu succes!
                      </p>
                      <Button 
                        onClick={handleManualRedirect} 
                        className="w-full"
                        size="lg"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Deschide în aplicație
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Dacă aplicația nu se deschide, poți închide această fereastră și reveni manual.
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
