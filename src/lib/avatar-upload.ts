/**
 * Avatar upload utility — generates resized variants and uploads to Supabase Storage.
 *
 * Storage structure:
 *   avatars/{userId}/avatar_small.webp   (64×64, for comments)
 *   avatars/{userId}/avatar_medium.webp  (256×256, for profile)
 *
 * The `avatar_url` column in `profiles` stores the medium URL.
 * The small URL is derived by replacing `avatar_medium` with `avatar_small`.
 */

import { supabase } from "@/integrations/supabase/client";
import { generateAvatarVariants } from "./image-resize";

const BUCKET = "avatars";

function storagePath(userId: string, variant: "small" | "medium") {
  return `${userId}/avatar_${variant}.webp`;
}

/**
 * Upload avatar variants and return the public URL of the medium image.
 * Overwrites any existing avatars for this user.
 */
export async function uploadAvatar(
  userId: string,
  file: File | Blob
): Promise<string> {
  const { small, medium } = await generateAvatarVariants(file);

  // Upload both variants in parallel
  const [smallResult, mediumResult] = await Promise.all([
    supabase.storage
      .from(BUCKET)
      .upload(storagePath(userId, "small"), small, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "3600",
      }),
    supabase.storage
      .from(BUCKET)
      .upload(storagePath(userId, "medium"), medium, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "3600",
      }),
  ]);

  if (smallResult.error) throw smallResult.error;
  if (mediumResult.error) throw mediumResult.error;

  // Return public URL for medium avatar
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath(userId, "medium"));

  // Append cache-busting param to ensure fresh images
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Given a medium avatar URL, derive the small avatar URL.
 * Works for both storage URLs and legacy base64 data-URIs (returns as-is).
 */
export function getSmallAvatarUrl(
  mediumUrl: string | null | undefined
): string | null {
  if (!mediumUrl) return null;
  // Legacy base64 — return as-is
  if (mediumUrl.startsWith("data:")) return mediumUrl;
  // Replace avatar_medium with avatar_small in path
  return mediumUrl.replace("avatar_medium.webp", "avatar_small.webp");
}
