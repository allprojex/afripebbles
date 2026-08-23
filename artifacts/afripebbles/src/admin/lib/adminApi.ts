import { supabase } from "./supabaseClient";

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface UploadedImage {
  url: string;
  /** Small web-optimized derivative for card/thumbnail contexts. Null only if derivative generation failed server-side. */
  thumbnailUrl: string | null;
}

/**
 * Uploads go through a hand-written fetch call rather than the generated API
 * client — multipart/form-data doesn't fit the OpenAPI-driven JSON hooks used
 * everywhere else, and this endpoint is simple enough not to need codegen.
 *
 * The server always resizes/re-encodes to WebP and returns both a "display"
 * derivative (the `url`) and a smaller "thumbnail" derivative — every upload
 * gets both regardless of which bucket/content-type it's for, even if a given
 * caller only has a field to persist `url`.
 */
export async function uploadImage(bucket: string, file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);

  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: await authHeader(),
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Upload failed (${res.status})`);
  }

  return (await res.json()) as UploadedImage;
}

/**
 * Digital product files (private bucket, e-books/PDFs/zips) — separate
 * endpoint from uploadImage above: no public URL comes back, only the
 * storage path, since the bucket is private and access is only ever
 * granted via a signed URL to a verified paid order.
 */
export async function uploadDigitalFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/uploads/digital", {
    method: "POST",
    headers: await authHeader(),
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Upload failed (${res.status})`);
  }

  const data = (await res.json()) as { path: string };
  return data.path;
}

export async function deleteDigitalFile(path: string): Promise<void> {
  const res = await fetch(`/api/admin/uploads/digital?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Delete failed (${res.status})`);
  }
}
