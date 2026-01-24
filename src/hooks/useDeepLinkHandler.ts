import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { initializeDeepLinkListener, isNativePlatform, cleanupAllListeners } from "@/lib/capacitor-auth";

/**
 * Global deep link handler hook that should be used at the app root level.
 * Handles OAuth and password recovery deep links on mobile.
 * 
 * This hook sets up listeners that persist throughout the app lifecycle
 * and ensures deep links are properly handled regardless of which screen
 * the user is currently on.
 */
export const useDeepLinkHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only set up on native platforms
    if (!isNativePlatform()) {
      return;
    }

    // Only initialize once per app lifecycle
    if (isInitialized.current) {
      console.log('[useDeepLinkHandler] Already initialized, skipping');
      return;
    }

    console.log('[useDeepLinkHandler] Initializing deep link handler');
    isInitialized.current = true;

    const cleanup = initializeDeepLinkListener({
      onAuthSuccess: () => {
        console.log("[useDeepLinkHandler] Auth success, navigating to dashboard");
        // Use a small timeout to ensure the browser is fully closed
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 150);
      },
      onRecoverySuccess: () => {
        console.log("[useDeepLinkHandler] Recovery success, navigating to reset-password");
        setTimeout(() => {
          navigate("/reset-password", { replace: true });
        }, 150);
      },
    });

    return () => {
      console.log('[useDeepLinkHandler] Cleanup called');
      cleanup();
      isInitialized.current = false;
    };
  }, [navigate]);

  // Cleanup all listeners on unmount (safety measure)
  useEffect(() => {
    return () => {
      if (isNativePlatform()) {
        cleanupAllListeners();
      }
    };
  }, []);
};
