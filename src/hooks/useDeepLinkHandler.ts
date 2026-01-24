import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { initializeDeepLinkListener, isNativePlatform } from "@/lib/capacitor-auth";

/**
 * Global deep link handler hook that should be used at the app root level.
 * Handles OAuth and password recovery deep links on mobile.
 */
export const useDeepLinkHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only set up on native platforms
    if (!isNativePlatform()) {
      return;
    }

    // Skip if we're already on auth pages (they have their own handlers)
    if (location.pathname === "/auth" || location.pathname.startsWith("/auth/")) {
      return;
    }

    const cleanup = initializeDeepLinkListener({
      onAuthSuccess: () => {
        console.log("[useDeepLinkHandler] Auth success, navigating to dashboard");
        navigate("/dashboard", { replace: true });
      },
      onRecoverySuccess: () => {
        console.log("[useDeepLinkHandler] Recovery success, navigating to reset-password");
        navigate("/reset-password", { replace: true });
      },
    });

    return cleanup;
  }, [navigate, location.pathname]);
};
