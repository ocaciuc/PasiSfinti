import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';

// Custom URL scheme for the app - must match Android/iOS config
export const APP_SCHEME = 'pelerinaj';
export const APP_CALLBACK_URL = `${APP_SCHEME}://auth/callback`;

/**
 * Check if running on a native mobile platform
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Web callback URL that will bridge to the app
export const WEB_CALLBACK_URL = 'https://pasi-comunitate-sfanta.lovable.app/auth/callback';

/**
 * Get the appropriate redirect URL based on platform
 * 
 * IMPORTANT: On mobile, we redirect to the WEB callback URL first, not the custom scheme.
 * This is because Chrome Custom Tabs often block or fail to handle direct redirects
 * to custom URL schemes (pelerinaj://).
 * 
 * The flow is:
 * 1. Supabase OAuth redirects to WEB_CALLBACK_URL (https://pasi-comunitate-sfanta.lovable.app/auth/callback)
 * 2. AuthCallback.tsx detects it's in a mobile browser context
 * 3. AuthCallback.tsx redirects to pelerinaj://auth/callback with tokens
 * 4. Android intercepts the custom scheme via intent-filter
 * 5. App receives deep link, closes browser, sets session
 * 
 * This "web-to-app bridge" approach works reliably across all Android versions.
 */
