/**
 * Avatar utility for Supabase Storage.
 * Returns original URLs directly (Supabase Image Transformations
 * require a Pro plan). Lazy loading + CSS sizing keep avatars
 * visually small while the browser handles caching.
 */

/**
 * Return a usable avatar URL.
 * The `size` parameter is kept for API compatibility but is not
 * used for server-side resizing (requires Supabase Pro).
 */
export function getAvatarThumbnailUrl(
  originalUrl: string | null | undefined,
  _size?: number
): string | null {
  if (!originalUrl) return null;
  return originalUrl;
}

/**
 * Get initials from a display name for avatar fallback.
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
