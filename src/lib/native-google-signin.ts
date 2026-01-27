import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for the native Google Sign-In plugin result
 */
interface GoogleSignInResult {
  idToken: string;
  email: string;
  displayName: string;
  profilePictureUri: string;
}

/**
 * Interface for the native Google Sign-In plugin
 */
interface GoogleSignInPlugin {
  signIn(options: { webClientId: string }): Promise<GoogleSignInResult>;
  signOut(): Promise<void>;
}

// Register the native plugin
const GoogleSignIn = registerPlugin<GoogleSignInPlugin>('GoogleSignIn');

/**
 * Google OAuth Web Client ID from Supabase
 * 
 * IMPORTANT: This must be the Web Client ID (not Android Client ID)
 * Get this from your Google Cloud Console > APIs & Services > Credentials
 * It's the same Client ID configured in Supabase Dashboard > Auth > Providers > Google
 */
const GOOGLE_WEB_CLIENT_ID = '958719330888-g1h7q31e56h1sefntjq5f52apotqamhh.apps.googleusercontent.com';

/**
 * Check if we're running on a native platform
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Perform native Google Sign-In and authenticate with Supabase
 * 
 * This function:
 * 1. Opens native Google Sign-In UI (One Tap)
 * 2. Gets the Google ID Token
 * 3. Exchanges it with Supabase using signInWithIdToken
 * 
 * No browser or Custom Tab is opened - everything happens natively.
 */
export const performNativeGoogleSignIn = async (): Promise<{ error: Error | null }> => {
  if (!isNativePlatform()) {
    console.log('[native-google-signin] Not on native platform, falling back to web OAuth');
    return { error: new Error('Native Google Sign-In is only available on mobile') };
  }

  try {
    console.log('[native-google-signin] Starting native Google Sign-In...');
    
    // Step 1: Get Google ID Token from native plugin
    const result = await GoogleSignIn.signIn({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
    
    console.log('[native-google-signin] Got Google credential:', {
      email: result.email,
      displayName: result.displayName,
      hasIdToken: !!result.idToken,
    });
    
    if (!result.idToken) {
      throw new Error('No ID token received from Google');
    }
    
    // Step 2: Sign in to Supabase using the Google ID Token
    console.log('[native-google-signin] Signing in to Supabase with ID token...');
    
    const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: result.idToken,
    });
    
    if (supabaseError) {
      console.error('[native-google-signin] Supabase signInWithIdToken error:', supabaseError);
      throw supabaseError;
    }
    
    console.log('[native-google-signin] Successfully signed in to Supabase:', {
      userId: data.user?.id,
      email: data.user?.email,
    });
    
    return { error: null };
    
  } catch (error) {
    console.error('[native-google-signin] Error:', error);
    
    // Convert to Error object if needed
    const errorObj = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : 'Google Sign-In failed');
    
    return { error: errorObj };
  }
};

/**
 * Sign out from native Google Sign-In
 * 
 * This clears the Google One Tap state so the user can sign in with
 * a different account next time.
 */
export const signOutFromGoogle = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }
  
  try {
    console.log('[native-google-signin] Signing out from Google...');
    await GoogleSignIn.signOut();
    console.log('[native-google-signin] Signed out from Google');
  } catch (error) {
    // Ignore errors - signing out from Supabase is what matters
    console.log('[native-google-signin] Google sign out error (ignoring):', error);
  }
};