export const getOAuthRedirectUrl = (): string => {
  if (isNativePlatform()) {
    // On mobile, use the web callback as a bridge
    // The web page will redirect to the custom scheme
    console.log('[capacitor-auth] Using web bridge for OAuth redirect:', WEB_CALLBACK_URL);
    return WEB_CALLBACK_URL;
  }
  // On web, use the web callback URL
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth/callback`;
};

/**
 * Open OAuth URL in in-app browser (for mobile)
 * 
 * CRITICAL: We use presentationStyle: 'popover' on Android because:
 * 1. It opens Chrome Custom Tabs which can handle redirects better
 * 2. The redirect to custom scheme (pelerinaj://) will trigger the intent-filter
 * 3. Android will then route the URL to our app via the deep link listener
 */
export const openOAuthInBrowser = async (url: string): Promise<void> => {
  if (isNativePlatform()) {
    console.log('[capacitor-auth] Opening OAuth URL in in-app browser');
    console.log('[capacitor-auth] OAuth URL (truncated):', url.substring(0, 150) + '...');
    
    try {
      // Open in-app browser
      // On Android, this opens Chrome Custom Tabs
      // The redirect to pelerinaj:// will be intercepted by the intent-filter
      await Browser.open({
        url,
        presentationStyle: 'popover', // popover works better with custom schemes on Android
        toolbarColor: '#4B0082', // Match app theme
      });
      
      console.log('[capacitor-auth] Browser opened successfully');
    } catch (error) {
      console.error('[capacitor-auth] Failed to open browser:', error);
      throw error;
    }
  } else {
    // Fallback for web - just redirect
    window.location.href = url;
  }
};

/**
 * Close the in-app browser (if open)
 */
export const closeOAuthBrowser = async (): Promise<void> => {
  if (isNativePlatform()) {
    try {
      console.log('[capacitor-auth] Closing in-app browser');
      await Browser.close();
    } catch (error) {
      // Browser might not be open, ignore error
      console.log('[capacitor-auth] Browser close error (may not be open):', error);
    }
  }
};

/**
 * Remove all browser listeners
 */
export const removeAllBrowserListeners = async (): Promise<void> => {
  try {
    await Browser.removeAllListeners();
  } catch (error) {
    console.log('[capacitor-auth] Failed to remove browser listeners:', error);
  }
};

/**
 * Result type for deep link parsing
 */
interface DeepLinkResult {
  accessToken: string | null;
  refreshToken: string | null;
  isRecovery: boolean;
}

/**
 * Parse OAuth tokens and recovery type from a deep link URL
 */
const parseOAuthTokensFromUrl = (url: string): DeepLinkResult => {
  try {
    console.log('[capacitor-auth] Parsing OAuth tokens from URL:', url);
    
    // Parse the URL - tokens can be in hash or query params
    const urlObj = new URL(url);
    
    // First check hash (fragment) for implicit flow
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    let accessToken = hashParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    console.log('[capacitor-auth] Hash params - accessToken exists:', !!accessToken, 'type:', type);
    
    // If not in hash, check query params
    if (!accessToken) {
      const queryParams = new URLSearchParams(urlObj.search);
      accessToken = queryParams.get('access_token');
      refreshToken = queryParams.get('refresh_token');
      console.log('[capacitor-auth] Query params - accessToken exists:', !!accessToken);
    }
    
    return { 
      accessToken, 
      refreshToken,
      isRecovery: type === 'recovery'
    };
  } catch (error) {
    console.error('[capacitor-auth] Error parsing OAuth tokens from URL:', error);
    return { accessToken: null, refreshToken: null, isRecovery: false };
  }
};

/**
 * Result of handling a deep link callback
 */
export interface DeepLinkCallbackResult {
  success: boolean;
  isRecovery: boolean;
}

/**
 * Handle deep link callback from OAuth or password recovery
 */
const handleDeepLinkCallback = async (url: string): Promise<DeepLinkCallbackResult> => {
  console.log('[capacitor-auth] Handling deep link:', url);
  
  // Check if this is an auth callback URL (OAuth or password recovery)
  // Password recovery URLs contain type=recovery in the hash
  const isAuthUrl = url.includes(APP_SCHEME) || 
                    url.includes('auth/callback') || 
                    url.includes('access_token') || 
                    url.includes('type=recovery');
  
  if (!isAuthUrl) {
    console.log('[capacitor-auth] Not an auth callback URL, ignoring');
    return { success: false, isRecovery: false };
  }

  // CRITICAL: Close the in-app browser FIRST and IMMEDIATELY
  // This is the key fix - the browser MUST close before the app shows the dashboard
  console.log('[capacitor-auth] *** CLOSING BROWSER IMMEDIATELY ***');
  
  // Close browser using multiple methods to ensure it works
  try {
    // Method 1: Direct close
    await Browser.close();
    console.log('[capacitor-auth] Browser.close() succeeded');
  } catch (e) {
    console.log('[capacitor-auth] Browser.close() error:', e);
  }
  
  // Method 2: Remove all listeners (this can also trigger close on some platforms)
  try {
    await Browser.removeAllListeners();
    console.log('[capacitor-auth] Browser listeners removed');
  } catch (e) {
    console.log('[capacitor-auth] Failed to remove browser listeners:', e);
  }
  
  // Add a small delay to ensure browser is fully closed
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const { accessToken, refreshToken, isRecovery } = parseOAuthTokensFromUrl(url);
  
  if (accessToken && refreshToken) {
    console.log('[capacitor-auth] Found OAuth tokens, setting session... isRecovery:', isRecovery);
    
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    if (error) {
      console.error('[capacitor-auth] Error setting session from deep link:', error);
      return { success: false, isRecovery };
    }
    
    console.log('[capacitor-auth] Session set successfully from deep link');
    return { success: true, isRecovery };
  }
  
  console.log('[capacitor-auth] No OAuth tokens found in URL');
  return { success: false, isRecovery: false };
};

/**
 * Callback type for deep link authentication
 */
export interface DeepLinkAuthCallback {
  onAuthSuccess?: () => void;
  onRecoverySuccess?: () => void;
}

// Store for active listener to prevent duplicates
let activeDeepLinkListener: { remove: () => void } | null = null;
let isListenerSetup = false;

/**
 * Initialize deep link listener for OAuth and password recovery callbacks
 * Should be called once when the app starts
 */
export const initializeDeepLinkListener = (callbacks?: DeepLinkAuthCallback): (() => void) => {
  if (!isNativePlatform()) {
    console.log('[capacitor-auth] Not a native platform, skipping deep link listener setup');
    return () => {};
  }
  
  // Prevent duplicate listeners
  if (isListenerSetup && activeDeepLinkListener) {
    console.log('[capacitor-auth] Deep link listener already setup, reusing existing');
    return () => {
      // Don't actually remove the listener here to prevent race conditions
    };
  }
  
  console.log('[capacitor-auth] Setting up deep link listener for native platform');
  isListenerSetup = true;
  
  const handleResult = async (result: DeepLinkCallbackResult) => {
    if (result.success) {
      // Add a small delay to ensure the browser is fully closed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (result.isRecovery && callbacks?.onRecoverySuccess) {
        console.log('[capacitor-auth] Recovery flow detected, calling onRecoverySuccess');
        callbacks.onRecoverySuccess();
      } else if (!result.isRecovery && callbacks?.onAuthSuccess) {
        console.log('[capacitor-auth] Auth success, calling onAuthSuccess');
        callbacks.onAuthSuccess();
      }
    }
  };
  
  // Handle app opened with URL (cold start)
  App.getLaunchUrl().then(async (launchUrl) => {
    if (launchUrl?.url) {
      console.log('[capacitor-auth] App launched with URL:', launchUrl.url);
      const result = await handleDeepLinkCallback(launchUrl.url);
      handleResult(result);
    }
  });
  
  // Handle app opened while running (warm start)
  App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    console.log('[capacitor-auth] App URL opened event:', event.url);
    const result = await handleDeepLinkCallback(event.url);
    handleResult(result);
  }).then((handle) => {
    activeDeepLinkListener = handle;
  });
  
  // Return cleanup function
  return () => {
    if (activeDeepLinkListener) {
      console.log('[capacitor-auth] Removing deep link listener');
      activeDeepLinkListener.remove();
      activeDeepLinkListener = null;
      isListenerSetup = false;
    }
  };
};

/**
 * Force cleanup of all listeners (useful for debugging)
 */
export const cleanupAllListeners = async (): Promise<void> => {
  if (activeDeepLinkListener) {
    activeDeepLinkListener.remove();
    activeDeepLinkListener = null;
    isListenerSetup = false;
  }
  await removeAllBrowserListeners();
};

/**
 * Perform Google OAuth login with proper mobile handling
 */
export const performGoogleOAuth = async (): Promise<{ error: Error | null }> => {
  try {
    const redirectUrl = getOAuthRedirectUrl();
    const nativePlatform = isNativePlatform();
    console.log('[capacitor-auth] Starting Google OAuth with redirect:', redirectUrl, 'isNative:', nativePlatform);
    console.log('[capacitor-auth] Platform info:', {
      platform: Capacitor.getPlatform(),
      isNative: nativePlatform,
      redirectUrl: redirectUrl,
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Don't auto-redirect on native - we'll open in in-app browser
        skipBrowserRedirect: nativePlatform,
      },
    });

    if (error) {
      console.error('[capacitor-auth] Google OAuth error:', error);
      return { error };
    }

    // On native platform, open the OAuth URL in in-app browser
    if (nativePlatform && data?.url) {
      console.log('[capacitor-auth] Opening OAuth URL in in-app browser:', data.url.substring(0, 100) + '...');
      await openOAuthInBrowser(data.url);
    } else if (!nativePlatform && data?.url) {
      // On web, redirect normally
      console.log('[capacitor-auth] Web platform - redirecting to OAuth URL');
      window.location.href = data.url;
    }

    return { error: null };
  } catch (err) {
    console.error('[capacitor-auth] Google OAuth exception:', err);
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
};
