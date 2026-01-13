import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SplashScreen from "./SplashScreen";

interface AppInitializerProps {
  children: ReactNode;
}

// Routes that don't require session check (public routes)
const PUBLIC_ROUTES = [
  "/",
  "/privacy",
  "/terms",
  "/user-data-deletion",
  "/account-deleted",
];

// Routes that should skip session check entirely (handled internally)
const SKIP_INIT_ROUTES = [
  "/auth",
  "/auth/callback",
  "/confirmare-cont",
  "/reset-password",
];

const AppInitializer = ({ children }: AppInitializerProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;

    // Skip initialization for routes that handle their own auth logic
    if (SKIP_INIT_ROUTES.some(route => currentPath.startsWith(route))) {
      setIsInitializing(false);
      return;
    }

    // For public routes, just finish loading without redirect
    if (PUBLIC_ROUTES.includes(currentPath)) {
      // Still check session to redirect authenticated users to dashboard from welcome page
      if (currentPath === "/") {
        checkSessionAndRedirect();
      } else {
        setIsInitializing(false);
      }
      return;
    }

    // For protected routes, check session
    checkSessionAndRedirect();

    async function checkSessionAndRedirect() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // User is authenticated
          const isWelcomeOrAuth = currentPath === "/" || currentPath === "/auth";
          if (isWelcomeOrAuth) {
            // Check if user has a profile (completed onboarding)
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (profile) {
              // Profile exists, redirect to dashboard
              navigate("/dashboard", { replace: true });
            } else {
              // No profile, redirect to onboarding
              navigate("/onboarding", { replace: true });
            }
          }
          // For other protected routes, let them handle their own logic
        } else {
          // No session - if on protected route, redirect to auth
          if (!PUBLIC_ROUTES.includes(currentPath) && !SKIP_INIT_ROUTES.some(r => currentPath.startsWith(r))) {
            navigate("/auth", { replace: true });
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
        // On error, redirect to auth for protected routes
        if (!PUBLIC_ROUTES.includes(currentPath)) {
          navigate("/auth", { replace: true });
        }
      } finally {
        setIsInitializing(false);
      }
    }
  }, [location.pathname, navigate]);

  if (isInitializing) {
    return <SplashScreen />;
  }

  return <>{children}</>;
};

export default AppInitializer;
