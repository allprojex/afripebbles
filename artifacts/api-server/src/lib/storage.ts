export const STORAGE_BUCKETS = [
  "product-images",
  "podcast-covers",
  "article-images",
  "recommendation-images",
  "branding",
] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_DIMENSION = 4000; // px, per side — generous ceiling against accidental huge uploads

export function isStorageBucket(value: unknown): value is StorageBucket {
  return typeof value === "string" && (STORAGE_BUCKETS as readonly string[]).includes(value);
}

/**
 * Extracts the (bucket, objectPath) pair from a Supabase Storage public URL,
 * e.g. https://xyz.supabase.co/storage/v1/object/public/<bucket>/<path...>
 * Returns null if the URL doesn't look like one of our own public objects.
 */
export function parsePublicStorageUrl(url: string): { bucket: StorageBucket; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, bucket, path] = match;
  if (!isStorageBucket(bucket)) return null;
  return { bucket, path: decodeURIComponent(path) };
}
