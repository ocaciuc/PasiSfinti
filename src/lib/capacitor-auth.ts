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

/**
 * Get the appropriate redirect URL based on platform
 */
export const getOAuthRedirectUrl = (): string => {
  if (isNativePlatform()) {
    // Use custom URL scheme for mobile apps
    return APP_CALLBACK_URL;
  }
  // Use web URL for browser
  return `${window.location.origin}/auth`;
};

/**
 * Open OAuth URL in in-app browser (for mobile)
 * This ensures the OAuth flow happens within the app context
 */
export const openOAuthInBrowser = async (url: string): Promise<void> => {
  if (isNativePlatform()) {
    // Use in-app browser for mobile
    await Browser.open({
      url,
      presentationStyle: 'popover',
      windowName: '_self',
    });
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
      await Browser.close();
    } catch {
      // Browser might not be open, ignore error
    }
  }
};

/**
 * Parse OAuth tokens from a deep link URL
 */
const parseOAuthTokensFromUrl = (url: string): { accessToken: string | null; refreshToken: string | null } => {
  try {
    // Parse the URL - tokens can be in hash or query params
    const urlObj = new URL(url);
    
    // First check hash (fragment) for implicit flow
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    let accessToken = hashParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token');
    
    // If not in hash, check query params
    if (!accessToken) {
      const queryParams = new URLSearchParams(urlObj.search);
      accessToken = queryParams.get('access_token');
      refreshToken = queryParams.get('refresh_token');
    }
    
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error parsing OAuth tokens from URL:', error);
    return { accessToken: null, refreshToken: null };
  }
};

/**
 * Handle deep link callback from OAuth
 */
const handleDeepLinkCallback = async (url: string): Promise<boolean> => {
  console.log('Handling deep link:', url);
  
  // Check if this is an auth callback URL
  if (!url.includes('auth/callback') && !url.includes('access_token')) {
    console.log('Not an auth callback URL, ignoring');
    return false;
  }

  // Close the in-app browser if it's open
  await closeOAuthBrowser();
  
  const { accessToken, refreshToken } = parseOAuthTokensFromUrl(url);
  
  if (accessToken && refreshToken) {
    console.log('Found OAuth tokens, setting session...');
    
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    if (error) {
      console.error('Error setting session from deep link:', error);
      return false;
    }
    
    console.log('Session set successfully from deep link');
    return true;
  }
  
  console.log('No OAuth tokens found in URL');
  return false;
};

/**
 * Initialize deep link listener for OAuth callbacks
 * Should be called once when the app starts
 */
export const initializeDeepLinkListener = (onAuthSuccess?: () => void): (() => void) => {
  if (!isNativePlatform()) {
    console.log('Not a native platform, skipping deep link listener setup');
    return () => {};
  }
  
  console.log('Setting up deep link listener for native platform');
  
  let listenerHandle: { remove: () => void } | null = null;
  
  // Handle app opened with URL (cold start)
  App.getLaunchUrl().then(async (launchUrl) => {
    if (launchUrl?.url) {
      console.log('App launched with URL:', launchUrl.url);
      const success = await handleDeepLinkCallback(launchUrl.url);
      if (success && onAuthSuccess) {
        onAuthSuccess();
      }
    }
  });
  
  // Handle app opened while running (warm start)
  App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    console.log('App URL opened:', event.url);
    const success = await handleDeepLinkCallback(event.url);
    if (success && onAuthSuccess) {
      onAuthSuccess();
    }
  }).then((handle) => {
    listenerHandle = handle;
  });
  
  // Return cleanup function
  return () => {
    if (listenerHandle) {
      listenerHandle.remove();
    }
  };
};

/**
 * Perform Google OAuth login with proper mobile handling
 */
export const performGoogleOAuth = async (): Promise<{ error: Error | null }> => {
  try {
    const redirectUrl = getOAuthRedirectUrl();
    console.log('Starting Google OAuth with redirect:', redirectUrl, 'isNative:', isNativePlatform());

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Don't auto-redirect on native - we'll open in in-app browser
        skipBrowserRedirect: isNativePlatform(),
      },
    });

    if (error) {
      return { error };
    }

    // On native platform, open the OAuth URL in in-app browser
    if (isNativePlatform() && data?.url) {
      console.log('Opening OAuth URL in in-app browser:', data.url);
      await openOAuthInBrowser(data.url);
    }

    return { error: null };
  } catch (err) {
    console.error('Google OAuth exception:', err);
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
};
