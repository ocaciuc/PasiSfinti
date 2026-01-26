import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Custom storage adapter for Supabase that uses Capacitor Preferences
 * on native platforms and falls back to localStorage on web.
 * 
 * This is necessary because localStorage in mobile WebViews is considered
 * transient - the OS may clear it when storage is low. Capacitor Preferences
 * uses SharedPreferences (Android) and UserDefaults (iOS) which persist reliably.
 */

const isNative = Capacitor.isNativePlatform();

/**
 * Get item from storage
 * Note: Supabase expects synchronous API, but Preferences is async.
 * We use a cache to provide synchronous reads after initial hydration.
 */
const cache = new Map<string, string | null>();
let isHydrated = false;

/**
 * Hydrate the cache from Preferences on app start
 * This should be called before Supabase client initialization
 */
export const hydrateStorageCache = async (): Promise<void> => {
  if (!isNative || isHydrated) return;
  
  try {
    // Hydrate known Supabase auth keys
    const authKeys = [
      'sb-yanjhfqqdcevlzmwsrnj-auth-token',
      'supabase.auth.token',
    ];
    
    for (const key of authKeys) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        cache.set(key, value);
        // Also sync to localStorage for immediate availability
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          // localStorage might not be available
        }
      }
    }
    
    isHydrated = true;
    console.log('[capacitor-storage] Cache hydrated with', cache.size, 'items');
  } catch (error) {
    console.error('[capacitor-storage] Failed to hydrate cache:', error);
  }
};

/**
 * Custom storage implementation that bridges Supabase's synchronous
 * storage API with Capacitor's async Preferences API
 */
export const capacitorStorage = {
  getItem: (key: string): string | null => {
    // On web, just use localStorage
    if (!isNative) {
      return localStorage.getItem(key);
    }
    
    // On native, check cache first
    if (cache.has(key)) {
      return cache.get(key) ?? null;
    }
    
    // Fallback to localStorage (might have been set before hydration)
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        cache.set(key, value);
        // Async persist to Preferences
        Preferences.set({ key, value }).catch(console.error);
      }
      return value;
    } catch (e) {
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    // On web, just use localStorage
    if (!isNative) {
      localStorage.setItem(key, value);
      return;
    }
    
    // On native, update cache and persist to both storages
    cache.set(key, value);
    
    // Sync write to localStorage for immediate availability
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // localStorage might not be available
    }
    
    // Async write to Preferences for persistence
    Preferences.set({ key, value }).catch(error => {
      console.error('[capacitor-storage] Failed to persist to Preferences:', error);
    });
  },
  
  removeItem: (key: string): void => {
    // On web, just use localStorage
    if (!isNative) {
      localStorage.removeItem(key);
      return;
    }
    
    // On native, remove from cache and both storages
    cache.delete(key);
    
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // localStorage might not be available
    }
    
    Preferences.remove({ key }).catch(error => {
      console.error('[capacitor-storage] Failed to remove from Preferences:', error);
    });
  },
};

/**
 * Clear all auth-related storage (for logout)
 */
export const clearAuthStorage = async (): Promise<void> => {
  const authKeys = [
    'sb-yanjhfqqdcevlzmwsrnj-auth-token',
    'supabase.auth.token',
  ];
  
  for (const key of authKeys) {
    cache.delete(key);
    
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
    
    if (isNative) {
      try {
        await Preferences.remove({ key });
      } catch (e) {
        console.error('[capacitor-storage] Failed to clear key:', key, e);
      }
    }
  }
  
  console.log('[capacitor-storage] Auth storage cleared');
};
