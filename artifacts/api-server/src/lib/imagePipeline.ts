import sharp from "sharp";

/**
 * Web-optimized derivative sizes generated for every uploaded product image.
 * Both are WebP, both preserve aspect ratio, neither ever upscales a smaller
 * original (`withoutEnlargement: true`) — a 400px original stays 400px, just
 * re-encoded for better compression.
 *
 * - `display`: the size stored at the main `url` — used for hero/gallery/detail
 *   views. Replaces what used to be the raw uploaded original.
 * - `thumbnail`: a second, smaller derivative stored at `thumbnailUrl` — used
 *   for shop-grid cards and variety-selector thumbnails, which never need to
 *   render anywhere near full width.
 */
export const IMAGE_DERIVATIVES = {
  display: { maxWidth: 1200, quality: 82 },
  thumbnail: { maxWidth: 600, quality: 78 },
} as const;

export interface ImageDerivative {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: "image/webp";
}

export interface ProcessedImage {
  display: ImageDerivative;
  thumbnail: ImageDerivative;
  original: { width: number; height: number };
}

async function makeDerivative(source: sharp.Sharp, maxWidth: number, quality: number): Promise<ImageDerivative> {
  const resized = source.clone().resize({ width: maxWidth, withoutEnlargement: true });
  const buffer = await resized.webp({ quality }).toBuffer();
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read derivative dimensions after resize");
  return { buffer, width: meta.width, height: meta.height, contentType: "image/webp" };
}

/**
 * Produces the two web-optimized derivatives for a freshly uploaded image
 * buffer. Orientation (EXIF) is normalized before resizing so a
 * sideways-tagged photo doesn't end up sideways in the display derivative.
 * Throws if the buffer isn't a readable image — callers should have already
 * validated MIME type/dimensions before calling this.
 */
export async function processUploadedImage(buffer: Buffer): Promise<ProcessedImage> {
  const base = sharp(buffer).rotate(); // rotate() with no args = auto-orient from EXIF, then strip it
  const originalMeta = await base.metadata();
  if (!originalMeta.width || !originalMeta.height) {
    throw new Error("Could not read image dimensions — the file may be corrupt.");
  }

  const [display, thumbnail] = await Promise.all([
    makeDerivative(base, IMAGE_DERIVATIVES.display.maxWidth, IMAGE_DERIVATIVES.display.quality),
    makeDerivative(base, IMAGE_DERIVATIVES.thumbnail.maxWidth, IMAGE_DERIVATIVES.thumbnail.quality),
  ]);

  return { display, thumbnail, original: { width: originalMeta.width, height: originalMeta.height } };
}
