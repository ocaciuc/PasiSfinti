/**
 * Avatar thumbnail utility for Supabase Storage.
 * Generates optimized thumbnail URLs using Supabase's image transformation API.
 * This avoids loading full-size (~3MB) profile images in comment lists.
 */

const THUMBNAIL_SIZE = 64;
const SUPABASE_STORAGE_HOST = "yanjhfqqdcevlzmwsrnj.supabase.co/storage/v1";

/**
 * Convert a Supabase storage URL to a resized WebP thumbnail.
 * Uses Supabase's built-in image transformation:
 * /render/image/public/bucket/path?width=64&height=64&format=webp&quality=75
 *
 * If the URL is not a Supabase storage URL, returns it as-is.
 */
export function getAvatarThumbnailUrl(
  originalUrl: string | null | undefined,
  size: number = THUMBNAIL_SIZE
): string | null {
  if (!originalUrl) return null;

  try {
    const url = new URL(originalUrl);

    // Only transform Supabase storage URLs
    if (!url.host.includes("supabase.co")) {
      return originalUrl;
    }

    // Already a render/image URL — update params
    if (url.pathname.includes("/render/image/")) {
      url.searchParams.set("width", String(size));
      url.searchParams.set("height", String(size));
      url.searchParams.set("format", "webp");
      url.searchParams.set("quality", "75");
      url.searchParams.set("resize", "cover");
      return url.toString();
    }

    // Convert /object/public/bucket/path → /render/image/public/bucket/path
    if (url.pathname.includes("/object/public/")) {
      const renderPath = url.pathname.replace("/object/public/", "/render/image/public/");
      url.pathname = renderPath;
      url.searchParams.set("width", String(size));
      url.searchParams.set("height", String(size));
      url.searchParams.set("format", "webp");
      url.searchParams.set("quality", "75");
      url.searchParams.set("resize", "cover");
      return url.toString();
    }

    // For /storage/v1/object/public/ pattern
    if (url.pathname.includes("/storage/v1/object/public/")) {
      const renderPath = url.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/"
      );
      url.pathname = renderPath;
      url.searchParams.set("width", String(size));
      url.searchParams.set("height", String(size));
      url.searchParams.set("format", "webp");
      url.searchParams.set("quality", "75");
      url.searchParams.set("resize", "cover");
      return url.toString();
    }

    return originalUrl;
  } catch {
    // If URL parsing fails, return original
    return originalUrl;
  }
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
