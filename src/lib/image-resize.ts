/**
 * Client-side image resizing utility.
 * Uses Canvas API to resize images to WebP format before upload.
 */

interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Resize an image file to a square crop (center-cropped) at the given size.
 * Output format: WebP for smaller file sizes.
 */
export async function resizeImageToSquare(
  file: File | Blob,
  size: number,
  quality = 0.85
): Promise<ResizedImage> {
  const imageBitmap = await createImageBitmap(file);

  // Center-crop to square
  const minDim = Math.min(imageBitmap.width, imageBitmap.height);
  const sx = (imageBitmap.width - minDim) / 2;
  const sy = (imageBitmap.height - minDim) / 2;

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(imageBitmap, sx, sy, minDim, minDim, 0, 0, size, size);
  imageBitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  return { blob, width: size, height: size };
}

/** Avatar size presets */
export const AVATAR_SIZES = {
  small: 64,   // Used in comments
  medium: 256, // Used in profile cards
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

/**
 * Generate both small and medium avatar variants from a source file.
 * Returns { small: Blob, medium: Blob }.
 */
export async function generateAvatarVariants(
  file: File | Blob
): Promise<{ small: Blob; medium: Blob }> {
  const [small, medium] = await Promise.all([
    resizeImageToSquare(file, AVATAR_SIZES.small, 0.8),
    resizeImageToSquare(file, AVATAR_SIZES.medium, 0.85),
  ]);

  return { small: small.blob, medium: medium.blob };
}
