import { getSupabaseAdmin } from "./supabase";

export const STORAGE_BUCKETS = [
  "product-images",
  "podcast-covers",
  "article-images",
  "recommendation-images",
  "branding",
  "ugc-media",
  "testimonial-images",
] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_DIMENSION = 4000; // px, per side — generous ceiling against accidental huge uploads

export function isStorageBucket(value: unknown): value is StorageBucket {
  return typeof value === "string" && (STORAGE_BUCKETS as readonly string[]).includes(value);
}

// Deliberately not part of STORAGE_BUCKETS above: that list is for public,
// image-only buckets handled by the generic upload/delete/cleanup endpoints.
// This one is private (must be created manually in the Supabase Dashboard,
// public-read OFF) and holds purchasable digital files, so it gets its own
// endpoints, allowlist, and size limit — see routes/admin/uploads.ts.
export const DIGITAL_DOWNLOAD_BUCKET = "digital-downloads";
export const ALLOWED_DIGITAL_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "application/epub+zip",
  "application/vnd.amazon.ebook",
] as const;
export const MAX_DIGITAL_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

/** Origin of the configured Supabase project, or null if unset/unparseable. */
function getConfiguredSupabaseOrigin(): string | null {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Extracts the (bucket, objectPath) pair from a Supabase Storage public URL,
 * e.g. https://xyz.supabase.co/storage/v1/object/public/<bucket>/<path...>
 *
 * Returns null for anything that isn't unambiguously one of our own public
 * objects: a different host (including a lookalike or an attacker-controlled
 * domain), a bucket outside STORAGE_BUCKETS, or a malformed URL. Callers can
 * treat null as "safe to ignore" — never delete based on a partial match.
 */
export function parsePublicStorageUrl(url: string): { bucket: StorageBucket; path: string } | null {
  const configuredOrigin = getConfiguredSupabaseOrigin();
  if (!configuredOrigin) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.origin !== configuredOrigin) return null;

  const match = parsed.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, bucket, path] = match;
  if (!isStorageBucket(bucket)) return null;
  return { bucket, path: decodeURIComponent(path) };
}

export interface StorageObjectRef {
  bucket: StorageBucket;
  path: string;
}

export interface StorageRemovalResult extends StorageObjectRef {
  /** null on success. Non-null failures are non-fatal to the caller — log and move on. */
  error: string | null;
}

/**
 * Deletes storage objects via the service-role client, grouped into one
 * `remove()` call per bucket. A missing object is not an error as far as
 * Supabase Storage is concerned, so this never throws for "already gone" —
 * only for genuine failures (auth, network), which are reported per-object
 * rather than thrown so a partial failure never looks like a full one.
 */
export async function removeStorageObjects(refs: StorageObjectRef[]): Promise<StorageRemovalResult[]> {
  if (refs.length === 0) return [];

  const pathsByBucket = new Map<StorageBucket, string[]>();
  for (const { bucket, path } of refs) {
    const paths = pathsByBucket.get(bucket) ?? [];
    paths.push(path);
    pathsByBucket.set(bucket, paths);
  }

  const results: StorageRemovalResult[] = [];
  const supabaseAdmin = getSupabaseAdmin();

  for (const [bucket, paths] of pathsByBucket) {
    let error: string | null = null;
    try {
      const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
      error = removeError ? removeError.message : null;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown storage error";
    }
    for (const path of paths) {
      results.push({ bucket, path, error });
    }
  }

  return results;
}
