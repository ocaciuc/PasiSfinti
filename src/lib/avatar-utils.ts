/**
 * Avatar utility functions.
 *
 * Avatars are stored in Supabase Storage in two sizes:
 *   avatar_small.webp  (64×64)  — used in comments
 *   avatar_medium.webp (256×256) — used in profile cards
 *
 * The `avatar_url` column in `profiles` stores the medium URL.
 */

import { getSmallAvatarUrl } from "./avatar-upload";

/**
 * Return the appropriate avatar URL for the given context.
 * - "small" → derives the 64px URL from the stored medium URL
 * - "medium" or unspecified → returns the stored URL as-is
 */
export function getAvatarUrl(
  storedUrl: string | null | undefined,
  variant: "small" | "medium" = "medium"
): string | null {
  if (!storedUrl) return null;
  if (variant === "small") return getSmallAvatarUrl(storedUrl);
  return storedUrl;
}

/**
 * @deprecated Use getAvatarUrl(url, "small") instead
 */
export function getAvatarThumbnailUrl(
  originalUrl: string | null | undefined,
  _size?: number
): string | null {
  if (!originalUrl) return null;
  return getSmallAvatarUrl(originalUrl);
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
